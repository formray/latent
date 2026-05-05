import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";
import type { RawPreset } from "@latent/camera-connection";

export interface CameraPresetRecipeMetadata {
  cameraModel: string;
  firmwareVersion?: string;
}

export interface CameraPresetRecipeOptions {
  id?: string;
  createdAt?: string;
}

export interface ImportCheck {
  ok: boolean;
  reason?: string;
}

type RecipeFields = Omit<
  RecipeType,
  | "id"
  | "schemaVersion"
  | "name"
  | "description"
  | "author"
  | "tags"
  | "createdAt"
  | "capabilitySetId"
  | "cameraModel"
  | "cameraGeneration"
  | "parentRecipeId"
  | "reasoning"
>;

const FILM_SIM_BY_VALUE: Record<number, RecipeType["filmSimulation"]> = {
  1: "ProviaStandard",
  2: "VelviaVivid",
  3: "AstiaSoft",
  4: "ProNegHi",
  5: "ProNegStd",
  6: "Monochrome",
  7: "MonochromeYe",
  8: "MonochromeR",
  9: "MonochromeG",
  10: "Sepia",
  11: "ClassicChrome",
  12: "AcrosStd",
  13: "AcrosYe",
  14: "AcrosR",
  15: "AcrosG",
  16: "EternaCinema",
  17: "ClassicNegative",
  18: "EternaBleachBypass",
  19: "NostalgicNeg",
  20: "RealaAce",
};

const WB_BY_VALUE: Record<number, RecipeType["whiteBalance"]["mode"]> = {
  2: "Auto",
  4: "Daylight",
  6: "Incandescent",
  8: "Underwater",
  0x8001: "Fluorescent1",
  0x8002: "Fluorescent2",
  0x8003: "Fluorescent3",
  0x8006: "Shade",
  0x8007: "ColorTemperature",
  0x8020: "AutoWhitePriority",
  0x8021: "AutoAmbiencePriority",
};

export function canImportCameraPreset(preset: RawPreset): ImportCheck {
  try {
    presetToRecipeFields(preset);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Unsupported camera preset",
    };
  }
}

export function cameraPresetToRecipe(
  preset: RawPreset,
  metadata: CameraPresetRecipeMetadata,
  options: CameraPresetRecipeOptions = {},
): RecipeType {
  const fields = presetToRecipeFields(preset);
  const cameraModel = metadata.cameraModel.trim() || "Fujifilm Camera";
  const createdAt = options.createdAt ?? new Date().toISOString();
  const name = presetName(preset);
  const recipe = {
    ...fields,
    id: options.id ?? createUuid(),
    schemaVersion: 1,
    name,
    description: `Imported from ${cameraModel} custom slot C${preset.slot}.`,
    author: "Camera import",
    tags: ["camera-import", cameraModel.toLowerCase(), `c${preset.slot}`],
    createdAt,
    capabilitySetId: capabilitySetId(cameraModel, metadata.firmwareVersion),
    cameraModel,
  };
  return Recipe.parse(recipe);
}

export function cameraPresetImportKey(
  preset: RawPreset,
  metadata: CameraPresetRecipeMetadata,
): string {
  const cameraModel = metadata.cameraModel.trim() || "Fujifilm Camera";
  return cameraImportKeyParts({
    cameraModel,
    capabilitySetId: capabilitySetId(cameraModel, metadata.firmwareVersion),
    slot: `c${preset.slot}`,
    name: presetName(preset),
  });
}

export function recipeCameraImportKey(recipe: RecipeType): string | null {
  if (recipe.author !== "Camera import") return null;
  if (!recipe.tags.includes("camera-import")) return null;
  const slot = recipe.tags.find((tag) => /^c\d+$/i.test(tag));
  if (!slot) return null;
  return cameraImportKeyParts({
    cameraModel: recipe.cameraModel,
    capabilitySetId: recipe.capabilitySetId,
    slot,
    name: recipe.name,
  });
}

export function cameraPresetMatchesRecipe(
  preset: RawPreset,
  metadata: CameraPresetRecipeMetadata,
  recipe: RecipeType,
): boolean {
  try {
    const current = cameraPresetToRecipe(preset, metadata, {
      id: recipe.id,
      createdAt: recipe.createdAt,
    });
    return JSON.stringify(recipeComparable(current)) === JSON.stringify(recipeComparable(recipe));
  } catch {
    return false;
  }
}

