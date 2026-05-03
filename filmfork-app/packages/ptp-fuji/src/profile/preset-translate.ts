/**
 * Translates camera preset properties (D18E-D1A5) into UI-compatible values.
 *
 * Preset encoding differs from d185 profile / UI encoding:
 *   Effects:  preset 1/2/3 → UI 0/1/2
 *   Grain:    preset flat enum 1-5 → UI GrainEffect combined value
 *   DynRange: preset raw % 100/200/400 → UI enum 1/2/3
 *   WB:       preset uint16 (read as int16) → mask 0xFFFF
 *   Tone:     preset ×10 → UI integer (÷10)
 */

// FIXME(ptp-fuji): replace with PtpTransport — RawProp comes from filmkit's session.ts
// (not copied in Task 16); will be redefined inline / extracted in Task 17 refactor.
import type { RawProp } from '../ptp/session.ts'
import { GrainEffect, MONOCHROME_SIMS, WBMode } from './enums.ts'

/** UI-ready values extracted from a camera preset */
export interface PresetUIValues {
  filmSimulation: number
  dynamicRange: number
  grainEffect: number
  smoothSkin: number
  colorChrome: number
  colorChromeFxBlue: number
  whiteBalance: number
  wbShiftR: number
  wbShiftB: number
  wbColorTemp: number
  highlightTone: number
  shadowTone: number
  color: number
  sharpness: number
  noiseReduction: number
  clarity: number
  exposure: number
  dRangePriority: number
  monoWC: number   // Monochromatic Warm/Cool (-9 to +9), only for B&W film sims
  monoMG: number   // Monochromatic Magenta/Green (-9 to +9), only for B&W film sims
}

/**
 * Frozen snapshot of a preset's state at load time.
 * Created once from camera data, never mutated.
 */
export interface PresetSnapshot {
  readonly name: string
  readonly values: Readonly<PresetUIValues>
}

export const PRESET_DEFAULTS: Readonly<PresetUIValues> = {
  filmSimulation: 0,
  dynamicRange: 0,
  grainEffect: 0,
  smoothSkin: 0,
  colorChrome: 0,
  colorChromeFxBlue: 0,
  whiteBalance: 0,
  wbShiftR: 0,
  wbShiftB: 0,
  wbColorTemp: 6500,
  highlightTone: 0,
  shadowTone: 0,
  color: 0,
  sharpness: 0,
  noiseReduction: 0,
  clarity: 0,
  exposure: 0,
  dRangePriority: 0,
  monoWC: 0,
  monoMG: 0,
}

/** Preset DR percentage → d185 enum */
const DR_MAP: Record<number, number> = { 100: 1, 200: 2, 400: 3 }

/** Preset grain flat enum → UI GrainEffect combined value */
const GRAIN_MAP: Record<number, number> = {
  1: GrainEffect.Off,
  2: GrainEffect.WeakSmall,
  3: GrainEffect.StrongSmall,
  4: GrainEffect.WeakLarge,
  5: GrainEffect.StrongLarge,
}

/** Get a property value by ID from a settings array, or null */
function prop(settings: RawProp[], id: number): number | null {
  const p = settings.find(s => s.id === id)
  if (!p || typeof p.value !== 'number') return null
  return p.value
}

/** Decode a ×10-encoded tone value, treating 0x8000 / -32768 as sentinel → 0. */
function decodeTone(raw: number): number {
  if (raw === 0x8000 || raw === -32768) return 0
  return raw / 10
}

/** Decode Fuji proprietary HighIsoNR encoding → -4..+4 integer. */
const NR_DECODE: Record<number, number> = {
  0x8000: -4, 0x7000: -3, 0x4000: -2, 0x3000: -1,
  0x2000: 0, 0x1000: 1, 0x0000: 2, 0x6000: 3, 0x5000: 4,
}

