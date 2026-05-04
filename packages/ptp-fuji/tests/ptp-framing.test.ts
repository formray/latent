import { describe, expect, it } from "vitest";
import { LatentError } from "../src/errors.js";
import { ContainerType, PTPResp } from "../src/ptp/constants.js";
import { packContainer } from "../src/ptp/container.js";
import { PtpFraming } from "../src/ptp/transport.js";
import { FakeTransport } from "./fake-transport.js";

function response(code: number, txid: number): Uint8Array {
  return packContainer({
    type: ContainerType.Response,
    code,
    transactionId: txid,
    params: [],
    data: new Uint8Array(0),
  });
}

function data(opcode: number, txid: number, bytes = [1, 2, 3]): Uint8Array {
  return packContainer({
    type: ContainerType.Data,
    code: opcode,
    transactionId: txid,
    params: [],
    data: new Uint8Array(bytes),
  });
}

describe("PtpFraming validation", () => {
  it("rejects a short response", async () => {
    const t = new FakeTransport();
    t.enqueue(new Uint8Array([1, 2, 3]));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("rejects a non-response final container", async () => {
    const t = new FakeTransport();
    t.enqueue(data(0x1001, 1));
    t.enqueue(data(0x1001, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toBeInstanceOf(
      LatentError,
    );
  });

  it("rejects a mismatched response transaction id", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OK, 99));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("accepts DATA followed by matching RESPONSE", async () => {
    const t = new FakeTransport();
    t.enqueue(data(0x1001, 1, [9, 8]));
    t.enqueue(response(PTPResp.OK, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).resolves.toMatchObject({
      code: PTPResp.OK,
      data: new Uint8Array([9, 8]),
    });
  });

  it("rejects a mismatched response transaction id for sendDataCommand", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OK, 77));
    const framing = new PtpFraming(t);
    await expect(
      framing.sendDataCommand(0x1016, [1], new Uint8Array([2])),
    ).rejects.toMatchObject({
      category: "PtpStall",
    });
  });

  it("maps SessionAlreadyOpen to PtpSessionAlreadyOpen", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.SessionAlreadyOpen, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1002)).rejects.toMatchObject({
      category: "PtpSessionAlreadyOpen",
    });
  });

  it("maps DeviceBusy to PtpDeviceBusy", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.DeviceBusy, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).rejects.toMatchObject({
      category: "PtpDeviceBusy",
    });
  });

  it("maps OperationNotSupported to PtpUnsupportedOperation", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OperationNotSupported, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x9999)).rejects.toMatchObject({
      category: "PtpUnsupportedOperation",
    });
  });

  it("maps DeviceBusy to PtpDeviceBusy for sendDataCommand", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.DeviceBusy, 1));
    const framing = new PtpFraming(t);
    await expect(
      framing.sendDataCommand(0x1016, [1], new Uint8Array([2])),
    ).rejects.toMatchObject({
      category: "PtpDeviceBusy",
    });
  });

  it("keeps existing OK response behaviour", async () => {
    const t = new FakeTransport();
    t.enqueue(response(PTPResp.OK, 1));
    const framing = new PtpFraming(t);
    await expect(framing.sendCommand(0x1001)).resolves.toMatchObject({
      code: PTPResp.OK,
      params: [],
    });
  });
});
