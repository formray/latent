import { z } from "zod";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

export const ParameterRange = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
});

export const CapabilitySet = z.object({
  cameraModel: z.string(),
  firmwareVersion: z.string(),
  usbProductId: z.string(),
  generation: z.string(),
  customSlots: z.number().int().positive(),
  filmSimulations: z.array(z.string()),
  parameterRanges: z.record(z.string(), ParameterRange),
  supports: z.record(z.string(), z.boolean()),
  writableSlotProperties: z.array(z.string()),
  tested: z.string(),
  knownIssues: z.array(z.string()),
});

export const CameraModelEntry = z.object({
  knownCapabilitySets: z.array(z.string()),
  latestKnownFirmware: z.string(),
  status: z.string().optional(),
});

export const CapabilityMatrix = z.object({
  capabilitySets: z.record(z.string(), CapabilitySet),
  models: z.record(z.string(), CameraModelEntry),
});

export type CapabilityMatrix = z.infer<typeof CapabilityMatrix>;
export type CapabilitySet = z.infer<typeof CapabilitySet>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PATH = resolve(__dirname, "../../../data/camera-models.json");

export async function loadCapabilityMatrix(path: string = DEFAULT_PATH): Promise<CapabilityMatrix> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return CapabilityMatrix.parse(parsed);
}

export function getCapabilitySet(matrix: CapabilityMatrix, id: string): CapabilitySet | undefined {
  return matrix.capabilitySets[id];
}
