import { describe, expect, it, vi } from "vitest";
import type { RawPreset } from "@latent/camera-connection";
import {
  cameraBackupFileName,
  createCameraBackupBundle,
  downloadCameraBackupBundle,
} from "../src/lib/camera-backup";

function preset(slot: number): RawPreset {
  return {
    slot,
    name: slot === 1 ? "ETERNAL BLACK" : "KODAK ULTRAMAX 400",
    properties: {
      "0xd190": {
        name: "P:DynamicRange%",
        value: 100,
        bytes: [100, 0],
      },
      "0xd192": {
        name: "P:FilmSimulation",
        value: 11,
        bytes: [11, 0],
      },
    },
    decoded: {
      filmSimulation: { value: 11, label: "Classic Chrome" },
      dynamicRange: { value: 1, label: "DR 100%" },
      whiteBalance: { value: 2, label: "Auto" },
      wbShift: { r: 1, b: -5 },
      highlightTone: 1,
      shadowTone: 1,
      color: 4,
      sharpness: 0,
      noiseReduction: -4,
      clarity: 3,
      grainEffect: {
        value: 259,
        label: "Strong Large",
        strength: "Strong",
        size: "Large",
      },
      colorChromeEffect: { value: 1, label: "Weak" },
      colorChromeEffectBlue: { value: 0, label: "Off" },
      smoothSkinEffect: { value: 0, label: "Off" },
    },
  };
}

describe("camera backup bundle", () => {
  it("serializes raw slots and restorable recipes into one portable bundle", () => {
    const bundle = createCameraBackupBundle(
      [preset(1), preset(2)],
      { cameraModel: "X-M5", firmwareVersion: "1.20" },
      "2026-05-05T08:00:00.000Z",
    );

    expect(bundle.kind).toBe("latent-camera-backup");
    expect(bundle.camera).toEqual({ cameraModel: "X-M5", firmwareVersion: "1.20" });
    expect(bundle.slotCount).toBe(2);
    expect(bundle.slots[0]).toMatchObject({
      slot: 1,
      name: "ETERNAL BLACK",
      propertyCount: 2,
      missing: [],
    });
    expect(bundle.slots[0]?.recipe).toMatchObject({
      name: "ETERNAL BLACK",
      author: "Camera import",
      cameraModel: "X-M5",
      capabilitySetId: "x-m5-fw1.20",
      dynamicRange: "DR100",
    });
  });

  it("uses camera identity and timestamp in the backup filename", () => {
    const bundle = createCameraBackupBundle(
      [preset(1)],
      { cameraModel: "X-S20", firmwareVersion: "3.30" },
      "2026-05-05T08:00:00.000Z",
    );

    expect(cameraBackupFileName(bundle)).toBe(
      "latent-camera-backup-x-s20-fw3-30-2026-05-05T08-00-00-000Z.json",
    );
  });

  it("downloads the bundle as JSON", () => {
    const createObjectURL = vi.fn(() => "blob:camera-backup");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const bundle = createCameraBackupBundle(
      [preset(1)],
      { cameraModel: "X-M5", firmwareVersion: "1.20" },
      "2026-05-05T08:00:00.000Z",
    );

    downloadCameraBackupBundle(bundle);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:camera-backup");
    click.mockRestore();
  });
});
