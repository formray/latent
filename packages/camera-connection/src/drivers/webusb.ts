import {
  FujiCameraSession,
  LatentError,
  type FujiDeviceInfo,
  type PtpTransport,
  type FujiRawPreset,
} from "@latent/ptp-fuji";
import { WebUsbPtpTransport } from "@latent/ptp-fuji-webusb";
import type { CameraDriver, ConnectOptions, DriverConnectResult } from "../driver.js";
import type { CameraSessionPort, DeviceInfo, DeviceValue } from "../session-port.js";

const FUJI_VENDOR_ID = 0x04cb;
const USB_CLASS_IMAGE = 0x06;

type FujiSessionLike = Pick<
  FujiCameraSession,
  | "open"
  | "close"
  | "fireCloseSession"
  | "getDeviceInfo"
  | "getDevicePropValue"
  | "setDevicePropValue"
  | "getPreset"
  | "state"
>;

export interface WebUsbCameraDriverOptions {
  usb?: USB;
  configurationValue?: number;
  sessionFactory?: (transport: PtpTransport) => FujiSessionLike;
  transportFactory?: (
    device: USBDevice,
    endpointIn: number,
    endpointOut: number,
    options: { interfaceNumber: number },
  ) => PtpTransport;
}

export class WebUsbSessionPort implements CameraSessionPort {
  constructor(private readonly session: FujiSessionLike) {}

  async getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo> {
    return this.session.getDeviceInfo(signal);
  }

  async getDevicePropValue(code: number, signal?: AbortSignal): Promise<DeviceValue> {
    return toDeviceValue(await this.session.getDevicePropValue(code, signal));
  }

  async setDevicePropValue(
    code: number,
    value: DeviceValue,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.session.setDevicePropValue(code, fromDeviceValue(value), signal);
  }

  async getPreset(slot: number, signal?: AbortSignal): Promise<{
    slot: number;
    name?: string;
    properties: Record<string, unknown>;
  }> {
    return toRawPreset(await this.session.getPreset(slot, signal));
  }

  isOpen(): boolean {
    return this.session.state === "open";
  }
}

function toDeviceValue(value: { bytes: Uint8Array; value: number | string | Uint8Array }): DeviceValue {
  if (typeof value.value === "string") return { kind: "string", value: value.value };
  if (typeof value.value !== "number") return { kind: "bytes", value: value.bytes };
  if (value.bytes.byteLength <= 1) return { kind: "uint8", value: value.value };
  if (value.bytes.byteLength <= 2) return { kind: "uint16", value: value.value & 0xffff };
  return { kind: "uint32", value: value.value };
}

function fromDeviceValue(value: DeviceValue): Uint8Array {
  switch (value.kind) {
    case "uint8":
      return new Uint8Array([value.value & 0xff]);
    case "uint16": {
      const bytes = new Uint8Array(2);
      new DataView(bytes.buffer).setUint16(0, value.value, true);
      return bytes;
    }
    case "uint32": {
      const bytes = new Uint8Array(4);
      new DataView(bytes.buffer).setUint32(0, value.value, true);
      return bytes;
    }
    case "string":
      return encodePtpString(value.value);
    case "bytes":
      return value.value;
  }
}

function encodePtpString(value: string): Uint8Array {
  if (!value) return new Uint8Array([0]);
  const bytes = new Uint8Array(1 + (value.length + 1) * 2);
  bytes[0] = value.length + 1;
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < value.length; index++) {
    view.setUint16(1 + index * 2, value.charCodeAt(index), true);
  }
  return bytes;
}

function toRawPreset(preset: FujiRawPreset): {
  slot: number;
  name?: string;
  properties: Record<string, unknown>;
} {
  const properties: Record<string, unknown> = {};
  for (const setting of preset.settings) {
    properties[`0x${setting.id.toString(16)}`] = {
      id: setting.id,
      name: setting.name,
      value: setting.value,
      bytes: Array.from(setting.bytes),
    };
  }
  if (preset.missing.length > 0) {
    properties["_missing"] = preset.missing.map((code) => `0x${code.toString(16)}`);
  }
  return {
    slot: preset.slot,
    ...(preset.name ? { name: preset.name } : {}),
    properties,
  };
}

export class WebUsbCameraDriver implements CameraDriver {
  private readonly usb: USB;
  private readonly configurationValue: number;
  private readonly sessionFactory: (transport: PtpTransport) => FujiSessionLike;
  private readonly transportFactory: NonNullable<WebUsbCameraDriverOptions["transportFactory"]>;
  private activeResult: DriverConnectResult | undefined;
  private activeSession: FujiSessionLike | undefined;
  private activeProductId: number | undefined;
  private activeUsbSerialNumber: string | undefined;

