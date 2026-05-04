import { describe, expect, it } from "vitest";
import { LatentError } from "../src/errors.js";
import { ContainerType } from "../src/ptp/constants.js";
import { packContainer } from "../src/ptp/container.js";
import { FujiCameraSession } from "../src/ptp/session.js";
import { FakeTransport } from "./fake-transport.js";

function le16(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff];
}

function le32(value: number): number[] {
  return [
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ];
}

function ptpString(value: string): number[] {
  const chars = Array.from(value);
  const out = [chars.length + 1];
  for (const ch of chars) {
    out.push(...le16(ch.charCodeAt(0)));
  }
  out.push(0, 0);
  return out;
}

function array16(values: number[]): number[] {
  return [...le32(values.length), ...values.flatMap(le16)];
}

function deviceInfoPayload(): Uint8Array {
  return new Uint8Array([
    ...le16(100),
    ...le32(6),
    ...le16(0x100),
    ...ptpString("FUJI PTP"),
    ...le16(0),
    ...array16([0x1001, 0x1002, 0x1003, 0x1015, 0x1016]),
    ...array16([]),
    ...array16([]),
    ...array16([]),
    ...array16([]),
    ...ptpString("FUJIFILM"),
    ...ptpString("X-S20"),
    ...ptpString("1.10"),
    ...ptpString("ABC123"),
  ]);
}

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

  it("open maps non-OK response through PtpFraming", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x19, 0x20, 1, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await expect(s.open()).rejects.toMatchObject({
      category: "PtpDeviceBusy",
    });
    expect(s.state).toBe("closed");
  });

  it("adopts an already-open camera session after a page refresh", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x1e, 0x20, 1, 0, 0, 0]));
    t.enqueue(packContainer({
      type: ContainerType.Data,
      code: 0x1001,
      transactionId: 2,
      params: [],
      data: deviceInfoPayload(),
    }));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    expect(s.state).toBe("open");
    await expect(s.getDeviceInfo()).resolves.toMatchObject({
      model: "X-S20",
    });
  });

  it("close always closes transport after response failure", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x19, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await expect(s.close()).rejects.toBeInstanceOf(LatentError);
    expect(t.closed).toBe(true);
    expect(s.state).toBe("closed");
  });

  it("fireCloseSession sends CloseSession without awaiting a response", () => {
    const t = new FakeTransport();
    const s = new FujiCameraSession(t);
    s.fireCloseSession();
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]?.[6]).toBe(0x03);
    expect(t.sent[0]?.[7]).toBe(0x10);
  });

  it("getDeviceInfo sends GetDeviceInfo opcode 0x1001", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(packContainer({
      type: ContainerType.Data,
      code: 0x1001,
      transactionId: 2,
      params: [],
      data: deviceInfoPayload(),
    }));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await s.getDeviceInfo();
    expect(t.sent[1]?.[6]).toBe(0x01);
    expect(t.sent[1]?.[7]).toBe(0x10);
  });

  it("getDeviceInfo parses model, firmware, serial, and supported ops", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(packContainer({
      type: ContainerType.Data,
      code: 0x1001,
      transactionId: 2,
      params: [],
      data: deviceInfoPayload(),
    }));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await expect(s.getDeviceInfo()).resolves.toEqual({
      model: "X-S20",
      firmwareVersion: "1.10",
      serialNumber: "ABC123",
      supportedOps: [0x1001, 0x1002, 0x1003, 0x1015, 0x1016],
    });
  });

  it("getDeviceInfo rejects when called before open", async () => {
    const s = new FujiCameraSession(new FakeTransport());
    await expect(s.getDeviceInfo()).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("getDeviceInfo wraps malformed payloads as PtpStall instead of RangeError", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 1, 0, 0, 0]));
    t.enqueue(packContainer({
      type: ContainerType.Data,
      code: 0x1001,
      transactionId: 2,
      params: [],
      data: new Uint8Array([0x64, 0x00, 0x06]),
    }));
    t.enqueue(new Uint8Array([0x0c, 0, 0, 0, 3, 0, 0x01, 0x20, 2, 0, 0, 0]));
    const s = new FujiCameraSession(t);
    await s.open();
    await expect(s.getDeviceInfo()).rejects.toMatchObject({
      category: "PtpStall",
    });
  });
});
