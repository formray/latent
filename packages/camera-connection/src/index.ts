export type {
  CameraDriver,
  ConnectOptions,
  DriverConnectResult,
} from "./driver.js";
export type {
  CameraSessionPort,
  DeviceInfo,
  DeviceValue,
} from "./session-port.js";
export {
  ERROR_REASONS,
  assertNever,
  type ConnectionState,
  type ErrorReason,
} from "./types.js";
export { classifyDriverError } from "./classifier.js";
export {
  backoffDelayMs,
  initialConnectionState,
  transition,
  type ConnectionContext,
  type ConnectionEffect,
  type ConnectionEvent,
  type TransitionResult,
} from "./state-machine.js";
export { WebUsbCameraDriver, WebUsbSessionPort } from "./drivers/webusb.js";
export {
  ConnectionManager,
  type ConnectionManagerOptions,
  type ManagerNotifications,
  type RawPreset,
} from "./manager.js";
