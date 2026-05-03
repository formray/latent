import type { Recipe } from "../recipe.js";
import { Recipe as RecipeSchema } from "../recipe.js";
import { recipeToCameraProperties, cameraPropertiesToRecipeFields, type CameraProperties } from "./d18e-d1a5.js";

export interface RecipeMetadata {
  id: string;
  schemaVersion: 1;
  name: string;
  tags: string[];
  createdAt: string;
  capabilitySetId: string;
  cameraModel: string;
}

export function recipeToProperties(r: Recipe): CameraProperties {
  return recipeToCameraProperties(r);
}

export function propertiesToRecipe(p: CameraProperties, meta: RecipeMetadata): Recipe {
  const fields = cameraPropertiesToRecipeFields(p);
  return RecipeSchema.parse({ ...meta, ...fields });
}

export type { CameraProperties };
