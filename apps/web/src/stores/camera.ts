import { create } from "zustand";
import type {
  ConnectionManager,
  ConnectionEvent,
  ConnectionState,
  ErrorReason,
  ManagerNotifications,
  RawPreset,
} from "@latent/camera-connection";
import { LatentError, patchProfile } from "@latent/ptp-fuji";
import type { ConversionParams } from "@latent/ptp-fuji";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { writeRecipeToCameraSlot } from "../lib/recipe-to-camera-preset";
import { recipeToConversionParams } from "../lib/recipe-to-conversion-params";

const MACOS_BETA_ACK_KEY = "latent:macos-beta-ack-v1";
const MACOS_SETUP_ACK_KEY = "latent:macos-setup-ack-v1";
const MACOS_PERSISTENT_DISABLE_KEY = "latent:macos-persistent-disable-v1";

export interface CameraStore {
  state: ConnectionState;
  presets: RawPreset[];
  writeStatus: CameraWriteStatus;
  rawPreviewStatus: RawPreviewStatus;
  macosBetaAcknowledged: boolean;
  macosSetupAcknowledged: boolean;
  macosPersistentDisableConfigured: boolean;
  macosWizardOpen: boolean;
  macosShowAdvanced: boolean;

  connect: () => void;
  disconnect: () => void;
  retry: () => void;
  acknowledgeMacosBeta: () => void;
  acknowledgeMacosSetup: () => void;
  markMacosPersistentDisable: () => void;
  resetMacosSetupStatus: () => void;
  openMacosWizard: () => void;
  closeMacosWizard: () => void;
  toggleMacosAdvanced: () => void;
  attemptMacosSetup: (advanced: boolean) => void;
  writeRecipeToSlot: (recipe: RecipeType, slot: number) => Promise<void>;
  renderRawPreview: (file: File, recipe?: RecipeType | null) => Promise<void>;
  renderRawPreviewDiagnostics: (file: File, recipe: RecipeType) => Promise<void>;
  clearRawPreview: () => void;
  isConnected: () => boolean;
  isConnecting: () => boolean;
  errorReason: () => ErrorReason | null;
}

export type CameraWriteStatus =
  | { kind: "idle" }
  | { kind: "writing"; slot: number; recipeName: string }
  | { kind: "success"; slot: number; recipeName: string; propertiesWritten: number }
  | { kind: "error"; slot: number; recipeName: string; message: string };

export type RawPreviewStatus =
  | { kind: "idle" }
  | {
      kind: "rendering";
      fileName: string;
      recipeName?: string;
      mode?: "single" | "diagnostic";
      currentVariant?: string;
    }
  | {
      kind: "success";
      fileName: string;
      objectUrl: string;
      jpegBytes: number;
      baseProfileBytes: number;
      recipeName?: string;
      diagnostics?: RawPreviewDiagnosticResult[];
    }
  | { kind: "error"; fileName: string; message: string; recipeName?: string };

export interface RawPreviewDiagnosticResult {
  id: RawPreviewDiagnosticVariantId;
  label: string;
  objectUrl: string;
  jpegBytes: number;
  baseProfileBytes: number;
}

export type RawPreviewDiagnosticVariantId =
  | "base"
  | "film"
  | "film-dynamic-range"
  | "film-tone"
  | "film-color"
  | "film-chrome"
  | "film-texture"
  | "full";

let manager: ConnectionManager | null = null;
let unwireManager: Array<() => void> = [];
let rawPreviewObjectUrls: string[] = [];

