import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraSessionPort, DeviceValue } from "@latent/camera-connection";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useCameraStore } from "../../src/stores/camera";

describe("camera store raw preview", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview"),
      revokeObjectURL: vi.fn(),
    });
    useCameraStore.setState({
      state: { kind: "idle" },
      presets: [],
      writeStatus: { kind: "idle" },
      rawPreviewStatus: { kind: "idle" },
      macosBetaAcknowledged: false,
      macosSetupAcknowledged: false,
      macosPersistentDisableConfigured: false,
      macosWizardOpen: false,
      macosShowAdvanced: false,
    });
  });

  it("reports an error when rendering without a connected camera", async () => {
    await useCameraStore.getState().renderRawPreview(file());

    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "error",
      fileName: "sample.raf",
      message: "Camera is not connected.",
    });
  });

  it("renders a RAF through the connected camera port and stores the JPEG object URL", async () => {
    const port = fakePort();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
    });

    await useCameraStore.getState().renderRawPreview(file());

    expect(useCameraStore.getState().rawPreviewStatus).toEqual({
      kind: "success",
      fileName: "sample.raf",
      objectUrl: "blob:preview",
      jpegBytes: 4,
      baseProfileBytes: 4,
    });
    expect(port.renderRawPreview).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4]), undefined);
  });

  it("patches the base profile with the selected recipe before rendering", async () => {
    const port = fakePort();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
    });

    await useCameraStore.getState().renderRawPreview(file(), recipe);

    const builder = vi.mocked(port.renderRawPreview).mock.calls[0]?.[1];
    expect(builder).toBeTypeOf("function");
    expect(builder?.(baseProfile())).not.toEqual(baseProfile());
    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "success",
      recipeName: "Preview sample",
    });
  });

  it("renders diagnostic RAF variants for isolating preview color shifts", async () => {
    const port = fakePort();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
    });

    await useCameraStore.getState().renderRawPreviewDiagnostics(file(), recipe);

    expect(port.renderRawPreview).toHaveBeenCalledTimes(4);
    expect(port.renderRawPreview).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3, 4]), undefined);
    expect(vi.mocked(port.renderRawPreview).mock.calls[1]?.[1]).toBeTypeOf("function");
    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "success",
      recipeName: "Preview sample",
      diagnostics: [
        { id: "base", label: "Base RAF" },
        { id: "film", label: "Film simulation only" },
        { id: "without-white-balance", label: "Full recipe without WB" },
        { id: "full", label: "Full recipe" },
      ],
    });
  });
});

function file(): File {
  return new File([new Uint8Array([1, 2, 3, 4])], "sample.raf", {
    type: "image/x-fuji-raf",
  });
}

function fakePort(): CameraSessionPort {
  return {
    getDeviceInfo: vi.fn(),
    getDevicePropValue: vi.fn(async (): Promise<DeviceValue> => ({ kind: "uint16", value: 0 })),
    setDevicePropValue: vi.fn(async () => undefined),
    getPreset: vi.fn(async (slot: number) => ({ slot, properties: {} })),
    renderRawPreview: vi.fn(async () => ({
      jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      baseProfile: new Uint8Array([1, 2, 3, 4]),
    })),
    isOpen: vi.fn(() => true),
  };
}

function baseProfile(): Uint8Array {
  const profile = new Uint8Array(120);
  new DataView(profile.buffer).setUint16(0, 28, true);
  return profile;
}

const recipe: RecipeType = {
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Preview sample",
  author: "Latent",
  tags: [],
  createdAt: "2026-05-04T10:00:00.000Z",
  capabilitySetId: "latent-defaults-v1",
  cameraModel: "Fujifilm",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR400",
  whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
  highlightTone: 1,
  shadowTone: 1,
  color: 0,
  sharpness: 0,
  noiseReduction: 0,
  clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Off",
  colorChromeEffectBlue: "Off",
  smoothSkinEffect: "Off",
};
