import { describe, expect, it } from "vitest";
import { FujiCameraSession } from "../src/ptp/session.js";
import { FakeTransport } from "./fake-transport.js";

describe("FujiCameraSession", () => {
  it("starts in 'closed' state", () => {
    const t = new FakeTransport();
    const s = new FujiCameraSession(t);
    expect(s.state).toBe("closed");
  });

  it("transitions to 'open' after open() succeeds", async () => {
    const t = new FakeTransport();
    // Enqueue minimal valid OpenSession response container (CMD response = OK)
    // Container header: length=12, type=3 (RESPONSE), code=0x2001 (OK), txid=1
    t.enqueue(new Uint8Array([
      0x0c, 0x00, 0x00, 0x00,
      0x03, 0x00,
      0x01, 0x20,
      0x01, 0x00, 0x00, 0x00,
    ]));
    const s = new FujiCameraSession(t);
    await s.open();
    expect(s.state).toBe("open");
  });

  it("close() transitions back to 'closed'", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await s.close();
    expect(s.state).toBe("closed");
  });
});
