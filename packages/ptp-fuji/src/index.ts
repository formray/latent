export const PACKAGE_NAME = "@latent/ptp-fuji";

export { FujiCameraSession } from "./ptp/session.js";
export type {
  FujiDeviceInfo,
  FujiDevicePropValue,
  FujiRawPreviewResult,
  FujiRawPreset,
  FujiRawProp,
  SessionOptions,
  SessionState,
} from "./ptp/session.js";
export { LatentError } from "./errors.js";
export type { LatentErrorCategory } from "./errors.js";
export type { PtpTransport, TransportOptions } from "./transport/transport.js";
export { translatePresetToUI } from "./profile/preset-translate.js";
export type { PresetUIValues, RawProp } from "./profile/preset-translate.js";
export {
  ColorChromeFxBlueLabels,
  ColorChromeLabels,
  DynRangeLabels,
  FilmSimLabels,
  GrainSizeLabels,
  GrainStrengthLabels,
  SmoothSkinLabels,
  WBModeLabels,
} from "./profile/enums.js";
