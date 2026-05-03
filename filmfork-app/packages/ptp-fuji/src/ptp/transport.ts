/**
 * WebUSB transport layer for PTP communication.
 *
 * This has no direct equivalent in rawji (which uses pyusb). The key differences:
 * - requestDevice() requires a user gesture (click handler)
 * - No kernel driver detach — must use udev rules on Linux
 * - No timeout param on transfers — we wrap with Promise.race
 * - Endpoint discovery uses the WebUSB interface model, not iteration
 */

import { FUJI_VENDOR_ID, PTPOp } from './constants.ts'
import { packContainer, unpackContainer, containerLength, type PTPContainerData } from './container.ts'
import { ContainerType } from './constants.ts'

export type LogFn = (msg: string) => void

const CHUNK_SIZE = 512 * 1024 // 512KB — matches rawji's chunking
const DEFAULT_TIMEOUT = 5000

export class USBTransport {
  // FIXME(ptp-fuji): replace with PtpTransport
  device: USBDevice | null = null
  private epOut = 0
  private epIn = 0
  private log: LogFn

  constructor(log: LogFn = console.log) {
    this.log = log
  }

  /** Check if WebUSB is available in this browser */
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator
  }

  /**
   * Request and open a Fujifilm camera.
   * MUST be called from a user gesture (click handler).
   */
  /** Connection error types for caller-side UI handling */
  static readonly ConnectError = {
    Cancelled: 'cancelled',
    Security: 'security',
    InterfaceBusy: 'interface-busy',
    Other: 'other',
  } as const

  async connect(): Promise<{ ok: true } | { ok: false, error: string, detail: string }> {
    if (!USBTransport.isSupported()) {
      this.log('WebUSB not supported in this browser (need Chromium-based)')
      return { ok: false, error: 'other', detail: 'WebUSB not supported' }
    }

    try {
      // Request device — browser shows picker dialog
      // FIXME(ptp-fuji): replace with PtpTransport
      this.device = await navigator.usb.requestDevice({
        filters: [{ vendorId: FUJI_VENDOR_ID }],
      })

      this.log(`Found: ${this.device.productName ?? 'Fujifilm camera'} (PID=0x${this.device.productId.toString(16).padStart(4, '0')})`)

      // Open and claim
      await this.device.open()
      await this.device.selectConfiguration(1)
      await this.device.claimInterface(0)
      this.log('USB interface claimed')

      // Discover endpoints
      this.findEndpoints()
      this.log(`Endpoints: OUT=${this.epOut}, IN=${this.epIn}`)

      return { ok: true }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        this.log('No camera selected')
        return { ok: false, error: 'cancelled', detail: 'No camera selected' }
      } else if (err instanceof DOMException && err.name === 'SecurityError') {
        this.log('WebUSB blocked — needs HTTPS or localhost')
        return { ok: false, error: 'security', detail: 'WebUSB blocked — needs HTTPS or localhost' }
      } else if (err instanceof DOMException && err.name === 'NetworkError') {
        this.log('Failed to claim USB interface — another application may have the device')
        return { ok: false, error: 'interface-busy', detail: String(err) }
      } else {
        this.log(`Connection failed: ${err}`)
        return { ok: false, error: 'other', detail: String(err) }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.device) return
    try {
      await this.device.releaseInterface(0)
      await this.device.close()
    } catch {
      // Ignore errors on disconnect
    }
    this.device = null
    this.log('Disconnected')
  }

  /**
   * Reset the USB connection without losing the device reference.
   * Releases interface, closes, reopens, reclaims — clears stale PTP state.
   */
  async resetConnection(): Promise<void> {
    if (!this.device) return
    try {
      await this.device.releaseInterface(0)
      await this.device.close()
    } catch {
      // Ignore
    }
    this._transactionId = 0
    await this.device.open()
    await this.device.selectConfiguration(1)
    await this.device.claimInterface(0)
    this.findEndpoints()
    this.log('USB connection reset')
  }

  /** Find bulk IN and OUT endpoints on interface 0 */
  private findEndpoints(): void {
    const intf = this.device!.configuration!.interfaces[0]
    const alt = intf.alternate

    for (const ep of alt.endpoints) {
      if (ep.type === 'bulk') {
        if (ep.direction === 'out') this.epOut = ep.endpointNumber
        if (ep.direction === 'in') this.epIn = ep.endpointNumber
      }
    }

    if (!this.epOut || !this.epIn) {
      throw new Error('Could not find bulk endpoints')
    }
  }

  /**
   * Send a PTP container, chunking large transfers at 512KB.
   *
   * Large RAF files (25-55MB) must be chunked — WebUSB may reject
   * very large buffers on some platforms.
   */
  async send(container: PTPContainerData): Promise<void> {
    const data = packContainer(container)
    let offset = 0

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE)
      const result = await this.transferOut(chunk)
      if (result.status !== 'ok') {
        throw new Error(`USB write failed: ${result.status}`)
      }
      offset += chunk.length
    }
  }

  /**
   * Receive a PTP container, handling multi-packet responses.
   *
   * Reads the first chunk to get the container length from the header,
   * then continues reading until we have all the bytes.
   */
  async recv(timeout = DEFAULT_TIMEOUT): Promise<PTPContainerData> {
    // First read
    const firstResult = await this.transferIn(CHUNK_SIZE, timeout)
    if (firstResult.status !== 'ok' || !firstResult.data) {
      throw new Error(`USB read failed: ${firstResult.status}`)
    }

    let data = new Uint8Array(firstResult.data.buffer)

    // Check if we need more data
    const totalLength = containerLength(data)
    while (data.length < totalLength) {
      const moreResult = await this.transferIn(CHUNK_SIZE, timeout)
      if (moreResult.status !== 'ok' || !moreResult.data) {
        throw new Error(`USB read continuation failed: ${moreResult.status}`)
      }
      const more = new Uint8Array(moreResult.data.buffer)
      const combined = new Uint8Array(data.length + more.length)
      combined.set(data)
      combined.set(more, data.length)
      data = combined

      if (data.length > 100 * 1024 * 1024) {
        throw new Error(`Response too large: ${data.length} bytes`)
      }
    }

    return unpackContainer(data)
  }

  /**
   * Send a PTP command and receive the response.
   *
   * Handles the optional DATA phase: if the camera sends a DATA container
   * before the RESPONSE, we capture the data payload.
   *
   * Returns: { code, params, data }
   */
  async sendCommand(
    opcode: number,
    params: number[] = [],
    timeout = DEFAULT_TIMEOUT,
  ): Promise<{ code: number; params: number[]; data: Uint8Array }> {
    const transactionId = this.nextTransactionId()

    // Send COMMAND container
    await this.send({
      type: ContainerType.Command,
      code: opcode,
      transactionId,
      params,
      data: new Uint8Array(0),
    })

    // Receive — might be DATA then RESPONSE, or just RESPONSE
    let resp = await this.recv(timeout)
    let data = new Uint8Array(0)

    if (resp.type === ContainerType.Data) {
      data = resp.data
      resp = await this.recv(timeout)
    }

    if (resp.type !== ContainerType.Response) {
      throw new Error(`Expected RESPONSE, got type 0x${resp.type.toString(16)}`)
    }

    return { code: resp.code, params: resp.params, data }
  }

  /**
   * Send a PTP command with a data payload (two-phase: COMMAND then DATA).
   *
   * Used for SetDevicePropValue, SendObjectInfo, SendObject, etc.
   */
  async sendDataCommand(
    opcode: number,
    params: number[],
    data: Uint8Array<ArrayBuffer>,
    timeout = DEFAULT_TIMEOUT,
  ): Promise<{ code: number; params: number[] }> {
    const transactionId = this.nextTransactionId()

    // Send COMMAND container
    await this.send({
      type: ContainerType.Command,
      code: opcode,
      transactionId,
      params,
      data: new Uint8Array(0),
    })

    // Send DATA container
    await this.send({
      type: ContainerType.Data,
      code: opcode,
      transactionId,
      params: [],
      data,
    })

    // Receive RESPONSE
    const resp = await this.recv(timeout)
    if (resp.type !== ContainerType.Response) {
      throw new Error(`Expected RESPONSE, got type 0x${resp.type.toString(16)}`)
    }

    return { code: resp.code, params: resp.params }
  }

  /**
   * Best-effort CloseSession for page unload — fire and forget.
   * Sends the command packet without waiting for a response.
   */
  fireCloseSession(): void {
    if (!this.device) return
    try {
      this.send({
        type: ContainerType.Command,
        code: PTPOp.CloseSession,
        transactionId: this.nextTransactionId(),
        params: [],
        data: new Uint8Array(0),
      })
    } catch {
      // Best-effort — ignore errors
    }
  }

  // -- Private helpers --

  private _transactionId = 0

  private nextTransactionId(): number {
    return ++this._transactionId
  }

  /** transferOut with the device, small wrapper for readability */
  // FIXME(ptp-fuji): replace with PtpTransport
  private transferOut(data: Uint8Array<ArrayBuffer>): Promise<USBOutTransferResult> {
    return this.device!.transferOut(this.epOut, data)
  }

  /** transferIn with timeout (WebUSB has no native timeout) */
  // FIXME(ptp-fuji): replace with PtpTransport
  private transferIn(length: number, timeout: number): Promise<USBInTransferResult> {
    const transfer = this.device!.transferIn(this.epIn, length)
    const timer = new Promise<USBInTransferResult>((_, reject) =>
      setTimeout(() => reject(new Error(`USB read timeout (${timeout}ms)`)), timeout)
    )
    return Promise.race([transfer, timer])
  }
}
