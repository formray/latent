import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LatentError } from "@latent/ptp-fuji";
import type {
  ConnectionManager,
  ConnectionState,
  ManagerNotifications,
} from "@latent/camera-connection";
import { CameraConnect } from "../src/components/CameraConnect";
import {
  resetCameraManagerForTests,
  useCameraStore,
  wireCameraManager,
} from "../src/stores/camera";

function fakeManager(): {
  manager: ConnectionManager;
  dispatch: ReturnType<typeof vi.fn>;
  emitState: (state: ConnectionState) => void;
  emitNotification: <K extends keyof ManagerNotifications>(
    type: K,
    payload: ManagerNotifications[K],
  ) => void;
} {
  let stateHandler: ((state: ConnectionState) => void) | undefined;
  const notificationHandlers: Partial<{
    [K in keyof ManagerNotifications]: (payload: ManagerNotifications[K]) => void;
  }> = {};
  const dispatch = vi.fn();
  const manager = {
    subscribe: vi.fn((handler: (state: ConnectionState) => void) => {
      stateHandler = handler;
      return () => undefined;
    }),
    onNotification: vi.fn(<K extends keyof ManagerNotifications>(
      type: K,
      handler: (payload: ManagerNotifications[K]) => void,
    ) => {
      notificationHandlers[type] = handler as never;
      return () => undefined;
    }),
    start: vi.fn(),
    dispatch,
  } as unknown as ConnectionManager;

  return {
    manager,
    dispatch,
    emitState(state) {
      stateHandler?.(state);
    },
    emitNotification(type, payload) {
      notificationHandlers[type]?.(payload as never);
    },
  };
}

function connectedState(): ConnectionState {
  return {
    kind: "connected",
    port: {
      getDeviceInfo: vi.fn(),
      getDevicePropValue: vi.fn(),
      setDevicePropValue: vi.fn(),
      getPreset: vi.fn(),
      isOpen: vi.fn(() => true),
    },
    cameraModel: "X-S20",
    firmwareVersion: "1.10",
  };
}

function errorConnectionState(reason: Parameters<typeof makeError>[0]): ConnectionState {
  return {
    kind: "error",
    reason,
    underlying: makeError(reason),
    isPhysicallyRecoverable: !["secure-context", "webusb-unsupported"].includes(reason),
  };
}

function makeError(reason: import("@latent/camera-connection").ErrorReason): LatentError {
  if (reason === "permission-denied") return new LatentError("UsbPermissionDenied", reason);
  if (reason === "secure-context") return new LatentError("WebUSBSecureContextRequired", reason);
  if (reason === "webusb-unsupported") return new LatentError("WebUSBUnsupported", reason);
  return new LatentError("UsbDisconnect", reason);
}

