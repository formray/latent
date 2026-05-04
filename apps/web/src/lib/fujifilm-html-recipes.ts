import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";

interface SourceRecipe {
  pack: string;
  name: string;
  sim: string;
  settings: Record<string, string>;
}

export function parseFujifilmRecipesHtml(html: string): RecipeType[] {
  const source = extractRecipesArray(html);
  const recipes = parseSourceRecipes(source);
  return recipes.map((recipe, index) => sourceRecipeToRecipe(recipe, index));
}

function extractRecipesArray(html: string): string {
  const startToken = "const RECIPES = [";
  const start = html.indexOf(startToken);
  if (start === -1) throw new Error("No Fujifilm RECIPES array found");
  const arrayStart = start + "const RECIPES = ".length;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let index = arrayStart; index < html.length; index++) {
    const char = html[index]!;
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[") depth++;
    if (char === "]") {
      depth--;
      if (depth === 0) return html.slice(arrayStart, index + 1);
    }
  }
  throw new Error("Unterminated Fujifilm RECIPES array");
}

function parseSourceRecipes(source: string): SourceRecipe[] {
  const entries: SourceRecipe[] = [];
  const entryRe =
    /\{\s*pack:"([^"]+)",name:"([^"]+)",sim:"([^"]+)",settings:\{([\s\S]*?)\}\s*\}/g;
  for (const match of source.matchAll(entryRe)) {
    entries.push({
      pack: match[1]!,
      name: match[2]!,
      sim: match[3]!,
      settings: parseSettings(match[4]!),
    });
  }
  if (entries.length === 0) throw new Error("No Fujifilm recipes found");
  return entries;
}

