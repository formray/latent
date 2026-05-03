/**
 * @filmfork/ptp-fuji-webusb — WebUSB-backed PtpTransport for Fujifilm cameras.
 *
 * Browser-only package. Pairs with `@filmfork/ptp-fuji` (transport-agnostic
 * core) to drive a Fujifilm X-S20 over WebUSB from a Chromium-based browser.
 *
 * Public surface:
 *   - {@link WebUsbPtpTransport} — `PtpTransport` over a `USBDevice`.
 *   - {@link requestFujiCamera} — user-gesture entry point that prompts the
 *     browser device picker and returns an open transport.
 *   - {@link getAlreadyPairedFujiCameras} — enumerate previously-permitted
 *     Fujifilm devices for silent reconnect.
 */

export { WebUsbPtpTransport } from "./webusb-transport.js";
export type { WebUsbPtpTransportOptions } from "./webusb-transport.js";
export { requestFujiCamera, getAlreadyPairedFujiCameras } from "./request-camera.js";
export type {
  RequestFujiCameraResult,
  RequestFujiCameraOptions,
} from "./request-camera.js";
