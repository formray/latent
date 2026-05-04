import { describe, expect, it, vi } from "vitest";
import type { CameraDriver, DriverConnectResult } from "../src/driver.js";
import type { CameraSessionPort } from "../src/session-port.js";
import {
  ERROR_REASONS,
  assertNever,
  type ConnectionState,
  type ErrorReason,
} from "../src/types.js";

const port: CameraSessionPort = {
  getDeviceInfo: vi.fn(async () => ({
    model: "X-S20",
    firmwareVersion: "1.10",
    supportedOps: [],
  })),
  getDevicePropValue: vi.fn(async () => ({ kind: "uint16", value: 1 })),
  setDevicePropValue: vi.fn(async () => undefined),
  getPreset: vi.fn(async (slot: number) => ({ slot, properties: {} })),
  renderRawPreview: vi.fn(async () => ({
    jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
    baseProfile: new Uint8Array([1, 2, 3, 4]),
  })),
  isOpen: vi.fn(() => true),
};

describe("camera connection public types", () => {
  it("discriminates idle", () => {
    const state: ConnectionState = { kind: "idle" };
    expect(renderState(state)).toBe("idle");
  });

  it("discriminates connecting with macos setup pending", () => {
    const state: ConnectionState = {
      kind: "connecting",
      attempt: 1,
      abort: new AbortController(),
      macosSetupPending: "advanced",
    };
    expect(state.macosSetupPending).toBe("advanced");
  });

  it("discriminates connected with CameraSessionPort", () => {
    const state: ConnectionState = {
      kind: "connected",
      port,
      cameraModel: "X-S20",
      firmwareVersion: "1.10",
    };
    expect(state.port.isOpen()).toBe(true);
  });

  it("exposes DriverConnectResult.dispose", async () => {
    const result: DriverConnectResult = {
      port,
      deviceInfo: { model: "X-S20", firmwareVersion: "1.10", supportedOps: [] },
      dispose: vi.fn(async () => undefined),
    };
    await result.dispose();
    expect(result.dispose).toHaveBeenCalledTimes(1);
  });

  it("contains all 8 error reasons", () => {
    expect(ERROR_REASONS).toEqual([
      "macos-claim-collision",
      "camera-off",
      "cable-unplugged",
      "permission-denied",
      "secure-context",
      "webusb-unsupported",
      "session-stale",
      "unknown",
    ]);
  });

  it("types CameraDriver against DriverConnectResult", async () => {
    const driver: CameraDriver = {
      connect: vi.fn(async () => ({
        port,
        deviceInfo: { model: "X-S20", firmwareVersion: "1.10", supportedOps: [] },
        dispose: vi.fn(async () => undefined),
      })),
      disconnect: vi.fn(async () => undefined),
      subscribeDisconnectEvents: vi.fn(() => () => undefined),
      subscribeConnectEvents: vi.fn(() => () => undefined),
      fireCloseSession: vi.fn(() => undefined),
      probe: vi.fn(async () => true),
    };
    await expect(driver.connect()).resolves.toMatchObject({
      deviceInfo: { model: "X-S20" },
    });
  });
});

function renderState(state: ConnectionState): string {
  switch (state.kind) {
    case "idle":
    case "connecting":
    case "connected":
    case "degraded":
    case "reconnecting":
    case "error":
    case "disconnected":
      return state.kind;
    default:
      return assertNever(state);
  }
}

void (undefined as ErrorReason | undefined);
