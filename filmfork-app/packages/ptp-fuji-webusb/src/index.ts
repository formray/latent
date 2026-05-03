/**
 * @filmfork/ptp-fuji-webusb — WebUSB-backed PtpTransport for Fujifilm cameras.
 *
 * Browser-only package. Pairs with `@filmfork/ptp-fuji` (transport-agnostic
 * core) to drive a Fujifilm X-S20 over WebUSB from a Chromium-based browser.
 *
 * Public surface (filled in across commits in this batch):
 *   - {@link WebUsbPtpTransport} — `PtpTransport` over a `USBDevice`.
 */

export { WebUsbPtpTransport } from "./webusb-transport.js";
export type { WebUsbPtpTransportOptions } from "./webusb-transport.js";
