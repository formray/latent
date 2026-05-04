export const PACKAGE_NAME = "@latent/ptp-fuji";

export { FujiCameraSession } from "./ptp/session.js";
export type {
  FujiDeviceInfo,
  FujiDevicePropValue,
  FujiRawPreset,
  FujiRawProp,
  SessionOptions,
  SessionState,
} from "./ptp/session.js";
export { LatentError } from "./errors.js";
export type { LatentErrorCategory } from "./errors.js";
export type { PtpTransport, TransportOptions } from "./transport/transport.js";
