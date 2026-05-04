export interface CameraSessionPort {
  getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;
  getDevicePropValue(code: number, signal?: AbortSignal): Promise<DeviceValue>;
  setDevicePropValue(code: number, value: DeviceValue, signal?: AbortSignal): Promise<void>;
  getPreset(slot: number, signal?: AbortSignal): Promise<RawPreset>;
  isOpen(): boolean;
}

export interface RawPreset {
  slot: number;
  name?: string;
  properties: Record<string, unknown>;
  decoded?: DecodedPresetValues;
}

export interface DecodedPresetValues {
  filmSimulation: DecodedPresetEnum;
  dynamicRange: DecodedPresetEnum;
  whiteBalance: DecodedPresetEnum & { colorTemperatureK?: number };
  wbShift: { r: number; b: number };
  highlightTone: number;
  shadowTone: number;
  color: number;
  sharpness: number;
  noiseReduction: number;
  clarity: number;
  grainEffect: DecodedPresetEnum & { strength: string; size: string };
  colorChromeEffect: DecodedPresetEnum;
  colorChromeEffectBlue: DecodedPresetEnum;
  smoothSkinEffect: DecodedPresetEnum;
  monochromaticColor?: { warmCool: number; greenMagenta: number };
}

export interface DecodedPresetEnum {
  value: number;
  label: string;
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
