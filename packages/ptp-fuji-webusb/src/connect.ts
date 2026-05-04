/**
 * High-level convenience wrapper for the Phase 3-base React UI:
 * pop the WebUSB picker, open a `FujiCameraSession`, and read whatever
 * preset slots are available (C1-C7).
 *
 * Phase 2-min scope: open a session over WebUSB and surface the live
 * `FujiCameraSession`. Per-slot preset reads (`getPreset(slot)`) land in
 * Phase 2-full once the underlying PTP opcode mappings exist on the
 * session class. Until then this wrapper returns an empty `presets[]`
 * but keeps a stable signature so the React layer can wire against it
 * today and the preset list will fill in transparently when the session
 * gains the read methods.
 */

import { FujiCameraSession, LatentError } from "@latent/ptp-fuji";
import { requestFujiCamera } from "./request-camera.js";

/** A raw, untranslated preset read from a C-slot. Schema firms up in Phase 2-full. */
export interface RawPreset {
  /** C-slot index, 1-based (1..7). */
  slot: number;
  /** Camera-reported preset name, if any. */
  name?: string;
  /** Raw property bag — opaque to V1; the recipe-schema translator owns it later. */
  properties: Record<string, unknown>;
}

/** Result of {@link connectAndReadPresets}. */
export interface ConnectAndReadPresetsResult {
  /** Open `FujiCameraSession` — caller is responsible for `close()`-ing it. */
  session: FujiCameraSession;
  /** Successfully-read presets. May be empty until per-slot reads land. */
  presets: RawPreset[];
}

/** C-slot count we attempt; body-dependent (X-S20 = 7, older bodies = 4). */
const MAX_C_SLOTS = 7;

/**
 * Pop the device picker, open a PTP session, and try to read C1..C7.
 *
 * Caller must close the returned `session` (and via it, the transport).
 * The picker requires a user gesture — call this from a click handler.
 */
export async function connectAndReadPresets(): Promise<ConnectAndReadPresetsResult> {
  const { transport } = await requestFujiCamera();

  const session = new FujiCameraSession(transport);
  try {
    await session.open();
  } catch (err) {
    // Bubble up but make sure we don't leak the USB interface.
    await transport.close();
    throw err;
  }

  const presets: RawPreset[] = [];
  for (let slot = 1; slot <= MAX_C_SLOTS; slot++) {
    const preset = await tryReadPreset(session, slot);
    if (preset) presets.push(preset);
  }
  return { session, presets };
}

/**
 * Attempt to read one C-slot. Returns the preset on success, or `undefined`
 * if the slot is unavailable (older body, vendor opcode not yet implemented).
 *
 * Surfaces `UsbDisconnect` and other transport-level errors so the UI can
 * react — only `PtpUnsupportedOperation` / `PtpStall` are treated as
 * "this slot doesn't exist on this body".
 */
async function tryReadPreset(
  session: FujiCameraSession,
  slot: number,
): Promise<RawPreset | undefined> {
  const reader = (session as unknown as {
    getPreset?: (slot: number) => Promise<RawPreset>;
  }).getPreset;
  if (typeof reader !== "function") {
    // Phase 2-min: per-slot reader not yet on the session — return early.
    // Phase 2-full will fill `getPreset` in and this branch goes away.
    return undefined;
  }
  try {
    return await reader.call(session, slot);
  } catch (err) {
    if (err instanceof LatentError) {
      if (
        err.category === "PtpUnsupportedOperation" ||
        err.category === "PtpStall"
      ) {
        return undefined;
      }
    }
    throw err;
  }
}
