import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";

export type CreatorPresetId = "warm-city" | "muted-street" | "mono-contrast" | "soft-travel";
export type CreatorGrainStrength = RecipeType["grainEffect"]["strength"];

export interface CreatorPreset {
  id: CreatorPresetId;
  label: string;
  defaultName: string;
  description: string;
  filmSimulation: RecipeType["filmSimulation"];
  dynamicRange: RecipeType["dynamicRange"];
  whiteBalance: RecipeType["whiteBalance"];
  highlightTone: RecipeType["highlightTone"];
  shadowTone: RecipeType["shadowTone"];
  color: RecipeType["color"];
  sharpness: RecipeType["sharpness"];
  noiseReduction: RecipeType["noiseReduction"];
  clarity: RecipeType["clarity"];
  colorChromeEffect: RecipeType["colorChromeEffect"];
  colorChromeEffectBlue: RecipeType["colorChromeEffectBlue"];
  warmth: number;
  contrast: number;
  grainStrength: CreatorGrainStrength;
}

export interface RecipeCreatorInput {
  name: string;
  presetId: CreatorPresetId;
  filmSimulation: RecipeType["filmSimulation"];
  warmth: number;
  contrast: number;
  grainStrength: CreatorGrainStrength;
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
    whiteBalance: { mode: "Daylight", shiftR: 2, shiftB: -3 },
    highlightTone: -0.5,
    shadowTone: 1,
    color: 1,
    sharpness: 0,
    noiseReduction: -4,
    clarity: 1,
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Weak",
    warmth: 1,
    contrast: 1,
    grainStrength: "Weak",
  },
  {
    id: "muted-street",
    label: "Muted street",
    defaultName: "Muted Street Negative",
    description: "Soft saturation, protected highlights, and a mild cool bias for hard light.",
    filmSimulation: "ClassicNegative",
    dynamicRange: "DR400",
    whiteBalance: { mode: "Daylight", shiftR: -1, shiftB: 2 },
    highlightTone: -1,
    shadowTone: 0.5,
    color: -2,
    sharpness: -1,
    noiseReduction: -4,
    clarity: 0,
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Strong",
    warmth: -1,
    contrast: 0,
    grainStrength: "Weak",
  },
  {
    id: "mono-contrast",
    label: "Mono contrast",
    defaultName: "High Contrast Acros",
    description: "Crisp monochrome separation with visible grain and deeper blacks.",
    filmSimulation: "AcrosR",
    dynamicRange: "DR200",
    whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
    highlightTone: 1,
    shadowTone: 2,
    color: 0,
    sharpness: 1,
    noiseReduction: -4,
    clarity: 2,
    colorChromeEffect: "Off",
    colorChromeEffectBlue: "Off",
    warmth: 0,
    contrast: 2,
    grainStrength: "Strong",
  },
  {
    id: "soft-travel",
    label: "Soft travel",
    defaultName: "Soft Travel Astia",
    description: "Gentle color, open shadows, and a clean handheld travel baseline.",
    filmSimulation: "AstiaSoft",
    dynamicRange: "DR400",
    whiteBalance: { mode: "AutoAmbiencePriority", shiftR: 1, shiftB: -1 },
    highlightTone: -1,
    shadowTone: -0.5,
    color: 1,
    sharpness: -1,
    noiseReduction: -3,
    clarity: -1,
    colorChromeEffect: "Weak",
    colorChromeEffectBlue: "Weak",
    warmth: 1,
    contrast: -1,
    grainStrength: "Off",
  },
];

export const CREATOR_FILM_SIMULATIONS: RecipeType["filmSimulation"][] = [
  "ProviaStandard",
  "VelviaVivid",
  "AstiaSoft",
  "ClassicChrome",
  "ClassicNegative",
  "EternaCinema",
  "EternaBleachBypass",
  "AcrosStd",
  "AcrosR",
  "AcrosG",
  "Monochrome",
  "NostalgicNeg",
  "RealaAce",
];

export function presetInput(presetId: CreatorPresetId): RecipeCreatorInput {
  const preset = findPreset(presetId);
  return {
    name: preset.defaultName,
    presetId: preset.id,
    filmSimulation: preset.filmSimulation,
    warmth: preset.warmth,
    contrast: preset.contrast,
    grainStrength: preset.grainStrength,
  };
}

