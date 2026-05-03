import type { Recipe } from "../recipe.js";
import { rulesEn, fallbackPhraseEn, type DeltaRule } from "./rules-en.js";
import { rulesIt, fallbackPhraseIt } from "./rules-it.js";

export type Locale = "en" | "it";

export interface RecipeDiffEntry {
  parameter: string;
  before: unknown;
  after: unknown;
  delta?: number;
  visualImpact: string;
  ruleKey: string;
}

export interface RecipeDiff {
  changedCount: number;
  unchangedCount: number;
  entries: RecipeDiffEntry[];
  summary: string;
}

const flatPaths: Array<{ path: string; get: (r: Recipe) => unknown }> = [
  { path: "filmSimulation", get: r => r.filmSimulation },
  { path: "dynamicRange", get: r => r.dynamicRange },
  { path: "whiteBalance.shiftR", get: r => r.whiteBalance.shiftR },
  { path: "whiteBalance.shiftB", get: r => r.whiteBalance.shiftB },
  { path: "highlightTone", get: r => r.highlightTone },
  { path: "shadowTone", get: r => r.shadowTone },
  { path: "color", get: r => r.color },
  { path: "sharpness", get: r => r.sharpness },
  { path: "noiseReduction", get: r => r.noiseReduction },
  { path: "clarity", get: r => r.clarity },
  { path: "grainEffect.strength", get: r => r.grainEffect.strength },
  { path: "grainEffect.size", get: r => r.grainEffect.size },
  { path: "colorChromeEffect", get: r => r.colorChromeEffect },
  { path: "colorChromeEffectBlue", get: r => r.colorChromeEffectBlue },
];

function applyRule(rule: DeltaRule, before: unknown, after: unknown, delta: number | undefined): boolean {
  if (rule.kind === "numericRange" && delta !== undefined) {
    return delta >= rule.min && delta <= rule.max;
  }
  if (rule.kind === "enumChange") {
    return before === rule.from && after === rule.to;
  }
  return false;
}

export function diffRecipes(a: Recipe, b: Recipe, locale: Locale): RecipeDiff {
  if (a.capabilitySetId !== b.capabilitySetId) {
    return {
      changedCount: 0,
      unchangedCount: 0,
      entries: [],
      summary: locale === "it"
        ? `Set di capacità incompatibili (${a.capabilitySetId} vs ${b.capabilitySetId})`
        : `Incompatible capability sets (${a.capabilitySetId} vs ${b.capabilitySetId})`,
    };
  }

  const rules = locale === "it" ? rulesIt : rulesEn;
  const fallback = locale === "it" ? fallbackPhraseIt : fallbackPhraseEn;
  const entries: RecipeDiffEntry[] = [];
  let changed = 0;
  let unchanged = 0;

  for (const { path, get } of flatPaths) {
    const before = get(a);
    const after = get(b);
    if (before === after) {
      unchanged++;
      continue;
    }
    const delta = (typeof before === "number" && typeof after === "number") ? after - before : undefined;
    const candidates = rules[path] ?? [];
    let matched: DeltaRule | undefined;
    for (const rule of candidates) {
      if (applyRule(rule, before, after, delta)) {
        matched = rule;
        break;
      }
    }
    const entry: RecipeDiffEntry = {
      parameter: path,
      before,
      after,
      visualImpact: matched ? matched.phrase : fallback(path, before, after),
      ruleKey: matched ? matched.ruleKey : "fallback",
    };
    if (delta !== undefined) {
      entry.delta = delta;
    }
    entries.push(entry);
    changed++;
  }

  const summary = locale === "it"
    ? `${changed} parametri cambiati: ${entries.map(e => e.visualImpact).slice(0, 3).join("; ")}${entries.length > 3 ? "..." : ""}`
    : `${changed} parameters changed: ${entries.map(e => e.visualImpact).slice(0, 3).join("; ")}${entries.length > 3 ? "..." : ""}`;

  return { changedCount: changed, unchangedCount: unchanged, entries, summary };
}
