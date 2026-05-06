import { describe, expect, it } from "vitest";
import type { RecipeType } from "@latent/recipe-schema/browser";
import {
  decodeRecipeShare,
  decodeRecipeShareFromLocation,
  encodeRecipeShare,
  recipeForUrlShare,
  recipeShareUrl,
} from "../src/lib/recipe-share";

const recipe: RecipeType = {
  id: "77777777-7777-4777-8777-777777777777",
  schemaVersion: 1,
  name: "Shared Chrome",
  description: "A recipe with share-safe metadata.",
  author: "Latent",
  parentRecipeId: "66666666-6666-4666-8666-666666666666",
  tags: ["shared", "chrome"],
  createdAt: "2026-05-06T08:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicChrome",
  exposureCompensation: 0,
  dynamicRange: "DR400",
  dRangePriority: "Off",
  whiteBalance: { mode: "Daylight", shiftR: 2, shiftB: -3 },
  highlightTone: -1,
  shadowTone: 1,
  color: 2,
  sharpness: -1,
  noiseReduction: -4,
  clarity: 0,
  grainEffect: { strength: "Weak", size: "Small" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Strong",
  smoothSkinEffect: "Off",
  reasoning: [
    {
      parameter: "Tone",
      visualEffect: "Adds contrast.",
      reason: "Private reasoning should not be embedded in share URLs.",
    },
  ],
};

describe("recipe URL share", () => {
  it("builds share-safe recipes without structured reasoning", () => {
    const shareable = recipeForUrlShare(recipe);

    expect(shareable.id).toBe(recipe.id);
    expect(shareable.parentRecipeId).toBe(recipe.parentRecipeId);
    expect(shareable.reasoning).toBeUndefined();
  });

  it("round-trips a recipe through the URL payload", () => {
    const encoded = encodeRecipeShare(recipe);
    const decoded = decodeRecipeShare(encoded);

    expect(decoded.id).toBe(recipe.id);
    expect(decoded.name).toBe(recipe.name);
    expect(decoded.parentRecipeId).toBe(recipe.parentRecipeId);
    expect(decoded.reasoning).toBeUndefined();
  });

  it("creates a library URL and decodes it from the location search params", () => {
    const url = recipeShareUrl(recipe, "https://latent.example/app?theme=dark#raf");
    const location = new URL(url);

    expect(location.hash).toBe("#library");
    expect(location.searchParams.get("theme")).toBe("dark");
    expect(location.searchParams.get("share")).toBeTruthy();
    expect(decodeRecipeShareFromLocation(location)?.id).toBe(recipe.id);
  });
});
