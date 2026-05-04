/**
 * Browser-safe entry point — exports schemas, types, and the diff helpers
 * but excludes the capability loader (which depends on `node:fs/promises`).
 *
 * Web bundlers should import from `@filmfork/recipe-schema/browser` to keep
 * Node-only modules out of the client bundle.
 */

export { Recipe, FilmSimulation, TriState } from "./recipe.js";
export type { Recipe as RecipeType } from "./recipe.js";

export { TasteProfile, ShootingContext } from "./taste-profile.js";
export type { TasteProfile as TasteProfileType } from "./taste-profile.js";

export { diffRecipes } from "./diff/index.js";
export type { RecipeDiff, RecipeDiffEntry, Locale } from "./diff/index.js";
