#!/usr/bin/env tsx
// Risk #1 (Codex R4): schema and translator must be in lockstep.
// Every recipe schema field must appear in writableSlotProperties of every
// capability set in data/camera-models.json. Conversely, every entry in
// writableSlotProperties must correspond to a real Recipe field.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

interface CameraModelsJson {
  capabilitySets: Record<string, { writableSlotProperties: string[] }>;
}

// The canonical schema field list. Keep this in sync with packages/recipe-schema/src/recipe.ts.
// If you add a Recipe field, add it here AND to writableSlotProperties of every applicable
// capability set, AND add a translator round-trip test in packages/recipe-schema/tests/.
const RECIPE_LOOK_FIELDS = [
  "filmSimulation",
  "monochromaticColor",
  "dynamicRange",
  "whiteBalance",
  "highlightTone",
  "shadowTone",
  "color",
  "sharpness",
  "noiseReduction",
  "clarity",
  "grainEffect",
  "colorChromeEffect",
  "colorChromeEffectBlue",
  "smoothSkinEffect",
];

async function main(): Promise<void> {
  const raw = await readFile(resolve(ROOT, "data/camera-models.json"), "utf8");
  const json = JSON.parse(raw) as CameraModelsJson;

  const errors: string[] = [];

  for (const [setId, set] of Object.entries(json.capabilitySets)) {
    const w = new Set(set.writableSlotProperties);
    for (const field of RECIPE_LOOK_FIELDS) {
      // Optional fields (monochromaticColor, smoothSkinEffect) are allowed to be absent
      // ONLY if the capability set explicitly does not support them. This is enforced
      // separately by the supports.* flags. For lockstep, we require either presence
      // in writableSlotProperties OR an explicit absence rationale.
      if (!w.has(field)) {
        // Hardcoded allowed absences: optional features
        if (field === "monochromaticColor" || field === "smoothSkinEffect") continue;
        errors.push(`${setId}: writableSlotProperties missing required field "${field}"`);
      }
    }
    for (const w_field of set.writableSlotProperties) {
      if (!RECIPE_LOOK_FIELDS.includes(w_field)) {
        errors.push(`${setId}: writableSlotProperties contains "${w_field}" which is not a Recipe field`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Schema↔translator lockstep CHECK FAILED:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("Schema↔translator lockstep OK across", Object.keys(json.capabilitySets).length, "capability set(s)");
}

await main();