  constructor(options: WebUsbCameraDriverOptions = {}) {
    const usb = options.usb ?? globalThis.navigator?.usb;
    if (!usb) {
      throw new LatentError("WebUSBUnsupported", "WebUSB is not available");
    }
    this.usb = usb;
    this.configurationValue = options.configurationValue ?? 1;
    this.sessionFactory = options.sessionFactory ?? ((transport) => new FujiCameraSession(transport));
    this.transportFactory = options.transportFactory ?? ((device, endpointIn, endpointOut, opts) =>
      new WebUsbPtpTransport(device, endpointIn, endpointOut, opts));
  }

  async connect(opts: ConnectOptions = {}): Promise<DriverConnectResult> {
    throwIfAborted(opts.signal);
    const device = await this.selectDevice(opts);
    throwIfAborted(opts.signal);
    await openAndSelect(device, this.configurationValue);
    const initialInterface = pickPtpInterface(device);
    await claimWithReset(device, initialInterface.interfaceNumber, this.configurationValue);
    let iface = pickPtpInterface(device);
    let transport = this.transportFactory(device, iface.endpointIn, iface.endpointOut, {
      interfaceNumber: iface.interfaceNumber,
    });
    let session = this.sessionFactory(transport);
    try {
      await openSessionWithStaging(session, opts.signal);
    } catch (err) {
      if (nameOf(err) === "AbortError") throw err;
      if (!(err instanceof LatentError) || err.stage !== "open") throw err;
      await disposeSessionTransport(session, transport);
      iface = await recoverFromOpenSessionFailure(
        device,
        this.configurationValue,
      );
      transport = this.transportFactory(device, iface.endpointIn, iface.endpointOut, {
        interfaceNumber: iface.interfaceNumber,
      });
      session = this.sessionFactory(transport);
      await openSessionWithStaging(session, opts.signal);
    }
    const port = new WebUsbSessionPort(session);
    let deviceInfo: DeviceInfo;
    try {
      deviceInfo = await port.getDeviceInfo(opts.signal);
    } catch (err) {
      await disposeSessionTransport(session, transport);
      throw err;
    }

    let disposed = false;
    const result: DriverConnectResult = {
      port,
      deviceInfo,
      ...(device.serialNumber ? { usbSerialNumber: device.serialNumber } : {}),
      dispose: async () => {
        if (disposed) return;
        disposed = true;
        await disposeSessionTransport(session, transport);
      },
    };

    this.activeResult = result;
    this.activeSession = session;
    this.activeProductId = device.productId;
    this.activeUsbSerialNumber = device.serialNumber ?? undefined;
    return result;
  }

  async disconnect(): Promise<void> {
    const result = this.activeResult;
    this.activeResult = undefined;
    this.activeSession = undefined;
    if (!result) return;
    await result.dispose();
  }

  subscribeDisconnectEvents(handler: () => void): () => void {
    const listener = (event: Event) => {
      const device = (event as USBConnectionEvent).device;
      if (this.matchesActiveDevice(device, false)) handler();
    };
    this.usb.addEventListener("disconnect", listener);
    return () => this.usb.removeEventListener("disconnect", listener);
  }

  subscribeConnectEvents(handler: () => void): () => void {
    const listener = (event: Event) => {
      void (async () => {
        const device = (event as USBConnectionEvent).device;
        if (!this.matchesActiveDevice(device, true)) return;
        const paired = await this.usb.getDevices();
        const stillPaired = paired.some((candidate) =>
          this.matchesActiveDevice(candidate, true),
        );
        if (stillPaired) handler();
      })();
    };
    this.usb.addEventListener("connect", listener);
    return () => this.usb.removeEventListener("connect", listener);
  }

  fireCloseSession(): void {
    try {
      this.activeSession?.fireCloseSession();
    } catch {
      // strict best-effort
    }
  }

  async probe(timeoutMs = 1_000): Promise<boolean> {
    const port = this.activeResult?.port;
    if (!port?.isOpen()) return false;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("probe timeout")), timeoutMs);
      });
      await Promise.race([port.getDeviceInfo(), timeout]);
      return true;
    } catch {
      return false;
    }
  }

  private async selectDevice(opts: ConnectOptions): Promise<USBDevice> {
    if (opts.autoSelectPaired) {
      const devices = await this.usb.getDevices();
      const paired = devices.find((device) => device.vendorId === FUJI_VENDOR_ID);
      if (paired) return paired;
    }
    return this.usb.requestDevice({ filters: [{ vendorId: FUJI_VENDOR_ID }] });
  }

  private matchesActiveDevice(device: USBDevice, checkSerial: boolean): boolean {
    if (device.vendorId !== FUJI_VENDOR_ID) return false;
    if (this.activeProductId !== undefined && device.productId !== this.activeProductId) {
      return false;
    }
    if (
      checkSerial &&
      this.activeUsbSerialNumber !== undefined &&
      device.serialNumber !== this.activeUsbSerialNumber
    ) {
      return false;
    }
    return true;
  }
}

