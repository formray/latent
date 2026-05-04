import { LatentError } from "@latent/ptp-fuji";
import type { CameraDriver } from "./driver.js";
import {
  backoffDelayMs,
  initialConnectionState,
  transition,
  type ConnectionContext,
  type ConnectionEffect,
  type ConnectionEvent,
} from "./state-machine.js";
import type { ConnectionState } from "./types.js";

export interface RawPreset {
  slot: number;
  name?: string;
  properties: Record<string, unknown>;
}

export type ManagerNotifications = {
  "setup-confirmed": { advanced: boolean };
  "presets-read": { presets: RawPreset[] };
};

export interface ConnectionManagerOptions {
  shouldAutoconnect?: () => Promise<boolean> | boolean;
}

type StateSubscriber = (state: ConnectionState) => void;

type NotificationSubscriber<K extends keyof ManagerNotifications> = (
  payload: ManagerNotifications[K],
) => void;

export class ConnectionManager {
  private state: ConnectionState = initialConnectionState;
  private currentOpId = 0;
  private stateSubscribers: StateSubscriber[] = [];
  private notificationSubscribers: {
    "setup-confirmed": Array<NotificationSubscriber<"setup-confirmed">>;
    "presets-read": Array<NotificationSubscriber<"presets-read">>;
  } = {
    "setup-confirmed": [],
    "presets-read": [],
  };
  private listenerUnsubscribers: Array<() => void> = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAbort: AbortController | undefined;

  constructor(
    private readonly driver: CameraDriver,
    private readonly options: ConnectionManagerOptions = {},
  ) {}

  subscribe(handler: StateSubscriber): () => void {
    this.stateSubscribers.push(handler);
    return () => {
      this.stateSubscribers = this.stateSubscribers.filter((item) => item !== handler);
    };
  }

  onNotification<K extends keyof ManagerNotifications>(
    type: K,
    handler: NotificationSubscriber<K>,
  ): () => void {
    const handlers = this.notificationSubscribers[type] as Array<NotificationSubscriber<K>>;
    handlers.push(handler);
    return () => {
      const next = handlers.filter((item) => item !== handler);
      if (type === "setup-confirmed") {
        this.notificationSubscribers["setup-confirmed"] = next as Array<
          NotificationSubscriber<"setup-confirmed">
        >;
      } else {
        this.notificationSubscribers["presets-read"] = next as Array<
          NotificationSubscriber<"presets-read">
        >;
      }
    };
  }

  getSnapshot(): ConnectionState {
    return this.state;
  }

  start(): void {
    void (async () => {
      if (await this.options.shouldAutoconnect?.()) {
        this.dispatch({ type: "AUTOCONNECT_AT_BOOT" });
      }
    })();
  }

  dispatch(event: ConnectionEvent): void {
    if (event.type === "OPERATION_FAILED" && isAlive(this.state)) {
      const opId = event.opId;
      void (async () => {
        const ok = await this.driver.probe();
        this.dispatch({ type: "PROBE_RESULT", ok, err: event.err, opId });
      })();
      return;
    }

    const result = transition(this.state, event, this.context());
    if (result.state === this.state && result.effects.length === 0) return;
    this.commit(result.state, result.effects);
  }

  private context(): ConnectionContext {
    return { currentOpId: this.currentOpId };
  }

  private commit(next: ConnectionState, effects: ConnectionEffect[]): void {
    const previous = this.state;
    this.applyPreSubscriberEffects(previous, next, effects);
    this.state = next;
    for (const subscriber of this.stateSubscribers) {
      subscriber(next);
    }
    for (const effect of effects) {
      if (effect.type === "notify-setup-confirmed") {
        this.emitNotification("setup-confirmed", { advanced: effect.advanced });
      }
    }
    this.applyPostSubscriberEffects(previous, next, effects);
  }

