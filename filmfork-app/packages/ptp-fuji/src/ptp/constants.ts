/** PTP standard operation codes (ISO 15740) */
export const PTPOp = {
  GetDeviceInfo:      0x1001,
  OpenSession:        0x1002,
  CloseSession:       0x1003,
  GetStorageIDs:      0x1004,
  GetStorageInfo:     0x1005,
  GetNumObjects:      0x1006,
  GetObjectHandles:   0x1007,
  GetObjectInfo:      0x1008,
  GetObject:          0x1009,
  DeleteObject:       0x100B,
  SendObjectInfo:     0x100C,
  SendObject:         0x100D,
  GetDevicePropDesc:  0x1014,
  GetDevicePropValue: 0x1015,
  SetDevicePropValue: 0x1016,
} as const

/** Fujifilm vendor-specific operation codes */
export const FujiOp = {
  SendObjectInfo: 0x900C,
  SendObject2:    0x900D,
} as const

/** PTP response codes */
export const PTPResp = {
  OK:                    0x2001,
  GeneralError:          0x2002,
  SessionNotOpen:        0x2003,
  InvalidTransactionID:  0x2004,
  OperationNotSupported: 0x2005,
  ParameterNotSupported: 0x2006,
  IncompleteTransfer:    0x2007,
  InvalidStorageID:      0x2008,
  InvalidObjectHandle:   0x2009,
  DevicePropNotSupported: 0x200A,
  SessionAlreadyOpen:    0x201E,
} as const

/** PTP container types */
export const ContainerType = {
  Command:  0x0001,
  Data:     0x0002,
  Response: 0x0003,
  Event:    0x0004,
} as const

/** Fujifilm device property codes */
export const FujiProp = {
  RawConvProfile:      0xD185,
  StartRawConversion:  0xD183,
} as const

/** Known Fuji device property names (for display) */
export const FujiPropNames: Record<number, string> = {
  // Camera shooting properties (D001-D0xx)
  0xD001: 'FilmSimulation',
  0xD002: 'FilmSimulationTune',
  0xD003: 'DRangeMode',
  0xD007: 'ColorTemperature',
  0xD008: 'WhiteBalanceFineTune',
  0xD00A: 'NoiseReduction',
  0xD00B: 'ImageQuality',
  0xD00C: 'RecMode',
  0xD00F: 'FocusMode',
  0xD017: 'GrainEffect',
  0xD019: 'ShadowHighlight',
  0xD100: 'ExposureIndex',
  0xD104: 'FocusMeteringMode',
  0xD10A: 'ShutterSpeed',
  0xD10B: 'ImageAspectRatio',
  0xD171: 'RawConversionEdit',
  0xD183: 'StartRawConversion',
  0xD184: 'IOPCodes',
  0xD185: 'RawConvProfile',
  0xD186: 'FirmwareVersion',
  0xD187: 'FirmwareVersion2',

  // Custom preset properties (D18C-D1A5)
  //
  // Confirmed mapping via cross-referencing 7 camera presets (X100VI, 2026-03).
  // Encoding differs from d185 profile format:
  //   Effects:  1=Off 2=Weak 3=Strong (not 0/2/3)
  //   Grain:    flat enum 1=Off 2=WeakSmall 3=StrongSmall 4=WeakLarge 5=StrongLarge
  //   DynRange: raw percentage 100/200/400 (not enum 1/2/3)
  //   WB:       uint16 values (read as int16 — mask with 0xFFFF for lookup)
  //   Tone:     ×10 encoding (same as d185)
  //
  // RESOLVED via Wireshark captures (2026-03):
  //   D193: MonoWC (Warm/Cool) — ×10 encoding, rejects writing 0, only for B&W sims
  //   D194: MonoMG (Magenta/Green) — same encoding as D193
  //   D1A1: HighIsoNR — Fuji-specific encoding (NOT ×10): -4→0x8000, 0→0x2000, +4→0x5000
  //
  // Still unknown:
  //   D191: always 0
  //   D1A5: always 7
  //
  0xD18C: 'PresetSlot',
  0xD18D: 'PresetName',
  0xD18E: 'P:ImageSize',
  0xD18F: 'P:ImageQuality',
  0xD190: 'P:DynamicRange%',
  0xD191: 'P:?D191',
  0xD192: 'P:FilmSimulation',
  0xD193: 'P:MonoWC×10',
  0xD194: 'P:MonoMG×10',
  0xD195: 'P:GrainEffect',
  0xD196: 'P:ColorChrome',
  0xD197: 'P:ColorChromeFxBlue',
  0xD198: 'P:SmoothSkin',
  0xD199: 'P:WhiteBalance',
  0xD19A: 'P:WBShiftR',
  0xD19B: 'P:WBShiftB',
  0xD19C: 'P:ColorTemp(K)',
  0xD19D: 'P:HighlightTone×10',  // confirmed: matches camera menu order
  0xD19E: 'P:ShadowTone×10',
  0xD19F: 'P:Color×10',
  0xD1A0: 'P:Sharpness×10',
  0xD1A1: 'P:HighIsoNR?',       // always 0x8000 — sentinel/not stored in presets
  0xD1A2: 'P:Clarity×10',
  0xD1A3: 'P:LongExpNR',        // 1=on for all tested presets
  0xD1A4: 'P:ColorSpace',       // 1=sRGB for all tested presets
  0xD1A5: 'P:?D1A5',            // 7 for all tested presets — image format?
}

