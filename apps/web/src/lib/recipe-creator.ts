import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";

export type CreatorPresetId = "warm-city" | "muted-street" | "mono-contrast" | "soft-travel";
export type CreatorGrainStrength = RecipeType["grainEffect"]["strength"];
export type CreatorGrainSize = RecipeType["grainEffect"]["size"];
export type CreatorTriState = RecipeType["colorChromeEffect"];
export type CreatorDRangePriority = NonNullable<RecipeType["dRangePriority"]>;
export type CreatorWhiteBalanceMode = RecipeType["whiteBalance"]["mode"];

export interface CreatorPreset {
  id: CreatorPresetId;
  label: string;
  defaultName: string;
  description: string;
  filmSimulation: RecipeType["filmSimulation"];
  dynamicRange: RecipeType["dynamicRange"];
  whiteBalanceMode: CreatorWhiteBalanceMode;
  colorTemperatureK: number;
  shiftR: number;
  shiftB: number;
  highlightTone: number;
  shadowTone: number;
  color: number;
  sharpness: number;
  noiseReduction: number;
  clarity: number;
  grainStrength: CreatorGrainStrength;
  grainSize: CreatorGrainSize;
  colorChromeEffect: CreatorTriState;
  colorChromeEffectBlue: CreatorTriState;
  smoothSkinEffect: CreatorTriState;
  exposureCompensation: number;
  dRangePriority: CreatorDRangePriority;
  monochromaticWarmCool: number;
  monochromaticGreenMagenta: number;
}

export interface RecipeCreatorInput {
  name: string;
  description: string;
  author: string;
  tags: string;
  cameraModel: string;
  cameraGeneration: string;
  capabilitySetId: string;
  parentRecipeId?: string;
  presetId: CreatorPresetId;
  filmSimulation: RecipeType["filmSimulation"];
  exposureCompensation: number;
  dynamicRange: RecipeType["dynamicRange"];
  dRangePriority: CreatorDRangePriority;
  whiteBalanceMode: CreatorWhiteBalanceMode;
  colorTemperatureK: number;
  shiftR: number;
  shiftB: number;
  highlightTone: number;
  shadowTone: number;
  color: number;
  sharpness: number;
  noiseReduction: number;
  clarity: number;
  grainStrength: CreatorGrainStrength;
  grainSize: CreatorGrainSize;
  colorChromeEffect: CreatorTriState;
  colorChromeEffectBlue: CreatorTriState;
  smoothSkinEffect: CreatorTriState;
  monochromaticWarmCool: number;
  monochromaticGreenMagenta: number;
}

export interface RecipeCreatorOptions {
  id?: string;
  createdAt?: string;
}

