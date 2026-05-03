import { describe, expect, it } from "vitest";
import { FujiCameraSession } from "../src/ptp/session.js";
import { FakeTransport } from "./fake-transport.js";

describe("AbortSignal propagation", () => {
  it("rejects open() when signal is already aborted", async () => {
    const t = new FakeTransport();
    const ac = new AbortController();
    ac.abort();
    const s = new FujiCameraSession(t);
    await expect(s.open(ac.signal)).rejects.toMatchObject({ name: "AbortError" });
  });
});
