// packages/recipe-schema/src/recipe.ts
import { z } from "zod";

export const FilmSimulation = z.enum([
  "ProviaStandard",
  "VelviaVivid",
  "AstiaSoft",
  "ClassicChrome",
  "ProNegHi",
  "ProNegStd",
  "ClassicNegative",
  "EternaCinema",
  "EternaBleachBypass",
  "AcrosStd",
  "AcrosYe",
  "AcrosR",
  "AcrosG",
  "Monochrome",
  "MonochromeYe",
  "MonochromeR",
  "MonochromeG",
  "Sepia",
  "NostalgicNeg",
  "RealaAce",
]);

export const TriState = z.enum(["Off", "Weak", "Strong"]);
export const DRangePriority = z.enum(["Off", "Auto", "Weak", "Strong"]);

export const Recipe = z.object({
  // Identity & provenance
  id: z.string().uuid(),
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  author: z.string().max(80).optional(),
  parentRecipeId: z.string().uuid().optional(),
  tags: z.array(z.string().max(32)).max(20).default([]),
  createdAt: z.string().datetime(),

  // Camera capability targeting (see §9)
  capabilitySetId: z.string(), // e.g. "x-s20-fw1.10"
  cameraModel: z.string(), // e.g. "X-S20" — descriptive
  cameraGeneration: z.string().optional(), // descriptive metadata only

  // Look-affecting parameters — restricted to filmkit-proven slot-writable
  filmSimulation: FilmSimulation,
  monochromaticColor: z
    .object({
      // monochrome film sims only
      warmCool: z.number().int().min(-9).max(9), // filmkit D193 (monoWC)
      greenMagenta: z.number().int().min(-9).max(9), // filmkit D194 (monoMG)
    })
    .optional(),
  exposureCompensation: z.number().min(-5).max(5).optional(), // EV, preview/render profile only
  dynamicRange: z.enum(["DRAuto", "DR100", "DR200", "DR400"]),
  dRangePriority: DRangePriority.optional(), // preview/render profile only until slot writes are verified
  whiteBalance: z.object({
    mode: z.enum([
      "Auto",
      "AutoWhitePriority",
      "AutoAmbiencePriority",
      "Daylight",
      "Shade",
      "Fluorescent1",
      "Fluorescent2",
      "Fluorescent3",
      "Incandescent",
      "Underwater",
      "ColorTemperature",
    ]),
    colorTemperatureK: z.number().int().min(2500).max(10000).optional(),
    shiftR: z.number().int().min(-9).max(9),
    shiftB: z.number().int().min(-9).max(9),
  }),
  highlightTone: z.number().min(-2).max(4).step(0.5),
  shadowTone: z.number().min(-2).max(4).step(0.5),
  color: z.number().int().min(-4).max(4),
  sharpness: z.number().int().min(-4).max(4),
  noiseReduction: z.number().int().min(-4).max(4),
  clarity: z.number().int().min(-5).max(5),
  grainEffect: z.object({
    strength: TriState,
    size: z.enum(["Small", "Large"]),
  }),
  colorChromeEffect: TriState,
  colorChromeEffectBlue: TriState,
  smoothSkinEffect: TriState.optional(),

  // AI-generated structured explanation (optional, excluded from URL share by default)
  // R5: replaces flat `explanation` with three-field structure for better explainability
  reasoning: z
    .array(
      z.object({
        parameter: z.string(),
        visualEffect: z.string().max(200), // what this parameter visually does
        reason: z.string().max(300), // why chosen for this recipe / feedback
        risk: z.string().max(200).optional(), // when this setting may fail or look bad
        confidence: z.enum(["low", "medium", "high"]).optional(),
      }),
    )
    .max(40)
    .optional(),
});

export type Recipe = z.infer<typeof Recipe>;