function presetToRecipeFields(preset: RawPreset): RecipeFields {
  const d = preset.decoded;
  if (!d) throw new Error("Preset has not been decoded yet");

  const filmSimulation = FILM_SIM_BY_VALUE[d.filmSimulation.value];
  if (!filmSimulation) {
    throw new Error(`Unsupported film simulation: ${d.filmSimulation.label}`);
  }

  const wbMode = WB_BY_VALUE[d.whiteBalance.value & 0xffff];
  if (!wbMode) {
    throw new Error(`Unsupported white balance: ${d.whiteBalance.label}`);
  }

  const whiteBalance: RecipeType["whiteBalance"] = {
    mode: wbMode,
    shiftR: d.wbShift.r,
    shiftB: d.wbShift.b,
  };
  if (wbMode === "ColorTemperature") {
    whiteBalance.colorTemperatureK = d.whiteBalance.colorTemperatureK ?? 6500;
  }

  const result: RecipeFields = {
    filmSimulation,
    dynamicRange: dynamicRange(d.dynamicRange.value, d.dynamicRange.label),
    whiteBalance,
    highlightTone: d.highlightTone,
    shadowTone: d.shadowTone,
    color: d.color,
    sharpness: d.sharpness,
    noiseReduction: d.noiseReduction,
    clarity: d.clarity,
    grainEffect: {
      strength: triState(d.grainEffect.strength, "grain"),
      size: grainSize(d.grainEffect.size),
    },
    colorChromeEffect: triState(d.colorChromeEffect.label, "color chrome"),
    colorChromeEffectBlue: triState(d.colorChromeEffectBlue.label, "color chrome blue"),
    smoothSkinEffect: triState(d.smoothSkinEffect.label, "smooth skin"),
  };

  if (d.monochromaticColor) {
    result.monochromaticColor = d.monochromaticColor;
  }
  return result;
}

function dynamicRange(value: number, label: string): RecipeType["dynamicRange"] {
  if (value === -1 || label.toLowerCase().includes("auto")) return "DRAuto";
  if (value === 1 || label.includes("100")) return "DR100";
  if (value === 2 || label.includes("200")) return "DR200";
  if (value === 3 || label.includes("400")) return "DR400";
  throw new Error(`Unsupported dynamic range: ${label}`);
}

function triState(value: string, label: string): "Off" | "Weak" | "Strong" {
  if (value === "Off" || value === "Weak" || value === "Strong") return value;
  throw new Error(`Unsupported ${label}: ${value}`);
}

function grainSize(value: string): "Small" | "Large" {
  if (value === "Small" || value === "Large") return value;
  throw new Error(`Unsupported grain size: ${value}`);
}

function capabilitySetId(cameraModel: string, firmwareVersion: string | undefined): string {
  const model = cameraModel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!firmwareVersion) return model || "fujifilm-camera";
  return `${model || "fujifilm-camera"}-fw${firmwareVersion}`;
}

function presetName(preset: RawPreset): string {
  return preset.name?.trim() || `Camera C${preset.slot} Default`;
}

function cameraImportKeyParts(parts: {
  cameraModel: string;
  capabilitySetId: string;
  slot: string;
  name: string;
}): string {
  return [
    parts.cameraModel.trim().toLowerCase(),
    parts.capabilitySetId.trim().toLowerCase(),
    parts.slot.trim().toLowerCase(),
  ].join("|");
}

function createUuid(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const suffix = Math.random().toString(16).slice(2, 14).padEnd(12, "0");
  return `00000000-0000-4000-8000-${suffix}`;
}

function recipeComparable(recipe: RecipeType): RecipeFields & {
  capabilitySetId: string;
  cameraModel: string;
} {
  return {
    capabilitySetId: recipe.capabilitySetId,
    cameraModel: recipe.cameraModel,
    filmSimulation: recipe.filmSimulation,
    dynamicRange: recipe.dynamicRange,
    whiteBalance: recipe.whiteBalance,
    highlightTone: recipe.highlightTone,
    shadowTone: recipe.shadowTone,
    color: recipe.color,
    sharpness: recipe.sharpness,
    noiseReduction: recipe.noiseReduction,
    clarity: recipe.clarity,
    grainEffect: recipe.grainEffect,
    colorChromeEffect: recipe.colorChromeEffect,
    colorChromeEffectBlue: recipe.colorChromeEffectBlue,
    ...(recipe.smoothSkinEffect ? { smoothSkinEffect: recipe.smoothSkinEffect } : {}),
    ...(recipe.monochromaticColor ? { monochromaticColor: recipe.monochromaticColor } : {}),
  };
}
