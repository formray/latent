import type { RecipeType } from "@latent/recipe-schema/browser";
import type { CameraSessionPort, DeviceValue, RawPreset } from "@latent/camera-connection";

export const PRESET_SLOT_PROP = 0xd18c;

export interface PresetWriteProperty {
  code: number;
  label: string;
  value: DeviceValue;
}

export interface PresetWritePlan {
  slot: number;
  properties: PresetWriteProperty[];
}

export interface PresetWriteResult {
  backup: RawPreset;
  verified: RawPreset;
  propertiesWritten: number;
}

const UNKNOWN_DEFAULTS: Record<number, number> = {
  0xd18e: 7,
  0xd18f: 4,
  0xd191: 0,
  0xd1a1: 0x4000,
  0xd1a3: 1,
  0xd1a4: 1,
  0xd1a5: 7,
};

const FILM_SIM: Record<RecipeType["filmSimulation"], number> = {
  ProviaStandard: 0x01,
  VelviaVivid: 0x02,
  AstiaSoft: 0x03,
  ProNegHi: 0x04,
  ProNegStd: 0x05,
  Monochrome: 0x06,
  MonochromeYe: 0x07,
  MonochromeR: 0x08,
  MonochromeG: 0x09,
  Sepia: 0x0a,
  ClassicChrome: 0x0b,
  AcrosStd: 0x0c,
  AcrosYe: 0x0d,
  AcrosR: 0x0e,
  AcrosG: 0x0f,
  EternaCinema: 0x10,
  ClassicNegative: 0x11,
  EternaBleachBypass: 0x12,
  NostalgicNeg: 0x13,
  RealaAce: 0x14,
};

const MONOCHROME_SIMS = new Set<RecipeType["filmSimulation"]>([
  "Monochrome",
  "MonochromeYe",
  "MonochromeR",
  "MonochromeG",
  "Sepia",
  "AcrosStd",
  "AcrosYe",
  "AcrosR",
  "AcrosG",
]);

const WB: Record<RecipeType["whiteBalance"]["mode"], number> = {
  Auto: 0x0002,
  AutoAmbiencePriority: 0x8021,
  Daylight: 0x0004,
  Shade: 0x8006,
  Fluorescent1: 0x8001,
  Fluorescent2: 0x8002,
  Fluorescent3: 0x8003,
  Incandescent: 0x0006,
  Underwater: 0x0008,
  ColorTemperature: 0x8007,
};

const DR: Record<RecipeType["dynamicRange"], number> = {
  DRAuto: 0xffff,
  DR100: 100,
  DR200: 200,
  DR400: 400,
};

const NR: Record<number, number> = {
  [-4]: 0x8000,
  [-3]: 0x7000,
  [-2]: 0x4000,
  [-1]: 0x3000,
  [0]: 0x2000,
  [1]: 0x1000,
  [2]: 0x0000,
  [3]: 0x6000,
  [4]: 0x5000,
};

export function recipeToPresetWritePlan(
  recipe: RecipeType,
  slot: number,
  base?: RawPreset,
): PresetWritePlan {
  assertSlot(slot);
  const props: PresetWriteProperty[] = [];
  const isMono = MONOCHROME_SIMS.has(recipe.filmSimulation);

  const raw = (code: number, label: string, value?: number): void => {
    props.push({
      code,
      label,
      value: bytesValue(value === undefined ? baseBytes(base, code) : u16(value)),
    });
  };
  const signed = (code: number, label: string, value: number): void => {
    props.push({ code, label, value: bytesValue(i16(value)) });
  };

  raw(0xd18e, "Image size");
  raw(0xd18f, "Image quality");
  raw(0xd190, "Dynamic range", DR[recipe.dynamicRange]);
  raw(0xd191, "Reserved");
  raw(0xd192, "Film simulation", FILM_SIM[recipe.filmSimulation]);

  if (isMono && recipe.monochromaticColor && recipe.monochromaticColor.warmCool !== 0) {
    signed(0xd193, "Monochrome warm/cool", recipe.monochromaticColor.warmCool * 10);
  }
  if (isMono && recipe.monochromaticColor && recipe.monochromaticColor.greenMagenta !== 0) {
    signed(0xd194, "Monochrome green/magenta", recipe.monochromaticColor.greenMagenta * 10);
  }

  raw(0xd195, "Grain effect", grain(recipe.grainEffect));
  raw(0xd196, "Color chrome effect", tri(recipe.colorChromeEffect) + 1);
  raw(0xd197, "Color chrome blue", tri(recipe.colorChromeEffectBlue) + 1);
  raw(0xd198, "Smooth skin effect", tri(recipe.smoothSkinEffect ?? "Off") + 1);
  raw(0xd199, "White balance", WB[recipe.whiteBalance.mode]);
  if (recipe.whiteBalance.mode === "ColorTemperature") {
    raw(0xd19c, "White balance color temperature", recipe.whiteBalance.colorTemperatureK ?? 6500);
  }
  signed(0xd19a, "White balance shift R", recipe.whiteBalance.shiftR);
  signed(0xd19b, "White balance shift B", recipe.whiteBalance.shiftB);
  signed(0xd19d, "Highlight tone", Math.round(recipe.highlightTone * 10));
  signed(0xd19e, "Shadow tone", Math.round(recipe.shadowTone * 10));
  if (!isMono) signed(0xd19f, "Color", Math.round(recipe.color * 10));
  signed(0xd1a0, "Sharpness", Math.round(recipe.sharpness * 10));
  raw(0xd1a1, "High ISO noise reduction", NR[recipe.noiseReduction]);
  signed(0xd1a2, "Clarity", Math.round(recipe.clarity * 10));
  raw(0xd1a3, "Long exposure noise reduction");
  raw(0xd1a4, "Color space");
  raw(0xd1a5, "Reserved");

  return { slot, properties: props };
}

