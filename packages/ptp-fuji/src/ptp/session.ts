/**
 * FujiCameraSession — high-level PTP session over an injected `PtpTransport`.
 *
 * State machine: closed → opening → open → closed (or `degraded`).
 *
 * Phase 1 implements: open()/close() with txid tracking and typed-error
 * responses. The PTP framing logic (container pack/unpack helpers) lives
 * in `./transport.ts` (PtpFraming) and `./container.ts`; this class
 * focuses on the session-level state machine and OpenSession/CloseSession
 * opcodes.
 */

import type { PtpTransport } from "../transport/transport.js";
import { LatentError } from "../errors.js";
import { PTPOp } from "./constants.js";
import { PtpFraming } from "./transport.js";

export type SessionState = "closed" | "opening" | "open" | "degraded";

export interface SessionOptions {
  onProgress?: (p: { stage: string; current: number; total: number }) => void;
}

const DEFAULT_SESSION_ID = 0x00000001;

export class FujiCameraSession {
  private _state: SessionState = "closed";
  private readonly framing: PtpFraming;
  private readonly transport: PtpTransport;
  // Held for future phases (progress callbacks); referenced to satisfy
  // strict TS unused-property checks.
  private readonly options: SessionOptions;

  constructor(transport: PtpTransport, options: SessionOptions = {}) {
    this.transport = transport;
    this.framing = new PtpFraming(transport);
    this.options = options;
  }

  get state(): SessionState {
    return this._state;
  }

  /** Open a PTP session. Sends OpenSession (0x1002) with a session ID. */
  async open(signal?: AbortSignal): Promise<void> {
    if (this._state === "open" || this._state === "opening") {
      throw new LatentError("PtpSessionAlreadyOpen", "session is already open");
    }
    this._state = "opening";
    try {
      await this.framing.sendCommand(PTPOp.OpenSession, [DEFAULT_SESSION_ID], signal);
      // Touch options so strict-TS doesn't flag the field as unused.
      void this.options;
      this._state = "open";
    } catch (err) {
      this._state = "closed";
      throw err;
    }
  }

  /**
   * Close the PTP session. Idempotent: if already closed, returns immediately.
   * Always transitions to `closed` and closes the underlying transport, even
   * if the CloseSession command itself fails.
   */
  async close(): Promise<void> {
    if (this._state === "closed") return;
    try {
      await this.framing.sendCommand(PTPOp.CloseSession);
    } finally {
      await this.transport.close();
      this._state = "closed";
    }
  }

  fireCloseSession(): void {
    this.framing.fireCloseSession();
  }
}
