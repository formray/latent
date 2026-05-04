import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CameraSessionPort, DeviceValue } from "@latent/camera-connection";
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
    expect(port.renderRawPreview).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4]));
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
