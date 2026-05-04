import { describe, expect, it } from "vitest";
import { STUB_NOTICE } from "../src/index";

describe("ai-agent stub", () => {
  it("exports a stub notice", () => {
    expect(STUB_NOTICE).toMatch(/Phase 5/);
  });
});
