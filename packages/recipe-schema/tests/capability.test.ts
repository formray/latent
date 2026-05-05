import { describe, expect, it } from "vitest";
import { loadCapabilityMatrix, getCapabilitySet } from "../src/capability";

describe("Capability matrix loader", () => {
  it("loads camera-models.json successfully", async () => {
    const matrix = await loadCapabilityMatrix();
    expect(matrix.capabilitySets).toBeDefined();
    expect(matrix.models).toBeDefined();
  });

  it("returns the X-S20 capability set by id", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    expect(xs20).toBeDefined();
    expect(xs20?.cameraModel).toBe("X-S20");
    expect(xs20?.customSlots).toBe(4);
    expect(xs20?.usbProductId).toBe("0x02F7");
  });

  it("X-S20 capability set has monochromaticColor: true (R3 fix)", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    expect(xs20?.supports.monochromaticColor).toBe(true);
  });

  it("X-S20 writableSlotProperties does NOT include unproven fields", async () => {
    const matrix = await loadCapabilityMatrix();
    const xs20 = getCapabilitySet(matrix, "x-s20-fw1.10");
    const w = xs20?.writableSlotProperties ?? [];
    expect(xs20?.supports.exposureCompensationPreview).toBe(true);
    expect(xs20?.supports.dRangePriorityPreview).toBe(true);
    expect(xs20?.parameterRanges.exposureCompensation).toMatchObject({ min: -5, max: 5 });
    expect(w).not.toContain("exposureCompensation");
    expect(w).not.toContain("dRangePriority");
    expect(w).not.toContain("longExposureNR");
    expect(w).not.toContain("lensModulationOptimizer");
  });

  it("returns undefined for unknown capability set id", async () => {
    const matrix = await loadCapabilityMatrix();
    expect(getCapabilitySet(matrix, "nonexistent")).toBeUndefined();
  });
});
