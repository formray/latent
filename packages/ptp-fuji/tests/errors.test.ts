import { describe, expect, it } from "vitest";
import { LatentError } from "../src/errors.js";

describe("LatentError", () => {
  it("preserves category and message", () => {
    const err = new LatentError("PtpStall", "device stalled");
    expect(err.category).toBe("PtpStall");
    expect(err.message).toBe("device stalled");
    expect(err.name).toBe("LatentError");
  });

  it("attaches optional cause", () => {
    const inner = new Error("transport closed");
    const err = new LatentError("UsbDisconnect", "lost", inner);
    expect(err.cause).toBe(inner);
  });

  it("is instanceof Error", () => {
    expect(new LatentError("PtpTimeout", "x")).toBeInstanceOf(Error);
  });
});