export const useCameraStore = create<CameraStore>((set, get) => {
  const update = (patch: Partial<CameraStore>): void => {
    set(patch);
    publishCameraDiagnostics(get());
  };

  return {
    state: { kind: "idle" },
    presets: [],
    writeStatus: { kind: "idle" },
    rawPreviewStatus: { kind: "idle" },
    macosBetaAcknowledged: readFlag(MACOS_BETA_ACK_KEY),
    macosSetupAcknowledged: readFlag(MACOS_SETUP_ACK_KEY),
    macosPersistentDisableConfigured: readFlag(MACOS_PERSISTENT_DISABLE_KEY),
    macosWizardOpen: false,
    macosShowAdvanced: false,

    connect() {
      if (!manager) {
        update({
          state: {
            kind: "error",
            reason: "webusb-unsupported",
            underlying: new LatentError(
              "WebUSBUnsupported",
              "navigator.usb is unavailable in this browser.",
            ),
            isPhysicallyRecoverable: false,
          },
        });
        return;
      }
      manager.dispatch({ type: "CONNECT_REQUESTED" });
    },

    disconnect() {
      manager?.dispatch({ type: "DISCONNECT_REQUESTED" });
    },

    retry() {
      manager?.dispatch({ type: "RETRY_REQUESTED" });
    },

    acknowledgeMacosBeta() {
      writeFlag(MACOS_BETA_ACK_KEY, true);
      update({ macosBetaAcknowledged: true });
    },

    acknowledgeMacosSetup() {
      writeFlag(MACOS_SETUP_ACK_KEY, true);
      update({ macosSetupAcknowledged: true });
    },

    markMacosPersistentDisable() {
      writeFlag(MACOS_PERSISTENT_DISABLE_KEY, true);
      update({ macosPersistentDisableConfigured: true });
    },

    resetMacosSetupStatus() {
      writeFlag(MACOS_SETUP_ACK_KEY, false);
      writeFlag(MACOS_PERSISTENT_DISABLE_KEY, false);
      update({
        macosSetupAcknowledged: false,
        macosPersistentDisableConfigured: false,
      });
    },

    openMacosWizard() {
      const startAdvanced = get().macosShowAdvanced || get().macosPersistentDisableConfigured;
      update({ macosWizardOpen: true, macosShowAdvanced: startAdvanced });
    },

    closeMacosWizard() {
      update({ macosWizardOpen: false, macosShowAdvanced: false });
    },

    toggleMacosAdvanced() {
      update({ macosShowAdvanced: !get().macosShowAdvanced });
    },

    attemptMacosSetup(advanced: boolean) {
      manager?.dispatch({ type: "MACOS_SETUP_ATTEMPTED", advanced });
    },

    async writeRecipeToSlot(recipe: RecipeType, slot: number) {
      const { state } = get();
      if (state.kind !== "connected" && state.kind !== "degraded") {
        update({
          writeStatus: {
            kind: "error",
            slot,
            recipeName: recipe.name,
            message: "Camera is not connected.",
          },
        });
        return;
      }

      update({ writeStatus: { kind: "writing", slot, recipeName: recipe.name } });
      try {
        const result = await writeRecipeToCameraSlot(state.port, recipe, slot);
        update({
          presets: upsertPreset(get().presets, result.verified),
          writeStatus: {
            kind: "success",
            slot,
            recipeName: recipe.name,
            propertiesWritten: result.propertiesWritten,
          },
        });
      } catch (err) {
        update({
          writeStatus: {
            kind: "error",
            slot,
            recipeName: recipe.name,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    },

    async renderRawPreview(file: File, recipe?: RecipeType | null) {
      const { state } = get();
      if (state.kind !== "connected" && state.kind !== "degraded") {
        update({
          rawPreviewStatus: {
            kind: "error",
            fileName: file.name,
            message: "Camera is not connected.",
            ...(recipe ? { recipeName: recipe.name } : {}),
          },
        });
        return;
      }

      update({
        rawPreviewStatus: {
          kind: "rendering",
          fileName: file.name,
          mode: "single",
          ...(recipe ? { recipeName: recipe.name } : {}),
        },
      });
      try {
        const raf = await fileToBytes(file);
        const profileBuilder = recipe
          ? (baseProfile: Uint8Array): Uint8Array => (
              patchProfile(baseProfile, recipeToConversionParams(recipe))
            )
          : undefined;
        const result = await state.port.renderRawPreview(raf, profileBuilder);
        revokeRawPreviewUrl();
        const objectUrl = createJpegObjectUrl(result.jpeg);
        rawPreviewObjectUrls = [objectUrl];
        update({
          rawPreviewStatus: {
            kind: "success",
            fileName: file.name,
            objectUrl,
            jpegBytes: result.jpeg.byteLength,
            baseProfileBytes: result.baseProfile.byteLength,
            ...(recipe ? { recipeName: recipe.name } : {}),
          },
        });
      } catch (err) {
        update({
          rawPreviewStatus: {
            kind: "error",
            fileName: file.name,
            message: err instanceof Error ? err.message : String(err),
            ...(recipe ? { recipeName: recipe.name } : {}),
          },
        });
      }
    },

    async renderRawPreviewDiagnostics(file: File, recipe: RecipeType) {
      const { state } = get();
      if (state.kind !== "connected" && state.kind !== "degraded") {
        update({
          rawPreviewStatus: {
            kind: "error",
            fileName: file.name,
            message: "Camera is not connected.",
            recipeName: recipe.name,
          },
        });
        return;
      }

      const full = recipeToConversionParams(recipe);
      const variants = diagnosticVariants(full);
      const firstVariant = variants[0];
      const results: RawPreviewDiagnosticResult[] = [];

      revokeRawPreviewUrl();
      update({
        rawPreviewStatus: {
          kind: "rendering",
          fileName: file.name,
          recipeName: recipe.name,
          mode: "diagnostic",
          ...(firstVariant ? { currentVariant: firstVariant.label } : {}),
        },
      });

      try {
        const raf = await fileToBytes(file);
        for (const variant of variants) {
          update({
            rawPreviewStatus: {
              kind: "rendering",
              fileName: file.name,
              recipeName: recipe.name,
              mode: "diagnostic",
              currentVariant: variant.label,
            },
          });
          const result = await state.port.renderRawPreview(raf, variant.buildProfile);
          const objectUrl = createJpegObjectUrl(result.jpeg);
          rawPreviewObjectUrls.push(objectUrl);
          results.push({
            id: variant.id,
            label: variant.label,
            objectUrl,
            jpegBytes: result.jpeg.byteLength,
            baseProfileBytes: result.baseProfile.byteLength,
          });
        }

        const fullResult = results.at(-1);
        update({
          rawPreviewStatus: {
            kind: "success",
            fileName: file.name,
            objectUrl: fullResult?.objectUrl ?? "",
            jpegBytes: fullResult?.jpegBytes ?? 0,
            baseProfileBytes: fullResult?.baseProfileBytes ?? 0,
            recipeName: recipe.name,
            diagnostics: results,
          },
        });
      } catch (err) {
        update({
          rawPreviewStatus: {
            kind: "error",
            fileName: file.name,
            recipeName: recipe.name,
            message: err instanceof Error ? err.message : String(err),
          },
        });
      }
    },

    clearRawPreview() {
      revokeRawPreviewUrl();
      update({ rawPreviewStatus: { kind: "idle" } });
    },

    isConnected() {
      return get().state.kind === "connected" || get().state.kind === "degraded";
    },

    isConnecting() {
      return get().state.kind === "connecting" || get().state.kind === "reconnecting";
    },

    errorReason() {
      const { state } = get();
      return state.kind === "error" ? state.reason : null;
    },
  };
});

export function wireCameraManager(nextManager: ConnectionManager): void {
  for (const unwire of unwireManager) unwire();
  unwireManager = [];
  manager = nextManager;

  unwireManager.push(
    nextManager.subscribe((state) => {
      useCameraStore.setState({ state });
      publishCameraDiagnostics(useCameraStore.getState());
      if (state.kind === "error") {
        // Surface the underlying error so DevTools shows the real cause
        // while the UI banner renders reason-level copy.
        console.error("[camera connect failed]", state.underlying);
      }
      if (state.kind === "error" && state.reason === "macos-claim-collision") {
        const store = useCameraStore.getState();
        if (store.macosPersistentDisableConfigured) {
          store.resetMacosSetupStatus();
          useCameraStore.setState({ macosWizardOpen: false, macosShowAdvanced: true });
          publishCameraDiagnostics(useCameraStore.getState());
        } else if (!store.macosSetupAcknowledged) {
          useCameraStore.setState({ macosWizardOpen: true });
          publishCameraDiagnostics(useCameraStore.getState());
        }
      }
    }),
  );

  unwireManager.push(
    nextManager.onNotification("setup-confirmed", ({ advanced }) => {
      useCameraStore.getState().acknowledgeMacosSetup();
      if (advanced) {
        useCameraStore.getState().markMacosPersistentDisable();
      }
    }),
  );

  unwireManager.push(
    nextManager.onNotification("presets-read", ({ presets }) => {
      useCameraStore.setState({ presets });
      publishCameraDiagnostics(useCameraStore.getState());
    }),
  );

  nextManager.start();
  publishCameraDiagnostics(useCameraStore.getState());
}

export function resetCameraManagerForTests(): void {
  for (const unwire of unwireManager) unwire();
  unwireManager = [];
  manager = null;
  revokeRawPreviewUrl();
}

export function dispatchCameraEventForTests(event: ConnectionEvent): void {
  manager?.dispatch(event);
}

export type CameraNotificationPayload<K extends keyof ManagerNotifications> =
  ManagerNotifications[K];

function readFlag(key: string): boolean {
  const storage = safeLocalStorage();
  if (!storage) return false;
  return storage.getItem(key) === "true";
}

function writeFlag(key: string, value: boolean): void {
  const storage = safeLocalStorage();
  if (!storage) return;
  if (value) {
    storage.setItem(key, "true");
  } else {
    storage.removeItem(key);
  }
}

function safeLocalStorage(): Storage | null {
  const storage = globalThis.localStorage;
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }
  return storage;
}

function publishCameraDiagnostics(state: CameraStore): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.__LATENT_CAMERA_STATE__ = {
    state: state.state,
    presets: state.presets,
    decodedPresets: compactDecodedPresets(state.presets),
    writeStatus: state.writeStatus,
    rawPreviewStatus: state.rawPreviewStatus,
    isConnected: state.isConnected(),
    isConnecting: state.isConnecting(),
    errorReason: state.errorReason(),
  };
}

function compactDecodedPresets(presets: RawPreset[]): CameraPresetDiagnostics[] {
  return presets.map((preset) => ({
    slot: preset.slot,
    name: preset.name ?? "",
    propertyCount: Object.keys(preset.properties).filter((key) => key !== "_missing").length,
    missingCount: preset.missing?.length ?? 0,
    film: preset.decoded?.filmSimulation.label ?? "",
    dynamicRange: preset.decoded?.dynamicRange.label ?? "",
    whiteBalance: preset.decoded?.whiteBalance.label ?? "",
    wbShiftR: preset.decoded?.wbShift.r ?? null,
    wbShiftB: preset.decoded?.wbShift.b ?? null,
    highlightTone: preset.decoded?.highlightTone ?? null,
    shadowTone: preset.decoded?.shadowTone ?? null,
    color: preset.decoded?.color ?? null,
    sharpness: preset.decoded?.sharpness ?? null,
    noiseReduction: preset.decoded?.noiseReduction ?? null,
    clarity: preset.decoded?.clarity ?? null,
    grain: preset.decoded?.grainEffect.label ?? "",
    colorChrome: preset.decoded?.colorChromeEffect.label ?? "",
    colorChromeBlue: preset.decoded?.colorChromeEffectBlue.label ?? "",
  }));
}

function upsertPreset(presets: RawPreset[], preset: RawPreset): RawPreset[] {
  const existing = presets.findIndex((item) => item.slot === preset.slot);
  if (existing === -1) return [...presets, preset].sort((a, b) => a.slot - b.slot);
  return presets.map((item) => (item.slot === preset.slot ? preset : item));
}

function createJpegObjectUrl(jpeg: Uint8Array): string {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return "";
  const copy = new Uint8Array(jpeg.byteLength);
  copy.set(jpeg);
  return URL.createObjectURL(new Blob([copy], { type: "image/jpeg" }));
}

function diagnosticVariants(full: ConversionParams): Array<{
  id: RawPreviewDiagnosticVariantId;
  label: string;
  buildProfile?: (baseProfile: Uint8Array) => Uint8Array;
}> {
  const film = pickParams(full, ["filmSimulation"]);
  return [
    {
      id: "base",
      label: "Base RAF",
    },
    {
      id: "film",
      label: "Film simulation only",
      buildProfile: buildDiagnosticProfile(film),
    },
    {
      id: "film-dynamic-range",
      label: "Film + DR",
      buildProfile: buildDiagnosticProfile({
        ...film,
        ...pickParams(full, ["dynamicRange"]),
      }),
    },
    {
      id: "film-tone",
      label: "Film + tone",
      buildProfile: buildDiagnosticProfile({
        ...film,
        ...pickParams(full, ["highlightTone", "shadowTone"]),
      }),
    },
    {
      id: "film-color",
      label: "Film + color",
      buildProfile: buildDiagnosticProfile({
        ...film,
        ...pickParams(full, ["color", "sharpness"]),
      }),
    },
    {
      id: "film-chrome",
      label: "Film + chrome",
      buildProfile: buildDiagnosticProfile({
        ...film,
        ...pickParams(full, ["colorChromeEffect", "colorChromeFxBlue"]),
      }),
    },
    {
      id: "film-texture",
      label: "Film + texture",
      buildProfile: buildDiagnosticProfile({
        ...film,
        ...pickParams(full, ["grainEffect", "noiseReduction", "clarity"]),
      }),
    },
    {
      id: "full",
      label: "Full recipe",
      buildProfile: (baseProfile) => patchProfile(baseProfile, full),
    },
  ];
}

function pickParams<K extends keyof ConversionParams>(
  params: ConversionParams,
  keys: K[],
): Partial<ConversionParams> {
  const out: Partial<ConversionParams> = {};
  for (const key of keys) {
    const value = params[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

function buildDiagnosticProfile(
  params: ConversionParams,
): (baseProfile: Uint8Array) => Uint8Array {
  return (baseProfile) => patchProfile(baseProfile, params);
}

async function fileToBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") {
    return new Uint8Array(await file.arrayBuffer());
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read RAF file."));
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) {
        reject(new Error("Failed to read RAF file as bytes."));
        return;
      }
      resolve(new Uint8Array(reader.result));
    };
    reader.readAsArrayBuffer(file);
  });
}

function revokeRawPreviewUrl(): void {
  if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
    for (const objectUrl of rawPreviewObjectUrls) {
      URL.revokeObjectURL(objectUrl);
    }
  }
  rawPreviewObjectUrls = [];
}

interface CameraPresetDiagnostics {
  slot: number;
  name: string;
  propertyCount: number;
  missingCount: number;
  film: string;
  dynamicRange: string;
  whiteBalance: string;
  wbShiftR: number | null;
  wbShiftB: number | null;
  highlightTone: number | null;
  shadowTone: number | null;
  color: number | null;
  sharpness: number | null;
  noiseReduction: number | null;
  clarity: number | null;
  grain: string;
  colorChrome: string;
  colorChromeBlue: string;
}

declare global {
  interface Window {
    __LATENT_CAMERA_STATE__?: {
      state: ConnectionState;
      presets: RawPreset[];
      decodedPresets: CameraPresetDiagnostics[];
      writeStatus: CameraWriteStatus;
      rawPreviewStatus: RawPreviewStatus;
      isConnected: boolean;
      isConnecting: boolean;
      errorReason: ErrorReason | null;
    };
  }
}
