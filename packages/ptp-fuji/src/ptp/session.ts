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
import { packU16, parsePTPStringRaw } from "../util/binary.js";
import { FujiPropNames, PTPOp } from "./constants.js";
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

export interface FujiDevicePropValue {
  bytes: Uint8Array;
  value: number | string | Uint8Array;
}

export interface FujiRawProp {
  id: number;
  name: string;
  bytes: Uint8Array;
  value: number | string;
}

export interface FujiRawPreset {
  slot: number;
  name?: string;
  settings: FujiRawProp[];
  missing: number[];
}

const DEFAULT_SESSION_ID = 0x00000001;
const PRESET_SLOT_PROP = 0xd18c;
const PRESET_NAME_PROP = 0xd18d;
const PRESET_SETTING_PROPS = range(0xd18e, 0xd1a5);

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
    try {
      return parseDeviceInfo(result.data);
    } catch (err) {
      if (err instanceof LatentError) throw err;
      throw new LatentError("PtpStall", "malformed GetDeviceInfo payload", err);
    }
  }

  async getDevicePropValue(
    code: number,
    signal?: AbortSignal,
  ): Promise<FujiDevicePropValue> {
    this.assertOpen("cannot read device property before session is open");
    const result = await this.framing.sendCommand(
      PTPOp.GetDevicePropValue,
      [code],
      signal,
    );
    const bytes = result.data;
    return {
      bytes,
      value: decodePropValue(bytes),
    };
  }

  async setDevicePropValue(
    code: number,
    bytes: Uint8Array,
    signal?: AbortSignal,
  ): Promise<void> {
    this.assertOpen("cannot write device property before session is open");
    await this.framing.sendDataCommand(
      PTPOp.SetDevicePropValue,
      [code],
      arrayBufferBytes(bytes),
      signal,
    );
  }

  async getPreset(slot: number, signal?: AbortSignal): Promise<FujiRawPreset> {
    if (!Number.isInteger(slot) || slot < 1 || slot > 7) {
      throw new LatentError("PtpUnsupportedOperation", `invalid custom slot C${slot}`);
    }
    this.assertOpen("cannot read preset before session is open");

    let previousSlot: FujiDevicePropValue | undefined;
    try {
      previousSlot = await this.getDevicePropValue(PRESET_SLOT_PROP, signal);
    } catch {
      // Older bodies may reject the read before a slot is selected.
    }

    await this.setDevicePropValue(PRESET_SLOT_PROP, packU16(slot), signal);
    const selectedSlot = await this.getDevicePropValue(PRESET_SLOT_PROP, signal);
    if (typeof selectedSlot.value !== "number" || selectedSlot.value !== slot) {
      throw new LatentError(
        "BackupIncomplete",
        `camera selected ${formatPropValue(selectedSlot.value)} instead of requested C${slot}`,
      );
    }

    try {
      const nameValue = await this.getDevicePropValue(PRESET_NAME_PROP, signal);
      const settings: FujiRawProp[] = [];
      const missing: number[] = [];
      for (const prop of PRESET_SETTING_PROPS) {
        try {
          const value = await this.getDevicePropValue(prop, signal);
          const decoded = decodeRawPropValue(value.bytes);
          settings.push({
            id: prop,
            name: FujiPropNames[prop] ?? `0x${prop.toString(16)}`,
            bytes: value.bytes,
            value: decoded,
          });
        } catch (err) {
          if (isOptionalPresetReadFailure(err)) {
            missing.push(prop);
            continue;
          }
          throw err;
        }
      }

      const name = typeof nameValue.value === "string" ? nameValue.value : undefined;
      return {
        slot,
        ...(name ? { name } : {}),
        settings,
        missing,
      };
    } finally {
      if (previousSlot?.bytes) {
        try {
          await this.setDevicePropValue(PRESET_SLOT_PROP, previousSlot.bytes, signal);
        } catch {
          // Best-effort: reading presets must not hide the successful snapshot.
        }
      }
    }
  }

  private assertOpen(message: string): void {
    if (this._state !== "open") {
      throw new LatentError("PtpStall", message);
    }
  }
}

function parseDeviceInfo(data: Uint8Array): FujiDeviceInfo {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;

  const requireBytes = (count: number, label: string): void => {
    if (offset + count > data.byteLength) {
      throw new LatentError(
        "PtpStall",
        `malformed GetDeviceInfo payload while reading ${label}`,
      );
    }
  };
  const readU16 = (): number => {
    requireBytes(2, "uint16");
    const value = view.getUint16(offset, true);
    offset += 2;
    return value;
  };
  const readU32 = (): number => {
    requireBytes(4, "uint32");
    const value = view.getUint32(offset, true);
    offset += 4;
    return value;
  };
  const readString = (): string => {
    requireBytes(1, "string length");
    const length = data[offset++] ?? 0;
    if (length === 0) return "";
    requireBytes(length * 2, "string data");
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
  readString(); // VendorExtensionDesc
  readU16(); // FunctionalMode
  const supportedOps = readArray16();
  readArray16();
  readArray16();
  readArray16();
  readArray16();
  readString(); // Manufacturer
  const model = readString();
  const firmwareVersion = readString();
  const serialNumber = readString();

  return {
    model,
    firmwareVersion,
    ...(serialNumber ? { serialNumber } : {}),
    supportedOps,
  };
}

function decodePropValue(bytes: Uint8Array): number | string | Uint8Array {
  const decoded = decodeRawPropValue(bytes);
  return decoded === "" && bytes.length > 0 ? bytes : decoded;
}

function decodeRawPropValue(bytes: Uint8Array): number | string {
  if (looksLikePtpString(bytes)) {
    return parsePTPStringRaw(bytes);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength === 1) return view.getUint8(0);
  if (bytes.byteLength === 2) return view.getInt16(0, true);
  if (bytes.byteLength === 4) return view.getUint32(0, true);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function looksLikePtpString(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 1) return false;
  const length = bytes[0] ?? 0;
  return length > 0 && bytes.byteLength === 1 + length * 2;
}

function isOptionalPresetReadFailure(err: unknown): boolean {
  return err instanceof LatentError && (
    err.category === "PtpUnsupportedOperation" ||
    err.category === "PtpStall"
  );
}

function range(start: number, end: number): number[] {
  const values: number[] = [];
  for (let code = start; code <= end; code++) values.push(code);
  return values;
}

function formatPropValue(value: number | string | Uint8Array): string {
  if (typeof value === "number") return `C${value}`;
  if (typeof value === "string") return value;
  return `0x${Array.from(value).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function arrayBufferBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}
