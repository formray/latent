/**
 * D185 profile patching.
 *
 * Patches the camera's native base profile (625 bytes) with user changes.
 * Only modifies fields the user explicitly set — sentinels for unset fields
 * are preserved so the camera uses EXIF values for untouched parameters.
 *
 * The camera's native format uses DIFFERENT field indices and encoding from
 * the rawji 632-byte write format. See NativeIdx for the confirmed mapping.
 */

import { NR_ENCODE } from './preset-translate.ts'

/** User-friendly parameters for conversion */
export interface ConversionParams {
  filmSimulation?: number
  exposureBias?: number    // in millistops (e.g., 1000 = +1.0 EV)
  highlightTone?: number   // -4 to +4
  shadowTone?: number      // -4 to +4
  color?: number           // -4 to +4
  sharpness?: number       // -4 to +4
  noiseReduction?: number  // -4 to +4
  clarity?: number         // -5 to +5
  dynamicRange?: number
  whiteBalance?: number
  wbShiftR?: number
  wbShiftB?: number
  wbColorTemp?: number
  grainEffect?: number
  smoothSkinEffect?: number
  wideDRange?: number         // D Range Priority
  colorChromeEffect?: number
  colorChromeFxBlue?: number
  imageQuality?: number
}

// ==========================================================================
// Native profile patching
// ==========================================================================

/**
 * Native d185 profile field indices (camera's 625-byte format).
 * Confirmed via X100VI test images (2026-03). Uses DIFFERENT layout from rawji.
 * Encoding matches preset properties: 1-indexed effects, flat grain enum, raw DR%.
 */
const NativeIdx = {
  ExposureBias:      4,
  DynamicRange:      6,   // raw percentage: 100/200/400
  WideDRange:        7,
  FilmSimulation:    8,
  GrainEffect:       9,   // flat enum: 1=Off 2=WkSm 3=StrSm 4=WkLg 5=StrLg
  ColorChrome:      10,   // 1-indexed: 1=Off 2=Weak 3=Strong
  SmoothSkin:       11,   // 1-indexed
  WhiteBalance:     12,   // 0 = use EXIF (sentinel)
  WBShiftR:         13,
  WBShiftB:         14,
  WBColorTemp:      15,
  HighlightTone:    16,   // ×10
  ShadowTone:       17,   // ×10
  Color:            18,   // ×10 (often sentinel 0)
  Sharpness:        19,   // ×10
  NoiseReduction:   20,   // sentinel 0x8000
  CCFxBlue:         25,   // 1-indexed
  Clarity:          27,   // ×10
} as const

/** UI GrainEffect combined value → native flat enum */
const GRAIN_TO_NATIVE: Record<number, number> = {
  0x0000: 1,  // Off
  0x0002: 2,  // WeakSmall
  0x0003: 3,  // StrongSmall
  0x0102: 4,  // WeakLarge
  0x0103: 5,  // StrongLarge
}

/** UI DR enum → native raw percentage */
const DR_TO_NATIVE: Record<number, number> = { 1: 100, 2: 200, 3: 400 }

/**
 * Patch the camera's native base profile with user changes.
 *
 * Only modifies fields the user explicitly set — sentinels for unset fields
 * are preserved, so the camera uses EXIF values for untouched parameters.
 * This eliminates the visual shift that buildProfile (from-scratch) causes.
 */
export function patchProfile(
  baseProfile: Uint8Array,
  changes: ConversionParams,
): Uint8Array<ArrayBuffer> {
  const patched = new Uint8Array(baseProfile.length) as Uint8Array<ArrayBuffer>
  patched.set(baseProfile)
  const view = new DataView(patched.buffer)
  const numParams = view.getUint16(0, true)
  const off = patched.length - numParams * 4

  const set = (idx: number, val: number) => view.setInt32(off + idx * 4, val, true)

  if (changes.filmSimulation !== undefined) set(NativeIdx.FilmSimulation, changes.filmSimulation)
  if (changes.exposureBias !== undefined)   set(NativeIdx.ExposureBias, changes.exposureBias)
  if (changes.dynamicRange !== undefined)   set(NativeIdx.DynamicRange, DR_TO_NATIVE[changes.dynamicRange] ?? 0)
  if (changes.wideDRange !== undefined)     set(NativeIdx.WideDRange, changes.wideDRange)

  // Grain: UI combined value → native flat enum
  if (changes.grainEffect !== undefined)    set(NativeIdx.GrainEffect, GRAIN_TO_NATIVE[changes.grainEffect] ?? 1)

  // Effects: UI 0/1/2 → native 1-indexed 1/2/3
  if (changes.colorChromeEffect !== undefined) set(NativeIdx.ColorChrome, changes.colorChromeEffect + 1)
  if (changes.colorChromeFxBlue !== undefined) set(NativeIdx.CCFxBlue, changes.colorChromeFxBlue + 1)
  if (changes.smoothSkinEffect !== undefined)  set(NativeIdx.SmoothSkin, changes.smoothSkinEffect + 1)

  if (changes.whiteBalance !== undefined)   set(NativeIdx.WhiteBalance, changes.whiteBalance)
  if (changes.wbShiftR !== undefined)       set(NativeIdx.WBShiftR, changes.wbShiftR)
  if (changes.wbShiftB !== undefined)       set(NativeIdx.WBShiftB, changes.wbShiftB)
  if (changes.wbColorTemp !== undefined)    set(NativeIdx.WBColorTemp, changes.wbColorTemp)

  // Tone params: UI integer × 10 → native ×10
  if (changes.highlightTone !== undefined)  set(NativeIdx.HighlightTone, changes.highlightTone * 10)
  if (changes.shadowTone !== undefined)     set(NativeIdx.ShadowTone, changes.shadowTone * 10)
  if (changes.color !== undefined)          set(NativeIdx.Color, changes.color * 10)
  if (changes.sharpness !== undefined)      set(NativeIdx.Sharpness, changes.sharpness * 10)
  // NR: proprietary encoding (NOT ×10) — use shared NR_ENCODE lookup
  if (changes.noiseReduction !== undefined) {
    const nrEncoded = NR_ENCODE[changes.noiseReduction]
    if (nrEncoded !== undefined) set(NativeIdx.NoiseReduction, nrEncoded)
  }
  if (changes.clarity !== undefined)        set(NativeIdx.Clarity, changes.clarity * 10)

  return patched
}

