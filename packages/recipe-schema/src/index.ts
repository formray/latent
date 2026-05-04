export const PACKAGE_NAME = "@latent/recipe-schema";

export { Recipe, FilmSimulation, TriState } from "./recipe.js";
export type { Recipe as RecipeType } from "./recipe.js";

export { TasteProfile, ShootingContext } from "./taste-profile.js";
export type { TasteProfile as TasteProfileType } from "./taste-profile.js";

export { loadCapabilityMatrix, getCapabilitySet, CapabilityMatrix, CapabilitySet } from "./capability.js";

export { diffRecipes } from "./diff/index.js";
export type { RecipeDiff, RecipeDiffEntry, Locale } from "./diff/index.js";
