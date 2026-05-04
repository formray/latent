import { describe, expect, it } from "vitest";
import { recipeToProperties, propertiesToRecipe } from "../src/translate";
import { Recipe } from "../src/recipe";

describe("Recipe ↔ camera property translator", () => {
  const sample: Recipe = Recipe.parse({
    id: "550e8400-e29b-41d4-a716-446655440000",
    schemaVersion: 1,
    name: "Test",
    tags: [],
    createdAt: "2026-05-04T10:00:00Z",
    capabilitySetId: "x-s20-fw1.10",
    cameraModel: "X-S20",
    filmSimulation: "ClassicChrome",
    dynamicRange: "DR200",
    whiteBalance: { mode: "Daylight", shiftR: 2, shiftB: -1 },
    highlightTone: -1,
    shadowTone: 0.5,
    color: 1,
    sharpness: 0,
    noiseReduction: -2,
    clarity: 3,
    grainEffect: { strength: "Weak", size: "Small" },
    colorChromeEffect: "Strong",
    colorChromeEffectBlue: "Off",
  });

  it("round-trips a full recipe through property bytes", () => {
    const props = recipeToProperties(sample);
    const back = propertiesToRecipe(props, {
      id: sample.id,
      schemaVersion: 1,
      name: sample.name,
      tags: [],
      createdAt: sample.createdAt,
      capabilitySetId: sample.capabilitySetId,
      cameraModel: sample.cameraModel,
    });
    expect(back.filmSimulation).toBe(sample.filmSimulation);
    expect(back.dynamicRange).toBe(sample.dynamicRange);
    expect(back.whiteBalance.shiftR).toBe(sample.whiteBalance.shiftR);
    expect(back.whiteBalance.shiftB).toBe(sample.whiteBalance.shiftB);
    expect(back.highlightTone).toBe(sample.highlightTone);
    expect(back.shadowTone).toBe(sample.shadowTone);
    expect(back.clarity).toBe(sample.clarity);
    expect(back.grainEffect).toEqual(sample.grainEffect);
  });

  it("encodes tone parameters with *10 multiplier (filmkit convention)", () => {
    const props = recipeToProperties({ ...sample, highlightTone: 1.5 });
    expect(props.highlightTone).toBe(15); // *10 encoding
  });

  it("encodes shadowTone -2 as -20", () => {
    const props = recipeToProperties({ ...sample, shadowTone: -2 });
    expect(props.shadowTone).toBe(-20);
  });

  it("round-trips dynamic range auto for camera-imported recipes", () => {
    const props = recipeToProperties({ ...sample, dynamicRange: "DRAuto" });
    const back = propertiesToRecipe(props, {
      id: sample.id,
      schemaVersion: 1,
      name: sample.name,
      tags: [],
      createdAt: sample.createdAt,
      capabilitySetId: sample.capabilitySetId,
      cameraModel: sample.cameraModel,
    });
    expect(back.dynamicRange).toBe("DRAuto");
  });
});
