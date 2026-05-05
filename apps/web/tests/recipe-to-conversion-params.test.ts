import { describe, expect, it } from "vitest";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { recipeToConversionParams } from "../src/lib/recipe-to-conversion-params";

const recipe: RecipeType = {
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Preview sample",
  author: "Latent",
  tags: [],
  createdAt: "2026-05-04T10:00:00.000Z",
  capabilitySetId: "latent-defaults-v1",
  cameraModel: "Fujifilm",
  filmSimulation: "ClassicChrome",
  exposureCompensation: 1 / 3,
  dynamicRange: "DR400",
  dRangePriority: "Weak",
  whiteBalance: { mode: "ColorTemperature", colorTemperatureK: 4550, shiftR: 2, shiftB: -1 },
  highlightTone: -1,
  shadowTone: 2,
  color: 0,
  sharpness: 2,
  noiseReduction: -4,
  clarity: 0,
  grainEffect: { strength: "Weak", size: "Large" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Off",
  smoothSkinEffect: "Off",
};

describe("recipeToConversionParams", () => {
  it("maps recipe fields to D185 conversion parameters", () => {
    expect(recipeToConversionParams(recipe)).toMatchObject({
      filmSimulation: 0x0b,
      exposureBias: 333,
      dynamicRange: 3,
      wideDRange: 2,
      whiteBalance: 0x8007,
      wbColorTemp: 4550,
      wbShiftR: 2,
      wbShiftB: -1,
      highlightTone: -1,
      shadowTone: 2,
      sharpness: 2,
      noiseReduction: -4,
      grainEffect: 0x0102,
      colorChromeEffect: 1,
      colorChromeFxBlue: 0,
      smoothSkinEffect: 0,
    });
  });
});