/** Encode UI NR value (-4..+4) → Fuji proprietary HighIsoNR encoding. */
export const NR_ENCODE: Record<number, number> = {
  [-4]: 0x8000, [-3]: 0x7000, [-2]: 0x4000, [-1]: 0x3000,
  [0]:  0x2000, [1]:  0x1000, [2]:  0x0000, [3]:  0x6000, [4]: 0x5000,
}
function decodeNR(raw: number): number {
  // raw comes as int16 from decodePropValue: 0x8000 → -32768, 0x7000 → 28672, etc.
  const u16 = raw & 0xFFFF
  return NR_DECODE[u16] ?? 0
}

/** Translate camera preset settings to UI-compatible values */
export function translatePresetToUI(settings: RawProp[]): PresetUIValues {
  const v = { ...PRESET_DEFAULTS }

  const filmSim = prop(settings, 0xD192)
  if (filmSim !== null) v.filmSimulation = filmSim

  const dr = prop(settings, 0xD190)
  if (dr !== null) v.dynamicRange = DR_MAP[dr] ?? 0

  const grain = prop(settings, 0xD195)
  if (grain !== null) v.grainEffect = GRAIN_MAP[grain] ?? 0

  // Effects: preset 1=Off,2=Weak,3=Strong → UI 0/1/2
  const skin = prop(settings, 0xD198)
  if (skin !== null) v.smoothSkin = Math.max(0, skin - 1)

  const cc = prop(settings, 0xD196)
  if (cc !== null) v.colorChrome = Math.max(0, cc - 1)

  const ccBlue = prop(settings, 0xD197)
  if (ccBlue !== null) v.colorChromeFxBlue = Math.max(0, ccBlue - 1)

  // D193/D194: Monochromatic WC/MG — ×10 encoding, only for B&W film sims
  if (MONOCHROME_SIMS.has(v.filmSimulation)) {
    const monoWC = prop(settings, 0xD193)
    if (monoWC !== null) v.monoWC = monoWC / 10

    const monoMG = prop(settings, 0xD194)
    if (monoMG !== null) v.monoMG = monoMG / 10
  }

  // WB: mask to uint16 (read as int16 by decodePropValue)
  const wb = prop(settings, 0xD199)
  if (wb !== null) v.whiteBalance = wb & 0xFFFF

  const wbR = prop(settings, 0xD19A)
  if (wbR !== null) v.wbShiftR = wbR

  const wbB = prop(settings, 0xD19B)
  if (wbB !== null) v.wbShiftB = wbB

  const ct = prop(settings, 0xD19C)
  if (ct !== null && ct > 0) v.wbColorTemp = ct

  // ×10 tone params → integer (0x8000 sentinel = use default)
  const ht = prop(settings, 0xD19D)
  if (ht !== null) v.highlightTone = decodeTone(ht)

  const st = prop(settings, 0xD19E)
  if (st !== null) v.shadowTone = decodeTone(st)

  const col = prop(settings, 0xD19F)
  if (col !== null) v.color = decodeTone(col)

  const shp = prop(settings, 0xD1A0)
  if (shp !== null) v.sharpness = decodeTone(shp)

  const nr = prop(settings, 0xD1A1)
  if (nr !== null) v.noiseReduction = decodeNR(nr)

  const cla = prop(settings, 0xD1A2)
  if (cla !== null) v.clarity = decodeTone(cla)

  return v
}

/** Create a frozen snapshot from preset data. The returned object is deeply immutable. */
export function createSnapshot(name: string, settings: RawProp[]): PresetSnapshot {
  const values = translatePresetToUI(settings)
  return Object.freeze({ name, values: Object.freeze(values) })
}

// ==========================================================================
// d185 profile → PresetUIValues bridge
// ==========================================================================

import { packU16, packI16 } from '../util/binary.ts'

