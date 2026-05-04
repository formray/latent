import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";

describe("Recipe identity & provenance", () => {
  it("accepts a minimal valid recipe with required identity fields", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "Classic Chrome Test",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
      highlightTone: 0,
      shadowTone: 0,
      color: 0,
      sharpness: 0,
      noiseReduction: 0,
      clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off",
      colorChromeEffectBlue: "Off",
    };
    expect(() => Recipe.parse(minimal)).not.toThrow();
  });

  it("rejects a recipe with no name", () => {
    const bad = { id: "550e8400-e29b-41d4-a716-446655440000", schemaVersion: 1, name: "" };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("rejects a recipe with name longer than 80 chars", () => {
    const bad = { name: "x".repeat(81) };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("rejects a recipe with schemaVersion != 1", () => {
    const bad = { schemaVersion: 2 };
    expect(() => Recipe.parse(bad)).toThrow();
  });

  it("accepts optional parentRecipeId for fork tree", () => {
    const minimal = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "Forked",
      parentRecipeId: "660e8400-e29b-41d4-a716-446655440001",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
      highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
      noiseReduction: 0, clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off", colorChromeEffectBlue: "Off",
    };
    expect(() => Recipe.parse(minimal)).not.toThrow();
  });
});
