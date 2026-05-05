import { describe, expect, it } from "vitest";
import { Recipe } from "@latent/recipe-schema/browser";
import { createRecipeFromCreatorInput, presetInput } from "../src/lib/recipe-creator";

describe("recipe creator", () => {
  it("creates a schema-valid recipe from a preset input", () => {
    const recipe = createRecipeFromCreatorInput(presetInput("warm-city"), {
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-05-05T10:00:00.000Z",
    });

    expect(() => Recipe.parse(recipe)).not.toThrow();
    expect(recipe.tags).toContain("latent-created");
    expect(recipe.tags).toContain("warm-city");
    expect(recipe.whiteBalance.mode).toBe("Daylight");
    expect(recipe.whiteBalance.shiftR).toBeGreaterThan(0);
    expect(recipe.whiteBalance.shiftB).toBeLessThan(0);
    expect(recipe.reasoning?.some((entry) => entry.parameter === "White Balance Shift")).toBe(true);
  });

  it("uses monochrome-safe values when a monochrome simulation is selected", () => {
    const recipe = createRecipeFromCreatorInput(
      {
        ...presetInput("muted-street"),
        name: "Street Acros",
        filmSimulation: "AcrosR",
        monochromaticWarmCool: 4,
        grainStrength: "Strong",
        grainSize: "Large",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        createdAt: "2026-05-05T10:00:00.000Z",
      },
    );

    expect(recipe.filmSimulation).toBe("AcrosR");
    expect(recipe.color).toBe(0);
    expect(recipe.colorChromeEffect).toBe("Off");
    expect(recipe.monochromaticColor?.warmCool).toBe(4);
    expect(recipe.grainEffect).toEqual({ strength: "Strong", size: "Large" });
  });
});