export const CREATOR_PRESETS: CreatorPreset[] = [
  {
    id: "warm-city",
    label: "Warm city",
    defaultName: "Warm City Chrome",
    description: "Golden daylight, restrained color, and enough shadow density for rooftops.",
    filmSimulation: "ClassicChrome",
    dynamicRange: "DR400",
    whiteBalanceMode: "Daylight",
    colorTemperatureK: 5600,
    shiftR: 4,
    shiftB: -5,
    highlightTone: 0,
    shadowTone: 1.5,
    color: 2,
    sharpness: 0,
    noiseReduction: -4,
    clarity: 1,
    grainStrength: "Weak",
    grainSize: "Small",
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Weak",
    smoothSkinEffect: "Off",
    exposureCompensation: 0,
    dRangePriority: "Off",
    monochromaticWarmCool: 0,
    monochromaticGreenMagenta: 0,
  },
  {
    id: "muted-street",
    label: "Muted street",
    defaultName: "Muted Street Negative",
    description: "Soft saturation, protected highlights, and a mild cool bias for hard light.",
    filmSimulation: "ClassicNegative",
    dynamicRange: "DR400",
    whiteBalanceMode: "Daylight",
    colorTemperatureK: 5200,
    shiftR: -3,
    shiftB: 4,
    highlightTone: -1,
    shadowTone: 0.5,
    color: -2,
    sharpness: -1,
    noiseReduction: -4,
    clarity: 0,
    grainStrength: "Weak",
    grainSize: "Small",
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Strong",
    smoothSkinEffect: "Off",
    exposureCompensation: -0.3,
    dRangePriority: "Off",
    monochromaticWarmCool: 0,
    monochromaticGreenMagenta: 0,
  },
  {
    id: "mono-contrast",
    label: "Mono contrast",
    defaultName: "High Contrast Acros",
    description: "Crisp monochrome separation with visible grain and deeper blacks.",
    filmSimulation: "AcrosR",
    dynamicRange: "DR200",
    whiteBalanceMode: "Auto",
    colorTemperatureK: 5600,
    shiftR: 0,
    shiftB: 0,
    highlightTone: 2,
    shadowTone: 3,
    color: 0,
    sharpness: 1,
    noiseReduction: -4,
    clarity: 2,
    grainStrength: "Strong",
    grainSize: "Large",
    colorChromeEffect: "Off",
    colorChromeEffectBlue: "Off",
    smoothSkinEffect: "Off",
    exposureCompensation: 0,
    dRangePriority: "Off",
    monochromaticWarmCool: 0,
    monochromaticGreenMagenta: 0,
  },
  {
    id: "soft-travel",
    label: "Soft travel",
    defaultName: "Soft Travel Astia",
    description: "Gentle color, open shadows, and a clean handheld travel baseline.",
    filmSimulation: "AstiaSoft",
    dynamicRange: "DR400",
    whiteBalanceMode: "AutoAmbiencePriority",
    colorTemperatureK: 5600,
    shiftR: 2,
    shiftB: -3,
    highlightTone: -1,
    shadowTone: -0.5,
    color: 1,
    sharpness: -1,
    noiseReduction: -3,
    clarity: -1,
    grainStrength: "Off",
    grainSize: "Small",
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Weak",
    smoothSkinEffect: "Off",
    exposureCompensation: 0.3,
    dRangePriority: "Off",
    monochromaticWarmCool: 0,
    monochromaticGreenMagenta: 0,
  },
];

export const CREATOR_FILM_SIMULATIONS: RecipeType["filmSimulation"][] = [
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
];

export const CREATOR_WHITE_BALANCE_MODES: CreatorWhiteBalanceMode[] = [
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
];

export const CREATOR_DYNAMIC_RANGES: RecipeType["dynamicRange"][] = [
  "DRAuto",
  "DR100",
  "DR200",
  "DR400",
];

export const CREATOR_D_RANGE_PRIORITIES: CreatorDRangePriority[] = [
  "Off",
  "Auto",
  "Weak",
  "Strong",
];

export const CREATOR_TRI_STATES: CreatorTriState[] = ["Off", "Weak", "Strong"];
export const CREATOR_GRAIN_SIZES: CreatorGrainSize[] = ["Small", "Large"];

export function presetInput(presetId: CreatorPresetId): RecipeCreatorInput {
  const preset = findPreset(presetId);
  return {
    name: preset.defaultName,
    description: preset.description,
    author: "Latent Creator",
    tags: `latent-created, ${preset.id}`,
    cameraModel: "Fujifilm X Series",
    cameraGeneration: "preview-safe",
    capabilitySetId: "latent-creator-v1",
    presetId: preset.id,
    filmSimulation: preset.filmSimulation,
    exposureCompensation: preset.exposureCompensation,
    dynamicRange: preset.dynamicRange,
    dRangePriority: preset.dRangePriority,
    whiteBalanceMode: preset.whiteBalanceMode,
    colorTemperatureK: preset.colorTemperatureK,
    shiftR: preset.shiftR,
    shiftB: preset.shiftB,
    highlightTone: preset.highlightTone,
    shadowTone: preset.shadowTone,
    color: preset.color,
    sharpness: preset.sharpness,
    noiseReduction: preset.noiseReduction,
    clarity: preset.clarity,
    grainStrength: preset.grainStrength,
    grainSize: preset.grainSize,
    colorChromeEffect: preset.colorChromeEffect,
    colorChromeEffectBlue: preset.colorChromeEffectBlue,
    smoothSkinEffect: preset.smoothSkinEffect,
    monochromaticWarmCool: preset.monochromaticWarmCool,
    monochromaticGreenMagenta: preset.monochromaticGreenMagenta,
  };
}

