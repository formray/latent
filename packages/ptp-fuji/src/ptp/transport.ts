/**
 * PTP framing helpers — container-level send/recv on top of an injected
 * `PtpTransport`. The framing layer owns the txid counter and the
 * 12-byte container header pack/unpack flow; chunking, timeouts, and
 * abort handling live inside the `PtpTransport` implementation.
 *
 * This module replaces filmkit's `USBTransport` class. The WebUSB-specific
 * connect/disconnect/endpoint-discovery code now lives in
 * @latent/ptp-fuji-webusb (Phase 2).
 */

import { PTPOp } from './constants.js'
import { packContainer, unpackContainer, containerLength, type PTPContainerData } from './container.js'
import { ContainerType } from './constants.js'
import type { PtpTransport } from '../transport/transport.js'

export type LogFn = (msg: string) => void

const MAX_RESPONSE_BYTES = 100 * 1024 * 1024

/**
 * PTP framing on top of a `PtpTransport`. Provides:
 *   - container-level `send` / `recv`
 *   - PTP command flow (`sendCommand` for COMMAND→[DATA→]RESPONSE)
 *   - PTP two-phase data write (`sendDataCommand` for COMMAND→DATA→RESPONSE)
 */
export class PtpFraming {
  private _transactionId = 0
  private readonly log: LogFn

  constructor(
    private readonly transport: PtpTransport,
    log: LogFn = () => {},
  ) {
    this.log = log
  }

  /** Send a PTP container (already-packed bytes go through the transport). */
  async send(container: PTPContainerData, signal?: AbortSignal): Promise<void> {
    const data = packContainer(container)
    await this.transport.send(data, signal)
  }

  /**
   * Receive a PTP container. The underlying transport hands us bytes; we
   * concatenate until we have the full length declared in the header.
   */
  async recv(signal?: AbortSignal): Promise<PTPContainerData> {
    let data = await this.transport.receive(signal)

    const totalLength = containerLength(data)
    while (data.length < totalLength) {
      const more = await this.transport.receive(signal)
      const combined = new Uint8Array(data.length + more.length)
      combined.set(data)
      combined.set(more, data.length)
      data = combined

      if (data.length > MAX_RESPONSE_BYTES) {
        throw new Error(`Response too large: ${data.length} bytes`)
      }
    }

    return unpackContainer(data)
  }

  /**
   * Send a PTP COMMAND and receive the response, optionally with an
   * intermediate DATA container. Returns the response code, params, and
   * any DATA payload the camera produced.
   */
  async sendCommand(
    opcode: number,
    params: number[] = [],
    signal?: AbortSignal,
  ): Promise<{ code: number; params: number[]; data: Uint8Array }> {
    const transactionId = this.nextTransactionId()

    await this.send({
      type: ContainerType.Command,
      code: opcode,
      transactionId,
      params,
      data: new Uint8Array(0),
    }, signal)

    let resp = await this.recv(signal)
    let data = new Uint8Array(0)

    if (resp.type === ContainerType.Data) {
      data = resp.data
      resp = await this.recv(signal)
    }

    if (resp.type !== ContainerType.Response) {
      throw new Error(`Expected RESPONSE, got type 0x${resp.type.toString(16)}`)
    }

    return { code: resp.code, params: resp.params, data }
  }

  /**
   * Send a PTP COMMAND with a DATA payload (two-phase: COMMAND then DATA).
   * Used for SetDevicePropValue, SendObjectInfo, SendObject, etc.
   */
  async sendDataCommand(
    opcode: number,
    params: number[],
    data: Uint8Array<ArrayBuffer>,
    signal?: AbortSignal,
  ): Promise<{ code: number; params: number[] }> {
    const transactionId = this.nextTransactionId()

    await this.send({
      type: ContainerType.Command,
      code: opcode,
      transactionId,
      params,
      data: new Uint8Array(0),
    }, signal)

    await this.send({
      type: ContainerType.Data,
      code: opcode,
      transactionId,
      params: [],
      data,
    }, signal)

    const resp = await this.recv(signal)
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
    try {
      // Intentionally not awaited — caller is in a teardown path.
      void this.send({
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

  /** Reset the txid counter (e.g. after a transport-level reconnect). */
  resetTransactionId(): void {
    this._transactionId = 0
  }

  private nextTransactionId(): number {
    return ++this._transactionId
  }
}