function parseSettings(source: string): Record<string, string> {
  const settings: Record<string, string> = {};
  const settingRe = /"([^"]+)":"([^"]*)"/g;
  for (const match of source.matchAll(settingRe)) {
    settings[match[1]!] = match[2]!;
  }
  return settings;
}

function sourceRecipeToRecipe(source: SourceRecipe, index: number): RecipeType {
  const settings = source.settings;
  const whiteBalance = parseWhiteBalance(settings["White Balance"], settings["WB Shift"]);
  const recipe = {
    id: stableUuid(`${source.pack}:${source.name}:${index}`),
    schemaVersion: 1,
    name: source.name,
    description: `Imported from Fujifilm Recipes HTML pack "${source.pack}".`,
    author: "Casey Herzawg",
    tags: [
      "fujifilm-recipes",
      slug(source.pack),
      slug(source.sim),
    ].filter(Boolean),
    createdAt: "2026-05-04T00:00:00.000Z",
    capabilitySetId: "fujifilm-recipes-html",
    cameraModel: "Fujifilm",
    filmSimulation: parseFilmSimulation(settings["Film Simulation"] ?? source.sim),
    dynamicRange: parseDynamicRange(settings["Dynamic Range"]),
    whiteBalance,
    highlightTone: parseSignedNumber(settings["Highlight Tone"], 0),
    shadowTone: parseSignedNumber(settings["Shadow Tone"], 0),
    color: parseSignedInteger(settings.Color, 0),
    sharpness: parseSignedInteger(settings.Sharpness, 0),
    noiseReduction: parseSignedInteger(settings["Noise Reduction"], 0),
    clarity: parseSignedInteger(settings.Clarity, 0),
    grainEffect: parseGrain(settings["Grain Effect"]),
    colorChromeEffect: parseTriState(settings["Color Chrome Effect"], "Off"),
    colorChromeEffectBlue: parseTriState(
      settings["Color Chrome FX Blue"] ?? settings["Color Chrome Blue"],
      "Off",
    ),
    smoothSkinEffect: "Off",
  };
  return Recipe.parse(recipe);
}

function parseFilmSimulation(value: string): RecipeType["filmSimulation"] {
  const normalized = value.toLowerCase().replaceAll(".", "").replaceAll("-", " ");
  if (normalized.includes("classic chrome")) return "ClassicChrome";
  if (normalized.includes("classic negative")) return "ClassicNegative";
  if (normalized.includes("eterna bleach")) return "EternaBleachBypass";
  if (normalized.includes("eterna")) return "EternaCinema";
  if (normalized.includes("velvia") || normalized.includes("vivid")) return "VelviaVivid";
  if (normalized.includes("provia") || normalized.includes("standard")) return "ProviaStandard";
  if (normalized.includes("pro neg hi")) return "ProNegHi";
  if (normalized.includes("pro neg std")) return "ProNegStd";
  if (normalized.includes("acros") && normalized.includes("yellow")) return "AcrosYe";
  if (normalized.includes("acros") && normalized.includes("red")) return "AcrosR";
  if (normalized.includes("acros") && normalized.includes("green")) return "AcrosG";
  if (normalized.includes("acros") && /\br\b/.test(normalized)) return "AcrosR";
  if (normalized.includes("acros")) return "AcrosStd";
  if (normalized.includes("monochrome") && normalized.includes("yellow")) return "MonochromeYe";
  if (normalized.includes("monochrome") && normalized.includes("red")) return "MonochromeR";
  if (normalized.includes("monochrome") && normalized.includes("green")) return "MonochromeG";
  if (normalized.includes("monochrome")) return "Monochrome";
  if (normalized.includes("sepia")) return "Sepia";
  throw new Error(`Unsupported film simulation: ${value}`);
}

function parseDynamicRange(value: string | undefined): RecipeType["dynamicRange"] {
  const normalized = value?.toUpperCase() ?? "";
  if (normalized.includes("AUTO")) return "DRAuto";
  if (normalized.includes("400")) return "DR400";
  if (normalized.includes("200")) return "DR200";
  return "DR100";
}

function parseWhiteBalance(
  modeValue: string | undefined,
  shiftValue: string | undefined,
): RecipeType["whiteBalance"] {
  const mode = modeValue ?? "Auto";
  const shift = parseWhiteBalanceShift(shiftValue);
  const kelvin = parseKelvin(mode);
  if (kelvin !== null) {
    return {
      mode: "ColorTemperature",
      colorTemperatureK: kelvin,
      shiftR: shift.r,
      shiftB: shift.b,
    };
  }
  const normalized = mode.toLowerCase();
  if (normalized.includes("daylight")) return { mode: "Daylight", shiftR: shift.r, shiftB: shift.b };
  if (normalized.includes("shade")) return { mode: "Shade", shiftR: shift.r, shiftB: shift.b };
  if (normalized.includes("incandescent")) {
    return { mode: "Incandescent", shiftR: shift.r, shiftB: shift.b };
  }
  if (normalized.includes("underwater")) return { mode: "Underwater", shiftR: shift.r, shiftB: shift.b };
  return { mode: "Auto", shiftR: shift.r, shiftB: shift.b };
}

function parseKelvin(value: string): number | null {
  const match = value.match(/(?:K\s*)?(\d{4,5})\s*K?/i);
  if (!match) return null;
  const kelvin = Number(match[1]);
  if (!Number.isFinite(kelvin)) return null;
  return Math.max(2500, Math.min(10000, kelvin));
}

function parseWhiteBalanceShift(value: string | undefined): { r: number; b: number } {
  const r = value?.match(/R:\s*([+-]?\d+)/i)?.[1];
  const b = value?.match(/B:\s*([+-]?\d+)/i)?.[1];
  return {
    r: clampInt(Number(r ?? 0), -9, 9),
    b: clampInt(Number(b ?? 0), -9, 9),
  };
}

function parseSignedNumber(value: string | undefined, fallback: number): number {
  const match = value?.match(/[+-]?\d+(?:\.\d+)?/);
  if (!match) return fallback;
  return Number(match[0]);
}

function parseSignedInteger(value: string | undefined, fallback: number): number {
  return Math.round(parseSignedNumber(value, fallback));
}

function parseGrain(value: string | undefined): RecipeType["grainEffect"] {
  const normalized = value?.toLowerCase() ?? "";
  const strength = normalized.includes("strong")
    ? "Strong"
    : normalized.includes("weak")
      ? "Weak"
      : "Off";
  const size = normalized.includes("large") ? "Large" : "Small";
  return { strength, size };
}

function parseTriState(value: string | undefined, fallback: "Off" | "Weak" | "Strong"): "Off" | "Weak" | "Strong" {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("strong")) return "Strong";
  if (normalized.includes("weak")) return "Weak";
  if (normalized.includes("off") || normalized.includes("none")) return "Off";
  return fallback;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function stableUuid(input: string): string {
  const hex = cyrb128(input).map((part) => part.toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < input.length; index++) {
    const k = input.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
