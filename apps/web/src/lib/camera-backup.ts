import type { RawPreset } from "@latent/camera-connection";
import type { RecipeType } from "@latent/recipe-schema/browser";
import {
  cameraPresetToRecipe,
  canImportCameraPreset,
  type CameraPresetRecipeMetadata,
} from "./camera-preset-to-recipe";

export interface CameraBackupBundle {
  kind: "latent-camera-backup";
  schemaVersion: 1;
  createdAt: string;
  camera: CameraPresetRecipeMetadata;
  slotCount: number;
  slots: CameraBackupSlot[];
}

export interface CameraBackupSlot {
  slot: number;
  name?: string;
  propertyCount: number;
  missing: string[];
  properties: RawPreset["properties"];
  decoded: RawPreset["decoded"] | null;
  recipe: RecipeType | null;
}

export function createCameraBackupBundle(
  presets: RawPreset[],
  metadata: CameraPresetRecipeMetadata,
  createdAt = new Date().toISOString(),
): CameraBackupBundle {
  return {
    kind: "latent-camera-backup",
    schemaVersion: 1,
    createdAt,
    camera: metadata,
    slotCount: presets.length,
    slots: presets.map((preset) => ({
      slot: preset.slot,
      ...(preset.name ? { name: preset.name } : {}),
      propertyCount: Object.keys(preset.properties).length,
      missing: preset.missing ?? [],
      properties: preset.properties,
      decoded: preset.decoded ?? null,
      recipe: canImportCameraPreset(preset).ok
        ? cameraPresetToRecipe(preset, metadata, {
            createdAt,
          })
        : null,
    })),
  };
}

export function cameraBackupFileName(bundle: CameraBackupBundle): string {
  const camera = [bundle.camera.cameraModel, bundle.camera.firmwareVersion]
    .filter(Boolean)
    .join("-fw")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const stamp = bundle.createdAt.replace(/[:.]/g, "-");
  return `latent-camera-backup-${camera || "fujifilm-camera"}-${stamp}.json`;
}

export function downloadCameraBackupBundle(bundle: CameraBackupBundle): void {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = cameraBackupFileName(bundle);
  anchor.click();
  URL.revokeObjectURL(url);
}
