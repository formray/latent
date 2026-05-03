import { describe, expect, it } from "vitest";
import { STUB_NOTICE } from "../src/index";

describe("ptp-fuji-webusb stub", () => {
  it("exports a stub notice", () => {
    expect(STUB_NOTICE).toMatch(/Phase 2/);
  });
});
