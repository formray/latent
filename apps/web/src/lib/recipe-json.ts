import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";
import { z } from "zod";

const RecipeJsonFile = z.union([Recipe, z.array(Recipe)]);

export function serializeRecipeJson(recipe: RecipeType): string {
  return `${JSON.stringify(recipe, null, 2)}\n`;
}

export function parseRecipeJson(raw: string): RecipeType[] {
  const parsed = RecipeJsonFile.parse(JSON.parse(raw));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function downloadRecipeJson(recipe: RecipeType): void {
  const blob = new Blob([serializeRecipeJson(recipe)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(recipe.name)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "latent-recipe";
}
