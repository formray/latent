import { describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import {
  WebUsbCameraDriver,
  WebUsbSessionPort,
  claimWithReset,
  openSessionWithStaging,
} from "../src/drivers/webusb.js";
import { FakeUSBDevice, FakeUsb } from "./fakes.js";

function session(overrides: Partial<FakeSession> = {}): FakeSession {
  return {
    state: "open",
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    fireCloseSession: vi.fn(() => undefined),
    getDeviceInfo: vi.fn(async () => ({
      model: "X-S20",
      firmwareVersion: "1.10",
      serialNumber: "PTP-123",
      supportedOps: [0x1001],
    })),
    getDevicePropValue: vi.fn(async () => ({
      bytes: new Uint8Array([1, 0]),
      value: 1,
    })),
    setDevicePropValue: vi.fn(async () => undefined),
    getPreset: vi.fn(async (slot: number) => ({
      slot,
      name: `C${slot}`,
      settings: [],
      missing: [],
    })),
    renderRawPreview: vi.fn(async () => ({
      jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      baseProfile: new Uint8Array([1, 2, 3, 4]),
    })),
    ...overrides,
  };
}

interface FakeSession {
  state: "closed" | "opening" | "open" | "degraded";
  open: (signal?: AbortSignal) => Promise<void>;
  close: () => Promise<void>;
  fireCloseSession: () => void;
  getDeviceInfo: (signal?: AbortSignal) => Promise<{
    model: string;
    firmwareVersion: string;
    serialNumber?: string;
    supportedOps: number[];
  }>;
  getDevicePropValue: (
    code: number,
    signal?: AbortSignal,
  ) => Promise<{
    bytes: Uint8Array;
    value: number | string | Uint8Array;
  }>;
  setDevicePropValue: (code: number, bytes: Uint8Array, signal?: AbortSignal) => Promise<void>;
  getPreset: (
    slot: number,
    signal?: AbortSignal,
  ) => Promise<{
    slot: number;
    name?: string;
    settings: Array<{ id: number; name: string; bytes: Uint8Array; value: number | string }>;
    missing: number[];
  }>;
  renderRawPreview: (
    raf: Uint8Array,
    profileBuilder?: (baseProfile: Uint8Array) => Uint8Array,
    signal?: AbortSignal,
  ) => Promise<{ jpeg: Uint8Array; baseProfile: Uint8Array }>;
}

function driverWith(usb = new FakeUsb(), fakeSession = session()): WebUsbCameraDriver {
  return new WebUsbCameraDriver({
    usb: usb as unknown as USB,
    sessionFactory: () => fakeSession,
    transportFactory: () => ({
      send: vi.fn(async () => undefined),
      receive: vi.fn(async () => new Uint8Array(0)),
      close: vi.fn(async () => undefined),
    }),
  });
}

describe("WebUsbCameraDriver connect", () => {
  it("uses paired device when autoSelectPaired is true", async () => {
    const device = new FakeUSBDevice();
    const usb = new FakeUsb([device]);
    await driverWith(usb).connect({ autoSelectPaired: true });
    expect(usb.getDevices).toHaveBeenCalled();
    expect(usb.requestDevice).not.toHaveBeenCalled();
  });

  it("falls back to picker when no paired device exists", async () => {
    const device = new FakeUSBDevice();
    const usb = new FakeUsb([device]);
    usb.getDevices.mockResolvedValueOnce([]);
    await driverWith(usb).connect({ autoSelectPaired: true });
    expect(usb.requestDevice).toHaveBeenCalledWith({
      filters: [{ vendorId: 0x04cb }],
    });
  });

  it("aborts before claim", async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(driverWith().connect({ signal: ac.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("aborts during OpenSession", async () => {
    const fakeSession = session({
      open: vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
    });
    await expect(driverWith(new FakeUsb(), fakeSession).connect()).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("returns deviceInfo and usbSerialNumber", async () => {
    const result = await driverWith().connect();
    expect(result.deviceInfo).toMatchObject({ model: "X-S20", firmwareVersion: "1.10" });
    expect(result.usbSerialNumber).toBe("USB-123");
  });

  it("resets and retries when OpenSession fails after a successful claim", async () => {
    const firstSession = session({
      open: vi.fn(async () => {
        throw new LatentError("UsbDisconnect", "stale", undefined, {
          stage: "transfer-in",
        });
      }),
    });
    const secondSession = session();
    const device = new FakeUSBDevice();
    const usb = new FakeUsb([device]);
    const driver = new WebUsbCameraDriver({
      usb: usb as unknown as USB,
      sessionFactory: vi.fn().mockReturnValueOnce(firstSession).mockReturnValueOnce(secondSession),
      transportFactory: () => ({
        send: vi.fn(async () => undefined),
        receive: vi.fn(async () => new Uint8Array(0)),
        close: vi.fn(async () => undefined),
      }),
    });
    await expect(driver.connect()).resolves.toMatchObject({
      deviceInfo: { model: "X-S20" },
    });
    expect(device.reset).toHaveBeenCalledTimes(1);
    expect(device.claimInterface).toHaveBeenCalledTimes(2);
    expect(secondSession.open).toHaveBeenCalledTimes(1);
  });

  it("surfaces reset failure during OpenSession stale recovery", async () => {
    const firstSession = session({
      open: vi.fn(async () => {
        throw new LatentError("UsbDisconnect", "stale", undefined, {
          stage: "transfer-in",
        });
      }),
    });
    const device = new FakeUSBDevice();
    device.reset.mockRejectedValueOnce(new DOMException("reset denied", "NetworkError"));
    const usb = new FakeUsb([device]);
    await expect(driverWith(usb, firstSession).connect()).rejects.toMatchObject({
      stage: "reset",
    });
  });

  it("closes the USB device when claim recovery still fails", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface
      .mockRejectedValueOnce(new DOMException("busy", "NetworkError"))
      .mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    const usb = new FakeUsb([device]);

    await expect(driverWith(usb).connect()).rejects.toMatchObject({
      stage: "claim",
    });
    expect(device.close).toHaveBeenCalledTimes(1);
  });

  it("closes the transport when device info read fails", async () => {
    const fakeSession = session({
      getDeviceInfo: vi.fn(async () => {
        throw new Error("device info failed");
      }),
    });
    const transport = {
      send: vi.fn(async () => undefined),
      receive: vi.fn(async () => new Uint8Array(0)),
      close: vi.fn(async () => undefined),
    };
    const driver = new WebUsbCameraDriver({
      usb: new FakeUsb() as unknown as USB,
      sessionFactory: () => fakeSession,
      transportFactory: () => transport,
    });

    await expect(driver.connect()).rejects.toThrow("device info failed");
    expect(fakeSession.close).toHaveBeenCalledTimes(1);
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it("WebUsbSessionPort reports isOpen from FujiCameraSession state", () => {
    expect(new WebUsbSessionPort(session()).isOpen()).toBe(true);
    expect(new WebUsbSessionPort(session({ state: "closed" })).isOpen()).toBe(false);
  });

  it("WebUsbSessionPort reads device properties and presets", async () => {
    const fakeSession = session({
      getDevicePropValue: vi.fn(async () => ({
        bytes: new Uint8Array([0x64, 0x00]),
        value: 100,
      })),
      getPreset: vi.fn(async () => ({
        slot: 2,
        name: "C2",
        settings: [
          {
            id: 0xd190,
            name: "P:DynamicRange%",
            bytes: new Uint8Array([0x64, 0x00]),
            value: 100,
          },
          {
            id: 0xd192,
            name: "P:FilmSimulation",
            bytes: new Uint8Array([0x0e, 0x00]),
            value: 14,
          },
          {
            id: 0xd195,
            name: "P:GrainEffect",
            bytes: new Uint8Array([0x05, 0x00]),
            value: 5,
          },
          {
            id: 0xd199,
            name: "P:WhiteBalance",
            bytes: new Uint8Array([0x02, 0x00]),
            value: 2,
          },
          {
            id: 0xd19a,
            name: "P:WBShiftR",
            bytes: new Uint8Array([0xf8, 0xff]),
            value: -8,
          },
          {
            id: 0xd19b,
            name: "P:WBShiftB",
            bytes: new Uint8Array([0xf8, 0xff]),
            value: -8,
          },
          {
            id: 0xd19d,
            name: "P:HighlightTone×10",
            bytes: new Uint8Array([0x0a, 0x00]),
            value: 10,
          },
        ],
        missing: [],
      })),
    });
    const port = new WebUsbSessionPort(fakeSession);
    await expect(port.getDevicePropValue(0xd190)).resolves.toEqual({
      kind: "uint16",
      value: 100,
    });
    await expect(port.getPreset(2)).resolves.toMatchObject({
      slot: 2,
      name: "C2",
      properties: {
        "0xd190": expect.objectContaining({ value: 100 }),
      },
      decoded: {
        filmSimulation: { value: 14, label: "Acros + Red" },
        dynamicRange: { value: 1, label: "DR 100%" },
        whiteBalance: expect.objectContaining({ value: 2, label: "Auto" }),
        wbShift: { r: -8, b: -8 },
        highlightTone: 1,
        grainEffect: expect.objectContaining({
          value: 259,
          label: "Strong Large",
        }),
      },
    });
  });

  it("WebUsbSessionPort decodes 0xffff dynamic range as DR Auto", async () => {
    const fakeSession = session({
      getPreset: vi.fn(async () => ({
        slot: 2,
        name: "DR Auto",
        settings: [
          {
            id: 0xd190,
            name: "P:DynamicRange%",
            bytes: new Uint8Array([0xff, 0xff]),
            value: -1,
          },
        ],
        missing: [],
      })),
    });
    const port = new WebUsbSessionPort(fakeSession);
    await expect(port.getPreset(2)).resolves.toMatchObject({
      decoded: {
        dynamicRange: { value: -1, label: "DR Auto" },
      },
    });
  });

  it("WebUsbSessionPort forwards raw preview rendering to the Fuji session", async () => {
    const fakeSession = session();
    const port = new WebUsbSessionPort(fakeSession);

    await expect(port.renderRawPreview(new Uint8Array([1, 2, 3]))).resolves.toEqual({
      jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      baseProfile: new Uint8Array([1, 2, 3, 4]),
    });
    expect(fakeSession.renderRawPreview).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      undefined,
      undefined,
    );
  });
});

describe("claimWithReset", () => {
  it("succeeds first try without reset", async () => {
    const device = new FakeUSBDevice();
    await claimWithReset(device as unknown as USBDevice, 0);
    expect(device.claimInterface).toHaveBeenCalledTimes(1);
    expect(device.reset).not.toHaveBeenCalled();
  });

  it("does not reset when failure is not claim collision", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface.mockRejectedValueOnce(new DOMException("missing", "NotFoundError"));
    await expect(claimWithReset(device as unknown as USBDevice, 0)).rejects.toMatchObject({
      stage: "claim",
    });
    expect(device.reset).not.toHaveBeenCalled();
  });

  it("wraps reset failure with stage reset", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    device.reset.mockRejectedValueOnce(new DOMException("no", "NetworkError"));
    await expect(claimWithReset(device as unknown as USBDevice, 0)).rejects.toMatchObject({
      stage: "reset",
    });
  });

  it("wraps reconfiguration failure with stage setup-config", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    device.selectConfiguration.mockRejectedValueOnce(new DOMException("no", "NetworkError"));
    await expect(claimWithReset(device as unknown as USBDevice, 0)).rejects.toMatchObject({
      stage: "setup-config",
    });
  });

  it("wraps endpoint discovery failure with stage endpoint-discovery", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    device.configuration = { configurationValue: 1, interfaces: [] } as unknown as USBConfiguration;
    device.selectConfiguration.mockImplementationOnce(async () => undefined);
    await expect(claimWithReset(device as unknown as USBDevice, 0)).rejects.toMatchObject({
      stage: "endpoint-discovery",
    });
  });

  it("wraps second claim failure with stage claim", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface
      .mockRejectedValueOnce(new DOMException("busy", "NetworkError"))
      .mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    await expect(claimWithReset(device as unknown as USBDevice, 0)).rejects.toMatchObject({
      stage: "claim",
    });
  });

  it("reclaims after reset and endpoint rediscovery", async () => {
    const device = new FakeUSBDevice();
    device.claimInterface.mockRejectedValueOnce(new DOMException("busy", "NetworkError"));
    await claimWithReset(device as unknown as USBDevice, 0);
    expect(device.reset).toHaveBeenCalledTimes(1);
    expect(device.claimInterface).toHaveBeenCalledTimes(2);
  });
});

describe("OpenSession staging and cleanup", () => {
  it("rewraps LatentError as stage open", async () => {
    const fakeSession = session({
      open: vi.fn(async () => {
        throw new LatentError("UsbDisconnect", "transfer", undefined, { stage: "transfer-in" });
      }),
    });
    await expect(openSessionWithStaging(fakeSession)).rejects.toMatchObject({
      stage: "open",
    });
  });

  it("wraps non-LatentError as stage open", async () => {
    const fakeSession = session({
      open: vi.fn(async () => {
        throw new Error("raw");
      }),
    });
    await expect(openSessionWithStaging(fakeSession)).rejects.toMatchObject({
      category: "UsbDisconnect",
      stage: "open",
    });
  });

  it("disconnect sends CloseSession before releasing interface", async () => {
    const fakeSession = session();
    const driver = driverWith(new FakeUsb(), fakeSession);
    await driver.connect();
    await driver.disconnect();
    expect(fakeSession.close).toHaveBeenCalledTimes(1);
  });

  it("disconnect is idempotent", async () => {
    const fakeSession = session();
    const driver = driverWith(new FakeUsb(), fakeSession);
    await driver.connect();
    await driver.disconnect();
    await driver.disconnect();
    expect(fakeSession.close).toHaveBeenCalledTimes(1);
  });

  it("disconnect swallows close errors", async () => {
    const fakeSession = session({
      close: vi.fn(async () => {
        throw new Error("close failed");
      }),
    });
    const driver = driverWith(new FakeUsb(), fakeSession);
    await driver.connect();
    await expect(driver.disconnect()).resolves.toBeUndefined();
  });

  it("DriverConnectResult.dispose closes only its own port", async () => {
    const firstSession = session();
    const secondSession = session();
    const usb = new FakeUsb([new FakeUSBDevice()]);
    const driver = new WebUsbCameraDriver({
      usb: usb as unknown as USB,
      sessionFactory: vi.fn().mockReturnValueOnce(firstSession).mockReturnValueOnce(secondSession),
      transportFactory: () => ({
        send: vi.fn(async () => undefined),
        receive: vi.fn(async () => new Uint8Array(0)),
        close: vi.fn(async () => undefined),
      }),
    });
    const first = await driver.connect();
    const second = await driver.connect();
    await first.dispose();
    expect(firstSession.close).toHaveBeenCalledTimes(1);
    expect(second.port.isOpen()).toBe(true);
  });
});

describe("events, probe, and fireCloseSession", () => {
  it.each([
    ["vendor mismatch", { vendorId: 1, productId: 0x02de, serialNumber: "USB-123" }, false],
    ["product mismatch", { vendorId: 0x04cb, productId: 1, serialNumber: "USB-123" }, false],
    ["USB serial mismatch", { vendorId: 0x04cb, productId: 0x02de, serialNumber: "OTHER" }, false],
    ["matching descriptor", { vendorId: 0x04cb, productId: 0x02de, serialNumber: "USB-123" }, true],
  ] as const)("connect event filter handles %s", async (_name, patch, shouldFire) => {
    const device = new FakeUSBDevice();
    const usb = new FakeUsb([device]);
    const driver = driverWith(usb);
    await driver.connect();
    const handler = vi.fn();
    driver.subscribeConnectEvents(handler);
    const eventDevice = Object.assign(new FakeUSBDevice(), patch);
    usb.devices = shouldFire ? [eventDevice] : [device];
    usb.emitConnect(eventDevice);
    await Promise.resolve();
    expect(handler).toHaveBeenCalledTimes(shouldFire ? 1 : 0);
  });

  it("connect event ignores permission revoked", async () => {
    const usb = new FakeUsb([new FakeUSBDevice()]);
    const driver = driverWith(usb);
    await driver.connect();
    const handler = vi.fn();
    driver.subscribeConnectEvents(handler);
    usb.devices = [];
    usb.emitConnect(new FakeUSBDevice());
    await Promise.resolve();
    expect(handler).not.toHaveBeenCalled();
  });

  it("disconnect event fires for matching descriptor", async () => {
    const device = new FakeUSBDevice();
    const usb = new FakeUsb([device]);
    const driver = driverWith(usb);
    await driver.connect();
    const handler = vi.fn();
    driver.subscribeDisconnectEvents(handler);
    usb.emitDisconnect(device);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("probe returns true when GetDeviceInfo succeeds", async () => {
    const driver = driverWith();
    await driver.connect();
    await expect(driver.probe()).resolves.toBe(true);
  });

  it("probe returns false on timeout, stall, or closed port", async () => {
    const fakeSession = session({
      getDeviceInfo: vi
        .fn()
        .mockResolvedValueOnce({
          model: "X-S20",
          firmwareVersion: "1.10",
          serialNumber: "PTP-123",
          supportedOps: [0x1001],
        })
        .mockRejectedValueOnce(new LatentError("PtpStall", "stall")),
    });
    const driver = driverWith(new FakeUsb(), fakeSession);
    await driver.connect();
    await expect(driver.probe()).resolves.toBe(false);
    await driver.disconnect();
    await expect(driver.probe()).resolves.toBe(false);
  });

  it("fireCloseSession returns synchronously and swallows send rejection", async () => {
    const fakeSession = session({
      fireCloseSession: vi.fn(() => {
        throw new Error("send failed");
      }),
    });
    const driver = driverWith(new FakeUsb(), fakeSession);
    await driver.connect();
    expect(() => driver.fireCloseSession()).not.toThrow();
  });
});
