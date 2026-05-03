import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";

describe("Recipe.reasoning structured fields (R5)", () => {
  const baseRecipe = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    schemaVersion: 1,
    name: "AI",
    tags: [],
    createdAt: "2026-05-04T10:00:00Z",
    capabilitySetId: "x-s20-fw1.10",
    cameraModel: "X-S20",
    filmSimulation: "ClassicChrome",
    dynamicRange: "DR100",
    whiteBalance: { mode: "Auto" as const, shiftR: 0, shiftB: 0 },
    highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
    noiseReduction: 0, clarity: 0,
    grainEffect: { strength: "Off" as const, size: "Small" as const },
    colorChromeEffect: "Off" as const, colorChromeEffectBlue: "Off" as const,
  };

  it("accepts reasoning entries with visualEffect/reason/risk/confidence", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "lifts shadows; opens detail in dark areas",
        reason: "user asked for less crushed blacks",
        risk: "noise becomes visible above ISO 3200",
        confidence: "medium",
      }],
    };
    expect(() => Recipe.parse(r)).not.toThrow();
  });

  it("rejects visualEffect over 200 chars", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "x".repeat(201),
        reason: "ok",
      }],
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("rejects reason over 300 chars", () => {
    const r = {
      ...baseRecipe,
      reasoning: [{
        parameter: "shadowTone",
        visualEffect: "ok",
        reason: "x".repeat(301),
      }],
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("rejects more than 40 reasoning entries", () => {
    const r = {
      ...baseRecipe,
      reasoning: Array.from({ length: 41 }, () => ({
        parameter: "p", visualEffect: "v", reason: "r",
      })),
    };
    expect(() => Recipe.parse(r)).toThrow();
  });

  it("treats reasoning as optional (recipes without it parse fine)", () => {
    expect(() => Recipe.parse(baseRecipe)).not.toThrow();
  });
});