export function createRecipeFromCreatorInput(
  input: RecipeCreatorInput,
  options: RecipeCreatorOptions = {},
): RecipeType {
  const preset = findPreset(input.presetId);
  const warmth = clampInt(input.warmth, -2, 2);
  const contrast = clampInt(input.contrast, -2, 2);
  const filmSimulation = input.filmSimulation;
  const isMono = isMonochromeFilmSimulation(filmSimulation);
  const shiftR = clampInt(preset.whiteBalance.shiftR + warmth * 2, -9, 9);
  const shiftB = clampInt(preset.whiteBalance.shiftB - warmth * 2, -9, 9);
  const highlightTone = clampTone(preset.highlightTone + contrast * 0.5);
  const shadowTone = clampTone(preset.shadowTone + contrast * 0.5);
  const color = isMono ? 0 : clampInt(preset.color + Math.sign(warmth), -4, 4);
  const grainStrength = input.grainStrength;

  const recipe: RecipeType = {
    id: options.id ?? randomUuid(),
    schemaVersion: 1,
    name: trimName(input.name, preset.defaultName),
    description: preset.description,
    author: "Latent Creator",
    tags: ["latent-created", preset.id, warmthTag(warmth), contrastTag(contrast)],
    createdAt: options.createdAt ?? new Date().toISOString(),
    capabilitySetId: "latent-creator-v1",
    cameraModel: "Fujifilm X Series",
    cameraGeneration: "preview-safe",
    filmSimulation,
    dynamicRange: preset.dynamicRange,
    whiteBalance: {
      mode: preset.whiteBalance.mode,
      colorTemperatureK: preset.whiteBalance.colorTemperatureK,
      shiftR,
      shiftB,
    },
    highlightTone,
    shadowTone,
    color,
    sharpness: preset.sharpness,
    noiseReduction: preset.noiseReduction,
    clarity: preset.clarity,
    grainEffect: {
      strength: grainStrength,
      size: grainStrength === "Strong" ? "Large" : "Small",
    },
    colorChromeEffect: isMono ? "Off" : preset.colorChromeEffect,
    colorChromeEffectBlue: isMono ? "Off" : preset.colorChromeEffectBlue,
    ...(isMono
      ? {
          monochromaticColor: {
            warmCool: clampInt(warmth * 2, -9, 9),
            greenMagenta: 0,
          },
        }
      : {}),
    reasoning: [
      {
        parameter: "Film Simulation",
        visualEffect: "Defines the base color response and contrast curve.",
        reason: `${preset.label} starts from ${filmSimulation} because it gives the look a stable base before tone and WB shifts.`,
        confidence: "high",
      },
      {
        parameter: "White Balance Shift",
        visualEffect: "Moves the image warmer or cooler through Fuji's R/B shift controls.",
        reason:
          "The creator uses WB shift instead of Kelvin because current RAF diagnostics show Kelvin changes are not reflected reliably in the preview loop.",
        risk: "Very mixed light can need manual correction.",
        confidence: "medium",
      },
      {
        parameter: "Tone",
        visualEffect: "Controls highlight restraint and shadow density.",
        reason: `Contrast ${contrastLabel(contrast)} maps to Highlight ${signed(highlightTone)} and Shadow ${signed(shadowTone)}.`,
        confidence: "high",
      },
      {
        parameter: "Grain",
        visualEffect: "Adds texture without changing exposure.",
        reason: `${grainStrength} grain keeps the recipe aligned with the selected intent.`,
        confidence: "high",
      },
    ],
  };

  return Recipe.parse(recipe);
}

function findPreset(presetId: CreatorPresetId): CreatorPreset {
  return CREATOR_PRESETS.find((preset) => preset.id === presetId) ?? CREATOR_PRESETS[0]!;
}

function isMonochromeFilmSimulation(filmSimulation: RecipeType["filmSimulation"]): boolean {
  return filmSimulation.startsWith("Acros") || filmSimulation.startsWith("Monochrome");
}

function trimName(name: string, fallback: string): string {
  const trimmed = name.trim();
  return (trimmed || fallback).slice(0, 80);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampTone(value: number): RecipeType["highlightTone"] {
  return Math.min(4, Math.max(-2, Math.round(value * 2) / 2));
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

function warmthTag(warmth: number): string {
  if (warmth > 0) return "warm";
  if (warmth < 0) return "cool";
  return "neutral-wb";
}

function contrastTag(contrast: number): string {
  if (contrast > 0) return "high-contrast";
  if (contrast < 0) return "soft-contrast";
  return "balanced-contrast";
}

function contrastLabel(contrast: number): string {
  if (contrast > 0) return `+${contrast}`;
  return String(contrast);
}

function signed(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}