export function recipeToCreatorInput(recipe: RecipeType): RecipeCreatorInput {
  return {
    name: `${recipe.name} Copy`.slice(0, 80),
    description: recipe.description ?? "",
    author: recipe.author ?? "Latent Creator",
    tags: withCreatedTags(recipe.tags).join(", "),
    cameraModel: recipe.cameraModel,
    cameraGeneration: recipe.cameraGeneration ?? "",
    capabilitySetId: recipe.capabilitySetId,
    parentRecipeId: recipe.id,
    presetId: "warm-city",
    filmSimulation: recipe.filmSimulation,
    exposureCompensation: recipe.exposureCompensation ?? 0,
    dynamicRange: recipe.dynamicRange,
    dRangePriority: recipe.dRangePriority ?? "Off",
    whiteBalanceMode: recipe.whiteBalance.mode,
    colorTemperatureK: recipe.whiteBalance.colorTemperatureK ?? 5600,
    shiftR: recipe.whiteBalance.shiftR,
    shiftB: recipe.whiteBalance.shiftB,
    highlightTone: recipe.highlightTone,
    shadowTone: recipe.shadowTone,
    color: recipe.color,
    sharpness: recipe.sharpness,
    noiseReduction: recipe.noiseReduction,
    clarity: recipe.clarity,
    grainStrength: recipe.grainEffect.strength,
    grainSize: recipe.grainEffect.size,
    colorChromeEffect: recipe.colorChromeEffect,
    colorChromeEffectBlue: recipe.colorChromeEffectBlue,
    smoothSkinEffect: recipe.smoothSkinEffect ?? "Off",
    monochromaticWarmCool: recipe.monochromaticColor?.warmCool ?? 0,
    monochromaticGreenMagenta: recipe.monochromaticColor?.greenMagenta ?? 0,
  };
}

export function createRecipeFromCreatorInput(
  input: RecipeCreatorInput,
  options: RecipeCreatorOptions = {},
): RecipeType {
  const filmSimulation = input.filmSimulation;
  const isMono = isMonochromeFilmSimulation(filmSimulation);
  const whiteBalance: RecipeType["whiteBalance"] = {
    mode: input.whiteBalanceMode,
    ...(input.whiteBalanceMode === "ColorTemperature"
      ? { colorTemperatureK: clampInt(input.colorTemperatureK, 2500, 10000) }
      : {}),
    shiftR: clampInt(input.shiftR, -9, 9),
    shiftB: clampInt(input.shiftB, -9, 9),
  };
  const recipe: RecipeType = {
    id: options.id ?? randomUuid(),
    schemaVersion: 1,
    name: trimName(input.name, "Untitled Recipe"),
    ...(nonEmpty(input.description) ? { description: input.description.trim().slice(0, 500) } : {}),
    ...(nonEmpty(input.author) ? { author: input.author.trim().slice(0, 80) } : {}),
    ...(input.parentRecipeId ? { parentRecipeId: input.parentRecipeId } : {}),
    tags: normalizeTags(input.tags),
    createdAt: options.createdAt ?? new Date().toISOString(),
    capabilitySetId: trimName(input.capabilitySetId, "latent-creator-v1"),
    cameraModel: trimName(input.cameraModel, "Fujifilm X Series"),
    ...(nonEmpty(input.cameraGeneration)
      ? { cameraGeneration: input.cameraGeneration.trim().slice(0, 80) }
      : {}),
    filmSimulation,
    ...(isMono
      ? {
          monochromaticColor: {
            warmCool: clampInt(input.monochromaticWarmCool, -9, 9),
            greenMagenta: clampInt(input.monochromaticGreenMagenta, -9, 9),
          },
        }
      : {}),
    exposureCompensation: clampStep(input.exposureCompensation, -5, 5, 0.1),
    dynamicRange: input.dynamicRange,
    dRangePriority: input.dRangePriority,
    whiteBalance,
    highlightTone: clampStep(input.highlightTone, -2, 4, 0.5),
    shadowTone: clampStep(input.shadowTone, -2, 4, 0.5),
    color: isMono ? 0 : clampInt(input.color, -4, 4),
    sharpness: clampInt(input.sharpness, -4, 4),
    noiseReduction: clampInt(input.noiseReduction, -4, 4),
    clarity: clampInt(input.clarity, -5, 5),
    grainEffect: {
      strength: input.grainStrength,
      size: input.grainSize,
    },
    colorChromeEffect: isMono ? "Off" : input.colorChromeEffect,
    colorChromeEffectBlue: isMono ? "Off" : input.colorChromeEffectBlue,
    smoothSkinEffect: input.smoothSkinEffect,
    reasoning: buildReasoning(input, isMono),
  };

  return Recipe.parse(recipe);
}

