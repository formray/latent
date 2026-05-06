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

function macosError(): ConnectionState {
  return {
    kind: "error",
    reason: "macos-claim-collision",
    underlying: new LatentError("UsbDisconnect", "busy"),
    isPhysicallyRecoverable: true,
  };
}

describe("MacosSetupWizard", () => {
  beforeEach(() => {
    resetCameraManagerForTests();
    localStorage.clear();
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

  it("first macos claim collision shows beta warning", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(macosError());
    render(<CameraConnect />);
    expect(screen.getByRole("dialog")).toHaveTextContent(/macOS camera support is beta/i);
  });

  it("acknowledging beta persists macosBetaAcknowledged", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    emitState(macosError());
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /i understand/i }));
    expect(useCameraStore.getState().macosBetaAcknowledged).toBe(true);
  });

  it("basic wizard click dispatches MACOS_SETUP_ATTEMPTED advanced false", () => {
    const { manager, dispatch, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({ macosBetaAcknowledged: true });
    emitState(macosError());
    render(<CameraConnect />);
    expect(screen.getByText("killall ptpcamerad icdd")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /i've run it/i }));
    expect(dispatch).toHaveBeenCalledWith({
      type: "MACOS_SETUP_ATTEMPTED",
      advanced: false,
    });
  });

  it("basic reconnect failure leaves both setup flags false", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({ macosBetaAcknowledged: true });
    emitState(macosError());
    emitState(macosError());
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(false);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(false);
  });

  it("failed basic path reveals Show advanced option", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({ macosBetaAcknowledged: true });
    emitState(macosError());
    render(<CameraConnect />);
    expect(screen.getByRole("button", { name: /show advanced option/i })).toBeInTheDocument();
  });

  it("advanced wizard renders disable and enable commands", () => {
    const { manager, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({ macosBetaAcknowledged: true });
    emitState(macosError());
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /show advanced option/i }));
    expect(screen.getByText(/launchctl disable/)).toBeInTheDocument();
    expect(screen.getByText(/killall -STOP ptpcamerad icdd/)).toBeInTheDocument();
    expect(screen.getByText(/killall -CONT ptpcamerad icdd/)).toBeInTheDocument();
    expect(screen.getAllByText(/com\.apple\.icdd/)).toHaveLength(2);
    expect(screen.getByText(/launchctl enable/)).toBeInTheDocument();
  });

  it("advanced click dispatches MACOS_SETUP_ATTEMPTED advanced true", () => {
    const { manager, dispatch, emitState } = fakeManager();
    wireCameraManager(manager);
    useCameraStore.setState({ macosBetaAcknowledged: true });
    emitState(macosError());
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /show advanced option/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /i've run it/i })[1]!);
    expect(dispatch).toHaveBeenCalledWith({
      type: "MACOS_SETUP_ATTEMPTED",
      advanced: true,
    });
  });

  it("setup-confirmed advanced sets persistent flag", () => {
    const { manager, emitNotification } = fakeManager();
    wireCameraManager(manager);
    emitNotification("setup-confirmed", { advanced: true });
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(true);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(true);
  });

  it("success step reset action clears both macOS setup flags", () => {
    useCameraStore.setState({
      macosWizardOpen: true,
      macosSetupAcknowledged: true,
      macosPersistentDisableConfigured: true,
    });
    render(<CameraConnect />);
    fireEvent.click(screen.getByRole("button", { name: /reset macos setup status/i }));
    expect(useCameraStore.getState().macosSetupAcknowledged).toBe(false);
    expect(useCameraStore.getState().macosPersistentDisableConfigured).toBe(false);
  });
});
