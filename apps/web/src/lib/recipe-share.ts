import { Recipe, type RecipeType } from "@latent/recipe-schema/browser";

export const RECIPE_SHARE_PARAM = "share";

interface RecipeSharePayload {
  v: 1;
  recipe: RecipeType;
}

export function recipeForUrlShare(recipe: RecipeType): RecipeType {
  const shareable = { ...recipe };
  delete shareable.reasoning;
  return Recipe.parse(shareable);
}

export function encodeRecipeShare(recipe: RecipeType): string {
  return encodeBase64Url(
    JSON.stringify({
      v: 1,
      recipe: recipeForUrlShare(recipe),
    } satisfies RecipeSharePayload),
  );
}

export function decodeRecipeShare(value: string): RecipeType {
  const parsed: unknown = JSON.parse(decodeBase64Url(value));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid recipe share payload");
  }
  const payload = parsed as Partial<RecipeSharePayload>;
  if (payload.v !== 1) throw new Error("Unsupported recipe share version");
  return Recipe.parse(payload.recipe);
}

export function recipeShareUrl(recipe: RecipeType, baseHref = window.location.href): string {
  const url = new URL(baseHref);
  url.searchParams.set(RECIPE_SHARE_PARAM, encodeRecipeShare(recipe));
  url.hash = "library";
  return url.toString();
}

export function decodeRecipeShareFromLocation(
  location: Pick<Location, "search">,
): RecipeType | null {
  const value = new URLSearchParams(location.search).get(RECIPE_SHARE_PARAM);
  if (!value) return null;
  return decodeRecipeShare(value);
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