export function isMonochromeFilmSimulation(filmSimulation: RecipeType["filmSimulation"]): boolean {
  return filmSimulation.startsWith("Acros") || filmSimulation.startsWith("Monochrome");
}

function buildReasoning(
  input: RecipeCreatorInput,
  isMono: boolean,
): NonNullable<RecipeType["reasoning"]> {
  return [
    {
      parameter: "Film Simulation",
      visualEffect: "Defines the base color response and contrast curve.",
      reason: `${input.filmSimulation} is the base look; all tone, color, grain, and WB controls are layered on top.`,
      confidence: "high",
    },
    {
      parameter: "White Balance Shift",
      visualEffect: "Moves the image warmer/cooler and magenta/green through Fuji's R/B controls.",
      reason:
        "WB shift is exposed directly because RAF diagnostics show it affects preview reliably, unlike Kelvin-only changes in the current RAF loop.",
      risk: "Kelvin may still be useful on camera, but preview validation should rely on shift until the RAF limitation is resolved.",
      confidence: "medium",
    },
    {
      parameter: "Tone",
      visualEffect: "Controls highlight restraint, shadow density, and perceived contrast.",
      reason: `Highlight ${signed(input.highlightTone)}, Shadow ${signed(input.shadowTone)}, and DR ${input.dynamicRange} define the tonal envelope.`,
      confidence: "high",
    },
    {
      parameter: isMono ? "Monochrome Color" : "Color",
      visualEffect: isMono
        ? "Tints monochrome output through warm/cool and green/magenta axes."
        : "Controls saturation and color separation.",
      reason: isMono
        ? `Mono color is WC ${signed(input.monochromaticWarmCool)} and MG ${signed(input.monochromaticGreenMagenta)}.`
        : `Color is set to ${signed(input.color)} with Color Chrome ${input.colorChromeEffect} and Blue ${input.colorChromeEffectBlue}.`,
      confidence: "high",
    },
    {
      parameter: "Texture",
      visualEffect: "Balances digital crispness, noise reduction, clarity, and grain.",
      reason: `Grain ${input.grainStrength} ${input.grainSize}, Sharpness ${signed(input.sharpness)}, NR ${signed(input.noiseReduction)}, Clarity ${signed(input.clarity)}.`,
      confidence: "high",
    },
  ];
}

function findPreset(presetId: CreatorPresetId): CreatorPreset {
  return CREATOR_PRESETS.find((preset) => preset.id === presetId) ?? CREATOR_PRESETS[0]!;
}

function trimName(name: string, fallback: string): string {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, 80);
}

function nonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function normalizeTags(value: string): string[] {
  const tags = value
    .split(",")
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-|-$/g, ""),
    )
    .filter(Boolean)
    .map((tag) => tag.slice(0, 32));
  return withCreatedTags(Array.from(new Set(tags))).slice(0, 20);
}

function withCreatedTags(tags: string[]): string[] {
  const next = new Set(["latent-created", ...tags.filter((tag) => tag !== "latent-default")]);
  return Array.from(next);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const rounded = Math.round(clamped / step) * step;
  return Number(rounded.toFixed(2));
}

function randomUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  const randomHex = (length: number): string =>
    Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${randomHex(8)}-${randomHex(4)}-4${randomHex(3)}-${(
    8 + Math.floor(Math.random() * 4)
  ).toString(16)}${randomHex(3)}-${randomHex(12)}`;
}

function signed(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}