async function disposeSessionTransport(
  session: FujiSessionLike,
  transport: PtpTransport,
): Promise<void> {
  try {
    await session.close();
  } catch {
    try {
      await transport.close();
    } catch {
      // best-effort cleanup
    }
  }
}

export async function claimWithReset(
  device: USBDevice,
  iface: number,
  configurationValue = 1,
): Promise<void> {
  try {
    await device.claimInterface(iface);
    return;
  } catch (firstClaimErr) {
    if (!isClaimCollision(firstClaimErr)) {
      throw stageError("claim", "claimInterface failed", firstClaimErr);
    }

    try {
      await device.reset();
    } catch (resetErr) {
      throw stageError("reset", "device.reset() failed", resetErr);
    }

    try {
      await device.selectConfiguration(configurationValue);
    } catch (setupErr) {
      throw stageError("setup-config", "selectConfiguration failed after reset", setupErr);
    }

    try {
      pickPtpInterface(device);
    } catch (endpointErr) {
      throw stageError("endpoint-discovery", "endpoint rediscovery failed", endpointErr);
    }

    try {
      await device.claimInterface(iface);
    } catch (secondClaimErr) {
      throw stageError(
        "claim",
        "claimInterface failed after device.reset()",
        secondClaimErr,
      );
    }
  }
}

export async function openSessionWithStaging(
  session: FujiSessionLike,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await session.open(signal);
  } catch (err) {
    if (nameOf(err) === "AbortError") throw err;
    if (err instanceof LatentError) {
      throw new LatentError(err.category, "OpenSession failed", err.cause, {
        ...err.metadata,
        stage: "open",
      });
    }
    throw new LatentError("UsbDisconnect", "OpenSession failed", err, {
      stage: "open",
      domException: nameOf(err),
      platform: detectPlatform(),
    });
  }
}

interface PtpInterfaceInfo {
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

function pickPtpInterface(device: USBDevice): PtpInterfaceInfo {
  const config = device.configuration;
  if (!config) {
    throw stageError("setup-config", "device has no active USB configuration");
  }
  const candidates = [
    ...config.interfaces.filter(
      (iface) => iface.alternate?.interfaceClass === USB_CLASS_IMAGE,
    ),
    ...config.interfaces,
  ];
  for (const iface of candidates) {
    const alt = iface.alternate;
    if (!alt) continue;
    let endpointIn: number | undefined;
    let endpointOut: number | undefined;
    for (const endpoint of alt.endpoints) {
      if (endpoint.type !== "bulk") continue;
      if (endpoint.direction === "in") endpointIn = endpoint.endpointNumber;
      if (endpoint.direction === "out") endpointOut = endpoint.endpointNumber;
    }
    if (endpointIn !== undefined && endpointOut !== undefined) {
      return { interfaceNumber: iface.interfaceNumber, endpointIn, endpointOut };
    }
  }
  throw stageError("endpoint-discovery", "no PTP interface with bulk IN/OUT endpoints found");
}

async function openAndSelect(device: USBDevice, configurationValue: number): Promise<void> {
  try {
    if (!device.opened) await device.open();
    if (!device.configuration || device.configuration.configurationValue !== configurationValue) {
      await device.selectConfiguration(configurationValue);
    }
  } catch (err) {
    throw stageError("setup-config", "failed to open/select configuration", err);
  }
}

async function recoverFromOpenSessionFailure(
  device: USBDevice,
  configurationValue: number,
): Promise<PtpInterfaceInfo> {
  try {
    await device.reset();
  } catch (resetErr) {
    throw stageError("reset", "device.reset() failed after OpenSession failure", resetErr);
  }

  await openAndSelect(device, configurationValue);
  const iface = pickPtpInterface(device);
  try {
    await device.claimInterface(iface.interfaceNumber);
  } catch (claimErr) {
    throw stageError(
      "claim",
      "claimInterface failed after OpenSession recovery reset",
      claimErr,
    );
  }
  return iface;
}

function isClaimCollision(err: unknown): boolean {
  return nameOf(err) === "NetworkError";
}

function stageError(
  stage: NonNullable<LatentError["stage"]>,
  message: string,
  cause?: unknown,
): LatentError {
  return new LatentError("UsbDisconnect", message, cause, {
    stage,
    domException: nameOf(cause),
    platform: detectPlatform(),
  });
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (!signal?.aborted) return;
  throw new DOMException("transfer aborted", "AbortError");
}

function nameOf(err: unknown): string | undefined {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return err.name;
  }
  const maybe = err as { name?: unknown } | null;
  return typeof maybe?.name === "string" ? maybe.name : undefined;
}

function detectPlatform(): "mac" | "windows" | "linux" | "unknown" {
  const platform = globalThis.navigator?.platform?.toLowerCase() ?? "";
  if (platform.includes("mac")) return "mac";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";
  return "unknown";
}

void (undefined as FujiDeviceInfo | undefined);
