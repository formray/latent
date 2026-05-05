import type { ConnectionState } from "@latent/camera-connection";
import type { RecipeType } from "@latent/recipe-schema/browser";

export interface CameraSlotBackup {
  slot: number;
  recipe: RecipeType;
}

export function findCameraSlotBackups(
  recipes: RecipeType[],
  state: ConnectionState,
): CameraSlotBackup[] {
  const cameraModel =
    state.kind === "connected" || state.kind === "degraded" ? state.cameraModel : null;

  return [1, 2, 3, 4].flatMap((slot) => {
    const backup = recipes.find((recipe) => isCameraSlotBackup(recipe, slot, cameraModel));
    return backup ? [{ slot, recipe: backup }] : [];
  });
}

export function isCameraSlotBackup(
  recipe: RecipeType,
  slot: number,
  cameraModel: string | null,
): boolean {
  if (recipe.author !== "Camera import") return false;
  if (!recipe.tags.includes("camera-import")) return false;
  if (!recipe.tags.some((tag) => tag.toLowerCase() === `c${slot}`)) return false;
  return !cameraModel || recipe.cameraModel === cameraModel;
}
