/**
 * Browser-side discovery of Fujifilm cameras over WebUSB.
 *
 * `requestFujiCamera()` MUST be called from a user gesture (click handler) —
 * `navigator.usb.requestDevice` requires it. After the user grants
 * permission once for a given device, `getAlreadyPairedFujiCameras()` can
 * silently return it on subsequent visits.
 *
 * Reference: filmkit/src/ptp/transport.ts § connect() for the canonical
 * open/select/claim sequence and endpoint discovery.
 */

import { LatentError } from "@latent/ptp-fuji";
import {
  WebUsbPtpTransport,
  type WebUsbPtpTransportOptions,
} from "./webusb-transport.js";

/** Fujifilm USB vendor ID (matches filmkit FUJI_VENDOR_ID). */
const FUJI_VENDOR_ID = 0x04cb;
/** PTP/Image-class interface (USB-IF base class 0x06). */
const USB_CLASS_IMAGE = 0x06;

/** Result of {@link requestFujiCamera}. */
export interface RequestFujiCameraResult {
  /** The opened, claimed `USBDevice` — kept around for diagnostics. */
  device: USBDevice;
  /** Ready-to-use PTP transport; pass to `new FujiCameraSession(transport)`. */
  transport: WebUsbPtpTransport;
}

/** Optional knobs for {@link requestFujiCamera}. */
export interface RequestFujiCameraOptions extends WebUsbPtpTransportOptions {
  /** USB configuration value to select. Defaults to 1 (filmkit convention). */
  configurationValue?: number;
}

/**
 * Prompt the browser device picker for a Fujifilm camera, open it, claim
 * the PTP interface, resolve bulk endpoints, and return a live transport.
 *
 * Throws `LatentError` with one of:
 *   - `WebUSBSecureContextRequired` — `navigator.usb` is undefined (HTTP page)
 *   - `WebUSBUnsupported` — non-Chromium browser
 *   - `UsbPermissionDenied` — user cancelled the picker (`NotFoundError`)
 *   - `UsbDisconnect` — failed to claim/open the device (e.g. another app
 *     has it on macOS)
 */
