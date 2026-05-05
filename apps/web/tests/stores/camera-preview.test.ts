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
      rawPreviewFile: null,
      macosBetaAcknowledged: false,
      macosSetupAcknowledged: false,
      macosPersistentDisableConfigured: false,
      macosWizardOpen: false,
      macosShowAdvanced: false,
    });
  });

  it("reports an error when rendering without a connected camera", async () => {
    const raf = file();
    await useCameraStore.getState().renderRawPreview(raf);

    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "error",
      fileName: "sample.raf",
      message: "Camera is not connected.",
    });
    expect(useCameraStore.getState().rawPreviewFile).toBe(raf);
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

    const raf = file();
    await useCameraStore.getState().renderRawPreview(raf);

    expect(useCameraStore.getState().rawPreviewStatus).toEqual({
      kind: "success",
      fileName: "sample.raf",
      objectUrl: "blob:preview",
      jpegBytes: 4,
      baseProfileBytes: 4,
    });
    expect(useCameraStore.getState().rawPreviewFile).toBe(raf);
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
    const patched = builder?.(baseProfile());
    expect(patched).not.toEqual(baseProfile());
    expect(readD185Field(patched, 4)).toBe(333);
    expect(readD185Field(patched, 6)).toBe(3);
    expect(readD185Field(patched, 7)).toBe(3);
    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "success",
      recipeName: "Preview sample",
    });
  });

  it("patches color-temperature white balance into the RAF render profile", async () => {
    const port = fakePort();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
    });

    await useCameraStore.getState().renderRawPreview(file(), {
      ...recipe,
      whiteBalance: { mode: "ColorTemperature", colorTemperatureK: 7200, shiftR: -2, shiftB: 3 },
    });

    const builder = vi.mocked(port.renderRawPreview).mock.calls[0]?.[1];
    const patched = builder?.(baseProfile());
    expect(readD185Field(patched, 12)).toBe(0x8007);
    expect(readD185Field(patched, 13)).toBe(-2);
    expect(readD185Field(patched, 14)).toBe(3);
    expect(readD185Field(patched, 15)).toBe(7200);
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

    expect(port.renderRawPreview).toHaveBeenCalledTimes(11);
    expect(port.renderRawPreview).toHaveBeenNthCalledWith(
      1,
      new Uint8Array([1, 2, 3, 4]),
      undefined,
    );
    expect(vi.mocked(port.renderRawPreview).mock.calls[1]?.[1]).toBeTypeOf("function");
    expect(useCameraStore.getState().rawPreviewStatus).toMatchObject({
      kind: "success",
      recipeName: "Preview sample",
      diagnostics: [
        { id: "base", label: "Base RAF" },
        { id: "film", label: "Film simulation only" },
        { id: "film-exposure", label: "Film + exposure" },
        { id: "film-dynamic-range-enum", label: "Film + DR enum" },
        { id: "film-dynamic-range-raw", label: "Film + DR raw %" },
        { id: "film-d-range-priority", label: "Film + D Range Priority" },
        { id: "film-tone", label: "Film + tone" },
        { id: "film-color", label: "Film + color" },
        { id: "film-chrome", label: "Film + chrome" },
        { id: "film-texture", label: "Film + texture" },
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

function readD185Field(profile: Uint8Array | undefined, index: number): number | undefined {
  if (!profile) return undefined;
  const view = new DataView(profile.buffer, profile.byteOffset, profile.byteLength);
  const count = view.getUint16(0, true);
  const offset = profile.byteLength - count * 4;
  return view.getInt32(offset + index * 4, true);
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
  exposureCompensation: 1 / 3,
  dynamicRange: "DR400",
  dRangePriority: "Strong",
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
