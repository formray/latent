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

  it("stores stage metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      stage: "claim",
    });
    expect(err.stage).toBe("claim");
  });

  it("stores domException metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      domException: "NetworkError",
    });
    expect(err.domException).toBe("NetworkError");
  });

  it("stores platform metadata", () => {
    const err = new LatentError("UsbDisconnect", "claim failed", undefined, {
      platform: "mac",
    });
    expect(err.platform).toBe("mac");
  });

  it("exposes metadata object for rewrap", () => {
    const err = new LatentError("UsbDisconnect", "transfer failed", undefined, {
      stage: "transfer-in",
      domException: "NetworkError",
      platform: "linux",
    });
    expect(err.metadata).toEqual({
      stage: "transfer-in",
      domException: "NetworkError",
      platform: "linux",
    });
  });

  it("preserves cause while adding metadata", () => {
    const cause = new Error("raw");
    const err = new LatentError("UsbDisconnect", "wrapped", cause, {
      stage: "transfer-out",
    });
    expect(err.cause).toBe(cause);
    expect(err.stage).toBe("transfer-out");
  });
});