export async function requestFujiCamera(
  options: RequestFujiCameraOptions = {},
): Promise<RequestFujiCameraResult> {
  assertWebUsbAvailable();

  let device: USBDevice;
  try {
    device = await navigator.usb.requestDevice({
      filters: [{ vendorId: FUJI_VENDOR_ID }],
    });
  } catch (err) {
    throw mapRequestDeviceError(err);
  }

  try {
    return await claimAndBuildTransport(device, options);
  } catch (err) {
    // Best-effort cleanup so we don't leave the device half-open.
    try {
      await device.close();
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * Return Fujifilm devices the user has already permitted for this origin.
 * Useful for silent reconnect after the first pairing — e.g. on a page
 * reload, the app can call this and skip the picker if a device is found.
 *
 * Returns an empty array if WebUSB is unavailable or no paired devices exist.
 */
export async function getAlreadyPairedFujiCameras(): Promise<USBDevice[]> {
  if (typeof navigator === "undefined" || !("usb" in navigator)) {
    return [];
  }
  const devices = await navigator.usb.getDevices();
  return devices.filter((d) => d.vendorId === FUJI_VENDOR_ID);
}

/** Open `device`, select config, claim PTP iface, find endpoints, wrap. */
async function claimAndBuildTransport(
  device: USBDevice,
  options: RequestFujiCameraOptions,
): Promise<RequestFujiCameraResult> {
  const configValue = options.configurationValue ?? 1;

  try {
    if (!device.opened) {
      await device.open();
    }
    if (
      !device.configuration ||
      device.configuration.configurationValue !== configValue
    ) {
      await device.selectConfiguration(configValue);
    }
  } catch (err) {
    throw new LatentError(
      "UsbDisconnect",
      `failed to open/select configuration on Fujifilm device: ${stringifyError(err)}`,
      err,
    );
  }

  const ifaceInfo = pickPtpInterface(device);
  try {
    await device.claimInterface(ifaceInfo.interfaceNumber);
  } catch (err) {
    throw new LatentError(
      "UsbDisconnect",
      `failed to claim PTP interface (another app may hold it): ${stringifyError(err)}`,
      err,
    );
  }

  const transportOptions: WebUsbPtpTransportOptions = {
    interfaceNumber: ifaceInfo.interfaceNumber,
  };
  if (options.maxChunkSize !== undefined) {
    transportOptions.maxChunkSize = options.maxChunkSize;
  }
  if (options.defaultTimeoutMs !== undefined) {
    transportOptions.defaultTimeoutMs = options.defaultTimeoutMs;
  }

  const transport = new WebUsbPtpTransport(
    device,
    ifaceInfo.endpointIn,
    ifaceInfo.endpointOut,
    transportOptions,
  );
  return { device, transport };
}

interface PtpInterfaceInfo {
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

/**
 * Locate the PTP-class interface and its bulk IN/OUT endpoints. Falls back
 * to interface 0 if no Image-class interface is advertised — some Fujifilm
 * bodies do not set the class code on every alt setting.
 */
function pickPtpInterface(device: USBDevice): PtpInterfaceInfo {
  const config = device.configuration;
  if (!config) {
    throw new LatentError(
      "UsbDisconnect",
      "device has no active USB configuration",
    );
  }

  // Prefer an Image-class (0x06) interface, else fall back to interface 0.
  const candidates = [
    ...config.interfaces.filter(
      (i) => i.alternate && i.alternate.interfaceClass === USB_CLASS_IMAGE,
    ),
    ...config.interfaces,
  ];

  for (const iface of candidates) {
    const alt = iface.alternate;
    if (!alt) continue;
    let inEp: number | undefined;
    let outEp: number | undefined;
    for (const ep of alt.endpoints) {
      if (ep.type !== "bulk") continue;
      if (ep.direction === "in") inEp = ep.endpointNumber;
      if (ep.direction === "out") outEp = ep.endpointNumber;
    }
    if (inEp !== undefined && outEp !== undefined) {
      return {
        interfaceNumber: iface.interfaceNumber,
        endpointIn: inEp,
        endpointOut: outEp,
      };
    }
  }

  throw new LatentError(
    "UsbDisconnect",
    "no PTP interface with bulk IN/OUT endpoints found",
  );
}

function assertWebUsbAvailable(): void {
  if (typeof navigator === "undefined") {
    throw new LatentError(
      "WebUSBUnsupported",
      "WebUSB is not available in this environment (no `navigator`)",
    );
  }
  if (!("usb" in navigator) || !navigator.usb) {
    // `navigator.usb` is gated to secure contexts (HTTPS or localhost) and
    // Chromium-based browsers. We can't distinguish here, so surface the
    // most actionable category — secure context — and let the caller hint
    // about browser support in copy.
    throw new LatentError(
      "WebUSBSecureContextRequired",
      "navigator.usb is undefined: WebUSB requires a secure context (HTTPS or localhost) on a Chromium-based browser",
    );
  }
}

function mapRequestDeviceError(err: unknown): LatentError {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    if (err.name === "NotFoundError") {
      return new LatentError(
        "UsbPermissionDenied",
        "user cancelled the WebUSB device picker",
        err,
      );
    }
    if (err.name === "SecurityError") {
      return new LatentError(
        "WebUSBSecureContextRequired",
        "WebUSB blocked: page must be served over HTTPS or localhost",
        err,
      );
    }
  }
  // DOMException-like duck-type check (some test environments stub it):
  const e = err as { name?: string; message?: string } | null;
  if (e && e.name === "NotFoundError") {
    return new LatentError(
      "UsbPermissionDenied",
      e.message ?? "user cancelled the WebUSB device picker",
      err,
    );
  }
  if (e && e.name === "SecurityError") {
    return new LatentError(
      "WebUSBSecureContextRequired",
      e.message ?? "WebUSB blocked by secure-context policy",
      err,
    );
  }
  return new LatentError(
    "UsbDisconnect",
    `WebUSB requestDevice failed: ${stringifyError(err)}`,
    err,
  );
}

function stringifyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
