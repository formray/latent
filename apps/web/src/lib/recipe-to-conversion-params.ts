import type { ConversionParams } from "@latent/ptp-fuji";
import type { RecipeType } from "@latent/recipe-schema/browser";

const FILM_SIM: Record<RecipeType["filmSimulation"], number> = {
  ProviaStandard: 0x01,
  VelviaVivid: 0x02,
  AstiaSoft: 0x03,
  ProNegHi: 0x04,
  ProNegStd: 0x05,
  Monochrome: 0x06,
  MonochromeYe: 0x07,
  MonochromeR: 0x08,
  MonochromeG: 0x09,
  Sepia: 0x0a,
  ClassicChrome: 0x0b,
  AcrosStd: 0x0c,
  AcrosYe: 0x0d,
  AcrosR: 0x0e,
  AcrosG: 0x0f,
  EternaCinema: 0x10,
  ClassicNegative: 0x11,
  EternaBleachBypass: 0x12,
  NostalgicNeg: 0x13,
  RealaAce: 0x14,
};

const WB: Record<RecipeType["whiteBalance"]["mode"], number> = {
  Auto: 0x0002,
  AutoWhitePriority: 0x8020,
  AutoAmbiencePriority: 0x8021,
  Daylight: 0x0004,
  Shade: 0x8006,
  Fluorescent1: 0x8001,
  Fluorescent2: 0x8002,
  Fluorescent3: 0x8003,
  Incandescent: 0x0006,
  Underwater: 0x0008,
  ColorTemperature: 0x8007,
};

const DR: Record<RecipeType["dynamicRange"], number> = {
  DRAuto: 0,
  DR100: 1,
  DR200: 2,
  DR400: 3,
};

export function recipeToConversionParams(recipe: RecipeType): ConversionParams {
  return {
    filmSimulation: FILM_SIM[recipe.filmSimulation],
    dynamicRange: DR[recipe.dynamicRange],
    whiteBalance: WB[recipe.whiteBalance.mode],
    wbShiftR: recipe.whiteBalance.shiftR,
    wbShiftB: recipe.whiteBalance.shiftB,
    ...(recipe.whiteBalance.mode === "ColorTemperature"
      ? { wbColorTemp: recipe.whiteBalance.colorTemperatureK ?? 6500 }
      : {}),
    highlightTone: recipe.highlightTone,
    shadowTone: recipe.shadowTone,
    color: recipe.color,
    sharpness: recipe.sharpness,
    noiseReduction: recipe.noiseReduction,
    clarity: recipe.clarity,
    grainEffect: grain(recipe.grainEffect),
    colorChromeEffect: tri(recipe.colorChromeEffect),
    colorChromeFxBlue: tri(recipe.colorChromeEffectBlue),
    ...(recipe.smoothSkinEffect ? { smoothSkinEffect: tri(recipe.smoothSkinEffect) } : {}),
  };
}

export function withoutWhiteBalance(params: ConversionParams): ConversionParams {
  const rest: ConversionParams = { ...params };
  delete rest.whiteBalance;
  delete rest.wbShiftR;
  delete rest.wbShiftB;
  delete rest.wbColorTemp;
  return rest;
}

function grain(grainEffect: RecipeType["grainEffect"]): number {
  if (grainEffect.strength === "Off") return 0x0000;
  const strength = grainEffect.strength === "Weak" ? 0x0002 : 0x0003;
  const size = grainEffect.size === "Large" ? 0x0100 : 0x0000;
  return size | strength;
}

function tri(value: "Off" | "Weak" | "Strong"): number {
  if (value === "Off") return 0;
  if (value === "Weak") return 1;
  return 2;
}
