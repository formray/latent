import { describe, expect, it } from "vitest";
import { FilmForkError } from "../src/errors.js";

describe("FilmForkError", () => {
  it("preserves category and message", () => {
    const err = new FilmForkError("PtpStall", "device stalled");
    expect(err.category).toBe("PtpStall");
    expect(err.message).toBe("device stalled");
    expect(err.name).toBe("FilmForkError");
  });

  it("attaches optional cause", () => {
    const inner = new Error("transport closed");
    const err = new FilmForkError("UsbDisconnect", "lost", inner);
    expect(err.cause).toBe(inner);
  });

  it("is instanceof Error", () => {
    expect(new FilmForkError("PtpTimeout", "x")).toBeInstanceOf(Error);
  });
});