/**
 * Extract PresetUIValues from the camera's native d185 base profile.
 *
 * IMPORTANT: The camera's returned 625-byte profile uses a DIFFERENT field layout
 * and encoding from the rawji 632-byte write format. The camera profile uses the
 * same encoding as preset properties (1-indexed effects, flat grain enum, raw DR%).
 *
 * Field mapping confirmed via X100VI test images (C1-C7 presets, 2026-03):
 *   [6]  DynamicRange%     [8]  FilmSimulation   [9]  GrainEffect (flat enum)
 *   [10] ColorChrome (1-idx) [11] SmoothSkin (1-idx) [13] WBShiftR [14] WBShiftB
 *   [15] WBColorTemp(K)    [16] HighlightTone×10 [17] ShadowTone×10
 *   [18] Color×10 (sentinel) [19] Sharpness×10   [25] CCFxBlue (1-idx) [27] Clarity×10
 *
 * Sentinel fields (always 0 or 0x8000 — camera uses EXIF values instead):
 *   [12] WB mode, [18] Color, [20] NoiseReduction (0x8000)
 */
export function cameraProfileToUIValues(profileData: Uint8Array): PresetUIValues {
  const view = new DataView(profileData.buffer, profileData.byteOffset, profileData.byteLength)
  const numParams = view.getUint16(0, true)
  const offset = profileData.length - numParams * 4

  const p = (idx: number) => view.getInt32(offset + idx * 4, true)

  // DR: raw percentage → enum (same as preset encoding)
  const drRaw = p(6)

  // Effects: 1-indexed → 0-indexed (same as preset encoding)
  const cc = p(10)
  const skin = p(11)
  const ccBlue = p(25)

  return {
    filmSimulation:   p(8),
    dynamicRange:     DR_MAP[drRaw] ?? 0,
    grainEffect:      GRAIN_MAP[p(9)] ?? 0,
    smoothSkin:       Math.max(0, skin - 1),
    colorChrome:      Math.max(0, cc - 1),
    colorChromeFxBlue: Math.max(0, ccBlue - 1),
    whiteBalance:     0,  // sentinel in camera profile — can't extract
    wbShiftR:         p(13),
    wbShiftB:         p(14),
    wbColorTemp:      p(15) || 6500,
    highlightTone:    decodeTone(p(16)),
    shadowTone:       decodeTone(p(17)),
    color:            decodeTone(p(18)), // often sentinel (0)
    sharpness:        decodeTone(p(19)),
    noiseReduction:   decodeNR(p(20)),
    clarity:          decodeTone(p(27)),
    exposure:         p(4) / 1000,
    dRangePriority:   p(7),
    monoWC:           0, // not in d185 profile (only in preset properties)
    monoMG:           0,
  }
}

// ==========================================================================
// Reverse translation: UI values → camera preset properties (for writing)
// ==========================================================================

/** UI DR enum → preset raw percentage */
const UI_DR_TO_PRESET: Record<number, number> = { 1: 100, 2: 200, 3: 400 }

/** UI GrainEffect combined → preset flat enum */
const UI_GRAIN_TO_PRESET: Record<number, number> = {
  [GrainEffect.Off]:         1,
  [GrainEffect.WeakSmall]:   2,
  [GrainEffect.StrongSmall]: 3,
  [GrainEffect.WeakLarge]:   4,
  [GrainEffect.StrongLarge]: 5,
}

/** Observed defaults for unknown/uneditable properties (from camera scans). */
const UNKNOWN_DEFAULTS: Record<number, number> = {
  0xD18E: 7,      // ImageSize (L 3:2)
  0xD18F: 4,      // ImageQuality
  0xD191: 0,      // Unknown
  0xD1A1: 0x4000, // HighIsoNR — Fuji-specific encoding (from Wireshark capture)
  0xD1A3: 1,      // LongExpNR = On
  0xD1A4: 1,      // ColorSpace = sRGB
  0xD1A5: 7,      // Unknown
}

/**
 * Reverse-translate UI values to camera preset properties (D18E-D1A5).
 *
 * Returns a RawProp[] ready for writing. Conditional properties (D193/D194,
 * D19C, D19F) are omitted entirely when they shouldn't be written.
 * For known fields: converts from UI encoding to camera preset encoding.
 * For unknown fields: uses original raw bytes if available (base), else observed defaults.
 */