export async function writeRecipeToCameraSlot(
  port: CameraSessionPort,
  recipe: RecipeType,
  slot: number,
  signal?: AbortSignal,
): Promise<PresetWriteResult> {
  assertSlot(slot);
  const backup = await port.getPreset(slot, signal);
  const plan = recipeToPresetWritePlan(recipe, slot, backup);
  try {
    await writePlan(port, plan, signal);
    const verified = await port.getPreset(slot, signal);
    verifyPlan(plan, verified);
    return { backup, verified, propertiesWritten: plan.properties.length };
  } catch (err) {
    await restorePreset(port, slot, backup, signal).catch(() => undefined);
    throw err;
  }
}

export async function restorePreset(
  port: CameraSessionPort,
  slot: number,
  preset: RawPreset,
  signal?: AbortSignal,
): Promise<void> {
  assertSlot(slot);
  await port.setDevicePropValue(PRESET_SLOT_PROP, bytesValue(u16(slot)), signal);
  for (const code of presetPropertyCodes(preset)) {
    const bytes = propertyBytes(preset, code);
    if (bytes) await port.setDevicePropValue(code, bytesValue(bytes), signal);
  }
}

async function writePlan(
  port: CameraSessionPort,
  plan: PresetWritePlan,
  signal?: AbortSignal,
): Promise<void> {
  await port.setDevicePropValue(PRESET_SLOT_PROP, bytesValue(u16(plan.slot)), signal);
  const selected = await port.getDevicePropValue(PRESET_SLOT_PROP, signal);
  if (!deviceValueEquals(selected, u16(plan.slot))) {
    throw new Error(`Camera did not select custom slot C${plan.slot}`);
  }
  for (const prop of plan.properties) {
    await port.setDevicePropValue(prop.code, prop.value, signal);
  }
}

function verifyPlan(plan: PresetWritePlan, preset: RawPreset): void {
  for (const prop of plan.properties) {
    const actual = propertyBytes(preset, prop.code);
    if (prop.value.kind !== "bytes" || !actual || !bytesEqual(actual, prop.value.value)) {
      throw new Error(`Verification failed for 0x${prop.code.toString(16)}`);
    }
  }
}

function assertSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > 7) {
    throw new Error(`Invalid custom slot C${slot}`);
  }
}

function baseBytes(base: RawPreset | undefined, code: number): Uint8Array {
  return propertyBytes(base, code) ?? u16(UNKNOWN_DEFAULTS[code] ?? 0);
}

function propertyBytes(preset: RawPreset | undefined, code: number): Uint8Array | null {
  const raw = preset?.properties[`0x${code.toString(16)}`];
  if (!isPropertyObject(raw) || !Array.isArray(raw.bytes)) return null;
  return new Uint8Array(raw.bytes.filter((byte): byte is number => Number.isInteger(byte)));
}

function presetPropertyCodes(preset: RawPreset): number[] {
  return Object.keys(preset.properties)
    .map((key) => Number.parseInt(key, 16))
    .filter((code) => Number.isInteger(code) && code >= 0xd18e && code <= 0xd1a5)
    .sort((a, b) => a - b);
}

function isPropertyObject(value: unknown): value is { bytes: unknown[] } {
  return typeof value === "object" && value !== null && "bytes" in value;
}

function bytesValue(value: Uint8Array): DeviceValue {
  return { kind: "bytes", value };
}

function u16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value & 0xffff, true);
  return bytes;
}

function i16(value: number): Uint8Array {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setInt16(0, value, true);
  return bytes;
}

function tri(value: "Off" | "Weak" | "Strong"): number {
  if (value === "Off") return 0;
  if (value === "Weak") return 1;
  return 2;
}

function grain(value: RecipeType["grainEffect"]): number {
  if (value.strength === "Off") return 1;
  if (value.strength === "Weak" && value.size === "Small") return 2;
  if (value.strength === "Strong" && value.size === "Small") return 3;
  if (value.strength === "Weak" && value.size === "Large") return 4;
  return 5;
}

function deviceValueEquals(value: DeviceValue, expected: Uint8Array): boolean {
  if (value.kind === "bytes") return bytesEqual(value.value, expected);
  if (value.kind === "uint16") return bytesEqual(u16(value.value), expected);
  return false;
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  return a.every((value, index) => value === b[index]);
}
