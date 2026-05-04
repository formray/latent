import { describe, expect, it, vi } from "vitest";
import { LatentError } from "@latent/ptp-fuji";
import { ConnectionManager } from "../src/manager.js";
import type { DriverConnectResult } from "../src/driver.js";
import { FakeCameraDriver, FakeSessionPort } from "./fakes.js";

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function result(port = new FakeSessionPort()): DriverConnectResult {
  return {
    port,
    deviceInfo: port.deviceInfo,
    usbSerialNumber: "USB-123",
    dispose: vi.fn(async () => {
      port.open = false;
    }),
  };
}

const err = new LatentError("UsbDisconnect", "gone", undefined, {
  stage: "transfer-in",
});

describe("ConnectionManager public API", () => {
  it("subscribe receives state on first commit", () => {
    const manager = new ConnectionManager(new FakeCameraDriver());
    const states: string[] = [];
    manager.subscribe((state) => states.push(state.kind));
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    expect(states[0]).toBe("connecting");
  });

  it("CONNECT_REQUESTED calls driver.connect with autoSelectPaired true", () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    expect(driver.connectCalls[0]).toMatchObject({ autoSelectPaired: true });
  });

  it("connect success commits connected", async () => {
    const manager = new ConnectionManager(new FakeCameraDriver());
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    expect(manager.getSnapshot().kind).toBe("connected");
  });

  it("connect success reads C presets and emits presets-read", async () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver);
    const handler = vi.fn();
    manager.onNotification("presets-read", handler);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(driver.port.getPreset).toHaveBeenCalledWith(1);
    expect(driver.port.getPreset).toHaveBeenCalledWith(7);
    expect(handler).toHaveBeenCalledWith({
      presets: expect.arrayContaining([
        expect.objectContaining({ slot: 1 }),
        expect.objectContaining({ slot: 7 }),
      ]),
    });
  });

  it("preset read emits earlier slots when later custom slots are unavailable", async () => {
    const driver = new FakeCameraDriver();
    driver.port.getPreset.mockImplementation(async (slot: number) => {
      if (slot > 4) {
        throw new LatentError("PtpUnsupportedOperation", `C${slot} unavailable`);
      }
      return { slot, name: `C${slot}`, properties: {} };
    });
    const manager = new ConnectionManager(driver);
    const handler = vi.fn();
    manager.onNotification("presets-read", handler);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(handler).toHaveBeenCalledWith({
      presets: [
        expect.objectContaining({ slot: 1 }),
        expect.objectContaining({ slot: 2 }),
        expect.objectContaining({ slot: 3 }),
        expect.objectContaining({ slot: 4 }),
      ],
    });
  });

  it("raw picker cancellation exits connecting as permission-denied", async () => {
    const driver = new FakeCameraDriver();
    driver.connect = vi.fn(async () => {
      throw new DOMException("cancelled", "NotFoundError");
    });
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    expect(manager.getSnapshot()).toMatchObject({
      kind: "error",
      reason: "permission-denied",
    });
  });

  it("raw driver errors exit connecting instead of leaving the spinner forever", async () => {
    const driver = new FakeCameraDriver();
    driver.connect = vi.fn(async () => {
      throw new TypeError("raw browser failure");
    });
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    expect(manager.getSnapshot()).toMatchObject({
      kind: "error",
      reason: "cable-unplugged",
    });
  });

  it("DISCONNECT_REQUESTED calls driver.disconnect", async () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "DISCONNECT_REQUESTED" });
    expect(driver.disconnect).toHaveBeenCalledTimes(1);
  });

  it("start dispatches AUTOCONNECT_AT_BOOT when paired callback returns true", async () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver, {
      shouldAutoconnect: async () => true,
    });
    manager.start();
    await Promise.resolve();
    expect(driver.connectCalls).toHaveLength(1);
  });
});

describe("ConnectionManager stale operation handling", () => {
  it("disconnect while connecting aborts in-flight connect", () => {
    const driver = new FakeCameraDriver();
    const pending = deferred<DriverConnectResult>();
    driver.connect = vi.fn(async () => pending.promise);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    const signal = vi.mocked(driver.connect).mock.calls[0]?.[0]?.signal;
    manager.dispatch({ type: "DISCONNECT_REQUESTED" });
    expect(signal?.aborted).toBe(true);
  });

  it("late connect success after disconnect calls result.dispose", async () => {
    const driver = new FakeCameraDriver();
    const pending = deferred<DriverConnectResult>();
    driver.connect = vi.fn(async () => pending.promise);
    const late = result();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    manager.dispatch({ type: "DISCONNECT_REQUESTED" });
    pending.resolve(late);
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(late.dispose).toHaveBeenCalledTimes(1);
  });

  it("late connect failure after disconnect is ignored", async () => {
    const driver = new FakeCameraDriver();
    const pending = deferred<DriverConnectResult>();
    driver.connect = vi.fn(async () => pending.promise);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    manager.dispatch({ type: "DISCONNECT_REQUESTED" });
    pending.reject(err);
    await Promise.resolve();
    await Promise.resolve();
    expect(manager.getSnapshot().kind).toBe("disconnected");
  });

  it("fresh connect after stale success is not closed by stale dispose", async () => {
    const driver = new FakeCameraDriver();
    const firstPending = deferred<DriverConnectResult>();
    const second = result();
    driver.connect = vi
      .fn()
      .mockReturnValueOnce(firstPending.promise)
      .mockResolvedValueOnce(second);
    const late = result();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    manager.dispatch({ type: "DISCONNECT_REQUESTED" });
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    firstPending.resolve(late);
    await Promise.resolve();
    await Promise.resolve();
    expect(late.dispose).toHaveBeenCalledTimes(1);
    expect(second.port.isOpen()).toBe(true);
  });

  it("stale OPERATION_FAILED does not overwrite connected state", async () => {
    const manager = new ConnectionManager(new FakeCameraDriver());
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 0 });
    expect(manager.getSnapshot().kind).toBe("connected");
  });
});

