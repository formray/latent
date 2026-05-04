// packages/recipe-schema/src/taste-profile.ts
import { z } from "zod";
import { FilmSimulation } from "./recipe.js";

export const ShootingContext = z.enum([
  "portraits", "travel", "street", "landscape", "night",
  "documentary", "wedding", "studio",
]);

export const TasteProfile = z.object({
  schemaVersion: z.literal(1),
  enabled: z.boolean().default(false),                  // opt-in gate
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastTouchedAt: z.string().datetime(),                 // for 90-day TTL

  // structured preferences (all optional)
  tonePreference: z.enum(["warm", "neutral", "cool"]).optional(),
  grainTolerance: z.enum(["none", "low", "medium", "high"]).optional(),
  contrastPreference: z.enum(["soft", "balanced", "punchy"]).optional(),
  preferredFilmSimulations: z.array(FilmSimulation).max(10).default([]),
  avoidedFilmSimulations: z.array(FilmSimulation).max(10).default([]),
  shootingContexts: z.array(ShootingContext).max(8).default([]),

  // free-form notes (capped, sanitized before injection into AI prompt)
  notes: z.string().max(500).optional(),
});

export type TasteProfile = z.infer<typeof TasteProfile>;