/** PTP data type names */
export const PTPDataTypeNames: Record<number, string> = {
  0x0001: 'INT8',
  0x0002: 'UINT8',
  0x0003: 'INT16',
  0x0004: 'UINT16',
  0x0005: 'INT32',
  0x0006: 'UINT32',
  0x0007: 'INT64',
  0x0008: 'UINT64',
  0x4002: 'UINT8[]',
  0x4004: 'UINT16[]',
  0x4006: 'UINT32[]',
  0xFFFF: 'String',
}

/** USB identifiers */
export const FUJI_VENDOR_ID = 0x04CB

export const FUJI_PRODUCT_IDS = [
  0x02E3, // X-T30
  0x02E5, // X100V
  0x02E7, // X-T4
  0x0305, // X100VI
]

// ==========================================================================
// Preset value formatting — human-readable decoding
// ==========================================================================

import { FilmSimLabels, WBModeLabels } from '../profile/enums.ts'

/**
 * Preset effect encoding (1-indexed, unlike d185 profile format).
 * Confirmed from cross-referencing camera presets with known settings.
 */
const PresetEffectLabels: Record<number, string> = { 1: 'Off', 2: 'Weak', 3: 'Strong' }

/**
 * Preset grain encoding — flat enum (NOT byte-packed).
 * Confirmed: C1=weak large(4), C4=weak small(2), C7=strong small(3), C2=strong large(5)
 */
const PresetGrainLabels: Record<number, string> = {
  1: 'Off', 2: 'Weak Small', 3: 'Strong Small', 4: 'Weak Large', 5: 'Strong Large',
}

/** Format a ×10-encoded tone value for display: 20 → "+2.0", -5 → "-0.5" */
function fmtTone(raw: number): string {
  if (raw === -32768) return '(sentinel 0x8000)' // 0x8000 as int16
  const v = raw / 10
  return (v >= 0 ? '+' : '') + v.toFixed(1)
}

/**
 * Decode a preset property value to a human-readable string.
 * Returns null for properties without a known decoder (raw value shown instead).
 *
 * NOTE: Preset properties (D18E-D1A5) use DIFFERENT encodings from the d185 profile:
 * - Effects: 1=Off, 2=Weak, 3=Strong (not 0/2/3)
 * - DynamicRange: raw percentage 100/200/400 (not enum 1/2/3)
 * - Grain: flat enum 1-5 (not byte-packed strength+size)
 * - WB mode values are uint16 but read as int16 — must mask to 0xFFFF
 */
export function formatPresetValue(propId: number, value: number | string): string | null {
  if (typeof value === 'string') return `"${value}"`

  switch (propId) {
    case 0xD192: return FilmSimLabels[value] ?? `? (${value})`

    // WB: values are uint16 but decodePropValue reads as int16
    case 0xD199: {
      const u = value & 0xFFFF
      return WBModeLabels[u] ?? `? (0x${u.toString(16).toUpperCase()})`
    }

    case 0xD19C: return value > 0 ? `${value}K` : 'N/A'
    case 0xD19A: case 0xD19B: return (value >= 0 ? '+' : '') + value
    case 0xD190: return `DR${value}%`

    // ×10 tone params (confirmed order: H, S, Color, Sharpness, [NR sentinel], Clarity)
    case 0xD19D: case 0xD19E:
    case 0xD19F: case 0xD1A0:
    case 0xD1A1: case 0xD1A2:
      return fmtTone(value)

    // Effects: 1-indexed (1=Off, 2=Weak, 3=Strong)
    case 0xD195: return PresetGrainLabels[value] ?? `? (${value})`
    case 0xD196: return PresetEffectLabels[value] ?? `? (${value})`
    case 0xD197: return PresetEffectLabels[value] ?? `? (${value})`
    case 0xD198: return PresetEffectLabels[value] ?? `? (${value})`

    // Constants
    case 0xD1A3: return value === 1 ? 'On' : value === 0 ? 'Off' : `? (${value})`
    case 0xD1A4: return value === 1 ? 'sRGB' : value === 2 ? 'AdobeRGB' : `? (${value})`

    default: return null
  }
}

/** Human-readable response code name */
export function respName(code: number): string {
  for (const [name, val] of Object.entries(PTPResp)) {
    if (val === code) return name
  }
  return `0x${code.toString(16).toUpperCase().padStart(4, '0')}`
}
