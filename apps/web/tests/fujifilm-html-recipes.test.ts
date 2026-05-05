import { describe, expect, it } from "vitest";
import { parseFujifilmRecipesHtml } from "../src/lib/fujifilm-html-recipes";
import { parseRecipeImportText } from "../src/lib/recipe-json";

const html = String.raw`<!DOCTYPE html>
<html>
<body>
<script>
const RECIPES = [
  {pack:"Black & White",name:"Cinematic B&W",sim:"ACROS+R Filter",settings:{
    "Film Simulation":"ACROS + R Filter","Dynamic Range":"DR100","D Range Priority":"OFF",
    "White Balance":"4550K","WB Shift":"R:+7  B:-9","Highlight Tone":"+4","Shadow Tone":"+2.5",
    "Sharpness":"-2","Noise Reduction":"-4","Clarity":"-3","Grain Effect":"Weak",
    "Color Chrome Effect":"OFF","Color Chrome FX Blue":"OFF","Lens Modulation Optimizer":"ON"
  }},
  {pack:"Film",name:"Kodak Gold",sim:"Classic Negative",settings:{
    "Film Simulation":"Classic Negative","Grain Effect":"Weak, Small","Color Chrome Effect":"Off",
    "Color Chrome FX Blue":"Weak (IV) or Off (V)","White Balance":"Auto","WB Shift":"R:+3  B:-6",
    "Dynamic Range":"DR400","Highlight Tone":"-0.5 (or -1)","Shadow Tone":"-1.5 (or -1)",
    "Color":"+1","Sharpness":"-1","Noise Reduction":"-4","Clarity":"-2","Exposure Compensation":"+1/3"
  }}
];
</script>
</body>
</html>`;

describe("parseFujifilmRecipesHtml", () => {
  it("extracts Fujifilm recipe objects from the embedded RECIPES array", () => {
    const recipes = parseFujifilmRecipesHtml(html);
    expect(recipes).toHaveLength(2);
    expect(recipes[0]?.name).toBe("Cinematic B&W");
    expect(recipes[0]?.author).toBe("Latent Collective");
    expect(recipes[0]?.filmSimulation).toBe("AcrosR");
    expect(recipes[0]?.whiteBalance).toEqual({
      mode: "ColorTemperature",
      colorTemperatureK: 4550,
      shiftR: 7,
      shiftB: -9,
    });
    expect(recipes[0]?.shadowTone).toBe(2.5);
  });

  it("normalizes ambiguous display strings into schema-safe recipe values", () => {
    const recipe = parseFujifilmRecipesHtml(html)[1]!;
    expect(recipe.filmSimulation).toBe("ClassicNegative");
    expect(recipe.dynamicRange).toBe("DR400");
    expect(recipe.exposureCompensation).toBeCloseTo(1 / 3);
    expect(recipe.highlightTone).toBe(-0.5);
    expect(recipe.grainEffect).toEqual({ strength: "Weak", size: "Small" });
    expect(recipe.colorChromeEffectBlue).toBe("Weak");
  });

  it("preserves D Range Priority for RAF preview metadata", () => {
    expect(parseFujifilmRecipesHtml(html)[0]?.dRangePriority).toBe("Off");
  });

  it("is selected by the generic recipe import parser for HTML files", () => {
    expect(parseRecipeImportText(html)[0]?.tags).toContain("fujifilm-recipes");
  });
});
