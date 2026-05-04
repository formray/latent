import { create } from "zustand";
import type {
  ConnectionManager,
  ConnectionEvent,
  ConnectionState,
  ErrorReason,
  ManagerNotifications,
  RawPreset,
} from "@latent/camera-connection";
import { LatentError } from "@latent/ptp-fuji";

const MACOS_BETA_ACK_KEY = "latent:macos-beta-ack-v1";
const MACOS_SETUP_ACK_KEY = "latent:macos-setup-ack-v1";
const MACOS_PERSISTENT_DISABLE_KEY = "latent:macos-persistent-disable-v1";

export interface CameraStore {
  state: ConnectionState;
  presets: RawPreset[];
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
  isConnected: () => boolean;
  isConnecting: () => boolean;
  errorReason: () => ErrorReason | null;
}

let manager: ConnectionManager | null = null;
let unwireManager: Array<() => void> = [];

export const useCameraStore = create<CameraStore>((set, get) => {
  const update = (patch: Partial<CameraStore>): void => {
    set(patch);
    publishCameraDiagnostics(get());
  };

  return {
    state: { kind: "idle" },
    presets: [],
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
      isConnected: boolean;
      isConnecting: boolean;
      errorReason: ErrorReason | null;
    };
  }
}
