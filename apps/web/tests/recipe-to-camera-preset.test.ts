import { describe, expect, it, vi } from "vitest";
import type { CameraSessionPort, DeviceValue, RawPreset } from "@latent/camera-connection";
import type { RecipeType } from "@latent/recipe-schema/browser";
import {
  cameraPresetName,
  PRESET_NAME_PROP,
  PRESET_SLOT_PROP,
  recipeToPresetWritePlan,
  writeRecipeToCameraSlot,
} from "../src/lib/recipe-to-camera-preset";

const sampleRecipe = (overrides: Partial<RecipeType> = {}): RecipeType => ({
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Camera write sample",
  author: "Latent",
  tags: [],
  createdAt: "2026-05-04T10:00:00.000Z",
  capabilitySetId: "latent-defaults-v1",
  cameraModel: "Fujifilm",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DRAuto",
  whiteBalance: { mode: "Auto", shiftR: 1, shiftB: -5 },
  highlightTone: 1,
  shadowTone: 1,
  color: 4,
  sharpness: 0,
  noiseReduction: -4,
  clarity: 3,
  grainEffect: { strength: "Strong", size: "Large" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Off",
  smoothSkinEffect: "Off",
  ...overrides,
});

function preset(slot = 2): RawPreset {
  const properties: RawPreset["properties"] = {};
  for (let code = 0xd18e; code <= 0xd1a5; code++) {
    properties[`0x${code.toString(16)}`] = {
      id: code,
      name: `0x${code.toString(16)}`,
      value: 0,
      bytes: [0, 0],
    };
  }
  return { slot, name: `C${slot}`, properties, missing: [] };
}

function fakePort(verifiedPreset = preset()): CameraSessionPort & {
  setDevicePropValue: ReturnType<typeof vi.fn>;
} {
  return {
    getDeviceInfo: vi.fn(),
    getDevicePropValue: vi.fn(async (code: number) =>
      code === PRESET_SLOT_PROP
        ? ({ kind: "uint16", value: verifiedPreset.slot } satisfies DeviceValue)
        : ({ kind: "uint16", value: 0 } satisfies DeviceValue),
    ),
    setDevicePropValue: vi.fn(async () => undefined),
    getPreset: vi.fn(async () => verifiedPreset),
    isOpen: vi.fn(() => true),
  };
}

function bytes(value: DeviceValue): number[] {
  expect(value.kind).toBe("bytes");
  return Array.from(value.value as Uint8Array);
}

describe("recipeToPresetWritePlan", () => {
  it("encodes recipe fields to D18E-D1A5 preset property bytes", () => {
    const plan = recipeToPresetWritePlan(sampleRecipe(), 2);
    const prop = (code: number) => plan.properties.find((item) => item.code === code);

    expect(ptpString(prop(PRESET_NAME_PROP)!.value)).toBe("Camera write sample");
    expect(bytes(prop(0xd190)!.value)).toEqual([0xff, 0xff]);
    expect(bytes(prop(0xd192)!.value)).toEqual([0x0b, 0x00]);
    expect(bytes(prop(0xd195)!.value)).toEqual([0x05, 0x00]);
    expect(bytes(prop(0xd196)!.value)).toEqual([0x02, 0x00]);
    expect(bytes(prop(0xd197)!.value)).toEqual([0x01, 0x00]);
    expect(bytes(prop(0xd19a)!.value)).toEqual([0x01, 0x00]);
    expect(bytes(prop(0xd19b)!.value)).toEqual([0xfb, 0xff]);
    expect(bytes(prop(0xd19f)!.value)).toEqual([0x28, 0x00]);
    expect(bytes(prop(0xd1a1)!.value)).toEqual([0x00, 0x80]);
    expect(bytes(prop(0xd1a2)!.value)).toEqual([0x1e, 0x00]);
  });

  it("preserves base bytes for non-recipe structural properties", () => {
    const base = preset();
    base.properties["0xd18e"] = { id: 0xd18e, name: "size", value: 7, bytes: [7, 0] };

    const plan = recipeToPresetWritePlan(sampleRecipe(), 2, base);

    expect(bytes(plan.properties.find((item) => item.code === 0xd18e)!.value)).toEqual([7, 0]);
  });

  it("skips Smooth Skin Effect when the camera slot does not expose D198 and the recipe leaves it Off", () => {
    const base = preset();
    delete base.properties["0xd198"];
    base.missing = ["0xd198"];

    const plan = recipeToPresetWritePlan(sampleRecipe({ smoothSkinEffect: "Off" }), 2, base);

    expect(plan.properties.some((item) => item.code === 0xd198)).toBe(false);
  });

  it("rejects non-Off Smooth Skin Effect before writing when the camera slot does not expose D198", () => {
    const base = preset();
    delete base.properties["0xd198"];
    base.missing = ["0xd198"];

    expect(() =>
      recipeToPresetWritePlan(sampleRecipe({ smoothSkinEffect: "Weak" }), 2, base),
    ).toThrow("Smooth skin effect is not supported by this camera slot.");
  });

  it("normalizes camera preset names before writing to D18D", () => {
    expect(cameraPresetName("  Cinéma  negative recipe with a very long name  ")).toBe(
      "Cinema negative recipe with a v",
    );
  });
});

describe("writeRecipeToCameraSlot", () => {
  it("backs up the target slot, selects it, writes properties, and verifies", async () => {
    const recipe = sampleRecipe();
    const plan = recipeToPresetWritePlan(recipe, 2, preset());
    const verified = preset(2);
    for (const prop of plan.properties) {
      if (prop.code === PRESET_NAME_PROP) {
        verified.name = ptpString(prop.value);
        continue;
      }
      verified.properties[`0x${prop.code.toString(16)}`] = {
        id: prop.code,
        name: prop.label,
        value: 0,
        bytes: bytes(prop.value),
      };
    }
    const port = fakePort(verified);

    const result = await writeRecipeToCameraSlot(port, recipe, 2);

    expect(result.propertiesWritten).toBe(plan.properties.length);
    expect(port.setDevicePropValue).toHaveBeenCalledWith(
      PRESET_SLOT_PROP,
      { kind: "bytes", value: new Uint8Array([2, 0]) },
      undefined,
    );
    expect(port.setDevicePropValue).toHaveBeenCalledWith(
      PRESET_NAME_PROP,
      { kind: "bytes", value: recipeNameBytes("Camera write sample") },
      undefined,
    );
  });

  it("attempts to restore the backed-up preset when a write fails", async () => {
    const backup = preset(2);
    backup.name = "Original C2";
    backup.properties["0xd18e"] = { id: 0xd18e, name: "size", value: 7, bytes: [7, 0] };
    const port = fakePort(backup);
    port.setDevicePropValue.mockImplementation(async (code: number) => {
      if (code === 0xd190) throw new Error("camera write failed");
    });

    await expect(writeRecipeToCameraSlot(port, sampleRecipe(), 2)).rejects.toThrow(
      "Writing 0xd190 Dynamic range failed: camera write failed",
    );

    expect(port.setDevicePropValue).toHaveBeenCalledWith(
      PRESET_NAME_PROP,
      { kind: "bytes", value: recipeNameBytes("Original C2") },
      undefined,
    );
    expect(port.setDevicePropValue).toHaveBeenCalledWith(
      0xd18e,
      { kind: "bytes", value: new Uint8Array([7, 0]) },
      undefined,
    );
  });
});

function ptpString(value: DeviceValue): string {
  const data = bytes(value);
  const length = data[0] ?? 0;
  let result = "";
  for (let offset = 1; offset < 1 + (length - 1) * 2; offset += 2) {
    const code = data[offset]! | (data[offset + 1]! << 8);
    if (code !== 0) result += String.fromCharCode(code);
  }
  return result;
}

function recipeNameBytes(value: string): Uint8Array {
  const chars = Array.from(value);
  const data = new Uint8Array(1 + chars.length * 2 + 2);
  data[0] = chars.length + 1;
  chars.forEach((char, index) => {
    const offset = 1 + index * 2;
    const code = char.charCodeAt(0);
    data[offset] = code & 0xff;
    data[offset + 1] = code >> 8;
  });
  return data;
}