describe("ConnectionManager listeners and page lifecycle", () => {
  it("connected installs USB listeners once", async () => {
    const driver = new FakeCameraDriver();
    const disconnectSpy = vi.spyOn(driver, "subscribeDisconnectEvents");
    const connectSpy = vi.spyOn(driver, "subscribeConnectEvents");
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it("connected to degraded preserves listeners", async () => {
    const driver = new FakeCameraDriver();
    const unsubscribe = vi.fn();
    driver.subscribeDisconnectEvents = vi.fn(() => unsubscribe);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "PROBE_RESULT", ok: true, err, opId: 1 });
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("degraded to reconnecting preserves listeners", async () => {
    const driver = new FakeCameraDriver();
    const unsubscribe = vi.fn();
    driver.subscribeDisconnectEvents = vi.fn(() => unsubscribe);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "PROBE_RESULT", ok: true, err, opId: 1 });
    manager.dispatch({ type: "PROBE_RESULT", ok: false, err, opId: 1 });
    expect(unsubscribe).not.toHaveBeenCalled();
  });

  it("alive to error uninstalls listeners once", async () => {
    const driver = new FakeCameraDriver();
    const unsubscribe = vi.fn();
    driver.subscribeDisconnectEvents = vi.fn(() => unsubscribe);
    driver.subscribeConnectEvents = vi.fn(() => vi.fn());
    driver.probe.mockResolvedValueOnce(false);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 1 });
    await Promise.resolve();
    expect(manager.getSnapshot().kind).toBe("reconnecting");
    vi.useFakeTimers();
    vi.useRealTimers();
  });

  it("pagehide and beforeunload call driver.fireCloseSession", async () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "PAGE_HIDING" });
    expect(driver.fireCloseSession).toHaveBeenCalledTimes(1);
  });
});

describe("ConnectionManager probe, backoff, and notifications", () => {
  it("operation failure in connected probes before state change", async () => {
    const driver = new FakeCameraDriver();
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 1 });
    expect(driver.probe).toHaveBeenCalledTimes(1);
  });

  it("probe ok moves connected to degraded", async () => {
    const driver = new FakeCameraDriver();
    driver.probe.mockResolvedValueOnce(true);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 1 });
    await Promise.resolve();
    expect(manager.getSnapshot().kind).toBe("degraded");
  });

  it("probe fail moves connected to reconnecting", async () => {
    const driver = new FakeCameraDriver();
    driver.probe.mockResolvedValueOnce(false);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 1 });
    await Promise.resolve();
    expect(manager.getSnapshot().kind).toBe("reconnecting");
  });

  it("third soft failure escalates from degraded to reconnecting", async () => {
    const manager = new ConnectionManager(new FakeCameraDriver());
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "PROBE_RESULT", ok: true, err, opId: 1 });
    manager.dispatch({ type: "PROBE_RESULT", ok: true, err, opId: 1 });
    manager.dispatch({ type: "PROBE_RESULT", ok: true, err, opId: 1 });
    expect(manager.getSnapshot().kind).toBe("reconnecting");
  });

  it("reconnect backoff retries at 200, 800, then 2000 ms", async () => {
    vi.useFakeTimers();
    const driver = new FakeCameraDriver();
    driver.probe.mockResolvedValueOnce(false);
    driver.connect = vi.fn().mockResolvedValueOnce(result()).mockRejectedValue(err);
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "OPERATION_FAILED", err, opId: 1 });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(800);
    await vi.advanceTimersByTimeAsync(2000);
    expect(driver.connect).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("setup-confirmed notification fires after state subscribers", async () => {
    const driver = new FakeCameraDriver();
    driver.connect = vi
      .fn()
      .mockRejectedValueOnce(
        new LatentError("UsbDisconnect", "busy", undefined, {
          stage: "claim",
          domException: "NetworkError",
          platform: "mac",
        }),
      )
      .mockResolvedValue(result());
    const manager = new ConnectionManager(driver);
    const order: string[] = [];
    manager.subscribe((state) => {
      if (state.kind === "connected") order.push("state");
    });
    manager.onNotification("setup-confirmed", () => order.push("notification"));
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "MACOS_SETUP_ATTEMPTED", advanced: true });
    await Promise.resolve();
    expect(order).toEqual(["state", "notification"]);
  });

  it("setup-confirmed notification is dropped when no subscriber exists", async () => {
    const driver = new FakeCameraDriver();
    driver.connect = vi
      .fn()
      .mockRejectedValueOnce(
        new LatentError("UsbDisconnect", "busy", undefined, {
          stage: "claim",
          domException: "NetworkError",
          platform: "mac",
        }),
      )
      .mockResolvedValue(result());
    const manager = new ConnectionManager(driver);
    manager.dispatch({ type: "CONNECT_REQUESTED" });
    await Promise.resolve();
    manager.dispatch({ type: "MACOS_SETUP_ATTEMPTED", advanced: false });
    await Promise.resolve();
    const handler = vi.fn();
    manager.onNotification("setup-confirmed", handler);
    expect(handler).not.toHaveBeenCalled();
  });
});
