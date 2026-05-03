export const PACKAGE_NAME = "@filmfork/ptp-fuji";

export { FujiCameraSession } from "./ptp/session.js";
export type { SessionOptions, SessionState } from "./ptp/session.js";
export { FilmForkError } from "./errors.js";
export type { FilmForkErrorCategory } from "./errors.js";
export type { PtpTransport, TransportOptions } from "./transport/transport.js";
