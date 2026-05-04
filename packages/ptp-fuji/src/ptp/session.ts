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
import { concat, packPTPString, packU16, packU32, parsePTPStringRaw } from "../util/binary.js";
import { FujiOp, FujiProp, FujiPropNames, PTPOp } from "./constants.js";
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

export interface FujiRawPreviewResult {
  jpeg: Uint8Array;
  baseProfile: Uint8Array;
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

  async sendRaf(data: Uint8Array | ArrayBuffer, signal?: AbortSignal): Promise<void> {
    this.assertOpen("cannot send RAF before session is open");
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength === 0) {
      throw new LatentError("RafFormatInvalid", "RAF file is empty");
    }

    await this.framing.sendDataCommand(
      FujiOp.SendObjectInfo,
      [0, 0, 0],
      objectInfoForRaf(bytes.byteLength),
      signal,
    );
    await this.framing.sendDataCommand(
      FujiOp.SendObject2,
      [],
      arrayBufferBytes(bytes),
      signal,
    );
  }

  async getRawConversionProfile(signal?: AbortSignal): Promise<Uint8Array> {
    this.assertOpen("cannot read raw conversion profile before session is open");
    const result = await this.framing.sendCommand(
      PTPOp.GetDevicePropValue,
      [FujiProp.RawConvProfile],
      signal,
    );
    if (result.data.byteLength === 0) {
      throw new LatentError(
        "RafFormatInvalid",
        "raw conversion profile is empty; load a RAF before reading D185",
      );
    }
    return result.data;
  }

  async setRawConversionProfile(profile: Uint8Array, signal?: AbortSignal): Promise<void> {
    this.assertOpen("cannot write raw conversion profile before session is open");
    if (profile.byteLength === 0) {
      throw new LatentError("RafFormatInvalid", "raw conversion profile is empty");
    }
    await this.framing.sendDataCommand(
      PTPOp.SetDevicePropValue,
      [FujiProp.RawConvProfile],
      arrayBufferBytes(profile),
      signal,
    );
  }

  async triggerRawConversion(signal?: AbortSignal): Promise<void> {
    this.assertOpen("cannot trigger raw conversion before session is open");
    await this.framing.sendDataCommand(
      PTPOp.SetDevicePropValue,
      [FujiProp.StartRawConversion],
      arrayBufferBytes(packU16(0)),
      signal,
    );
  }

  async waitForRawConversionResult(
    options: { timeoutMs?: number; pollMs?: number } = {},
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    this.assertOpen("cannot wait for raw conversion before session is open");
    const timeoutMs = options.timeoutMs ?? 30_000;
    const pollMs = options.pollMs ?? 1_000;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      throwIfAborted(signal);
      const handles = await this.getObjectHandles(signal);
      const handle = handles[0];
      if (handle !== undefined) {
        try {
          const result = await this.framing.sendCommand(PTPOp.GetObject, [handle], signal);
          return result.data;
        } finally {
          await this.deleteObject(handle, signal).catch(() => undefined);
        }
      }
      await sleep(pollMs, signal);
    }
    throw new LatentError(
      "PtpTimeout",
      `raw conversion timed out after ${Math.round(timeoutMs / 1000)}s`,
    );
  }

  async renderRawPreview(
    raf: Uint8Array | ArrayBuffer,
    profileBuilder: (baseProfile: Uint8Array) => Uint8Array = (baseProfile) => baseProfile,
    signal?: AbortSignal,
  ): Promise<FujiRawPreviewResult> {
    await this.sendRaf(raf, signal);
    const baseProfile = await this.getRawConversionProfile(signal);
    const profile = profileBuilder(baseProfile);
    await this.setRawConversionProfile(profile, signal);
    await this.triggerRawConversion(signal);
    const jpeg = await this.waitForRawConversionResult({}, signal);
    return { jpeg, baseProfile };
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

  private async getObjectHandles(signal?: AbortSignal): Promise<number[]> {
    const result = await this.framing.sendCommand(
      PTPOp.GetObjectHandles,
      [0xffffffff, 0x0000, 0x00000000],
      signal,
    );
    return parseU32Array(result.data);
  }

  private async deleteObject(handle: number, signal?: AbortSignal): Promise<void> {
    await this.framing.sendCommand(PTPOp.DeleteObject, [handle], signal);
  }
}

function objectInfoForRaf(byteLength: number): Uint8Array<ArrayBuffer> {
  return concat(
    packU32(0),
    packU16(0xf802),
    packU16(0),
    packU32(byteLength),
    packU16(0),
    packU32(0),
    packU32(0),
    packU32(0),
    packU32(0),
    packU32(0),
    packU32(0),
    packU32(0),
    packU16(0),
    packU32(0),
    packU32(0),
    packPTPString("FUP_FILE.dat"),
    new Uint8Array([0]),
    new Uint8Array([0]),
    new Uint8Array([0]),
  );
}

function parseU32Array(data: Uint8Array): number[] {
  if (data.byteLength < 4) return [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint32(0, true);
  const handles: number[] = [];
  for (let index = 0; index < count && 4 + index * 4 + 4 <= data.byteLength; index += 1) {
    handles.push(view.getUint32(4 + index * 4, true));
  }
  return handles;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(timeout);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
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
