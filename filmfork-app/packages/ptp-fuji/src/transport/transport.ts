/**
 * PtpTransport — DI boundary between PTP session logic and the underlying
 * USB stack. Phase 2 will provide a WebUSB implementation in
 * @filmfork/ptp-fuji-webusb; tests use a FakeTransport.
 *
 * The session layer is transport-agnostic: chunking, timeouts, and
 * abort-signal handling are the implementation's responsibility.
 */

export interface PtpTransport {
  send(data: Uint8Array, signal?: AbortSignal): Promise<void>;
  receive(signal?: AbortSignal): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface TransportOptions {
  /** Maximum bytes per USB transfer chunk. Default 524288 (512 KB), filmkit convention. */
  maxChunkSize?: number;
  /** Default per-operation timeout in milliseconds. Default 30000. */
  defaultTimeoutMs?: number;
}
