import { describe, expect, it } from "vitest";
import { connectAndReadPresets } from "../src/connect.js";

describe("connectAndReadPresets", () => {
  it("propagates WebUSB-unavailable failure from requestFujiCamera", async () => {
    const desc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      writable: true,
      value: {},
    });
    try {
      await expect(connectAndReadPresets()).rejects.toMatchObject({
        category: "WebUSBSecureContextRequired",
      });
    } finally {
      if (desc) {
        Object.defineProperty(globalThis, "navigator", desc);
      } else {
        delete (globalThis as { navigator?: unknown }).navigator;
      }
    }
  });
});
