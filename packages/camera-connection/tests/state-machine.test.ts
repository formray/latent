import { describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import { classifyDriverError } from "../src/classifier.js";
import type { CameraSessionPort } from "../src/session-port.js";
import type { ConnectionState, ErrorReason } from "../src/types.js";
import {
  backoffDelayMs,
  initialConnectionState,
  transition,
  type ConnectionContext,
  type ConnectionEvent,
} from "../src/state-machine.js";

const err = new LatentError("UsbDisconnect", "gone", undefined, {
  stage: "transfer-in",
});

const port: CameraSessionPort = {
  getDeviceInfo: vi.fn(async () => ({
    model: "X-S20",
    firmwareVersion: "1.10",
    supportedOps: [],
  })),
  getDevicePropValue: vi.fn(async () => ({ kind: "uint16", value: 1 })),
  setDevicePropValue: vi.fn(async () => undefined),
  isOpen: vi.fn(() => true),
};

function ctx(currentOpId = 1): ConnectionContext {
  return { currentOpId };
}

function connectedState(): ConnectionState {
  return {
    kind: "connected",
    port,
    cameraModel: "X-S20",
    firmwareVersion: "1.10",
  };
}

function degradedState(k = 1): ConnectionState {
  return {
    kind: "degraded",
    port,
    cameraModel: "X-S20",
    firmwareVersion: "1.10",
    consecutiveSoftFailures: k,
    lastFailure: err,
  };
}

function reconnectingState(attempt = 1): ConnectionState {
  return {
    kind: "reconnecting",
    attempt,
    lastReason: "cable-unplugged",
    lastFailure: err,
    backoffTimer: setTimeout(() => undefined, 0),
    abort: new AbortController(),
  };
}

function errorState(reason: ErrorReason): ConnectionState {
  return {
    kind: "error",
    reason,
    underlying: err,
    isPhysicallyRecoverable: !["secure-context", "webusb-unsupported"].includes(reason),
  };
}

function connectSucceeded(opId = 1): ConnectionEvent {
  return {
    type: "CONNECT_SUCCEEDED",
    opId,
    port,
    deviceInfo: {
      model: "X-S20",
      firmwareVersion: "1.10",
      supportedOps: [],
    },
  };
}

describe("classifyDriverError", () => {
  it.each([
    ["claim NetworkError on mac classifies macos-claim-collision", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "mac" }), "macos-claim-collision"],
    ["claim NetworkError on linux classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "linux" }), "session-stale"],
    ["claim NetworkError on windows classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "claim", domException: "NetworkError", platform: "windows" }), "session-stale"],
    ["transfer-in classifies cable-unplugged", new LatentError("UsbDisconnect", "x", undefined, { stage: "transfer-in" }), "cable-unplugged"],
    ["transfer-out classifies cable-unplugged", new LatentError("UsbDisconnect", "x", undefined, { stage: "transfer-out" }), "cable-unplugged"],
    ["PtpTimeout with transfer-in stage classifies camera-off", new LatentError("PtpTimeout", "x", undefined, { stage: "transfer-in" }), "camera-off"],
    ["open classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "open" }), "session-stale"],
    ["reset classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "reset" }), "session-stale"],
    ["setup-config classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "setup-config" }), "session-stale"],
    ["endpoint-discovery classifies session-stale", new LatentError("UsbDisconnect", "x", undefined, { stage: "endpoint-discovery" }), "session-stale"],
    ["PtpStall without stage classifies camera-off", new LatentError("PtpStall", "x"), "camera-off"],
    ["PtpTimeout without stage classifies camera-off", new LatentError("PtpTimeout", "x"), "camera-off"],
    ["UsbPermissionDenied classifies permission-denied", new LatentError("UsbPermissionDenied", "x"), "permission-denied"],
    ["WebUSBSecureContextRequired classifies secure-context", new LatentError("WebUSBSecureContextRequired", "x"), "secure-context"],
    ["WebUSBUnsupported classifies webusb-unsupported", new LatentError("WebUSBUnsupported", "x"), "webusb-unsupported"],
  ] as const)("%s", (_name, input, expected) => {
    expect(classifyDriverError(input)).toBe(expected);
  });
});

describe("connection reducer transitions", () => {
  it.each([
    ["idle CONNECT_REQUESTED enters connecting attempt 1", initialConnectionState, { type: "CONNECT_REQUESTED" } as ConnectionEvent, "connecting"],
    ["idle AUTOCONNECT_AT_BOOT enters connecting attempt 1", initialConnectionState, { type: "AUTOCONNECT_AT_BOOT" } as ConnectionEvent, "connecting"],
    ["connecting DISCONNECT_REQUESTED enters disconnected", transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state, { type: "DISCONNECT_REQUESTED" } as ConnectionEvent, "disconnected"],
    ["connected USB_DEVICE_DISCONNECTED enters reconnecting", connectedState(), { type: "USB_DEVICE_DISCONNECTED" } as ConnectionEvent, "reconnecting"],
    ["connected PAGE_HIDING stays connected", connectedState(), { type: "PAGE_HIDING" } as ConnectionEvent, "connected"],
    ["error RETRY_REQUESTED enters connecting", errorState("session-stale"), { type: "RETRY_REQUESTED" } as ConnectionEvent, "connecting"],
    ["error CONNECT_REQUESTED enters connecting", errorState("permission-denied"), { type: "CONNECT_REQUESTED" } as ConnectionEvent, "connecting"],
    ["error USB_DEVICE_CONNECTED enters connecting for cable-unplugged", errorState("cable-unplugged"), { type: "USB_DEVICE_CONNECTED" } as ConnectionEvent, "connecting"],
    ["disconnected CONNECT_REQUESTED enters connecting", { kind: "disconnected" } as ConnectionState, { type: "CONNECT_REQUESTED" } as ConnectionEvent, "connecting"],
    ["disconnected USB_DEVICE_CONNECTED enters connecting", { kind: "disconnected" } as ConnectionState, { type: "USB_DEVICE_CONNECTED" } as ConnectionEvent, "connecting"],
  ])("%s", (_name, state, event, expected) => {
    expect(transition(state, event, ctx()).state.kind).toBe(expected);
  });

  it("connecting connect success enters connected and installs listeners", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    const result = transition(state, connectSucceeded(), ctx());
    expect(result.state).toMatchObject({
      kind: "connected",
      cameraModel: "X-S20",
      firmwareVersion: "1.10",
    });
    expect(result.effects).toContainEqual({ type: "install-listeners" });
  });

  it("connecting fresh OPERATION_FAILED enters error", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    const result = transition(state, { type: "OPERATION_FAILED", err, opId: 1 }, ctx());
    expect(result.state).toMatchObject({ kind: "error", reason: "cable-unplugged" });
  });

  it("connecting stale OPERATION_FAILED is ignored", () => {
    const state = transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state;
    expect(transition(state, { type: "OPERATION_FAILED", err, opId: 0 }, ctx()).state).toBe(state);
  });

  it.each([
    "macos-claim-collision",
    "secure-context",
    "webusb-unsupported",
  ] as const)("error USB_DEVICE_CONNECTED is skipped for %s", (reason) => {
    const state = errorState(reason);
    expect(transition(state, { type: "USB_DEVICE_CONNECTED" }, ctx()).state).toBe(state);
  });
});

describe("degraded, probe, stale opIds, and backoff", () => {
  it.each([
    ["connected probe ok enters degraded with one soft failure", connectedState(), { type: "PROBE_RESULT", ok: true, err, opId: 1 } as ConnectionEvent, "degraded"],
    ["connected probe fail enters reconnecting", connectedState(), { type: "PROBE_RESULT", ok: false, err, opId: 1 } as ConnectionEvent, "reconnecting"],
    ["degraded operation success returns connected", degradedState(), { type: "OPERATION_SUCCEEDED", opId: 1 } as ConnectionEvent, "connected"],
    ["degraded probe fail escalates immediately", degradedState(), { type: "PROBE_RESULT", ok: false, err, opId: 1 } as ConnectionEvent, "reconnecting"],
    ["degraded USB disconnect enters reconnecting", degradedState(), { type: "USB_DEVICE_DISCONNECTED" } as ConnectionEvent, "reconnecting"],
    ["reconnecting USB connect skips backoff and enters connecting", reconnectingState(), { type: "USB_DEVICE_CONNECTED" } as ConnectionEvent, "connecting"],
    ["reconnecting disconnect enters disconnected", reconnectingState(), { type: "DISCONNECT_REQUESTED" } as ConnectionEvent, "disconnected"],
  ])("%s", (_name, state, event, expected) => {
    expect(transition(state, event, ctx()).state.kind).toBe(expected);
  });

  it("degraded probe ok increments soft failure from 1 to 2", () => {
    const next = transition(degradedState(1), { type: "PROBE_RESULT", ok: true, err, opId: 1 }, ctx()).state;
    expect(next).toMatchObject({ kind: "degraded", consecutiveSoftFailures: 2 });
  });

  it("degraded third soft failure escalates to reconnecting", () => {
    expect(
      transition(degradedState(2), { type: "PROBE_RESULT", ok: true, err, opId: 1 }, ctx()).state.kind,
    ).toBe("reconnecting");
  });

  it.each([
    ["reconnecting operation failure retries attempt 2", reconnectingState(1), "reconnecting", 2],
    ["reconnecting operation failure retries attempt 3", reconnectingState(2), "reconnecting", 3],
    ["reconnecting third failure enters error", reconnectingState(3), "error", undefined],
  ] as const)("%s", (_name, state, expectedKind, expectedAttempt) => {
    const next = transition(state, { type: "OPERATION_FAILED", err, opId: 1 }, ctx()).state;
    expect(next.kind).toBe(expectedKind);
    if (expectedAttempt !== undefined && next.kind === "reconnecting") {
      expect(next.attempt).toBe(expectedAttempt);
    }
  });

  it.each([
    ["stale OPERATION_SUCCEEDED is ignored", degradedState(), { type: "OPERATION_SUCCEEDED", opId: 0 } as ConnectionEvent],
    ["stale PROBE_RESULT is ignored", degradedState(), { type: "PROBE_RESULT", ok: true, err, opId: 0 } as ConnectionEvent],
    ["stale CONNECT_SUCCEEDED is ignored", transition(initialConnectionState, { type: "CONNECT_REQUESTED" }, ctx()).state, connectSucceeded(0)],
  ])("%s", (_name, state, event) => {
    expect(transition(state, event, ctx()).state).toBe(state);
  });

  it("backoff delays are 200, 800, and 2000 ms", () => {
    vi.useFakeTimers();
    expect(backoffDelayMs(1)).toBe(200);
    expect(backoffDelayMs(2)).toBe(800);
    expect(backoffDelayMs(3)).toBe(2000);
    vi.useRealTimers();
  });
});

describe("effects and macOS setup pending", () => {
  it("connected PAGE_HIDING emits fire-close effect", () => {
    const result = transition(connectedState(), { type: "PAGE_HIDING" }, ctx());
    expect(result.effects).toContainEqual({ type: "fire-close-session" });
  });

  it("alive to disconnected uninstalls listeners", () => {
    const result = transition(connectedState(), { type: "DISCONNECT_REQUESTED" }, ctx());
    expect(result.effects).toContainEqual({ type: "uninstall-listeners" });
  });

  it("connected to degraded preserves listeners", () => {
    const result = transition(connectedState(), { type: "PROBE_RESULT", ok: true, err, opId: 1 }, ctx());
    expect(result.effects).not.toContainEqual({ type: "uninstall-listeners" });
  });

  it("degraded to reconnecting preserves listeners", () => {
    const result = transition(degradedState(), { type: "PROBE_RESULT", ok: false, err, opId: 1 }, ctx());
    expect(result.effects).not.toContainEqual({ type: "uninstall-listeners" });
  });

  it("reconnecting to error uninstalls listeners", () => {
    const result = transition(reconnectingState(3), { type: "OPERATION_FAILED", err, opId: 1 }, ctx());
    expect(result.effects).toContainEqual({ type: "uninstall-listeners" });
  });

  it.each([
    ["macOS setup basic enters connecting with pending basic", false, "basic"],
    ["macOS setup advanced enters connecting with pending advanced", true, "advanced"],
  ] as const)("%s", (_name, advanced, expected) => {
    const result = transition(errorState("macos-claim-collision"), {
      type: "MACOS_SETUP_ATTEMPTED",
      advanced,
    }, ctx());
    expect(result.state).toMatchObject({
      kind: "connecting",
      macosSetupPending: expected,
    });
  });

  it("macOS setup success emits setup-confirmed notification", () => {
    const connecting = transition(errorState("macos-claim-collision"), {
      type: "MACOS_SETUP_ATTEMPTED",
      advanced: true,
    }, ctx()).state;
    const result = transition(connecting, connectSucceeded(), ctx());
    expect(result.effects).toContainEqual({
      type: "notify-setup-confirmed",
      advanced: true,
    });
  });
});
