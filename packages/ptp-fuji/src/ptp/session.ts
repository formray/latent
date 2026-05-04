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

export interface FujiDeviceInfo {
  model: string;
  firmwareVersion: string;
  serialNumber?: string;
  supportedOps: number[];
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
      if (err instanceof LatentError && err.category === "PtpSessionAlreadyOpen") {
        this._state = "open";
        return;
      }
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

  async getDeviceInfo(signal?: AbortSignal): Promise<FujiDeviceInfo> {
    if (this._state !== "open") {
      throw new LatentError(
        "PtpStall",
        "cannot read device info before session is open",
      );
    }
    const result = await this.framing.sendCommand(PTPOp.GetDeviceInfo, [], signal);
    return parseDeviceInfo(result.data);
  }
}

function parseDeviceInfo(data: Uint8Array): FujiDeviceInfo {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const readU16 = (): number => {
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };
  const readU32 = (): number => {
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const readString = (): string => {
    const length = data[offset++] ?? 0;
    if (length === 0) return "";
    const chars: number[] = [];
    for (let i = 0; i < length - 1; i++) {
      chars.push(readU16());
    }
    offset += 2;
    return String.fromCharCode(...chars);
  };
  const readArray16 = (): number[] => {
    const count = readU32();
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(readU16());
    }
    return out;
  };

  readU16();
  readU32();
  readU16();
  readString();
  const firmwareVersion = readString();
  const supportedOps = readArray16();
  readArray16();
  readArray16();
  readArray16();
  readArray16();
  const model = readString();
  const serialNumber = readString();

  return {
    model,
    firmwareVersion,
    ...(serialNumber ? { serialNumber } : {}),
    supportedOps,
  };
}
