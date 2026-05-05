import type { Recipe } from "../recipe.js";

// Intermediate property representation matching filmkit's preset properties
// D18E..D1A5 (24 properties). Numbers represent encoded camera values.
export interface CameraProperties {
  filmSimulation: string;
  exposureCompensation?: number;
  dynamicRange: "DRAuto" | "DR100" | "DR200" | "DR400";
  dRangePriority?: "Off" | "Auto" | "Weak" | "Strong";
  wbMode: string;
  wbColorTemperatureK?: number;
  wbShiftR: number;
  wbShiftB: number;
  highlightTone: number; // *10 encoding (e.g. +1.5 → 15)
  shadowTone: number; // *10 encoding
  color: number; // *10 encoding
  sharpness: number; // *10 encoding
  noiseReduction: number; // proprietary lookup, see filmkit
  clarity: number; // *10 encoding
  grainStrength: "Off" | "Weak" | "Strong";
  grainSize: "Small" | "Large";
  colorChromeEffect: "Off" | "Weak" | "Strong";
  colorChromeEffectBlue: "Off" | "Weak" | "Strong";
  smoothSkinEffect?: "Off" | "Weak" | "Strong";
  monoWC?: number; // monochromaticColor warmCool, X-S20 D193
  monoMG?: number; // monochromaticColor greenMagenta, X-S20 D194
}

export function recipeToCameraProperties(r: Recipe): CameraProperties {
  const out: CameraProperties = {
    filmSimulation: r.filmSimulation,
    dynamicRange: r.dynamicRange,
    wbMode: r.whiteBalance.mode,
    wbShiftR: r.whiteBalance.shiftR,
    wbShiftB: r.whiteBalance.shiftB,
    highlightTone: Math.round(r.highlightTone * 10),
    shadowTone: Math.round(r.shadowTone * 10),
    color: Math.round(r.color * 10),
    sharpness: Math.round(r.sharpness * 10),
    noiseReduction: r.noiseReduction,
    clarity: Math.round(r.clarity * 10),
    grainStrength: r.grainEffect.strength,
    grainSize: r.grainEffect.size,
    colorChromeEffect: r.colorChromeEffect,
    colorChromeEffectBlue: r.colorChromeEffectBlue,
  };
  if (r.whiteBalance.colorTemperatureK !== undefined) {
    out.wbColorTemperatureK = r.whiteBalance.colorTemperatureK;
  }
  if (r.exposureCompensation !== undefined) {
    out.exposureCompensation = r.exposureCompensation;
  }
  if (r.dRangePriority !== undefined) {
    out.dRangePriority = r.dRangePriority;
  }
  if (r.smoothSkinEffect !== undefined) {
    out.smoothSkinEffect = r.smoothSkinEffect;
  }
  if (r.monochromaticColor !== undefined) {
    out.monoWC = r.monochromaticColor.warmCool;
    out.monoMG = r.monochromaticColor.greenMagenta;
  }
  return out;
}

type RecipeFields = Pick<
  Recipe,
  | "filmSimulation"
  | "exposureCompensation"
  | "dynamicRange"
  | "dRangePriority"
  | "whiteBalance"
  | "highlightTone"
  | "shadowTone"
  | "color"
  | "sharpness"
  | "noiseReduction"
  | "clarity"
  | "grainEffect"
  | "colorChromeEffect"
  | "colorChromeEffectBlue"
  | "smoothSkinEffect"
  | "monochromaticColor"
>;

export function cameraPropertiesToRecipeFields(p: CameraProperties): RecipeFields {
  const whiteBalance: Recipe["whiteBalance"] = {
    mode: p.wbMode as Recipe["whiteBalance"]["mode"],
    shiftR: p.wbShiftR,
    shiftB: p.wbShiftB,
  };
  if (p.wbColorTemperatureK !== undefined) {
    whiteBalance.colorTemperatureK = p.wbColorTemperatureK;
  }

  const result: RecipeFields = {
    filmSimulation: p.filmSimulation as Recipe["filmSimulation"],
    dynamicRange: p.dynamicRange,
    whiteBalance,
    highlightTone: p.highlightTone / 10,
    shadowTone: p.shadowTone / 10,
    color: p.color / 10,
    sharpness: p.sharpness / 10,
    noiseReduction: p.noiseReduction,
    clarity: p.clarity / 10,
    grainEffect: { strength: p.grainStrength, size: p.grainSize },
    colorChromeEffect: p.colorChromeEffect,
    colorChromeEffectBlue: p.colorChromeEffectBlue,
  };
  if (p.smoothSkinEffect !== undefined) {
    result.smoothSkinEffect = p.smoothSkinEffect;
  }
  if (p.exposureCompensation !== undefined) {
    result.exposureCompensation = p.exposureCompensation;
  }
  if (p.dRangePriority !== undefined) {
    result.dRangePriority = p.dRangePriority;
  }
  if (p.monoWC !== undefined && p.monoMG !== undefined) {
    result.monochromaticColor = { warmCool: p.monoWC, greenMagenta: p.monoMG };
  }
  return result;
}
