import type { CameraSessionPort, DeviceInfo } from "./session-port.js";

export interface CameraDriver {
  connect(opts?: ConnectOptions): Promise<DriverConnectResult>;
  disconnect(): Promise<void>;
  subscribeDisconnectEvents(handler: () => void): () => void;
  subscribeConnectEvents(handler: () => void): () => void;
  fireCloseSession(): void;
  probe(timeoutMs?: number): Promise<boolean>;
}

export interface ConnectOptions {
  autoSelectPaired?: boolean;
  signal?: AbortSignal;
}

export interface DriverConnectResult {
  port: CameraSessionPort;
  deviceInfo: DeviceInfo;
  usbSerialNumber?: string;
  dispose(): Promise<void>;
}
