/**
 * Display-formatters for recipe parameters. Pure functions, no React or i18n.
 */

import type { RecipeType, FilmSimulation } from "@latent/recipe-schema/browser";
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

export function formatExposureCompensation(value: number): string {
  const rounded = Math.round(value * 3) / 3;
  if (rounded === 0) return "0 EV";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} EV`;
}

export function describeDynamicRange(value: RecipeType["dynamicRange"]): string {
  if (value === "DRAuto") return "DR Auto";
  if (value === "DR100") return "DR 100%";
  if (value === "DR200") return "DR 200%";
  return "DR 400%";
}

export function describeDRangePriority(value: RecipeType["dRangePriority"]): string {
  return value ?? "Off";
}

export function describeWhiteBalance(wb: RecipeType["whiteBalance"]): string {
  if (wb.mode === "ColorTemperature" && typeof wb.colorTemperatureK === "number") {
    return `${wb.colorTemperatureK}K`;
  }
  if (wb.mode === "ColorTemperature") return "Color Temperature";
  if (wb.mode === "AutoWhitePriority") return "White Priority";
  if (wb.mode === "AutoAmbiencePriority") return "Ambience Priority";
  if (wb.mode === "Fluorescent1") return "Fluorescent 1";
  if (wb.mode === "Fluorescent2") return "Fluorescent 2";
  if (wb.mode === "Fluorescent3") return "Fluorescent 3";
  return wb.mode;
}

export function describeGrain(grain: RecipeType["grainEffect"]): string {
  if (grain.strength === "Off") return "Off";
  return `${grain.strength} ${grain.size}`;
}

export function describeWhiteBalanceShift(wb: RecipeType["whiteBalance"]): string {
  return `R ${signedNumber(wb.shiftR)} · B ${signedNumber(wb.shiftB)}`;
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
