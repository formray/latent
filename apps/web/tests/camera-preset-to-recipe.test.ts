import { describe, expect, it } from "vitest";
import type { RawPreset } from "@latent/camera-connection";
import {
  cameraPresetImportKey,
  cameraPresetMatchesRecipe,
  cameraPresetToRecipe,
  canImportCameraPreset,
  recipeCameraImportKey,
} from "../src/lib/camera-preset-to-recipe";

function preset(overrides: Partial<RawPreset> = {}): RawPreset {
  return {
    slot: 2,
    name: "KODAK ULTRAMAX 400",
    properties: {},
    decoded: {
      filmSimulation: { value: 11, label: "Classic Chrome" },
      dynamicRange: { value: -1, label: "DR Auto" },
      whiteBalance: { value: 2, label: "Auto" },
      wbShift: { r: 1, b: -5 },
      highlightTone: 1,
      shadowTone: 1,
      color: 4,
      sharpness: 0,
      noiseReduction: -4,
      clarity: 3,
      grainEffect: { value: 259, label: "Strong Large", strength: "Strong", size: "Large" },
      colorChromeEffect: { value: 1, label: "Weak" },
      colorChromeEffectBlue: { value: 0, label: "Off" },
      smoothSkinEffect: { value: 0, label: "Off" },
    },
    ...overrides,
  };
}

describe("cameraPresetToRecipe", () => {
  it("converts a decoded Fuji custom slot into a schema-valid recipe", () => {
    const recipe = cameraPresetToRecipe(
      preset(),
      { cameraModel: "X-M5", firmwareVersion: "1.20" },
      {
        id: "99999999-9999-4999-8999-999999999999",
        createdAt: "2026-05-04T17:00:00.000Z",
      },
    );

    expect(recipe.name).toBe("KODAK ULTRAMAX 400");
    expect(recipe.cameraModel).toBe("X-M5");
    expect(recipe.capabilitySetId).toBe("x-m5-fw1.20");
    expect(recipe.filmSimulation).toBe("ClassicChrome");
    expect(recipe.dynamicRange).toBe("DRAuto");
    expect(recipe.whiteBalance).toEqual({ mode: "Auto", shiftR: 1, shiftB: -5 });
    expect(recipe.grainEffect).toEqual({ strength: "Strong", size: "Large" });
    expect(recipe.colorChromeEffect).toBe("Weak");
  });

  it("allows import when a non-critical camera property is missing but decoded fields are complete", () => {
    const check = canImportCameraPreset(preset({ missing: ["0xd19c"] }));
    expect(check.ok).toBe(true);
  });

  it("maps Fuji auto white-priority WB value 0x8020 from X-S20 FW 3.30", () => {
    const recipe = cameraPresetToRecipe(
      preset({
        missing: ["0xd19c"],
        decoded: {
          ...preset().decoded!,
          whiteBalance: { value: 0x8020, label: "White Priority" },
        },
      }),
      { cameraModel: "X-S20", firmwareVersion: "3.30" },
      {
        id: "99999999-9999-4999-8999-999999999999",
        createdAt: "2026-05-04T17:00:00.000Z",
      },
    );

    expect(recipe.whiteBalance.mode).toBe("AutoWhitePriority");
  });

  it("uses the same stable import key for a camera preset and its imported recipe", () => {
    const metadata = { cameraModel: "X-M5", firmwareVersion: "1.20" };
    const recipe = cameraPresetToRecipe(
      preset(),
      metadata,
      {
        id: "99999999-9999-4999-8999-999999999999",
        createdAt: "2026-05-04T17:00:00.000Z",
      },
    );

    expect(recipeCameraImportKey(recipe)).toBe(cameraPresetImportKey(preset(), metadata));
  });

  it("detects when an existing import no longer matches the camera slot", () => {
    const metadata = { cameraModel: "X-M5", firmwareVersion: "1.20" };
    const recipe = cameraPresetToRecipe(
      preset(),
      metadata,
      {
        id: "99999999-9999-4999-8999-999999999999",
        createdAt: "2026-05-04T17:00:00.000Z",
      },
    );

    expect(cameraPresetMatchesRecipe(preset(), metadata, recipe)).toBe(true);
    expect(
      cameraPresetMatchesRecipe(
        preset({ decoded: { ...preset().decoded!, color: 3 } }),
        metadata,
        recipe,
      ),
    ).toBe(false);
  });
});
