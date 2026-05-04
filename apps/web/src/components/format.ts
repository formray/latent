/**
 * Display-formatters for recipe parameters. Pure functions, no React or i18n.
 */

import type {
  RecipeType,
  FilmSimulation,
} from "@latent/recipe-schema/browser";
import type { z } from "zod";

type FilmSim = z.infer<typeof FilmSimulation>;

const FILM_SIM_LABELS: Record<FilmSim, string> = {
  ProviaStandard: "Provia / Standard",
  VelviaVivid: "Velvia / Vivid",
  AstiaSoft: "Astia / Soft",
  ClassicChrome: "Classic Chrome",
  ProNegHi: "Pro Neg Hi",
  ProNegStd: "Pro Neg Std",
  ClassicNegative: "Classic Negative",
  EternaCinema: "Eterna / Cinema",
  EternaBleachBypass: "Eterna Bleach Bypass",
  AcrosStd: "Acros",
  AcrosYe: "Acros Ye",
  AcrosR: "Acros R",
  AcrosG: "Acros G",
  Monochrome: "Monochrome",
  MonochromeYe: "Monochrome Ye",
  MonochromeR: "Monochrome R",
  MonochromeG: "Monochrome G",
  Sepia: "Sepia",
  NostalgicNeg: "Nostalgic Neg",
  RealaAce: "Reala Ace",
};

export function humanFilmSim(sim: FilmSim): string {
  return FILM_SIM_LABELS[sim] ?? sim;
}

export function signedNumber(n: number): string {
  if (n === 0) return "0";
  return n > 0 ? `+${n}` : `${n}`;
}

export function describeWhiteBalance(wb: RecipeType["whiteBalance"]): string {
  if (wb.mode === "ColorTemperature" && typeof wb.colorTemperatureK === "number") {
    return `${wb.colorTemperatureK}K`;
  }
  return wb.mode;
}

export function describeGrain(grain: RecipeType["grainEffect"]): string {
  if (grain.strength === "Off") return "Off";
  return `${grain.strength} · ${grain.size}`;
}

export function formatDate(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
