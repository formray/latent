import { LatentError } from "@latent/ptp-fuji";
import { classifyDriverError } from "./classifier.js";
import type { DeviceInfo } from "./session-port.js";
import type { CameraSessionPort } from "./session-port.js";
import type { ConnectionState, ErrorReason } from "./types.js";

export type ConnectionEvent =
  | { type: "CONNECT_REQUESTED" }
  | { type: "AUTOCONNECT_AT_BOOT" }
  | { type: "DISCONNECT_REQUESTED" }
  | { type: "USB_DEVICE_DISCONNECTED" }
  | { type: "USB_DEVICE_CONNECTED" }
  | {
      type: "CONNECT_SUCCEEDED";
      opId: number;
      port: CameraSessionPort;
      deviceInfo: DeviceInfo;
    }
  | { type: "OPERATION_FAILED"; err: LatentError; opId: number }
  | { type: "OPERATION_SUCCEEDED"; opId: number }
  | { type: "PROBE_RESULT"; ok: boolean; err: LatentError; opId: number }
  | { type: "RETRY_REQUESTED" }
  | { type: "MACOS_SETUP_ATTEMPTED"; advanced: boolean }
  | { type: "PAGE_HIDING" };

export type ConnectionEffect =
  | { type: "abort-connect" }
  | { type: "clear-backoff" }
  | { type: "install-listeners" }
  | { type: "uninstall-listeners" }
  | { type: "fire-close-session" }
  | { type: "notify-setup-confirmed"; advanced: boolean };

export interface ConnectionContext {
  currentOpId: number;
}

export interface TransitionResult {
  state: ConnectionState;
  effects: ConnectionEffect[];
}

export const initialConnectionState: ConnectionState = { kind: "idle" };

export function transition(
  state: ConnectionState,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  switch (state.kind) {
    case "idle":
      return reduceIdle(state, event);
    case "connecting":
      return reduceConnecting(state, event, context);
    case "connected":
      return reduceConnected(state, event, context);
    case "degraded":
      return reduceDegraded(state, event, context);
    case "reconnecting":
      return reduceReconnecting(state, event, context);
    case "error":
      return reduceError(state, event);
    case "disconnected":
      return reduceDisconnected(state, event);
  }
}

export function backoffDelayMs(attempt: number): number {
  if (attempt === 1) return 200;
  if (attempt === 2) return 800;
  return 2000;
}

function reduceIdle(
  state: Extract<ConnectionState, { kind: "idle" }>,
  event: ConnectionEvent,
): TransitionResult {
  if (event.type === "CONNECT_REQUESTED" || event.type === "AUTOCONNECT_AT_BOOT") {
    return { state: connectingState(1), effects: [] };
  }
  return unchanged(state);
}

function reduceConnecting(
  state: Extract<ConnectionState, { kind: "connecting" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "DISCONNECT_REQUESTED") {
    return { state: { kind: "disconnected" }, effects: [{ type: "abort-connect" }] };
  }
  if (event.type === "USB_DEVICE_DISCONNECTED") {
    return {
      state: toError(
        "cable-unplugged",
        new LatentError("UsbDisconnect", "USB device disconnected"),
      ),
      effects: [{ type: "abort-connect" }],
    };
  }
  if (event.type === "CONNECT_SUCCEEDED") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    return {
      state: {
        kind: "connected",
        port: event.port,
        cameraModel: event.deviceInfo.model,
        firmwareVersion: event.deviceInfo.firmwareVersion,
      },
      effects: [
        { type: "install-listeners" },
        ...(state.macosSetupPending
          ? [{
              type: "notify-setup-confirmed" as const,
              advanced: state.macosSetupPending === "advanced",
            }]
          : []),
      ],
    };
  }
  if (event.type === "OPERATION_FAILED") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    return {
      state: toError(classifyDriverError(event.err), event.err),
      effects: [{ type: "abort-connect" }],
    };
  }
  return unchanged(state);
}

function reduceConnected(
  state: Extract<ConnectionState, { kind: "connected" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "USB_DEVICE_DISCONNECTED") {
    return {
      state: reconnectingState(1, "cable-unplugged", eventFailure()),
      effects: [],
    };
  }
  if (event.type === "PAGE_HIDING") {
    return { state, effects: [{ type: "fire-close-session" }] };
  }
  if (event.type === "DISCONNECT_REQUESTED") {
    return {
      state: { kind: "disconnected" },
      effects: [{ type: "uninstall-listeners" }],
    };
  }
  if (event.type === "PROBE_RESULT") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    if (event.ok) {
      return {
        state: {
          kind: "degraded",
          port: state.port,
          cameraModel: state.cameraModel,
          firmwareVersion: state.firmwareVersion,
          consecutiveSoftFailures: 1,
          lastFailure: event.err,
        },
        effects: [],
      };
    }
    return {
      state: reconnectingState(1, classifyDriverError(event.err), event.err),
      effects: [],
    };
  }
  return unchanged(state);
}