  private applyPreSubscriberEffects(
    previous: ConnectionState,
    next: ConnectionState,
    effects: ConnectionEffect[],
  ): void {
    for (const effect of effects) {
      if (effect.type === "abort-connect") {
        abortState(previous);
        this.reconnectAbort?.abort();
      }
      if (effect.type === "clear-backoff") {
        this.clearReconnectTimer();
      }
      if (effect.type === "install-listeners") this.installListeners();
      if (effect.type === "uninstall-listeners") this.uninstallListeners();
      if (effect.type === "fire-close-session") this.driver.fireCloseSession();
    }
    if (next.kind === "connecting" && previous !== next) {
      this.startConnect(next);
    }
    if (next.kind === "reconnecting" && previous !== next) {
      this.startReconnect(next);
    }
  }

  private applyPostSubscriberEffects(
    _previous: ConnectionState,
    next: ConnectionState,
    _effects: ConnectionEffect[],
  ): void {
    if (next.kind === "disconnected") {
      void this.driver.disconnect();
    }
  }

  private startConnect(state: Extract<ConnectionState, { kind: "connecting" }>): void {
    const opId = ++this.currentOpId;
    void this.runConnect(opId, state.abort);
  }

  private startReconnect(state: Extract<ConnectionState, { kind: "reconnecting" }>): void {
    this.clearReconnectTimer();
    this.reconnectAbort = state.abort;
    this.reconnectTimer = setTimeout(() => {
      void this.runConnect(++this.currentOpId, state.abort);
    }, backoffDelayMs(state.attempt));
  }

  private async runConnect(opId: number, abort: AbortController): Promise<void> {
    try {
      const result = await this.driver.connect({
        autoSelectPaired: true,
        signal: abort.signal,
      });
      if (opId !== this.currentOpId || !canAcceptConnect(this.state)) {
        await result.dispose();
        return;
      }
      this.dispatch({
        type: "CONNECT_SUCCEEDED",
        opId,
        port: result.port,
        deviceInfo: result.deviceInfo,
      });
    } catch (rawErr) {
      if (opId !== this.currentOpId || abort.signal.aborted) return;
      if (rawErr instanceof LatentError) {
        this.dispatch({ type: "OPERATION_FAILED", err: rawErr, opId });
      }
    }
  }

  private installListeners(): void {
    if (this.listenerUnsubscribers.length > 0) return;
    this.listenerUnsubscribers = [
      this.driver.subscribeDisconnectEvents(() => {
        this.dispatch({ type: "USB_DEVICE_DISCONNECTED" });
      }),
      this.driver.subscribeConnectEvents(() => {
        this.dispatch({ type: "USB_DEVICE_CONNECTED" });
      }),
    ];
    const pageHandler = () => this.dispatch({ type: "PAGE_HIDING" });
    const target = globalThis as unknown as {
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    if (typeof target.addEventListener === "function") {
      target.addEventListener("pagehide", pageHandler);
      target.addEventListener("beforeunload", pageHandler);
      this.listenerUnsubscribers.push(() => {
        target.removeEventListener?.("pagehide", pageHandler);
        target.removeEventListener?.("beforeunload", pageHandler);
      });
    }
  }

  private uninstallListeners(): void {
    for (const unsubscribe of this.listenerUnsubscribers.splice(0)) {
      unsubscribe();
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== undefined) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private emitNotification<K extends keyof ManagerNotifications>(
    type: K,
    payload: ManagerNotifications[K],
  ): void {
    for (const subscriber of this.notificationSubscribers[type] as Array<NotificationSubscriber<K>>) {
      subscriber(payload);
    }
  }
}

function isAlive(state: ConnectionState): boolean {
  return state.kind === "connected" || state.kind === "degraded";
}

function canAcceptConnect(state: ConnectionState): boolean {
  return state.kind === "connecting" || state.kind === "reconnecting";
}

function abortState(state: ConnectionState): void {
  if (state.kind === "connecting" || state.kind === "reconnecting") {
    state.abort.abort();
  }
}
