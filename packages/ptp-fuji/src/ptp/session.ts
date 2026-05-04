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
import { FilmForkError } from "../errors.js";

export type SessionState = "closed" | "opening" | "open" | "degraded";

export interface SessionOptions {
  onProgress?: (p: { stage: string; current: number; total: number }) => void;
}

const PTP_TYPE_RESPONSE = 3;
const PTP_RESP_OK = 0x2001;
const PTP_OP_OPEN_SESSION = 0x1002;
const PTP_OP_CLOSE_SESSION = 0x1003;
const DEFAULT_SESSION_ID = 0x00000001;

export class FujiCameraSession {
  private _state: SessionState = "closed";
  private nextTxid = 1;
  private readonly transport: PtpTransport;
  // Held for future phases (progress callbacks); referenced to satisfy
  // strict TS unused-property checks.
  private readonly options: SessionOptions;

  constructor(transport: PtpTransport, options: SessionOptions = {}) {
    this.transport = transport;
    this.options = options;
  }

  get state(): SessionState {
    return this._state;
  }

  /** Open a PTP session. Sends OpenSession (0x1002) with a session ID. */
  async open(signal?: AbortSignal): Promise<void> {
    if (this._state === "open" || this._state === "opening") {
      throw new FilmForkError("PtpSessionAlreadyOpen", "session is already open");
    }
    this._state = "opening";
    const txid = this.nextTxid++;
    const cmd = packCommand(PTP_OP_OPEN_SESSION, txid, [DEFAULT_SESSION_ID]);
    try {
      await this.transport.send(cmd, signal);
      const resp = await this.transport.receive(signal);
      assertResponseOK(resp, txid);
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
    const txid = this.nextTxid++;
    const cmd = packCommand(PTP_OP_CLOSE_SESSION, txid, []);
    try {
      await this.transport.send(cmd);
      const resp = await this.transport.receive();
      assertResponseOK(resp, txid);
    } finally {
      await this.transport.close();
      this._state = "closed";
    }
  }
}

/**
 * Pack a PTP COMMAND container with up to 5 uint32 params.
 *
 * Layout (12-byte header + N×4 param bytes):
 *   [0-3]  uint32 LE: total length
 *   [4-5]  uint16 LE: container type (1 = COMMAND)
 *   [6-7]  uint16 LE: opcode
 *   [8-11] uint32 LE: transaction ID
 *   [12+]  N × uint32 LE: params
 */
function packCommand(opcode: number, txid: number, params: number[]): Uint8Array {
  const length = 12 + params.length * 4;
  const buf = new Uint8Array(length);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, length, true);
  dv.setUint16(4, 1, true); // type = CMD
  dv.setUint16(6, opcode, true);
  dv.setUint32(8, txid, true);
  for (let i = 0; i < params.length; i++) {
    dv.setUint32(12 + i * 4, params[i] ?? 0, true);
  }
  return buf;
}

/**
 * Validate a RESPONSE container against an expected txid.
 * Throws `FilmForkError` with an appropriate category on any failure.
 */
function assertResponseOK(resp: Uint8Array, expectedTxid: number): void {
  if (resp.length < 12) {
    throw new FilmForkError("PtpStall", "response too short");
  }
  const dv = new DataView(resp.buffer, resp.byteOffset, resp.byteLength);
  const type = dv.getUint16(4, true);
  const code = dv.getUint16(6, true);
  const txid = dv.getUint32(8, true);
  if (type !== PTP_TYPE_RESPONSE) {
    throw new FilmForkError("PtpStall", `expected RESPONSE container, got type=${type}`);
  }
  if (txid !== expectedTxid) {
    throw new FilmForkError(
      "PtpStall",
      `txid mismatch: expected ${expectedTxid}, got ${txid}`,
    );
  }
  if (code !== PTP_RESP_OK) {
    throw new FilmForkError(
      "PtpUnsupportedOperation",
      `PTP response code 0x${code.toString(16)}`,
    );
  }
}