function reduceDegraded(
  state: Extract<ConnectionState, { kind: "degraded" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "DISCONNECT_REQUESTED") {
    return {
      state: { kind: "disconnected" },
      effects: [{ type: "uninstall-listeners" }],
    };
  }
  if (event.type === "USB_DEVICE_DISCONNECTED") {
    return { state: reconnectingState(1, "cable-unplugged", eventFailure()), effects: [] };
  }
  if (event.type === "PAGE_HIDING") {
    return { state, effects: [{ type: "fire-close-session" }] };
  }
  if (event.type === "OPERATION_SUCCEEDED") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    return {
      state: {
        kind: "connected",
        port: state.port,
        cameraModel: state.cameraModel,
        firmwareVersion: state.firmwareVersion,
      },
      effects: [],
    };
  }
  if (event.type === "PROBE_RESULT") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    if (!event.ok) {
      return {
        state: reconnectingState(1, classifyDriverError(event.err), event.err),
        effects: [],
      };
    }
    if (state.consecutiveSoftFailures >= 2) {
      return {
        state: reconnectingState(1, classifyDriverError(event.err), event.err),
        effects: [],
      };
    }
    return {
      state: {
        ...state,
        consecutiveSoftFailures: state.consecutiveSoftFailures + 1,
        lastFailure: event.err,
      },
      effects: [],
    };
  }
  return unchanged(state);
}

function reduceReconnecting(
  state: Extract<ConnectionState, { kind: "reconnecting" }>,
  event: ConnectionEvent,
  context: ConnectionContext,
): TransitionResult {
  if (event.type === "DISCONNECT_REQUESTED") {
    return {
      state: { kind: "disconnected" },
      effects: [{ type: "clear-backoff" }, { type: "abort-connect" }, { type: "uninstall-listeners" }],
    };
  }
  if (event.type === "USB_DEVICE_CONNECTED") {
    return {
      state: connectingState(1),
      effects: [{ type: "clear-backoff" }, { type: "abort-connect" }],
    };
  }
  if (event.type === "OPERATION_FAILED") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    if (state.attempt >= 3) {
      return {
        state: toError(classifyDriverError(event.err), event.err),
        effects: [{ type: "clear-backoff" }, { type: "abort-connect" }, { type: "uninstall-listeners" }],
      };
    }
    return {
      state: reconnectingState(
        state.attempt + 1,
        classifyDriverError(event.err),
        event.err,
      ),
      effects: [{ type: "clear-backoff" }, { type: "abort-connect" }],
    };
  }
  if (event.type === "CONNECT_SUCCEEDED") {
    if (event.opId !== context.currentOpId) return unchanged(state);
    return {
      state: {
        kind: "connected",
        port: event.port,
        cameraModel: event.deviceInfo.model,
        firmwareVersion: event.deviceInfo.firmwareVersion,
      },
      effects: [{ type: "clear-backoff" }],
    };
  }
  return unchanged(state);
}

function reduceError(
  state: Extract<ConnectionState, { kind: "error" }>,
  event: ConnectionEvent,
): TransitionResult {
  if (event.type === "RETRY_REQUESTED" || event.type === "CONNECT_REQUESTED") {
    return { state: connectingState(1), effects: [] };
  }
  if (event.type === "MACOS_SETUP_ATTEMPTED") {
    return {
      state: connectingState(1, event.advanced ? "advanced" : "basic"),
      effects: [],
    };
  }
  if (event.type === "USB_DEVICE_CONNECTED") {
    if (["macos-claim-collision", "secure-context", "webusb-unsupported"].includes(state.reason)) {
      return unchanged(state);
    }
    return { state: connectingState(1), effects: [] };
  }
  if (event.type === "DISCONNECT_REQUESTED") {
    return { state: { kind: "disconnected" }, effects: [] };
  }
  return unchanged(state);
}

function reduceDisconnected(
  state: Extract<ConnectionState, { kind: "disconnected" }>,
  event: ConnectionEvent,
): TransitionResult {
  if (event.type === "CONNECT_REQUESTED" || event.type === "USB_DEVICE_CONNECTED") {
    return { state: connectingState(1), effects: [] };
  }
  return unchanged(state);
}

function connectingState(
  attempt: number,
  macosSetupPending?: "basic" | "advanced",
): Extract<ConnectionState, { kind: "connecting" }> {
  return {
    kind: "connecting",
    attempt,
    abort: new AbortController(),
    ...(macosSetupPending ? { macosSetupPending } : {}),
  };
}

function reconnectingState(
  attempt: number,
  lastReason: ErrorReason,
  lastFailure: LatentError,
): Extract<ConnectionState, { kind: "reconnecting" }> {
  return {
    kind: "reconnecting",
    attempt,
    lastReason,
    lastFailure,
    backoffTimer: setTimeout(() => undefined, 0),
    abort: new AbortController(),
  };
}

function toError(
  reason: ErrorReason,
  underlying: LatentError,
): Extract<ConnectionState, { kind: "error" }> {
  return {
    kind: "error",
    reason,
    underlying,
    isPhysicallyRecoverable: !["secure-context", "webusb-unsupported"].includes(reason),
  };
}

function eventFailure(): LatentError {
  return new LatentError("UsbDisconnect", "USB device disconnected");
}

function unchanged(state: ConnectionState): TransitionResult {
  return { state, effects: [] };
}
