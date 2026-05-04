import { create } from "zustand";
import {
  FilmForkError,
  type FilmForkErrorCategory,
  type FujiCameraSession,
} from "@filmfork/ptp-fuji";
import {
  connectAndReadPresets,
  type RawPreset,
} from "@filmfork/ptp-fuji-webusb";

export type ConnectFn = typeof connectAndReadPresets;

export interface CameraError {
  category: FilmForkErrorCategory | "Unknown";
  message: string;
}

export interface CameraState {
  session: FujiCameraSession | null;
  presets: RawPreset[];
  connecting: boolean;
  connected: boolean;
  error: CameraError | null;
  cameraModel: string | null;

  connect: (impl?: ConnectFn) => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

function classifyError(err: unknown): CameraError {
  if (err instanceof FilmForkError) {
    return { category: err.category, message: err.message };
  }
  if (typeof err === "object" && err !== null) {
    const e = err as { name?: string; message?: string };
    // WebUSB picker rejections show up as DOMException "NotFoundError"
    if (e.name === "NotFoundError" || e.name === "AbortError") {
      return {
        category: "UsbPermissionDenied",
        message: e.message ?? "User cancelled the camera picker.",
      };
    }
    if (e.name === "SecurityError") {
      return {
        category: "WebUSBSecureContextRequired",
        message: e.message ?? "Secure context required.",
      };
    }
    if (e.message) {
      return { category: "Unknown", message: e.message };
    }
  }
  return { category: "Unknown", message: String(err) };
}

export const useCameraStore = create<CameraState>((set, get) => ({
  session: null,
  presets: [],
  connecting: false,
  connected: false,
  error: null,
  cameraModel: null,

  async connect(impl?: ConnectFn) {
    if (get().connecting || get().connected) return;
    set({ connecting: true, error: null });

    if (typeof navigator === "undefined" || !("usb" in navigator)) {
      set({
        connecting: false,
        error: {
          category: "WebUSBUnsupported",
          message: "navigator.usb is unavailable in this browser.",
        },
      });
      return;
    }

    const fn = impl ?? connectAndReadPresets;
    try {
      const { session, presets } = await fn();
      set({
        session,
        presets,
        connecting: false,
        connected: true,
        error: null,
        cameraModel: "X-S20",
      });
    } catch (err) {
      set({
        connecting: false,
        connected: false,
        session: null,
        error: classifyError(err),
      });
    }
  },

  async disconnect() {
    const { session } = get();
    if (session) {
      try {
        await session.close();
      } catch {
        // best-effort
      }
    }
    set({
      session: null,
      presets: [],
      connected: false,
      cameraModel: null,
    });
  },

  clearError() {
    set({ error: null });
  },
}));