export function translateUIToPresetProps(
  values: Readonly<PresetUIValues>,
  base?: RawProp[],
): RawProp[] {
  const baseMap = new Map(base?.map(p => [p.id, p]) ?? [])

  /** Get bytes for a property: use computed value, fall back to base, then default. */
  function makeRaw(propId: number, computedBytes?: Uint8Array): RawProp {
    const bytes = computedBytes
      ?? baseMap.get(propId)?.bytes
      ?? packU16(UNKNOWN_DEFAULTS[propId] ?? 0)
    const name = '' // name not needed for writing
    return { id: propId, name, bytes, value: 0 }
  }

  const props: RawProp[] = []
  const isMono = MONOCHROME_SIMS.has(values.filmSimulation)

  // D18E-D18F: ImageSize, ImageQuality — use base or defaults
  props.push(makeRaw(0xD18E))
  props.push(makeRaw(0xD18F))

  // D190: DynamicRange%
  props.push(makeRaw(0xD190, packU16(UI_DR_TO_PRESET[values.dynamicRange] ?? 100)))

  // D191: Unknown
  props.push(makeRaw(0xD191))

  // D192: FilmSimulation
  props.push(makeRaw(0xD192, packU16(values.filmSimulation || 1)))

  // D193-D194: Monochromatic WC/MG — ×10 encoding
  // Only valid for monochrome film sims; camera rejects writing 0
  if (isMono && values.monoWC !== 0) {
    props.push(makeRaw(0xD193, packI16(Math.round(values.monoWC * 10))))
  }
  if (isMono && values.monoMG !== 0) {
    props.push(makeRaw(0xD194, packI16(Math.round(values.monoMG * 10))))
  }

  // D195: GrainEffect (flat enum)
  props.push(makeRaw(0xD195, packU16(UI_GRAIN_TO_PRESET[values.grainEffect] ?? 1)))

  // D196: ColorChrome (1-indexed)
  props.push(makeRaw(0xD196, packU16(values.colorChrome + 1)))

  // D197: ColorChromeFxBlue (1-indexed)
  props.push(makeRaw(0xD197, packU16(values.colorChromeFxBlue + 1)))

  // D198: SmoothSkin (1-indexed)
  props.push(makeRaw(0xD198, packU16(values.smoothSkin + 1)))

  // D199: WhiteBalance
  props.push(makeRaw(0xD199, packU16(values.whiteBalance)))

  // D19C: WB Color Temp (K) — must be written RIGHT AFTER D199 (WB mode).
  // Only include when WB mode is ColorTemp; camera rejects otherwise.
  if (values.whiteBalance === WBMode.ColorTemp && values.wbColorTemp > 0) {
    props.push(makeRaw(0xD19C, packU16(values.wbColorTemp)))
  }

  // D19A-D19B: WB Shift R/B (after D19C per official app order)
  props.push(makeRaw(0xD19A, packI16(values.wbShiftR)))
  props.push(makeRaw(0xD19B, packI16(values.wbShiftB)))

  // D19D-D1A0: Tone params (×10)
  props.push(makeRaw(0xD19D, packI16(Math.round(values.highlightTone * 10))))
  props.push(makeRaw(0xD19E, packI16(Math.round(values.shadowTone * 10))))

  // D19F: Color×10 — only include for non-monochrome film sims
  if (!isMono) {
    props.push(makeRaw(0xD19F, packI16(Math.round(values.color * 10))))
  }

  props.push(makeRaw(0xD1A0, packI16(Math.round(values.sharpness * 10))))

  // D1A1: HighIsoNR — Fuji proprietary encoding (NOT ×10, NOT linear).
  {
    const encoded = NR_ENCODE[values.noiseReduction]
    if (encoded !== undefined) {
      props.push(makeRaw(0xD1A1, packU16(encoded)))
    } else {
      props.push(makeRaw(0xD1A1)) // fallback to base raw bytes
    }
  }

  // D1A2: Clarity (×10)
  props.push(makeRaw(0xD1A2, packI16(Math.round(values.clarity * 10))))

  // D1A3-D1A5: LongExpNR, ColorSpace, Unknown — use base or defaults
  props.push(makeRaw(0xD1A3))
  props.push(makeRaw(0xD1A4))
  props.push(makeRaw(0xD1A5))

  return props
}
