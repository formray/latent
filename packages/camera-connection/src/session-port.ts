export interface CameraSessionPort {
  getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;
  getDevicePropValue(code: number, signal?: AbortSignal): Promise<DeviceValue>;
  setDevicePropValue(
    code: number,
    value: DeviceValue,
    signal?: AbortSignal,
  ): Promise<void>;
  isOpen(): boolean;
}

export interface DeviceInfo {
  model: string;
  firmwareVersion: string;
  serialNumber?: string;
  supportedOps: number[];
}

export type DeviceValue =
  | { kind: "uint8"; value: number }
  | { kind: "uint16"; value: number }
  | { kind: "uint32"; value: number }
  | { kind: "string"; value: string }
  | { kind: "bytes"; value: Uint8Array };
