import { describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import { WebUsbPtpTransport } from "../src/webusb-transport.js";

/**
 * Mock USBDevice — minimal surface area for transport tests. The transport
 * only ever calls `transferIn`, `transferOut`, `releaseInterface`, `close`.
 */
function makeMockDevice(overrides: Partial<MockDevice> = {}): MockDevice {
  return {
    transferIn: vi.fn(async (_endpoint: number, length: number) => ({
      status: "ok" as const,
      data: new DataView(new Uint8Array(length).fill(0).buffer),
    })),
    transferOut: vi.fn(async (_endpoint: number, _data: BufferSource) => ({
      status: "ok" as const,
      bytesWritten: (_data as ArrayBufferView).byteLength,
    })),
    releaseInterface: vi.fn(async (_n: number) => undefined),
    close: vi.fn(async () => undefined),
    ...overrides,
  };
}

interface MockDevice {
  transferIn: (endpoint: number, length: number) => Promise<{
    status: "ok" | "stall" | "babble";
    data?: DataView;
  }>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<{
    status: "ok" | "stall" | "babble";
    bytesWritten: number;
  }>;
  releaseInterface: (interfaceNumber: number) => Promise<void>;
  close: () => Promise<void>;
}

describe("WebUsbPtpTransport.send", () => {
  it("calls transferOut on the configured OUT endpoint", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await transport.send(new Uint8Array([1, 2, 3, 4]));
    expect(device.transferOut).toHaveBeenCalledTimes(1);
    expect(vi.mocked(device.transferOut).mock.calls[0]?.[0]).toBe(0x02);
  });

  it("chunks payloads larger than maxChunkSize", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
      { maxChunkSize: 4 },
    );
    await transport.send(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    // 9 bytes / 4 = 3 chunks (4 + 4 + 1)
    expect(device.transferOut).toHaveBeenCalledTimes(3);
  });

  it("rejects with AbortError when signal is already aborted", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    const ac = new AbortController();
    ac.abort();
    await expect(transport.send(new Uint8Array([1]), ac.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(device.transferOut).not.toHaveBeenCalled();
  });

  it("throws LatentError(PtpStall) when transferOut status is not ok", async () => {
    const device = makeMockDevice({
      transferOut: vi.fn(async () => ({ status: "stall" as const, bytesWritten: 0 })),
    });
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await expect(transport.send(new Uint8Array([1]))).rejects.toBeInstanceOf(
      LatentError,
    );
  });

  it("wraps raw transferOut rejection with stage transfer-out", async () => {
    const device = makeMockDevice({
      transferOut: vi.fn(async () => {
        throw new DOMException("gone", "NetworkError");
      }),
    });
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await expect(transport.send(new Uint8Array([1]))).rejects.toMatchObject({
      category: "UsbDisconnect",
      stage: "transfer-out",
      domException: "NetworkError",
    });
  });
});

describe("WebUsbPtpTransport.receive", () => {
  it("calls transferIn on the configured IN endpoint and returns a Uint8Array", async () => {
    const payload = new Uint8Array([10, 20, 30]);
    const device = makeMockDevice({
      transferIn: vi.fn(async () => ({
        status: "ok" as const,
        data: new DataView(payload.buffer),
      })),
    });
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    const got = await transport.receive();
    expect(device.transferIn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(device.transferIn).mock.calls[0]?.[0]).toBe(0x81);
    expect(Array.from(got)).toEqual([10, 20, 30]);
  });

  it("rejects with AbortError on pre-aborted signal", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    const ac = new AbortController();
    ac.abort();
    await expect(transport.receive(ac.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(device.transferIn).not.toHaveBeenCalled();
  });

  it("rejects with AbortError when signal aborts mid-transfer", async () => {
    let resolveTransfer: ((v: { status: "ok"; data: DataView }) => void) | undefined;
    const device = makeMockDevice({
      transferIn: vi.fn(
        () =>
          new Promise<{ status: "ok"; data: DataView }>((resolve) => {
            resolveTransfer = resolve;
          }),
      ),
    });
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    const ac = new AbortController();
    const recvPromise = transport.receive(ac.signal);
    ac.abort();
    await expect(recvPromise).rejects.toMatchObject({ name: "AbortError" });
    // Resolve to avoid unhandled-promise warnings.
    resolveTransfer?.({ status: "ok", data: new DataView(new Uint8Array(0).buffer) });
  });

  it("wraps raw transferIn rejection with stage transfer-in", async () => {
    const device = makeMockDevice({
      transferIn: vi.fn(async () => {
        throw new DOMException("gone", "NetworkError");
      }),
    });
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await expect(transport.receive()).rejects.toMatchObject({
      category: "UsbDisconnect",
      stage: "transfer-in",
      domException: "NetworkError",
    });
  });
});

describe("WebUsbPtpTransport.close", () => {
  it("releases the interface and closes the device", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
      { interfaceNumber: 3 },
    );
    await transport.close();
    expect(device.releaseInterface).toHaveBeenCalledWith(3);
    expect(device.close).toHaveBeenCalledTimes(1);
  });

  it("is idempotent: a second close is a no-op", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await transport.close();
    await transport.close();
    expect(device.releaseInterface).toHaveBeenCalledTimes(1);
    expect(device.close).toHaveBeenCalledTimes(1);
  });

  it("rejects send/receive after close", async () => {
    const device = makeMockDevice();
    const transport = new WebUsbPtpTransport(
      device as unknown as USBDevice,
      0x81,
      0x02,
    );
    await transport.close();
    await expect(transport.send(new Uint8Array([1]))).rejects.toBeInstanceOf(
      LatentError,
    );
    await expect(transport.receive()).rejects.toBeInstanceOf(LatentError);
  });
});
