import { describe, expect, it } from "vitest";
import { parseRecipeJson, serializeRecipeJson } from "../src/lib/recipe-json";
import type { RecipeType } from "@latent/recipe-schema/browser";

const recipe: RecipeType = {
  id: "44444444-4444-4444-8444-444444444444",
  schemaVersion: 1,
  name: "Backup Recipe",
  author: "Latent",
  tags: ["backup"],
  createdAt: "2026-05-04T08:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR200",
  whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
  highlightTone: 0,
  shadowTone: 0,
  color: 0,
  sharpness: 0,
  noiseReduction: -3,
  clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Weak",
};

describe("recipe JSON helpers", () => {
  it("serializes a recipe as pretty JSON with a trailing newline", () => {
    const json = serializeRecipeJson(recipe);
    expect(json).toContain('\n  "name": "Backup Recipe"');
    expect(json.endsWith("\n")).toBe(true);
  });

  it("parses one recipe or an array of recipes", () => {
    expect(parseRecipeJson(JSON.stringify(recipe))).toHaveLength(1);
    expect(parseRecipeJson(JSON.stringify([recipe, { ...recipe, id: "55555555-5555-4555-8555-555555555555" }]))).toHaveLength(2);
  });

  it("rejects invalid recipe JSON", () => {
    expect(() => parseRecipeJson('{"name":"bad"}')).toThrow();
  });
});
