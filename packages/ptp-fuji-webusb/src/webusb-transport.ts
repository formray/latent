/**
 * WebUSB implementation of `PtpTransport`.
 *
 * The session layer in `@latent/ptp-fuji` issues PTP containers as opaque
 * `Uint8Array` blobs and expects this transport to push them over the bulk
 * OUT endpoint and read responses off the bulk IN endpoint. Endpoint
 * discovery and interface lifecycle are the caller's responsibility — see
 * {@link ./request-camera.ts} for the user-gesture entry point.
 *
 * Reference: filmkit/src/ptp/transport.ts (USBTransport class) — kept in
 * lockstep with that implementation for chunk size and behaviour.
 */

import { LatentError, type PtpTransport, type TransportOptions } from "@latent/ptp-fuji";

/** filmkit convention: 512 KB max per WebUSB transfer chunk. */
const DEFAULT_MAX_CHUNK = 512 * 1024;
const DEFAULT_TIMEOUT_MS = 30_000;

/** Construction options for {@link WebUsbPtpTransport}. */
export interface WebUsbPtpTransportOptions extends TransportOptions {
  /** Interface index to release on `close()`. Defaults to 0 (PTP class iface). */
  interfaceNumber?: number;
}

/**
 * `PtpTransport` over WebUSB. Constructed with a pre-opened `USBDevice` whose
 * PTP-class interface has already been claimed and whose bulk endpoints have
 * been resolved.
 *
 * Lifecycle:
 *   - `send` / `receive` honour optional `AbortSignal` via pre-check + race.
 *   - `close` releases the interface and closes the device. Idempotent.
 */
export class WebUsbPtpTransport implements PtpTransport {
  private readonly device: USBDevice;
  private readonly endpointIn: number;
  private readonly endpointOut: number;
  private readonly interfaceNumber: number;
  private readonly maxChunkSize: number;
  private readonly defaultTimeoutMs: number;
  private closed = false;

  constructor(
    device: USBDevice,
    endpointIn: number,
    endpointOut: number,
    options: WebUsbPtpTransportOptions = {},
  ) {
    this.device = device;
    this.endpointIn = endpointIn;
    this.endpointOut = endpointOut;
    this.interfaceNumber = options.interfaceNumber ?? 0;
    this.maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK;
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * Push bytes over the bulk OUT endpoint, chunking at `maxChunkSize`.
   * Honours `AbortSignal` via pre-check and post-write check.
   */
  async send(data: Uint8Array, signal?: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    if (this.closed) {
      throw new LatentError("UsbDisconnect", "transport is closed");
    }

    let offset = 0;
    while (offset < data.length) {
      throwIfAborted(signal);
      const end = Math.min(offset + this.maxChunkSize, data.length);
      // WebUSB types want an `ArrayBuffer`-backed BufferSource (TS 5.7+
      // narrowed away `SharedArrayBuffer`). Copy into a fresh Uint8Array so
      // we always hand the device an ArrayBuffer-backed view, regardless
      // of where the input bytes came from.
      const chunk = new Uint8Array(end - offset);
      chunk.set(data.subarray(offset, end));
      const result = await this.raceWithSignal(
        this.device.transferOut(this.endpointOut, chunk),
        signal,
      );
      if (result.status !== "ok") {
        throw new LatentError(
          "PtpStall",
          `WebUSB transferOut returned status="${result.status}"`,
        );
      }
      offset = end;
    }
  }

  /**
   * Read up to `maxChunkSize` bytes from the bulk IN endpoint and return them
   * as a `Uint8Array`. Multi-chunk PTP responses are reassembled by the
   * session layer (it owns the container-length parsing).
   */
  async receive(signal?: AbortSignal): Promise<Uint8Array> {
    throwIfAborted(signal);
    if (this.closed) {
      throw new LatentError("UsbDisconnect", "transport is closed");
    }

    const result = await this.raceWithSignal(
      this.device.transferIn(this.endpointIn, this.maxChunkSize),
      signal,
    );
    if (result.status !== "ok") {
      throw new LatentError(
        "PtpStall",
        `WebUSB transferIn returned status="${result.status}"`,
      );
    }
    if (!result.data) {
      // `data` is optional in the WebUSB spec but always present on `ok`.
      return new Uint8Array(0);
    }
    return new Uint8Array(
      result.data.buffer,
      result.data.byteOffset,
      result.data.byteLength,
    );
  }

  /**
   * Release the claimed interface and close the device. Errors are
   * swallowed — `close()` is best-effort, like filmkit's `disconnect()`.
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.device.releaseInterface(this.interfaceNumber);
    } catch {
      // ignore
    }
    try {
      await this.device.close();
    } catch {
      // ignore
    }
  }

  /** Default per-operation timeout (ms). Exposed for diagnostics. */
  get timeoutMs(): number {
    return this.defaultTimeoutMs;
  }

  /**
   * Race a WebUSB transfer with the abort signal. WebUSB has no native
   * cancellation, so we only reject the JS-side promise — the in-flight
   * transfer continues until the device responds.
   */
  private raceWithSignal<T>(
    transfer: Promise<T>,
    signal: AbortSignal | undefined,
  ): Promise<T> {
    if (!signal) return transfer;
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        signal.removeEventListener("abort", onAbort);
        reject(makeAbortError(signal));
      };
      if (signal.aborted) {
        reject(makeAbortError(signal));
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });
      transfer.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener("abort", onAbort);
          reject(err as Error);
        },
      );
    });
  }
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw makeAbortError(signal);
  }
}

function makeAbortError(signal: AbortSignal): Error {
  // Prefer the spec-conformant DOMException if the runtime ships one
  // (browsers + Node 20+). Fall back to a plain Error for older runtimes.
  const reason = (signal as { reason?: unknown }).reason;
  if (typeof DOMException !== "undefined") {
    return new DOMException(
      reason instanceof Error ? reason.message : "transfer aborted",
      "AbortError",
    );
  }
  const err = new Error(
    reason instanceof Error ? reason.message : "transfer aborted",
  );
  err.name = "AbortError";
  return err;
}
