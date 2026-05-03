import { describe, expect, it } from "vitest";
import { Recipe } from "../src/recipe";
import { recipeToProperties, propertiesToRecipe } from "../src/translate";

describe("AutoAmbiencePriority ↔ AmbiencePriority codec (NL1 R3)", () => {
  it("schema name AutoAmbiencePriority round-trips through camera property as AmbiencePriority", () => {
    const r = Recipe.parse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      schemaVersion: 1,
      name: "WB Ambience",
      tags: [],
      createdAt: "2026-05-04T10:00:00Z",
      capabilitySetId: "x-s20-fw1.10",
      cameraModel: "X-S20",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DR100",
      whiteBalance: { mode: "AutoAmbiencePriority", shiftR: 0, shiftB: 0 },
      highlightTone: 0, shadowTone: 0, color: 0, sharpness: 0,
      noiseReduction: 0, clarity: 0,
      grainEffect: { strength: "Off", size: "Small" },
      colorChromeEffect: "Off", colorChromeEffectBlue: "Off",
    });

    const props = recipeToProperties(r);
    expect(props.wbMode).toBe("AutoAmbiencePriority"); // schema-side name preserved at translator boundary

    const back = propertiesToRecipe(props, {
      id: r.id, schemaVersion: 1, name: r.name, tags: [],
      createdAt: r.createdAt,
      capabilitySetId: r.capabilitySetId, cameraModel: r.cameraModel,
    });
    expect(back.whiteBalance.mode).toBe("AutoAmbiencePriority");
  });
});
