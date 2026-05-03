import { describe, expect, it } from "vitest";
import { packContainer, unpackContainer } from "../src/ptp/container.js";

describe("PTP container codec", () => {
  it("packs a CMD container with header + zero params", () => {
    const buf = packContainer({
      type: 1,
      code: 0x1003,
      transactionId: 5,
      params: [],
      data: new Uint8Array(0),
    });
    expect(buf.length).toBe(12);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    expect(dv.getUint32(0, true)).toBe(12);
    expect(dv.getUint16(4, true)).toBe(1);
    expect(dv.getUint16(6, true)).toBe(0x1003);
    expect(dv.getUint32(8, true)).toBe(5);
  });

  it("packs CMD with two params", () => {
    const buf = packContainer({
      type: 1,
      code: 0x1015,
      transactionId: 2,
      params: [0xd185, 0],
      data: new Uint8Array(0),
    });
    expect(buf.length).toBe(20);
  });

  it("unpacks a RESPONSE container with no payload", () => {
    const bytes = new Uint8Array([
      0x0c, 0, 0, 0,
      0x03, 0,
      0x01, 0x20,
      0x07, 0, 0, 0,
    ]);
    const c = unpackContainer(bytes);
    expect(c.type).toBe(3);
    expect(c.code).toBe(0x2001);
    expect(c.transactionId).toBe(7);
    expect(c.params.length).toBe(0);
  });
});
