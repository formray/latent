import type { PtpTransport } from "../src/transport/transport.js";

/**
 * In-memory PtpTransport for tests. Tests enqueue canned response bytes
 * via `enqueue()` and inspect what the session sent via `sent`.
 */
export class FakeTransport implements PtpTransport {
  private inbox: Uint8Array[] = [];
  public sent: Uint8Array[] = [];
  public closed = false;

  enqueue(data: Uint8Array): void {
    this.inbox.push(data);
  }

  async send(data: Uint8Array, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    this.sent.push(new Uint8Array(data));
  }

  async receive(signal?: AbortSignal): Promise<Uint8Array> {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const next = this.inbox.shift();
    if (!next) throw new Error("FakeTransport: receive() called with empty inbox");
    return next;
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}
