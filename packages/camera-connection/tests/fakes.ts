import { vi } from "vitest";
import type { CameraDriver, DriverConnectResult } from "../src/driver.js";
import type { CameraSessionPort, DeviceInfo, DeviceValue } from "../src/session-port.js";

export class FakeSessionPort implements CameraSessionPort {
  open = true;
  deviceInfo: DeviceInfo = {
    model: "X-S20",
    firmwareVersion: "1.10",
    serialNumber: "PTP-123",
    supportedOps: [0x1001, 0x1002, 0x1003, 0x1015, 0x1016],
  };

  getDeviceInfo = vi.fn(async () => this.deviceInfo);
  getDevicePropValue = vi.fn(async (_code: number): Promise<DeviceValue> => ({ kind: "uint16", value: 1 }));
  setDevicePropValue = vi.fn(async () => undefined);
  getPreset = vi.fn(async (slot: number) => ({
    slot,
    name: `C${slot}`,
    properties: {},
  }));
  isOpen = vi.fn(() => this.open);
}

export class FakeCameraDriver implements CameraDriver {
  port = new FakeSessionPort();
  connectCalls: Array<{ signal?: AbortSignal; autoSelectPaired?: boolean }> = [];
  disconnect = vi.fn(async () => undefined);
  fireCloseSession = vi.fn(() => undefined);
  probe = vi.fn(async () => true);
  private disconnectHandlers = new Set<() => void>();
  private connectHandlers = new Set<() => void>();

  async connect(opts: { autoSelectPaired?: boolean; signal?: AbortSignal } = {}): Promise<DriverConnectResult> {
    this.connectCalls.push(opts);
    return {
      port: this.port,
      deviceInfo: this.port.deviceInfo,
      usbSerialNumber: "USB-123",
      dispose: vi.fn(async () => {
        this.port.open = false;
      }),
    };
  }

  subscribeDisconnectEvents(handler: () => void): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  subscribeConnectEvents(handler: () => void): () => void {
    this.connectHandlers.add(handler);
    return () => {
      this.connectHandlers.delete(handler);
    };
  }

  emitDisconnect(): void {
    for (const handler of this.disconnectHandlers) handler();
  }

  emitConnect(): void {
    for (const handler of this.connectHandlers) handler();
  }
}

export class FakeUSBDevice extends EventTarget {
  vendorId = 0x04cb;
  productId = 0x02de;
  serialNumber?: string = "USB-123";
  opened = false;
  configuration: USBConfiguration | null = makeConfiguration();
  open = vi.fn(async () => {
    this.opened = true;
  });
  close = vi.fn(async () => {
    this.opened = false;
  });
  selectConfiguration = vi.fn(async () => {
    this.configuration = makeConfiguration();
  });
  claimInterface = vi.fn(async () => undefined);
  releaseInterface = vi.fn(async () => undefined);
  reset = vi.fn(async () => undefined);
  transferIn = vi.fn(async () => ({ status: "ok", data: new DataView(new ArrayBuffer(0)) }));
  transferOut = vi.fn(async () => ({ status: "ok", bytesWritten: 0 }));
}

export class FakeUsb extends EventTarget {
  requestDevice = vi.fn(async () => this.devices[0] as USBDevice);
  getDevices = vi.fn(async () => this.devices as USBDevice[]);

  constructor(public devices: FakeUSBDevice[] = [new FakeUSBDevice()]) {
    super();
  }

  emitConnect(device: FakeUSBDevice): void {
    this.dispatchEvent(new FakeUSBConnectionEvent("connect", device));
  }

  emitDisconnect(device: FakeUSBDevice): void {
    this.dispatchEvent(new FakeUSBConnectionEvent("disconnect", device));
  }
}

class FakeUSBConnectionEvent extends Event {
  constructor(type: string, readonly device: FakeUSBDevice) {
    super(type);
  }
}

function makeConfiguration(): USBConfiguration {
  return {
    configurationValue: 1,
    interfaces: [
      {
        interfaceNumber: 0,
        alternate: {
          interfaceClass: 0x06,
          endpoints: [
            { endpointNumber: 1, direction: "in", type: "bulk" },
            { endpointNumber: 2, direction: "out", type: "bulk" },
          ],
        },
      },
    ],
  } as unknown as USBConfiguration;
}
