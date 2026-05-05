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

  it("accepts dynamic range auto from camera-imported custom slots", () => {
    const imported = {
      id: "770e8400-e29b-41d4-a716-446655440002",
      schemaVersion: 1,
      name: "Imported DR Auto",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-m5-fw1.20",
      cameraModel: "X-M5",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DRAuto",
      whiteBalance: { mode: "Auto", shiftR: 1, shiftB: -5 },
      highlightTone: 1,
      shadowTone: 1,
      color: 4,
      sharpness: 0,
      noiseReduction: -4,
      clarity: 3,
      grainEffect: { strength: "Strong", size: "Large" },
      colorChromeEffect: "Weak",
      colorChromeEffectBlue: "Off",
    };
    expect(() => Recipe.parse(imported)).not.toThrow();
  });

  it("accepts preview-only exposure and D Range Priority fields", () => {
    const preview = {
      id: "880e8400-e29b-41d4-a716-446655440003",
      schemaVersion: 1,
      name: "Preview Controls",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      exposureCompensation: -1 / 3,
      dynamicRange: "DR400",
      dRangePriority: "Strong",
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
    expect(Recipe.parse(preview)).toMatchObject({
      exposureCompensation: -1 / 3,
      dRangePriority: "Strong",
    });
  });
});
