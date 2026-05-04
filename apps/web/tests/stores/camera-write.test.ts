import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraSessionPort, DeviceValue, RawPreset } from "@latent/camera-connection";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useCameraStore } from "../../src/stores/camera";
import {
  PRESET_NAME_PROP,
  recipeToPresetWritePlan,
} from "../../src/lib/recipe-to-camera-preset";

const recipe: RecipeType = {
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Write sample",
  tags: [],
  createdAt: "2026-05-04T10:00:00.000Z",
  capabilitySetId: "latent-defaults-v1",
  cameraModel: "Fujifilm",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR100",
  whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
  highlightTone: 0,
  shadowTone: 0,
  color: 0,
  sharpness: 0,
  noiseReduction: 0,
  clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Off",
  colorChromeEffectBlue: "Off",
  smoothSkinEffect: "Off",
};

describe("camera store recipe writes", () => {
  beforeEach(() => {
    useCameraStore.setState({
      state: { kind: "idle" },
      presets: [],
      writeStatus: { kind: "idle" },
      macosBetaAcknowledged: false,
      macosSetupAcknowledged: false,
      macosPersistentDisableConfigured: false,
      macosWizardOpen: false,
      macosShowAdvanced: false,
    });
  });

  it("reports an error when writing without a connected camera", async () => {
    await useCameraStore.getState().writeRecipeToSlot(recipe, 1);

    expect(useCameraStore.getState().writeStatus).toMatchObject({
      kind: "error",
      slot: 1,
      recipeName: "Write sample",
    });
  });

  it("writes through the connected port and updates cached presets", async () => {
    const port = fakePort(verifiedPreset(recipe, 2));
    useCameraStore.setState({
      state: {
        kind: "connected",
        port,
        cameraModel: "X-M5",
        firmwareVersion: "1.20",
      },
    });

    await useCameraStore.getState().writeRecipeToSlot(recipe, 2);

    expect(port.setDevicePropValue).toHaveBeenCalled();
    expect(useCameraStore.getState().presets[0]?.slot).toBe(2);
    expect(useCameraStore.getState().writeStatus).toMatchObject({
      kind: "success",
      slot: 2,
      recipeName: "Write sample",
    });
  });
});

function fakePort(preset: RawPreset): CameraSessionPort & {
  setDevicePropValue: ReturnType<typeof vi.fn>;
} {
  return {
    getDeviceInfo: vi.fn(),
    getDevicePropValue: vi.fn(async (): Promise<DeviceValue> => ({ kind: "uint16", value: preset.slot })),
    setDevicePropValue: vi.fn(async () => undefined),
    getPreset: vi.fn(async () => preset),
    isOpen: vi.fn(() => true),
  };
}

function verifiedPreset(source: RecipeType, slot: number): RawPreset {
  const plan = recipeToPresetWritePlan(source, slot, emptyPreset(slot));
  const preset = emptyPreset(slot);
  for (const prop of plan.properties) {
    if (prop.code === PRESET_NAME_PROP) {
      preset.name = valueString(prop.value);
      continue;
    }
    preset.properties[`0x${prop.code.toString(16)}`] = {
      id: prop.code,
      name: prop.label,
      value: 0,
      bytes: valueBytes(prop.value),
    };
  }
  return preset;
}

function emptyPreset(slot: number): RawPreset {
  const properties: RawPreset["properties"] = {};
  for (let code = 0xd18e; code <= 0xd1a5; code++) {
    properties[`0x${code.toString(16)}`] = {
      id: code,
      name: `0x${code.toString(16)}`,
      value: 0,
      bytes: [0, 0],
    };
  }
  return { slot, properties, missing: [] };
}

function valueBytes(value: DeviceValue): number[] {
  if (value.kind !== "bytes") throw new Error("expected bytes");
  return Array.from(value.value);
}

function valueString(value: DeviceValue): string {
  const data = valueBytes(value);
  const length = data[0] ?? 0;
  let result = "";
  for (let offset = 1; offset < 1 + (length - 1) * 2; offset += 2) {
    const code = data[offset]! | (data[offset + 1]! << 8);
    if (code !== 0) result += String.fromCharCode(code);
  }
  return result;
}
