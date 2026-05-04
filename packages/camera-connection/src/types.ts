import type { LatentError } from "@latent/ptp-fuji";
import type { CameraSessionPort } from "./session-port.js";

export const ERROR_REASONS = [
  "macos-claim-collision",
  "camera-off",
  "cable-unplugged",
  "permission-denied",
  "secure-context",
  "webusb-unsupported",
  "session-stale",
  "unknown",
] as const;

export type ErrorReason = (typeof ERROR_REASONS)[number];

export type ConnectionState =
  | { kind: "idle" }
  | {
      kind: "connecting";
      attempt: number;
      abort: AbortController;
      macosSetupPending?: "basic" | "advanced";
    }
  | {
      kind: "connected";
      port: CameraSessionPort;
      cameraModel: string;
      firmwareVersion: string;
    }
  | {
      kind: "degraded";
      port: CameraSessionPort;
      cameraModel: string;
      firmwareVersion: string;
      consecutiveSoftFailures: number;
      lastFailure: LatentError;
    }
  | {
      kind: "reconnecting";
      attempt: number;
      lastReason: ErrorReason;
      lastFailure: LatentError;
      backoffTimer: ReturnType<typeof setTimeout>;
      abort: AbortController;
    }
  | {
      kind: "error";
      reason: ErrorReason;
      underlying: LatentError;
      isPhysicallyRecoverable: boolean;
    }
  | { kind: "disconnected" };

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
