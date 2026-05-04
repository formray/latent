// ==========================================================================
// Film Simulations
// ==========================================================================

/** Film simulation values (from rawji, may need adjustment for X-Processor 5) */
export const FilmSim = {
  Provia:       0x01,
  Velvia:       0x02,
  Astia:        0x03,
  ProNegHi:     0x04,
  ProNegStd:    0x05,
  Monochrome:   0x06,
  MonochromeYe: 0x07,
  MonochromeR:  0x08,
  MonochromeG:  0x09,
  Sepia:        0x0A,
  ClassicChrome:0x0B,
  Acros:        0x0C,
  AcrosYe:      0x0D,
  AcrosR:       0x0E,
  AcrosG:       0x0F,
  Eterna:       0x10,
  ClassicNeg:   0x11,
  EternaBleach: 0x12,
  NostalgicNeg: 0x13,
  RealaAce:     0x14,
} as const

/** Film simulations that are monochrome (B&W) — Color adjustment is not applicable */
export const MONOCHROME_SIMS: Set<number> = new Set([
  FilmSim.Monochrome, FilmSim.MonochromeYe, FilmSim.MonochromeR, FilmSim.MonochromeG,
  FilmSim.Sepia, FilmSim.Acros, FilmSim.AcrosYe, FilmSim.AcrosR, FilmSim.AcrosG,
])

export const FilmSimLabels: Record<number, string> = {
  [FilmSim.Provia]:       'Provia (Standard)',
  [FilmSim.Velvia]:       'Velvia (Vivid)',
  [FilmSim.Astia]:        'Astia (Soft)',
  [FilmSim.ProNegHi]:     'PRO Neg. Hi',
  [FilmSim.ProNegStd]:    'PRO Neg. Std',
  [FilmSim.Monochrome]:   'Monochrome',
  [FilmSim.MonochromeYe]: 'Monochrome + Yellow',
  [FilmSim.MonochromeR]:  'Monochrome + Red',
  [FilmSim.MonochromeG]:  'Monochrome + Green',
  [FilmSim.Sepia]:        'Sepia',
  [FilmSim.ClassicChrome]:'Classic Chrome',
  [FilmSim.Acros]:        'Acros',
  [FilmSim.AcrosYe]:      'Acros + Yellow',
  [FilmSim.AcrosR]:       'Acros + Red',
  [FilmSim.AcrosG]:       'Acros + Green',
  [FilmSim.Eterna]:       'Eterna (Cinema)',
  [FilmSim.EternaBleach]: 'Eterna Bleach Bypass',
  [FilmSim.NostalgicNeg]: 'Nostalgic Neg.',
  [FilmSim.RealaAce]:     'Reala Ace',
  [FilmSim.ClassicNeg]:   'Classic Neg.',
}

// ==========================================================================
// White Balance
// ==========================================================================

export const WBMode = {
  AsShot:           0x0000,
  Auto:             0x0002,
  Daylight:         0x0004,
  Incandescent:     0x0006,
  Underwater:       0x0008,
  Fluorescent1:     0x8001,
  Fluorescent2:     0x8002,
  Fluorescent3:     0x8003,
  Shade:            0x8006,
  ColorTemp:        0x8007,
  AmbiencePriority: 0x8021,  // Auto WB sub-mode (confirmed from preset scan)
} as const

export const WBModeLabels: Record<number, string> = {
  [WBMode.AsShot]:           'As Shot',
  [WBMode.Auto]:             'Auto',
  [WBMode.Daylight]:         'Daylight',
  [WBMode.Shade]:            'Shade',
  [WBMode.Fluorescent1]:     'Fluorescent 1',
  [WBMode.Fluorescent2]:     'Fluorescent 2',
  [WBMode.Fluorescent3]:     'Fluorescent 3',
  [WBMode.Incandescent]:     'Incandescent',
  [WBMode.Underwater]:       'Underwater',
  [WBMode.ColorTemp]:        'Color Temperature',
  [WBMode.AmbiencePriority]: 'Ambience Priority',
}

// ==========================================================================
// Dynamic Range
// ==========================================================================

export const DynRange = {
  DR100: 0x1,
  DR200: 0x2,
  DR400: 0x3,
} as const

export const DynRangeLabels: Record<number, string> = {
  [DynRange.DR100]: 'DR 100%',
  [DynRange.DR200]: 'DR 200%',
  [DynRange.DR400]: 'DR 400%',
}

// ==========================================================================
// Effects (Off/Weak/Strong triplets)
// ==========================================================================

/**
 * Grain effect — combined strength + size as used in d185 profile.
 * The profile encodes grain as a single value; rawji uses strength only (Off=0, Weak=2, Strong=3).
 * We extend with size variants for full preset fidelity.
 * Encoding: low byte = strength (0=off, 2=weak, 3=strong), high byte = size (0=small, 1=large).
 */
export const GrainEffect = {
  Off:         0x0000,
  WeakSmall:   0x0002,
  StrongSmall: 0x0003,
  WeakLarge:   0x0102,
  StrongLarge: 0x0103,
} as const

/** Grain strength values (low byte of GrainEffect) */
export const GrainStrength = { Off: 0, Weak: 2, Strong: 3 } as const

export const GrainStrengthLabels: Record<number, string> = {
  [GrainStrength.Off]:    'Off',
  [GrainStrength.Weak]:   'Weak',
  [GrainStrength.Strong]: 'Strong',
}

/** Grain size values (high byte of GrainEffect, shifted) */
export const GrainSize = { Small: 0, Large: 1 } as const

export const GrainSizeLabels: Record<number, string> = {
  [GrainSize.Small]: 'Small',
  [GrainSize.Large]: 'Large',
}

/** Smooth skin effect — values need camera testing */
export const SmoothSkin = { Off: 0, Weak: 1, Strong: 2 } as const

export const SmoothSkinLabels: Record<number, string> = {
  [SmoothSkin.Off]:    'Off',
  [SmoothSkin.Weak]:   'Weak',
  [SmoothSkin.Strong]: 'Strong',
}

/** Color Chrome Effect — enhances color depth in saturated areas */
export const ColorChrome = { Off: 0, Weak: 1, Strong: 2 } as const

export const ColorChromeLabels: Record<number, string> = {
  [ColorChrome.Off]:    'Off',
  [ColorChrome.Weak]:   'Weak',
  [ColorChrome.Strong]: 'Strong',
}

/** Color Chrome FX Blue — controls blue tone rendering */
export const ColorChromeFxBlue = { Off: 0, Weak: 1, Strong: 2 } as const

export const ColorChromeFxBlueLabels: Record<number, string> = {
  [ColorChromeFxBlue.Off]:    'Off',
  [ColorChromeFxBlue.Weak]:   'Weak',
  [ColorChromeFxBlue.Strong]: 'Strong',
}

/**
 * D Range Priority (WideDRange) — values are speculative, need camera testing.
 * Rawji doesn't document these values.
 */
export const DRangePriority = { Off: 0, Auto: 1, Weak: 2, Strong: 3 } as const

export const DRangePriorityLabels: Record<number, string> = {
  [DRangePriority.Off]:    'Off',
  [DRangePriority.Auto]:   'Auto',
  [DRangePriority.Weak]:   'Weak',
  [DRangePriority.Strong]: 'Strong',
}

