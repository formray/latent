import { afterEach, describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import {
  getAlreadyPairedFujiCameras,
  requestFujiCamera,
} from "../src/request-camera.js";

/**
 * Tests stub `globalThis.navigator.usb` directly. We can't use vi.stubGlobal
 * for nested properties cleanly, so we save+restore the navigator reference
 * via Object.defineProperty since `navigator` is a getter on globalThis in
 * Node.
 */

function setNavigator(value: unknown): () => void {
  const desc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    writable: true,
    value,
  });
  return () => {
    if (desc) {
      Object.defineProperty(globalThis, "navigator", desc);
    } else {
      delete (globalThis as { navigator?: unknown }).navigator;
    }
  };
}

function makeMockDevice(opts: {
  vendorId?: number;
  alreadyOpened?: boolean;
  configValue?: number;
  failClaim?: boolean;
} = {}): {
  device: {
    vendorId: number;
    productId: number;
    productName: string;
    opened: boolean;
    configuration: {
      configurationValue: number;
      interfaces: Array<{
        interfaceNumber: number;
        alternate: {
          interfaceClass: number;
          endpoints: Array<{
            endpointNumber: number;
            direction: "in" | "out";
            type: "bulk" | "interrupt" | "isochronous";
          }>;
        };
      }>;
    };
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    selectConfiguration: ReturnType<typeof vi.fn>;
    claimInterface: ReturnType<typeof vi.fn>;
    releaseInterface: ReturnType<typeof vi.fn>;
    transferIn: ReturnType<typeof vi.fn>;
    transferOut: ReturnType<typeof vi.fn>;
  };
} {
  const device = {
    vendorId: opts.vendorId ?? 0x04cb,
    productId: 0x02de,
    productName: "X-S20",
    opened: opts.alreadyOpened ?? false,
    configuration: {
      configurationValue: opts.configValue ?? 1,
      interfaces: [
        {
          interfaceNumber: 0,
          alternate: {
            interfaceClass: 0x06, // Image
            endpoints: [
              { endpointNumber: 1, direction: "in" as const, type: "bulk" as const },
              { endpointNumber: 2, direction: "out" as const, type: "bulk" as const },
              {
                endpointNumber: 3,
                direction: "in" as const,
                type: "interrupt" as const,
              },
            ],
          },
        },
      ],
    },
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
    selectConfiguration: vi.fn(async () => undefined),
    claimInterface: vi.fn(async () => {
      if (opts.failClaim) throw new Error("interface busy");
    }),
    releaseInterface: vi.fn(async () => undefined),
    transferIn: vi.fn(),
    transferOut: vi.fn(),
  };
  return { device };
}

describe("requestFujiCamera", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws WebUSBSecureContextRequired when navigator.usb is undefined", async () => {
    const restore = setNavigator({});
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "WebUSBSecureContextRequired",
      });
    } finally {
      restore();
    }
  });

  it("throws WebUSBUnsupported when navigator itself is undefined", async () => {
    const restore = setNavigator(undefined);
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "WebUSBUnsupported",
      });
    } finally {
      restore();
    }
  });

  it("maps a NotFoundError from requestDevice to UsbPermissionDenied", async () => {
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => {
          const err = new Error("user cancelled");
          err.name = "NotFoundError";
          throw err;
        }),
        getDevices: vi.fn(),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "UsbPermissionDenied",
      });
    } finally {
      restore();
    }
  });

  it("maps a SecurityError from requestDevice to WebUSBSecureContextRequired", async () => {
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => {
          const err = new Error("blocked by feature policy");
          err.name = "SecurityError";
          throw err;
        }),
        getDevices: vi.fn(),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toBeInstanceOf(LatentError);
    } finally {
      restore();
    }
  });

  it("returns a transport on the success path", async () => {
    const { device } = makeMockDevice();
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => device),
        getDevices: vi.fn(async () => []),
      },
    });
    try {
      const result = await requestFujiCamera();
      expect(result.device).toBe(device);
      expect(result.transport).toBeDefined();
      expect(device.open).toHaveBeenCalled();
      expect(device.claimInterface).toHaveBeenCalledWith(0);
    } finally {
      restore();
    }
  });

  it("wraps open/select failures with stage setup-config", async () => {
    const { device } = makeMockDevice();
    device.open.mockRejectedValueOnce(new DOMException("blocked", "NetworkError"));
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => device),
        getDevices: vi.fn(async () => []),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "UsbDisconnect",
        stage: "setup-config",
        domException: "NetworkError",
      });
    } finally {
      restore();
    }
  });

  it("wraps claim failures with stage claim", async () => {
    const { device } = makeMockDevice();
    device.claimInterface.mockRejectedValueOnce(
      new DOMException("busy", "NetworkError"),
    );
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => device),
        getDevices: vi.fn(async () => []),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "UsbDisconnect",
        stage: "claim",
      });
    } finally {
      restore();
    }
  });

  it("stores DOMException name on claim failure", async () => {
    const { device } = makeMockDevice();
    device.claimInterface.mockRejectedValueOnce(
      new DOMException("busy", "NetworkError"),
    );
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => device),
        getDevices: vi.fn(),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        domException: "NetworkError",
      });
    } finally {
      restore();
    }
  });

  it("wraps claimInterface failure in UsbDisconnect and closes the device", async () => {
    const { device } = makeMockDevice({ failClaim: true });
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(async () => device),
        getDevices: vi.fn(),
      },
    });
    try {
      await expect(requestFujiCamera()).rejects.toMatchObject({
        category: "UsbDisconnect",
      });
      expect(device.close).toHaveBeenCalled();
    } finally {
      restore();
    }
  });
});

describe("getAlreadyPairedFujiCameras", () => {
  it("returns [] when navigator.usb is unavailable", async () => {
    const restore = setNavigator({});
    try {
      const out = await getAlreadyPairedFujiCameras();
      expect(out).toEqual([]);
    } finally {
      restore();
    }
  });

  it("filters getDevices() output by Fujifilm vendor ID", async () => {
    const fujiA = { vendorId: 0x04cb, productId: 1 } as unknown as USBDevice;
    const sony = { vendorId: 0x054c, productId: 2 } as unknown as USBDevice;
    const fujiB = { vendorId: 0x04cb, productId: 3 } as unknown as USBDevice;
    const restore = setNavigator({
      usb: {
        requestDevice: vi.fn(),
        getDevices: vi.fn(async () => [fujiA, sony, fujiB]),
      },
    });
    try {
      const out = await getAlreadyPairedFujiCameras();
      expect(out).toEqual([fujiA, fujiB]);
    } finally {
      restore();
    }
  });
});