describe("<CameraConnect />", () => {
  beforeEach(() => {
    resetCameraManagerForTests();
    if (typeof localStorage.clear === "function") {
      localStorage.clear();
    }
    useCameraStore.setState({
      state: { kind: "idle" },
      presets: [],
      macosBetaAcknowledged: false,
      macosSetupAcknowledged: false,
      macosPersistentDisableConfigured: false,
      macosWizardOpen: false,
      macosShowAdvanced: false,
    });
  });

  it("renders the connect button in idle state", () => {
    render(<CameraConnect />);
    expect(screen.getByRole("button", { name: /connect camera/i })).toBeInTheDocument();
  });

  it("connect dispatches CONNECT_REQUESTED", () => {
    const { manager, dispatch } = fakeManager();
    wireCameraManager(manager);
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /connect camera/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CONNECT_REQUESTED" });
  });

  it("disconnect dispatches DISCONNECT_REQUESTED", () => {
    const { manager, dispatch, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(connectedState());
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "DISCONNECT_REQUESTED" });
  });

  it("retry dispatches RETRY_REQUESTED", () => {
    const { manager, dispatch, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(errorConnectionState("session-stale"));
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "RETRY_REQUESTED" });
  });

  it("permission-denied Connect action dispatches CONNECT_REQUESTED", () => {
    const { manager, dispatch, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(errorConnectionState("permission-denied"));
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /connect/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "CONNECT_REQUESTED" });
  });

  it("state subscriber mirrors manager state", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(connectedState());
    expect(useCameraStore.getState().state.kind).toBe("connected");
  });

  it("setup-confirmed basic sets only macosSetupAcknowledged", () => {
    const { manager, emitNotification } = fakeManager();
    wireCameraManager(manager);
    emitNotification("setup-confirmed", { advanced: false });
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(true);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(false);
  });

  it("setup-confirmed advanced sets both macOS setup flags", () => {
    const { manager, emitNotification } = fakeManager();
    wireCameraManager(manager);
    emitNotification("setup-confirmed", { advanced: true });
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(true);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(true);
  });

  it("macos claim collision with persistent flag resets both setup flags", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({
      macosSetupAcknowledged: true,
      macosPersistentDisableConfigured: true,
    });
    emitState(errorConnectionState("macos-claim-collision"));
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(false);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(false);
  });

  it("macos claim collision without persistent flag keeps setup acknowledgement", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({
      macosSetupAcknowledged: true,
      macosPersistentDisableConfigured: false,
    });
    emitState(errorConnectionState("macos-claim-collision"));
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(true);
  });

  it("non-mac error does not reset macOS setup flags", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({
      macosSetupAcknowledged: true,
      macosPersistentDisableConfigured: true,
    });
    emitState(errorConnectionState("session-stale"));
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(true);
  });

  it.each([
    ["connecting renders ConnectingIndicator with attempt", { kind: "connecting", attempt: 2, abort: new AbortController() } as ConnectionState, /connecting/i],
    ["reconnecting renders ConnectingIndicator with attempt", { kind: "reconnecting", attempt: 3, abort: new AbortController(), backoffTimer: setTimeout(() => undefined, 0), lastFailure: makeError("cable-unplugged"), lastReason: "cable-unplugged" } as ConnectionState, /3/],
  ])("%s", (_name, state, text) => {
    useCameraStore.setState({ state });
    render(<CameraConnect />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("connected renders ConnectedBadge", () => {
    useCameraStore.setState({ state: connectedState() });
    render(<CameraConnect />);
    expect(screen.getByTestId("camera-status")).toHaveTextContent("X-S20");
  });

  it("degraded renders ConnectedBadge and DegradedBanner", () => {
    const connected = connectedState();
    if (connected.kind !== "connected") throw new Error("expected connected");
    useCameraStore.setState({
      state: {
        ...connected,
        kind: "degraded",
        consecutiveSoftFailures: 1,
        lastFailure: makeError("camera-off"),
      },
    });
    render(<CameraConnect />);
    expect(screen.getByTestId("camera-status")).toHaveTextContent("X-S20");
    expect(screen.getByRole("status")).toHaveTextContent(/intermittently/i);
  });

  it.each([
    ["macos-claim-collision", /macos is holding the camera/i],
    ["camera-off", /camera not responding/i],
    ["cable-unplugged", /camera unplugged/i],
    ["permission-denied", /permission needed/i],
    ["secure-context", /insecure context/i],
    ["webusb-unsupported", /browser not supported/i],
    ["session-stale", /camera in stale state/i],
    ["unknown", /connection failed/i],
  ] as const)("ErrorBanner renders %s copy", (reason, text) => {
    useCameraStore.setState({ state: errorConnectionState(reason) });
    render(<CameraConnect />);
    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  it("cable-unplugged title is Camera unplugged", () => {
    useCameraStore.setState({ state: errorConnectionState("cable-unplugged") });
    render(<CameraConnect />);
    expect(screen.getByRole("alert")).toHaveTextContent("Camera unplugged");
    expect(screen.getByRole("alert")).not.toHaveTextContent("Camera disconnected");
  });

  it("presets-read notification populates store", () => {
    const { manager, emitNotification } = fakeManager();
    wireCameraManager(manager);
    emitNotification("presets-read", { presets: [{ slot: 1, properties: {} }] });
    expect(useCameraStore.getState().presets).toHaveLength(1);
  });
});
