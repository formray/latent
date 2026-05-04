# Camera connection stability — design

**Status**: Draft, awaiting user review (revision 3 — incorporates Codex review round 2)
**Date**: 2026-05-04
**Owner**: Giuseppe Albrizio
**Related**:
- Spec V1 §6.1 (connect), §6.6 (disconnect mid-flow), §6.9 (typed errors), §10 (macOS path)
- Spec V2 §14 (Tauri 2.0 + libusb backend)
- ROADMAP Phase 2-min ✅, Phase 2-full → this design is its hardening foundation

## 1. Background

Phase 2-min shipped `@latent/ptp-fuji-webusb` and Phase 3-base shipped the
web app shell with a `CameraConnect` button. Today we made the first real
PTP `OpenSession` round-trip against an X-S20 over WebUSB on macOS. Two
problems surfaced immediately and neither has a workaround in the current
codebase:

1. **Refresh leaves the PTP session stuck on the camera.** After `Cmd+R`,
   the next connect attempt fails. The exact failure point (claim vs
   `OpenSession`) was not captured; reproducing it for diagnosis is an
   open task — see §12 Q1. Until then we treat the page-unload cleanup
   path as best-effort and put the real recovery at connect-time.
2. **macOS `ptpcamerad` daemon claims the PTP interface ahead of WebUSB**,
   producing `NetworkError: Unable to claim interface` on the first
   connect attempt. The user-visible message is a generic
   "Camera disconnected" with no actionable guidance.

The current `CameraConnect` and Zustand store use boolean state
(`connecting / connected / error`), which can already produce
contradictory combinations. Adding retry logic, USB events, and explicit
failure reasons on top of that structure makes the contradiction surface
explode. The store needs a refactor before stability work compounds the
mess.

## 2. Goals

The system must remain in a recoverable state — without physical
power-cycle of the camera — for every failure mode below:

- Page lifecycle: refresh, tab close, navigation away, hot reload, tab crash
- USB-level: cable unplug, switch off, battery dies, hub power-cycle
- Camera-level: sleep, wrong USB mode, stale PTP session post-crash
- Platform-level: macOS daemon claim, Image Capture interference
- Browser-level: insecure context, non-Chromium, picker cancellation
- Mid-operation (preview only — full handling in Phase 4): cable yank
  during read, stall, timeout

Every failure surfaces a specific, actionable banner. No banner uses the
generic copy "Camera disconnected".

The implementation must be ready for the V2 transport swap (Tauri +
libusb) without rewriting the state machine, the store, or the UI. V2
explicitly puts the PTP session in Rust; the V1 abstraction must not
leak the `FujiCameraSession` JS type through the manager API.

## 3. Non-goals

- **No persistence of preset data across reload.** Presets are re-read
  from the camera on reconnect (under 1s typically). User recipe library
  persistence (already in Zustand + localStorage) is unchanged.
- **No native helper / Tauri sidecar in V1.** V1 stays browser-only as
  per spec §2. Future Tauri integration in V2 swaps the driver, not the
  manager.
- **No transactional verified backup logic.** That is Phase 4 (§6.3).
  The manager exposes a hook (`wrapOperation`) so Phase 4 can attach to
  it without restructuring.
- **No camera-side preview / RAF round-trip.** Phase 4 (§6.4).
- **No Bluetooth or WiFi alternative transports.** V3+ (§14).

## 4. Decisions taken during brainstorming and revision

| Decision | Choice | Why |
|---|---|---|
| Failure scope | All failure modes covered | User-stated requirement |
| UX style | Mix: silent auto-recover for soft errors, explicit banner + retry for hard errors | A pure-silent or pure-explicit approach is frustrating in opposite ways |
| Persistence | Auto-reconnect via WebUSB permission, no preset cache | YAGNI; cache invalidation cost > re-read cost |
| macOS daemon strategy | Safer-first per V1 §10: surface beta warning + `killall ptpcamerad` (one-shot) as default; persistent `launchctl disable` exposed as advanced option with full disclosure | V1 spec explicitly frames macOS as beta-with-disclaimer; persistent disable changes Image Capture / Photos system-wide and must not be the silent default |
| Architecture | Approach 3: separate `ConnectionManager` + `CameraSessionPort` interface, store as thin view layer | V2 explicitly swaps the transport (Tauri + libusb); the abstraction pays for itself |
| State machine | 7 explicit states (`idle`, `connecting`, `connected`, `degraded`, `reconnecting`, `error`, `disconnected`) with discriminated union | V1 §6.6 mandates `degraded` for stall mid-operation; boolean composition produces contradictory combinations |
| V1→V2 boundary | `CameraSessionPort` interface (operations as methods) instead of exposing `FujiCameraSession` | V2 owns the PTP session in Rust; the JS layer holds only an opaque port |
| Error structure | `LatentError` extended with `stage` (`open` / `claim` / `transfer-in` / `transfer-out` / `reset` / `setup-config` / `endpoint-discovery`) and structured `cause` | Substring matching on error message is brittle (Codex blocker B4) |
| `device.reset()` as recovery | Guarded step with post-reset reconfig + endpoint rediscovery; specific tests for success / reject / disconnect-as-side-effect | "Cheap and benign on every platform" was too strong (Codex H1) |
| `subscribeConnectEvents` filter | Vendor + product + (optional) serial + `getDevices()` permission state — no object identity | Browsers create new `USBDevice` objects on replug (Codex H3) |
| `probe()` opcode | PTP `GetDeviceInfo` (0x1001) with explicit DATA→RESPONSE container parsing; returns `{model, firmwareVersion, supportedOps}` | Standard, vendor-agnostic; firmware version is required for capability lookup per V1 §6.1 (Codex H2) |
| Page-unload close | True best-effort: dispatch one `CloseSession` command synchronously into the WebUSB transport via `navigator.sendBeacon`-style write, do not rely on it for correctness | Async `transferOut` cannot complete reliably during `beforeunload` (Codex B2) |
| Stale-session connect-time recovery | After failed `OpenSession`, attempt: reset → reopen device → reselect config → rediscover endpoints → reclaim → reopen session | This is the *real* recovery path — page-unload is a nice-to-have on top |
| Reconnect attempts | 3 with exponential backoff `[200ms, 800ms, 2000ms]` per `reconnecting` entry; per-attempt `AbortController` for cancellation | Covers transient failures; cancellation prevents stale promise resolution from corrupting state (Codex B3) |
| Stale-completion cleanup | If `driver.connect()` resolves with a stale `opId`, the manager calls `driver.disconnect()` on the late result before discarding it | Otherwise an aborted connect that opens a device "behind our back" leaves the device claimed (Codex B3 round 2) |
| Liveness probe timeout | 3000ms | Balance between false positives and recovery latency |
| Probe gating in `degraded` | `probe()` runs on every `OPERATION_FAILED` in `degraded`, not only after 3 soft failures | A hard failure (timeout, stall) during degraded must escalate immediately (Codex H4 round 2) |
| Listener ownership | Connection-generation-owned, not per-state-entry/exit. Installed on entering `connected` from a `connecting` success; uninstalled only on entering `disconnected` or `error` | Avoids the `connected → degraded → connected` double-install bug and the `connected` exit / `degraded` retain contradiction (Codex NH2) |
| Probe payload | `PROBE_RESULT { ok, err, opId }` carries the original failure so the state machine has nowhere to lose it | Avoids a `probing` sub-state while still giving transitions the `lastFailure` they declare (Codex NH1) |
| `OpenSession` failure stage | Driver wraps every `session.open()` rejection with `stage: "open"` after a successful claim, regardless of which lower-layer stage threw | `transfer-in` from inside `OpenSession` would otherwise misroute to `cable-unplugged` (Codex B4 round 2) |
| `PtpFraming.sendCommand()` validation | Validate response container type, transaction ID, and `code === PTPResp.OK` inside the framing layer | Step 1 refactor would otherwise drop the existing checks in `session.ts:114-136` and silently accept `SessionAlreadyOpen` and other non-OK codes (Codex NB1) |
| `CameraSessionPort` scope | Minimal stability port for V1 Phase 2-min: `getDeviceInfo`, `getDevicePropValue`, `setDevicePropValue`, `isOpen`. Phase 4 extends it with a `Phase4SessionPort` sub-interface adding `sendCommand` / `sendDataCommand` for vendor opcodes and object I/O | Keeps the V1 surface small and reviewable; documents the extension point so V2's Tauri port can plan for it (Codex NH3) |
| macOS persistence flags | Two separate flags: `macosSetupAcknowledged` (one-time wizard education seen) and `macosPersistentDisableConfigured` (advanced disable opt-in completed). Wizard auto-open is gated on the first; education re-display is gated on the second | `killall` is per-session and a successful reconnect after `killall` does not mean persistent setup is in place (Codex NH4) |
| `MACOS_SETUP_*` event split | Two events: `MACOS_SETUP_ATTEMPTED` (user clicked "I've run it") triggers `connecting`; `MACOS_SETUP_CONFIRMED` is dispatched by the manager when that connect succeeds and only then are flags persisted | Round 1 had a single `MACOS_SETUP_DONE` whose semantics were contradictory across event table, transition, and wizard (Codex H5 round 2) |
| `PtpTimeout` classification | Maps to `camera-off` by default; probe disambiguates between sleep (camera-off) and stale-session (session-stale) when called | Was falling through to `unknown` (Codex NM1) |
| Connect/disconnect event filter | Vendor + product + optional serial + permission state — implementation matches the decision, no shortcut to vendor-only | Round 2's r2 sample code regressed to vendor-only (Codex NM2) |
| Presets in store | Kept on the same `useCameraStore` as a separate `presets` field, populated by manager event after entering `connected` | Splitting into a second store is YAGNI for now |

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web/src/components/camera/                             │
│   CameraConnect, ConnectButton, ConnectingIndicator,        │
│   ConnectedBadge, DegradedBanner, ErrorBanner,              │
│   MacosBetaWarning, MacosSetupWizard                        │
│   (UI components — read store, dispatch actions)            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ subscribe to state
                              │
┌─────────────────────────────────────────────────────────────┐
│ apps/web/src/stores/camera.ts                               │
│ Zustand store — view layer; reflects ConnectionManager      │
│ state. No transition logic.                                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ emits state events; UI calls
                              │ manager.dispatch(event) for actions
                              │
┌─────────────────────────────────────────────────────────────┐
│ packages/camera-connection/src/manager.ts                   │
│ ConnectionManager — state machine, lifecycle, retry,        │
│ event subscription, page-unload best-effort cleanup,        │
│ error classification on structured stage metadata.          │
│ Driver-agnostic. Holds CameraSessionPort, never the JS      │
│ FujiCameraSession concrete type.                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ implements CameraDriver
                              │ + returns CameraSessionPort
                              │
┌─────────────────────────────────────────────────────────────┐
│ packages/camera-connection/src/drivers/webusb.ts            │
│ WebUsbCameraDriver — wraps @latent/ptp-fuji-webusb.         │
│ Owns FujiCameraSession internally, exposes it as a          │
│ CameraSessionPort.                                          │
│ V2: TauriCameraDriver returns a TauriRpcSessionPort         │
│ backed by IPC to a Rust libusb session; manager unchanged.  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│ @latent/ptp-fuji + @latent/ptp-fuji-webusb (existing)       │
│ Two changes:                                                │
│   1. FujiCameraSession refactored onto PtpFraming so the    │
│      DATA→RESPONSE pattern is reused for getDeviceInfo()    │
│      and future ops (Codex H2). fireCloseSession() becomes  │
│      a real session method, not a dangling PtpFraming util. │
│   2. LatentError gains stage / domException / platform      │
│      structured fields (Codex B4).                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.1 New package

`packages/camera-connection` (MIT, `@latent/camera-connection`).

Contents:

```
packages/camera-connection/
├── src/
│   ├── manager.ts           # ConnectionManager class
│   ├── state-machine.ts     # pure state + transitions (no I/O)
│   ├── classifier.ts        # LatentError(stage, category) → ErrorReason
│   ├── driver.ts            # CameraDriver interface
│   ├── session-port.ts      # CameraSessionPort interface
│   ├── drivers/
│   │   └── webusb.ts        # WebUsbCameraDriver + WebUsbSessionPort
│   ├── types.ts             # ConnectionState, ErrorReason, etc.
│   └── index.ts             # public API barrel
├── tests/
│   ├── state-machine.test.ts
│   ├── manager.test.ts
│   ├── webusb-driver.test.ts
│   └── fakes.ts             # FakeCameraDriver, FakeSessionPort,
│                            # FakeUSBDevice with reset() + event-target
└── package.json
```

The package's `package.json` defines local `test`, `typecheck`, `lint`,
and `build` scripts to match the CI gates in §10.7. Existing packages
keep their current scripts.

Why a new package and not a folder under `apps/web`: V2 reuses
`ConnectionManager`, `CameraDriver`, and `CameraSessionPort` from a
Tauri shell. Putting this in `apps/web` would couple it to the Vite
build. Keeping it in `packages/` matches the existing monorepo pattern.

### 5.2 Boundaries

- **UI components** never call the manager or driver directly. They read
  state from the Zustand store and dispatch actions defined on the store.
- **Store** never decides transitions. It is a passive subscriber to the
  manager. Actions on the store call `manager.dispatch(event)`.
- **Manager** owns the state machine, retry logic, USB event
  subscription, page-unload best-effort handling, and error
  classification. It does not know about WebUSB or about
  `FujiCameraSession`. It talks to a `CameraDriver` and holds a
  `CameraSessionPort` for the connected camera.
- **Driver** owns platform-specific transport details: WebUSB picker,
  claim-with-reset retry, USB event filtering, fire-and-forget
  CloseSession. It throws `LatentError` carrying `stage` metadata. It
  does not classify into `ErrorReason`.
- **Session port** owns the PTP-level operations a connected session
  exposes (read device info, read prop, write prop, etc.). Its
  implementation is platform-specific; its interface is platform-agnostic.

## 6. State machine

### 6.1 States

```ts
type ConnectionState =
  | { kind: "idle" }
  | {
      kind: "connecting";
      attempt: number;
      abort: AbortController;
      macosSetupPending?: true;  // set when entered via MACOS_SETUP_ATTEMPTED;
                                 // success emits MACOS_SETUP_CONFIRMED
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
      consecutiveSoftFailures: number;  // 1..2; 3 escalates to reconnecting
      lastFailure: LatentError;
    }
  | {
      kind: "reconnecting";
      attempt: number;                  // 1..3
      lastReason: ErrorReason;
      lastFailure: LatentError;
      backoffTimer: ReturnType<typeof setTimeout>;
      abort: AbortController;
    }
  | {
      kind: "error";
      reason: ErrorReason;
      underlying: LatentError;
      // True if the failure is recoverable by physical action (replug, etc.)
      // False if the failure requires environment change (insecure-context, etc.)
      isPhysicallyRecoverable: boolean;
    }
  | { kind: "disconnected" };

type ErrorReason =
  | "macos-claim-collision"
  | "camera-off"
  | "cable-unplugged"
  | "permission-denied"
  | "secure-context"
  | "webusb-unsupported"
  | "session-stale"
  | "unknown";
```

Discriminated union. TypeScript exhaustiveness check enforces complete
handling in every switch statement throughout the codebase.

The `connected` state holds a `CameraSessionPort`, never the concrete
`FujiCameraSession`. This is the V1→V2 boundary: in V2 the same state
holds a `TauriRpcSessionPort` instead, with no manager / store / UI
changes.

### 6.2 Events

| Event | Origin | Payload |
|---|---|---|
| `CONNECT_REQUESTED` | UI click on Connect | — |
| `AUTOCONNECT_AT_BOOT` | Manager `start()` if `getAlreadyPairedFujiCameras()` non-empty | — |
| `DISCONNECT_REQUESTED` | UI click on Disconnect | — |
| `USB_DEVICE_DISCONNECTED` | `navigator.usb` `disconnect` event filtered for Fuji vendor + product | — (manager already knows the connected device) |
| `USB_DEVICE_CONNECTED` | `navigator.usb` `connect` event filtered for paired Fuji + permission state | — |
| `OPERATION_FAILED` | Driver throws during I/O | `{ err: LatentError; opId: number }` |
| `OPERATION_SUCCEEDED` | Driver succeeds and `degraded` state needs to clear | `{ opId: number }` |
| `PROBE_RESULT` | Manager runs `probe()` after `OPERATION_FAILED` to disambiguate; payload carries the original failure so transitions can classify | `{ ok: boolean; err: LatentError; opId: number }` |
| `RETRY_REQUESTED` | UI click on retry | — |
| `MACOS_SETUP_ATTEMPTED` | Wizard "I've run it" click | — |
| `MACOS_SETUP_CONFIRMED` | Dispatched by the manager when a `connecting` triggered by `MACOS_SETUP_ATTEMPTED` reaches `connected` | — |
| `PAGE_HIDING` | `beforeunload` or `pagehide` | — |

`opId` is a monotonic integer assigned at operation dispatch time.
Events carrying a stale `opId` (older than the current connection
generation) are ignored by the state machine. This prevents stale
async resolutions from a previous `connecting` from corrupting a fresh
`connected` state (Codex B3).

### 6.3 Transitions

```
idle
  ─[CONNECT_REQUESTED]→ connecting{attempt: 1}
  ─[AUTOCONNECT_AT_BOOT]→ connecting{attempt: 1}

connecting{attempt: n}
  ─[connect-success]→ connected
  ─[OPERATION_FAILED, fresh opId]→ error{reason: classify(err), …}
  ─[USB_DEVICE_DISCONNECTED]→ error{reason: "cable-unplugged", …}
  ─[DISCONNECT_REQUESTED]→ disconnected
                            (abort.signal aborts the in-flight connect;
                             when it eventually resolves/rejects, opId is
                             stale and is ignored)
  ─[OPERATION_FAILED, stale opId]→ (no transition; ignored)

connected
  ─[USB_DEVICE_DISCONNECTED]→ reconnecting{attempt: 1, lastReason: "cable-unplugged"}
  ─[OPERATION_FAILED]→ (run probe → wait for PROBE_RESULT)
  ─[PROBE_RESULT, ok=true]→ degraded{consecutiveSoftFailures: 1, lastFailure: err}
  ─[PROBE_RESULT, ok=false]→ reconnecting{attempt: 1, lastReason: classify(err), lastFailure: err}
  ─[DISCONNECT_REQUESTED]→ disconnected
  ─[PAGE_HIDING]→ (best-effort fireCloseSession; no transition)

degraded{consecutiveSoftFailures: k}
  ─[OPERATION_SUCCEEDED]→ connected
  ─[OPERATION_FAILED]→ (run probe → wait for PROBE_RESULT)
  ─[PROBE_RESULT, ok=false]→ reconnecting{attempt: 1, lastReason: classify(err), lastFailure: err}
                              // probe-fail in degraded escalates immediately,
                              // regardless of consecutiveSoftFailures count
  ─[PROBE_RESULT, ok=true, k < 2]→ degraded{consecutiveSoftFailures: k+1, lastFailure: err}
  ─[PROBE_RESULT, ok=true, k == 2]→ reconnecting{attempt: 1, lastReason: classify(err), lastFailure: err}
                                     // 3 soft failures in a row escalate, even if probe still ok
  ─[USB_DEVICE_DISCONNECTED]→ reconnecting{attempt: 1, lastReason: "cable-unplugged"}
  ─[DISCONNECT_REQUESTED]→ disconnected
  ─[PAGE_HIDING]→ (best-effort fireCloseSession; no transition)

reconnecting{attempt: n, lastReason}
  ─[backoff-expired]→ (call driver.connect; await result; map to OPERATION_*)
  ─[OPERATION_SUCCEEDED]→ connected
  ─[OPERATION_FAILED, n < 3]→ reconnecting{attempt: n+1, lastReason: classify(err)}
  ─[OPERATION_FAILED, n == 3]→ error{reason: classify(err), …}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}    // skip remaining backoff
  ─[DISCONNECT_REQUESTED]→ disconnected
                            (abort cancels the backoff timer + in-flight connect)

error{reason}
  ─[RETRY_REQUESTED]→ connecting{attempt: 1}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}
                            // skipped when reason == "macos-claim-collision":
                            // replug does not free the daemon, retry would loop
                            // skipped when reason ∈ {secure-context, webusb-unsupported}:
                            // environment dead-end, USB events unrelated
  ─[MACOS_SETUP_ATTEMPTED]→ connecting{attempt: 1, macosSetupPending: true}
                             // marks the connect attempt as setup-driven so a success
                             // emits MACOS_SETUP_CONFIRMED at connected entry
  ─[DISCONNECT_REQUESTED]→ disconnected

connecting{attempt: 1, macosSetupPending: true}
  ─[connect-success]→ connected (entry emits MACOS_SETUP_CONFIRMED before clearing flag)
  ─[OPERATION_FAILED]→ error{reason: classify(err)}
                       // setup attempt failed; flag cleared. Wizard re-opens "Try again"
                       // and reveals the advanced option.

disconnected
  ─[CONNECT_REQUESTED]→ connecting{attempt: 1}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}    // auto-recover for paired device
```

### 6.4 Entry and exit actions

Every state declares both. Exit actions matter as much as entry actions:
they are how we prevent stale promise resolutions, leaked listeners, and
timer accumulation (Codex B3).

**Listener lifecycle is connection-generation-owned, not per-state.**
The manager keeps a `currentGeneration: number` and a `listenerHandles`
record. Listeners (USB disconnect, USB connect, `pagehide`,
`beforeunload`) are **installed once** when entering `connected` from a
fresh `connecting` success, and **uninstalled once** when leaving the
"alive connection" set (transitioning into `disconnected` or `error`).
Transitions inside the alive set — `connected ↔ degraded`, alive →
`reconnecting` → alive — preserve the listener handles. This addresses
the contradiction Codex flagged at NH2 between `connected` exit and
`degraded` retain semantics.

| State | Entry action | Exit action |
|---|---|---|
| `idle` | None | None |
| `connecting` | Mint new `opId`. Mint new `AbortController`. Call `driver.connect({autoSelectPaired: true, signal: abort.signal})`. On rejection, dispatch `OPERATION_FAILED({err, opId})`. On resolution after a state change, the result is **discarded after closing the late-created device** (see "stale-completion cleanup" below). (Driver's internal `device.reset()` retry is described in §7.3.) If the source state was `error{macos-claim-collision}` and the entry is via `MACOS_SETUP_ATTEMPTED`, set the per-attempt `macosSetupPending` flag. | `abort.abort()` cancels in-flight connect. |
| `connected` | If entering from `connecting` (i.e. a fresh `currentGeneration`): install USB disconnect, USB connect, `pagehide`, `beforeunload` listeners — store handles in `listenerHandles`. If `macosSetupPending` was set on the source `connecting`, dispatch `MACOS_SETUP_CONFIRMED` synchronously and clear the flag. Populate store presets via Phase 2-full read flow. If entering from `degraded` or `reconnecting` (same generation): no listener changes. | If transitioning to `disconnected` or `error`: uninstall all listeners via `listenerHandles`; bump `currentGeneration`. Otherwise (to `degraded` or `reconnecting`): no action. |
| `degraded` | Track `consecutiveSoftFailures` and `lastFailure`. No listener changes (still inside the alive generation). | No listener changes. |
| `reconnecting` | Mint new `opId`. Mint new `AbortController`. Schedule timer `setTimeout(backoff[attempt-1])`. On timer fire, call `driver.connect({autoSelectPaired: true, signal: abort.signal})`. No listener changes (still inside the alive generation). | Clear timer; `abort.abort()`. If transitioning to `error`: uninstall listeners + bump generation. If transitioning to `connected`: keep listeners. |
| `error` | If transitioning from an alive state, uninstall listeners + bump generation. Otherwise, no action. Wait for user action. | None. |
| `disconnected` | Call `driver.disconnect()` (graceful CloseSession + releaseInterface). If transitioning from an alive state, uninstall listeners + bump generation. | None. |

**Stale-completion cleanup** (Codex B3 round 2): when a `driver.connect()`
promise resolves *after* the manager has already left `connecting`
(e.g. user clicked Disconnect, or a USB event short-circuited the
state), the manager checks `opId` against `currentGeneration`:

- If stale, the manager **does not** trust the result for state
  transitions, **and** calls `driver.disconnect()` on the late-arriving
  port to close the device that may have been opened/claimed during the
  abandoned connect. This prevents leaking USB ownership.

`probe()` itself runs as a manager-internal coroutine when
`OPERATION_FAILED` arrives in `connected` or `degraded`. The state stays
in the source state until `PROBE_RESULT` is dispatched; this avoids a
"connected-but-probing" sub-state. The probe carries the original `err`
so the resulting transition can classify even when probe returns `ok:
true` and the transition would otherwise have nowhere to put the
failure.

### 6.5 Error classifier

The classifier reads structured fields, not message substrings. The
`LatentError` type gains a `stage` field and a `domException?` field
(see §5.2 + §7.1). The driver populates them at the throw site.

```ts
function classifyDriverError(err: LatentError): ErrorReason {
  // Stage-first classification — cannot collide across causes.
  switch (err.stage) {
    case "claim":
      // Distinguish macOS daemon claim from generic claim failure via
      // platform hint + DOMException name.
      if (err.domException === "NetworkError" && err.platform === "mac") {
        return "macos-claim-collision";
      }
      // Linux/Windows: same DOMException usually means another userspace app
      // has the interface — surface as session-stale and let the user power-cycle.
      return "session-stale";

    case "transfer-in":
    case "transfer-out":
      // Mid-I/O failure — almost always physical disconnect or stall.
      // Probe disambiguates between cable-unplugged vs camera-off when called
      // from the manager; the classifier itself defaults to cable-unplugged
      // because `USB_DEVICE_DISCONNECTED` short-circuits this path when
      // the disconnect is detectable.
      return "cable-unplugged";

    case "open":
      // OpenSession failure after successful claim — classic stale-session
      // post-refresh / post-tab-crash.
      return "session-stale";

    case "reset":
    case "setup-config":
    case "endpoint-discovery":
      // Lower-level USB fault — surface as session-stale; recovery is
      // power-cycle. Could be split out in V2 if V2's libusb backend
      // exposes finer detail.
      return "session-stale";
  }

  // Fallback by category for errors that did not originate at the WebUSB
  // boundary (e.g. PtpStall thrown by the session layer).
  switch (err.category) {
    case "PtpStall": return "camera-off";
    case "PtpTimeout": return "camera-off";   // disambiguated by probe at call site
    case "UsbPermissionDenied": return "permission-denied";
    case "WebUSBSecureContextRequired": return "secure-context";
    case "WebUSBUnsupported": return "webusb-unsupported";
    case "UsbDisconnect": return "cable-unplugged";
    default: return "unknown";
  }
}
```

The classifier lives in `classifier.ts`, depends only on `LatentError`
shape, and is tested in isolation with one test per `(stage, category,
domException)` triple of interest.

## 7. CameraDriver and CameraSessionPort interfaces

### 7.1 Contracts

```ts
// session-port.ts — ops the connected session exposes to the manager and UI.
// Platform-agnostic: WebUsbSessionPort and TauriRpcSessionPort both
// implement this. The manager and UI never see FujiCameraSession.
//
// Scope: this is the MINIMAL STABILITY PORT for V1 Phase 2-min. It covers
// what the manager itself needs (probe via getDeviceInfo, simple property
// reads) and what Phase 2-full preset reads need (single-property reads
// against the writableSlotProperties whitelist).
//
// Phase 4 will extend this with a Phase4SessionPort sub-interface adding:
//   - sendCommand(opcode, params): RESPONSE-only commands
//   - sendDataCommand(opcode, params, data): COMMAND→DATA→RESPONSE
//   - vendor-opcode passthrough for §6.4 camera-side preview
//   - object-handle ops (GetObjectHandles, GetObject, DeleteObject)
//   - SendObjectInfo / SendObject2 vendor pair for RAF upload
//
// Adding these in V1 would expand the surface beyond what V1 needs and
// would force WebUsbSessionPort to implement vendor opcodes that
// Phase 2-min does not exercise. The extension contract is documented
// here so V2's TauriRpcSessionPort can plan for it.
export interface CameraSessionPort {
  /** Read device info: model, firmware, supported ops. PTP 0x1001 in V1. */
  getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;

  /** Read a single device property by code. PTP 0x1015 in V1. */
  getDevicePropValue(code: number, signal?: AbortSignal): Promise<DeviceValue>;

  /** Write a single device property by code. PTP 0x1016 in V1. */
  setDevicePropValue(
    code: number,
    value: DeviceValue,
    signal?: AbortSignal,
  ): Promise<void>;

  /** True if the underlying session is open and reachable. Cheap check. */
  isOpen(): boolean;
}

export interface DeviceInfo {
  model: string;            // "X-S20"
  firmwareVersion: string;  // e.g. "1.10"
  serialNumber?: string;    // when discoverable
  supportedOps: number[];   // PTP opcodes the camera advertises
}

export type DeviceValue =
  | { kind: "uint8"; value: number }
  | { kind: "uint16"; value: number }
  | { kind: "uint32"; value: number }
  | { kind: "string"; value: string }
  | { kind: "bytes"; value: Uint8Array };
```

```ts
// driver.ts — what the manager talks to.
export interface CameraDriver {
  connect(opts?: ConnectOptions): Promise<DriverConnectResult>;
  disconnect(): Promise<void>;
  subscribeDisconnectEvents(handler: () => void): () => void;
  subscribeConnectEvents(handler: () => void): () => void;
  fireCloseSession(): void;          // strict best-effort
  probe(timeoutMs?: number): Promise<boolean>;
}

export interface ConnectOptions {
  autoSelectPaired?: boolean;
  signal?: AbortSignal;             // honoured by the driver
}

export interface DriverConnectResult {
  port: CameraSessionPort;          // not FujiCameraSession
  deviceInfo: DeviceInfo;           // includes model + firmware
}
```

The signature change from `{session, cameraModel}` to `{port,
deviceInfo}` is the V1→V2 boundary repair. This addresses Codex B1.

### 7.2 V2 contract preservation

In V2 (Tauri + libusb), the swap remains a single change:

```ts
// V1 — apps/web/src/main.tsx
const driver = new WebUsbCameraDriver();

// V2 — apps/web/src/main.tsx
const driver = new TauriCameraDriver(invoke);
```

`TauriCameraDriver` returns a `TauriRpcSessionPort` whose methods
forward over Tauri IPC to the Rust libusb session. The manager, store,
components, error reasons, copy, and wizard are unchanged. The Rust
backend owns the real PTP session; the JS layer holds an opaque
`CameraSessionPort`.

### 7.3 WebUsbCameraDriver — V1 implementation

Wraps `@latent/ptp-fuji-webusb`. Owns `FujiCameraSession` privately and
exposes it via a `WebUsbSessionPort` adapter. Adds three behaviours
beyond what already exists in `connect.ts` / `request-camera.ts`:

**`device.reset()` as guarded recovery, not blanket retry**

```ts
async function claimWithReset(
  device: USBDevice,
  iface: number,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await device.claimInterface(iface);
    return;
  } catch (firstClaimErr) {
    // Reset is only attempted under specific conditions:
    //   - the failure looks like a kernel claim collision (NetworkError)
    //   - the device is still attached (not a NotFoundError)
    if (!isClaimCollision(firstClaimErr)) {
      throw new LatentError("UsbDisconnect", "claimInterface failed", firstClaimErr, {
        stage: "claim",
        domException: nameOf(firstClaimErr),
        platform: detectPlatform(),
      });
    }

    try {
      await device.reset();
    } catch (resetErr) {
      // device.reset() itself can fail (permission, multi-function device,
      // device removed mid-reset). Wrap with stage="reset" and propagate.
      throw new LatentError("UsbDisconnect", "device.reset() failed", resetErr, {
        stage: "reset",
        domException: nameOf(resetErr),
        platform: detectPlatform(),
      });
    }

    // After reset: the device is unconfigured. Re-select configuration,
    // rediscover endpoints, then re-claim. Each of these can fail and
    // each must wrap with the correct stage for classification.
    await reselectConfiguration(device);                 // stage="setup-config"
    const endpoints = await rediscoverEndpoints(device); // stage="endpoint-discovery"

    try {
      await device.claimInterface(iface);                // stage="claim", retry final
    } catch (secondClaimErr) {
      // The post-reset reclaim also failed — surface as classified claim
      // collision so the manager can route to error{macos-claim-collision}.
      throw new LatentError(
        "UsbDisconnect",
        "claimInterface failed after device.reset()",
        secondClaimErr,
        {
          stage: "claim",
          domException: nameOf(secondClaimErr),
          platform: detectPlatform(),
        },
      );
    }
    return;
  }
}
```

After successful claim, the driver opens the PTP session. Any failure
of `session.open()` is wrapped with `stage: "open"` regardless of the
underlying lower-layer stage that actually threw. Without this wrap, a
`transfer-in` failure during the `OpenSession` round-trip would
misroute to `cable-unplugged` (Codex B4 round 2):

```ts
async function openSessionWithStaging(
  session: FujiCameraSession,
  signal?: AbortSignal,
): Promise<void> {
  try {
    await session.open(signal);
  } catch (err) {
    // Wrap any open-time failure with stage="open" so the classifier
    // routes it to "session-stale" via §6.5 case "open", not via the
    // transfer-in/out path.
    if (err instanceof LatentError) {
      throw new LatentError(err.category, "OpenSession failed", err.cause, {
        ...err.metadata,
        stage: "open",
      });
    }
    throw new LatentError("UsbDisconnect", "OpenSession failed", err, {
      stage: "open",
      domException: nameOf(err),
      platform: detectPlatform(),
    });
  }
}
```

This addresses Codex H1: reset is not blanket-applied, it is conditional
on a recoverable claim failure, and the post-reset reconfiguration is
explicit.

**USB event subscription with vendor + product + (optional) serial + permission filter**

```ts
subscribeConnectEvents(handler: () => void): () => void {
  const expectedVendor = FUJI_VENDOR_ID;
  const expectedProduct = this.connectedProductId;     // captured at connect time
  const expectedSerial = this.connectedSerialNumber;   // when discoverable, else undefined

  const listener = async (e: USBConnectionEvent) => {
    // Match by vendor + product, NOT by USBDevice object identity.
    // After unplug/replug the browser may surface a new USBDevice instance
    // for the same physical camera.
    if (e.device.vendorId !== expectedVendor) return;
    if (e.device.productId !== expectedProduct) return;

    // If we have a serial from the original connect, prefer matching on it
    // so multi-camera setups don't cross-fire.
    if (expectedSerial !== undefined) {
      // Serial is read at the device descriptor level; compare strictly.
      if (e.device.serialNumber !== expectedSerial) return;
    }

    // Confirm we still hold permission (the user may have revoked it).
    const paired = await navigator.usb.getDevices();
    const stillPaired = paired.some(
      d => d.vendorId === expectedVendor && d.productId === expectedProduct
        && (expectedSerial === undefined || d.serialNumber === expectedSerial)
    );
    if (!stillPaired) return;

    handler();
  };
  navigator.usb.addEventListener("connect", listener);
  return () => navigator.usb.removeEventListener("connect", listener);
}
```

Same vendor + product + optional serial + permission pattern for
`subscribeDisconnectEvents`. The `connectedProductId` and
`connectedSerialNumber` fields are populated by the driver during
`connect()` from the `USBDevice` descriptor and from the
`getDeviceInfo()` response respectively. This addresses Codex H3 and
NM2.

**Wrap raw `transferIn`/`transferOut` rejections**

The existing `WebUsbPtpTransport` only wraps non-`ok` statuses; raw
DOMException rejections leak (Codex B4). Fix in `webusb-transport.ts`:

```ts
async send(data: Uint8Array, signal?: AbortSignal): Promise<void> {
  // …existing chunking…
  let result: USBOutTransferResult;
  try {
    result = await this.raceWithSignal(
      this.device.transferOut(this.endpointOut, chunk),
      signal,
    );
  } catch (err) {
    throw new LatentError("UsbDisconnect", "WebUSB transferOut threw", err, {
      stage: "transfer-out",
      domException: nameOf(err),
      platform: detectPlatform(),
    });
  }
  if (result.status !== "ok") {
    throw new LatentError("PtpStall", `transferOut status=${result.status}`, undefined, {
      stage: "transfer-out",
      platform: detectPlatform(),
    });
  }
  // …
}
```

Same pattern for `transferIn`. Errors thrown by lower layers gain
`stage` automatically.

**Liveness probe via `GetDeviceInfo` (PTP 0x1001) — DATA→RESPONSE aware**

The existing `FujiCameraSession.open()` / `close()` use local
`packCommand()` / `assertResponseOK()` helpers and expect a single
RESPONSE container. `GetDeviceInfo` returns DATA followed by RESPONSE.
The `PtpFraming.sendCommand()` helper in
`packages/ptp-fuji/src/ptp/transport.ts` already implements DATA→RESPONSE.

**Choice (rollout step ordering)**: refactor `FujiCameraSession` onto
`PtpFraming` *before* adding `getDeviceInfo()`. This is one extra step in
§11 but it (a) gives `fireCloseSession()` a real wiring path through the
session, (b) reuses container handling, (c) reduces local
`packCommand()` duplication.

The `getDeviceInfo` parser must extract:

- **Model name** (variable-length string) → `DeviceInfo.model`
- **Device version** string → `DeviceInfo.firmwareVersion`
- **Serial number** string → `DeviceInfo.serialNumber`
- **Operations supported** (uint16 array) → `DeviceInfo.supportedOps`

These are required for V1 §6.1 capability lookup (Codex H2).

```ts
async probe(timeoutMs = 3000): Promise<boolean> {
  if (!this.session || !this.session.isOpen()) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await this.port.getDeviceInfo(ctrl.signal);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
```

## 8. UI layer

### 8.1 Store shape

```ts
interface CameraStore {
  // mirror of ConnectionManager state
  state: ConnectionState;

  // populated by manager event after entering `connected`
  presets: RawPreset[];

  // wizard / setup state — orthogonal to connection state
  macosBetaAcknowledged: boolean;            // hydrated from localStorage
  macosSetupAcknowledged: boolean;           // hydrated from localStorage; user has
                                             // gone through the wizard once and
                                             // achieved a real reconnect after it
  macosPersistentDisableConfigured: boolean; // hydrated from localStorage; user
                                             // explicitly opted into the advanced
                                             // launchctl disable path
  macosWizardOpen: boolean;                  // UI-only, not persisted
  macosShowAdvanced: boolean;                // UI-only

  // actions
  connect: () => void;
  disconnect: () => void;
  retry: () => void;
  acknowledgeMacosBeta: () => void;
  // The manager emits MACOS_SETUP_CONFIRMED on successful reconnect after
  // a MACOS_SETUP_ATTEMPTED. The store reacts by setting
  // macosSetupAcknowledged = true. There is no manual "I've run it sets
  // the flag" path — the flag follows the actual connect.
  markMacosPersistentDisable: () => void;    // set when the user clicks the
                                             // advanced "I've run launchctl
                                             // disable" path AND a real connect
                                             // confirms it
  openMacosWizard: () => void;
  closeMacosWizard: () => void;
  toggleMacosAdvanced: () => void;

  // selectors
  isConnected: () => boolean;
  isConnecting: () => boolean;
  errorReason: () => ErrorReason | null;
}
```

`presets` is populated by a manager event emitted after `connected` is
reached and the Phase 2-full read flow completes. Until then it is `[]`.
This addresses Codex M3.

`macosBetaAcknowledged`, `macosSetupAcknowledged`, and
`macosPersistentDisableConfigured` hydrate from localStorage keys
`latent:macos-beta-ack-v1`, `latent:macos-setup-ack-v1`, and
`latent:macos-persistent-disable-v1` respectively at boot.

The two macOS flags are intentionally separate (Codex NH4):

- `macosSetupAcknowledged === true` means "the user has been through the
  wizard once and a reconnect has succeeded after it". It suppresses
  the auto-open behaviour of the wizard on subsequent
  `macos-claim-collision` errors (we show a banner with "Re-open setup"
  instead of auto-opening).
- `macosPersistentDisableConfigured === true` means "the user explicitly
  ran `launchctl disable` and a reconnect confirmed it". It is the
  only flag that lets us *assume* the daemon is permanently off across
  browser/macOS sessions. If only `macosSetupAcknowledged` is true, we
  treat each new browser session as potentially needing `killall` again.

### 8.2 Wiring

In `apps/web/src/main.tsx`, executed once at module load:

```ts
const driver = new WebUsbCameraDriver();
const manager = new ConnectionManager(driver);

manager.subscribe((state) => useCameraStore.setState({ state }));
manager.onPresetsRead((presets) => useCameraStore.setState({ presets }));
manager.start();
```

`manager.start()` triggers `AUTOCONNECT_AT_BOOT` if paired Fuji devices
exist. Otherwise stays in `idle`.

### 8.3 Components

Decompose the current monolithic `CameraConnect.tsx` (~100 lines) into
focused components in `apps/web/src/components/camera/`:

- `CameraConnect.tsx` — switch on `state.kind`, dispatches to children
- `ConnectButton.tsx` — `idle / disconnected`
- `ConnectingIndicator.tsx` — `connecting / reconnecting`, shows attempt
- `ConnectedBadge.tsx` — `connected / degraded`, includes disconnect control
- `DegradedBanner.tsx` — secondary banner shown over `connected` UI when in `degraded`
- `ErrorBanner.tsx` — `error`, switch on `reason`, dispatches retry / wizard
- `MacosBetaWarning.tsx` — first-time disclosure required by V1 §10
- `MacosSetupWizard.tsx` — main wizard with safer-first default + advanced reveal

Each tested in isolation with mock store.

### 8.4 Error banner copy (i18n keys)

| `reason` | Title | Body | Action |
|---|---|---|---|
| `macos-claim-collision` | macOS is holding the camera | Image Capture is claiming exclusive access. Open the macOS setup to release it. | Open setup → wizard |
| `camera-off` | Camera not responding | Power-cycle the camera (off → on) and check the cable, then click retry. | Retry |
| `cable-unplugged` | Camera unplugged | The USB cable was disconnected. Reconnect it — Latent will reconnect automatically. | (auto on replug) |
| `permission-denied` | Permission needed | Click Connect and allow access to the camera in the picker. | Connect |
| `secure-context` | Insecure context | Latent needs HTTPS or localhost to access USB devices. | (link to docs) |
| `webusb-unsupported` | Browser not supported | Latent needs a Chromium browser (Chrome, Edge, Brave, Arc). | (link to docs) |
| `session-stale` | Camera in stale state | The previous session did not close cleanly, or another app is holding the camera. Close other camera apps if any, then power-cycle the camera and retry. | Retry |
| `unknown` | Connection failed | (underlying message) + Show details (collapsible debug panel) | Retry |

Note: `cable-unplugged` title is now "Camera unplugged" (not "Camera
disconnected"), avoiding the §2 acceptance criterion (Codex L2).

i18n keys structured as `camera.error.<reason>.{title,body,action}` in
both `en.ts` and `it.ts`.

**Breaking change**: existing `error.<LatentErrorCategory>.title` keys
in `apps/web/src/components/CameraConnect.tsx` are removed and replaced
with the `camera.error.<reason>.*` namespace. Step 6 of the rollout
includes this migration.

### 8.5 macOS path: beta warning, safer-first, advanced opt-in

V1 §10 explicitly frames macOS as beta with a safer-first sequence. The
wizard aligns with that framing: the persistent `launchctl disable`
becomes an advanced opt-in, not the silent default.

**First time the user enters `error{reason: "macos-claim-collision"}`**:

If `!macosBetaAcknowledged`, a `MacosBetaWarning` is shown first as a
modal step, summarising:

- macOS support is beta
- Latent talks PTP; macOS auto-mounts cameras for Image Capture / Photos
- The temporary fix is `killall ptpcamerad` per session
- The persistent fix exists but disables Image Capture system-wide until
  re-enabled

The user clicks "I understand" → `macosBetaAcknowledged = true` → the
wizard proceeds.

**`MacosSetupWizard` — safer-first default**:

Step 1 — Run the temporary release command:

```
killall ptpcamerad
```

Copy button. The user clicks "I've run it" — this dispatches
`MACOS_SETUP_ATTEMPTED` to the manager, which transitions
`error{macos-claim-collision} → connecting{macosSetupPending: true}`.

- If the connect succeeds within ~10 seconds, the manager dispatches
  `MACOS_SETUP_CONFIRMED` at `connected` entry. The store then sets
  `macosSetupAcknowledged = true` and the wizard advances to the
  success step.
- If the connect fails again, the wizard surfaces a "Try again"
  button **plus** "Show advanced option". Neither flag is persisted.
  The user is not lied to about setup being done.

Step 2 (advanced, hidden by default) — Persistent disable:

```
launchctl disable gui/$(id -u)/com.apple.ptpcamerad && killall ptpcamerad
```

Surrounded by a copy block titled "Advanced — disables Image Capture
system-wide until re-enabled". Includes the re-enable command:

```
launchctl enable gui/$(id -u)/com.apple.ptpcamerad
```

A note: "If you use Image Capture or Photos with cameras, prefer the
basic command above and re-run it when needed."

The advanced step has its own "I've run it" button. Click flow:

1. Wizard dispatches `MACOS_SETUP_ATTEMPTED` like Step 1.
2. On `MACOS_SETUP_CONFIRMED`, the store sets **both**
   `macosSetupAcknowledged = true` **and**
   `markMacosPersistentDisable()` (which sets
   `macosPersistentDisableConfigured = true`).
3. On failure, neither flag changes; wizard offers "Try again".

Step 3 — Done: confirmation; reminder of the re-enable command; bullet
for power users mentioning `brew install formray/latent/release-camera`
(Homebrew formula distributed separately, optional).

**Both flags are gated on a real reconnect success**, never on a click
alone (Codex H5 + NH4). The advanced flag is only set when the user
explicitly walked through Step 2; running the basic Step 1 only sets
`macosSetupAcknowledged`.

**Subsequent collision behaviour**:

| `macosSetupAcknowledged` | `macosPersistentDisableConfigured` | New `macos-claim-collision` shows... |
|---|---|---|
| false | false | Auto-opens wizard at Step 1 (first-time path) |
| true | false | Banner with "Re-open setup". On click, wizard opens at Step 1 — the basic killall — because we cannot assume persistent state. Education is suppressed (no beta warning re-shown). |
| true | true | Banner with "Re-open setup". On click, wizard opens at Step 2 — the advanced path — because the user explicitly chose persistent disable previously. If they re-enabled `ptpcamerad` deliberately, this puts the advanced reset in front of them quickly. |

## 9. Failure mode catalog

### 9.1 Page lifecycle (Category A)

| Failure | Detection | Transition | UX | Recovery |
|---|---|---|---|---|
| Refresh `Cmd+R` | `beforeunload` (best-effort fireCloseSession) + connect-time stale recovery | `connected` → page dies | Spinner ~1s on boot; if stale, transparent device.reset → reclaim → reopen | `AUTOCONNECT_AT_BOOT` + connect-time recovery |
| Tab close | `pagehide` (best-effort) | Same | (page gone) | Same on next boot |
| Browser quit | `pagehide` (best-effort) | Same | N/A | N/A |
| Navigation away | `pagehide` (best-effort) | Same | (new page) | Same when returning |
| Vite HMR | `beforeunload` (best-effort) | Same | Brief spinner | Same |
| Tab crash | None possible | Session left dangling on camera | At next boot, reconnect goes through stale-session recovery | `device.reset()` + reopen covers most; `error{session-stale}` + power-cycle prompt otherwise |

The page-unload close is **strict best-effort**: the browser does not
guarantee that `transferOut` of a `CloseSession` PTP packet completes
during teardown. The real correctness path is connect-time recovery
in §7.3 (`claimWithReset` plus stale-session reopen sequence). This
addresses Codex B2.

### 9.2 USB-level disconnects (Category B)

All four indistinguishable at the technical level (camera leaves the bus).

| Failure | Detection | Transition | Recovery |
|---|---|---|---|
| Cable unplugged | `navigator.usb` `disconnect` event (~10ms) | `connected` → `reconnecting` → if replug within 5s reconnected, else `error{cable-unplugged}` | `USB_DEVICE_CONNECTED` event auto-triggers `connecting` |
| Camera switch OFF | Same (camera leaves bus on power-down) | Same | Switch ON → enumeration → auto-connect |
| Battery dies | Same | Same | Battery swap → switch ON → auto-connect |
| USB hub power-cycle | Same (vendor + product + permission filter) | Same | Hub recovery → auto-connect |

### 9.3 Camera alive but not responding (Category C)

| Failure | Detection | Transition | UX |
|---|---|---|---|
| Camera in transient stall | `OPERATION_FAILED` with `PtpStall` from session; probe succeeds | `connected` → `degraded` (single soft-fail tolerated) | Operation-level error; subtle warning indicator; no banner unless escalates |
| Camera in deep sleep | `OPERATION_FAILED` with `PtpStall` or 30s timeout; probe fails | `connected` → `reconnecting` → `error{camera-off}` after 3 attempts | "Wake camera (half-press shutter)" + retry |
| Wrong USB mode | `OPERATION_FAILED` with `PtpUnsupportedOperation` on standard op; probe fails (no GetDeviceInfo answer) | Same as deep sleep | "Set camera to USB RAW Conv./Backup Restore" + retry |
| Stale PTP session post-crash | `connecting` → `OpenSession` fails after successful claim → driver runs reset+reconfig+reopen → if still fails, `error{session-stale}` | — | "Power-cycle the camera and retry" |

`degraded` corresponds to V1 §6.6's "USB stall — mark session degraded;
offer reconnect". This addresses Codex H4.

### 9.4 Claim collision (Category D)

| Variant | Detection | UX |
|---|---|---|
| First-time `ptpcamerad` collision (macOS) | `connecting` → `claim` stage fail → guarded reset+reclaim fail; `domException === "NetworkError"`; platform === "mac" | Beta warning (if not acknowledged) → safer-first wizard `killall ptpcamerad` |
| Repeat collision after setup done | Same, `macosSetupAcknowledged === true` | Banner with "Re-open setup" button; if `macosPersistentDisableConfigured === true` it opens at Step 2 (advanced), otherwise at Step 1 (basic killall) |
| `Image Capture.app` open by user (macOS) | Same signature (claims via `mscamerad-xpc`) | Same banner / wizard path |
| Linux/Windows generic claim collision | Same `claim` stage but `platform !== "mac"` | `error{session-stale}` with "another app may hold the camera; close it and retry" body — does NOT show macOS wizard |

The platform hint is required because the same DOMException name
(`NetworkError`) on Linux/Windows almost always means another userspace
app (gphoto, darktable, OBS, etc.) holds the device, not a system
daemon. This addresses Codex B4.

### 9.5 Browser environment (Category E)

| Failure | Detection | Recovery |
|---|---|---|
| HTTP page, not localhost | `window.isSecureContext === false` at boot | Direct to `error{secure-context}`; user changes URL |
| Non-Chromium | `navigator.usb === undefined` AND `window.isSecureContext === true` | `error{webusb-unsupported}`; user switches browser |
| Picker cancellation | `requestDevice()` throws `NotFoundError` | `error{permission-denied}`; user re-clicks Connect |

Distinguishing secure-context from unsupported-browser uses
`window.isSecureContext` first, then checks `navigator.usb` presence.
This addresses Codex M2.

### 9.6 Mid-operation (Category F — Phase 4 preview)

The manager exposes `wrapOperation<T>(fn: () => Promise<T>, opId?: number): Promise<T>`.
Phase 4 reads/writes go through it. On failure, the manager classifies
and dispatches `OPERATION_FAILED` to the state machine with an `opId`.
On success, dispatches `OPERATION_SUCCEEDED({opId})`.

For Phase 2-min, only the failures that already exist (read failures
during `connectAndReadPresets` Phase 2-full work) flow through this hook.

### 9.7 User-effort summary

```
Automatic recovery (no user action):
  - Refresh / tab close / navigation / hot reload         (Category A)
  - Cable unplugged then replugged                        (Category B, event-driven)
  - Camera switch OFF then ON                             (Category B, event-driven)
  - Transient PTP stall                                   (Category C, degraded → connected)

One-click recovery (retry button):
  - Camera in deep sleep                                  (wake + retry)
  - Wrong USB mode                                        (fix mode + retry)
  - Session stale after tab crash                         (power-cycle + retry)
  - Permission denied                                     (re-click Connect)

One-time setup with safer-first default (wizard):
  - macOS ptpcamerad claim                                (killall once per session, advanced disable optional)

Environment dead-ends:
  - Insecure context                                      (change URL)
  - Non-Chromium browser                                  (change browser)
```

Approximate distribution: ~70% automatic, ~25% one-click, ~3% one-time
setup, ~2% environment.

## 10. Test plan

### 10.1 Layered

```
Hardware tests (manual, against X-S20)
    ↑
Integration tests (Vitest + jsdom + FakeCameraDriver)
    ↑
Manager state machine tests (pure TS)
    ↑
Driver tests (FakeUSBDevice with reset() + event-target)
    ↑
Existing PTP/WebUSB tests (untouched, still green)
```

### 10.2 State machine tests (`@latent/camera-connection`)

Pure TypeScript, no DOM, no USB. Tests transitions only.

Target: ~30 tests. Every declared transition + entry/exit action
side-effect (timer cleared, listener uninstalled, abort dispatched).
Backoff timing verified with `vi.useFakeTimers()`. Stale-`opId`
filtering tested explicitly. Classifier covered with one test per
`(stage, category, domException, platform)` triple of interest.

### 10.3 Driver tests

Local fakes in `tests/fakes.ts` — a `FakeUSBDevice` that supports
`reset()`, `selectConfiguration()`, endpoint discovery, and
`addEventListener("connect"/"disconnect")` is required. Existing
`FakeTransport` from `@latent/ptp-fuji` is internal to that package
and not exported; we do not depend on it.

Target: ~18 tests. `connect` with paired vs picker; `claimWithReset`
all branches (success first try, reset+reclaim success, reset rejects,
reclaim rejects); disconnect graceful close; event subscription with
vendor+product+permission filter (including new-USBDevice-instance
case); `probe` OK / timeout / stall; idempotent disconnect;
`fireCloseSession` returns synchronously even if the underlying send
rejects.

This addresses Codex M1.

### 10.4 Integration tests (`apps/web`)

Mock the driver with `FakeCameraDriver` implementing `CameraDriver`.
Drives the full UI flow.

Target: ~12 tests. Cold connect; auto-connect at boot; macOS beta
warning shown then acknowledged; macOS wizard safer-first path
(success); macOS wizard advanced path; `macosSetupAcknowledged` only set on
real reconnect success; cable unplug shows banner with new "Camera
unplugged" copy; USB connect event auto-recovers; disconnect button;
`pagehide` calls `fireCloseSession`; presets event populates store;
banner copy matches reason for all 8 reasons.

### 10.5 Hardware test plan

`docs/qa/hardware-test-plan.md` (new directory). Manual checklist run
before every release. Items grouped:

- Connection happy path (3)
- USB events (3)
- Camera state including degraded (5)
- macOS-specific including beta warning + safer-first + advanced (5)
- Edge environment (4)
- Refresh / lifecycle including tab crash simulation (4)
- Wizard flow (3)

Total: 27 items. Each is boolean pass/fail. Result table per device +
macOS version.

### 10.6 Success criteria

| # | Criterion | Measure |
|---|---|---|
| 1 | Refresh requires no power-cycle | 50/50 consecutive refreshes reconnect within 2s |
| 2 | USB unplug-replug recovers | 20/20 cycles connected within 5s of replug |
| 3 | Camera off/on recovers without click | 10/10 cycles |
| 4 | macOS beta warning shown once | Acknowledged once, never re-shown unless localStorage cleared |
| 5 | macOS setup flags only set after real reconnect | 0 cases of `macosSetupAcknowledged === true` or `macosPersistentDisableConfigured === true` while still in `error` |
| 6 | No "Camera disconnected" generic copy | 0 occurrences in any failure scenario |
| 7 | TypeScript exhaustiveness on state | 0 `// @ts-ignore` or `as any` on state switches |
| 8 | Coverage of `@latent/camera-connection` | ≥ 90% line coverage |
| 9 | Hardware checklist | 27/27 green pre-merge |
| 10 | Stale-`opId` race | 0 cases of state corruption from late promise resolution in test |

### 10.7 CI gates

In `.github/workflows/ci.yml`. The new package adds local scripts;
existing packages are untouched:

```yaml
- run: npm run test --workspace=@latent/camera-connection
- run: npm run typecheck --workspace=@latent/camera-connection
- run: npm run lint --workspace=@latent/camera-connection
```

This addresses Codex M4: the new package's `package.json` defines
`typecheck` and `lint` scripts (`tsc --noEmit` and `eslint .`
respectively), matching what the workflow expects.

Existing `lockstep-check` continues unchanged.

## 11. Rollout plan

Implementation order (each step independently testable, mergeable). The
order is updated from revision 1 to land the prerequisite refactors
first.

**Step 0 — Extend `LatentError` with structured stage metadata**
- Add `stage`, `domException?`, `platform?` to `LatentError`
- Update existing throw sites in `request-camera.ts` and `webusb-transport.ts`
- ~5 tests for the new fields
- All existing tests stay green

**Step 1 — Refactor `FujiCameraSession` onto `PtpFraming` AND tighten `PtpFraming.sendCommand()`**

- **First**, add the missing validation to `PtpFraming.sendCommand()`:
  - Verify response container type (existing local helper already does this)
  - Verify `transactionId` matches the command's txid (currently missing — Codex NB1)
  - Verify `code === PTPResp.OK` and throw classified `LatentError` on
    `SessionAlreadyOpen`, `DeviceBusy`, `InvalidParameter`, etc.
    (currently missing — Codex NB1)
  - Add new tests in `packages/ptp-fuji/tests/ptp-framing.test.ts` covering
    txid mismatch, type mismatch, non-OK response codes, short response.
- **Then**, replace local `packCommand` / `assertResponseOK` in
  `FujiCameraSession` with calls to the now-validated
  `PtpFraming.sendCommand`.
- **Then**, wire `fireCloseSession()` to live on `FujiCameraSession`
  (using `PtpFraming` for the synchronous send) so the session-level
  call is a real method, not a dangling util.
- All existing `session.ts` tests must stay green. Run `npm run test`
  on both `@latent/ptp-fuji` and `@latent/ptp-fuji-webusb` after the
  refactor to confirm no regression.

This is the most risky structural change in the rollout and it lands
**alone** in its own commit so any breakage is easy to bisect.

**Step 2 — Add `FujiCameraSession.getDeviceInfo()` with DATA→RESPONSE parsing**
- PTP op `0x1001` issuance + container parsing
- Returns `DeviceInfo` (model, firmware, serial, supported ops)
- ~5 tests with `FakeTransport` covering OK, stall, abort

**Step 3 — Scaffold `@latent/camera-connection` package**
- `package.json` with local `test`, `typecheck`, `lint`, `build` scripts
- `tsconfig.json`, `vitest.config.ts`, empty `src/index.ts`
- Wire into `vitest.workspace.ts` and root `package.json` workspaces
- CI runs the empty test suite green

**Step 4 — Types + `CameraSessionPort` + `CameraDriver` interfaces**
- `types.ts`, `session-port.ts`, `driver.ts`
- No implementations yet, types only
- ~5 type-only tests (compile-time exhaustiveness)

**Step 5 — State machine + classifier (no I/O)**
- `state-machine.ts`, `classifier.ts`
- Per-attempt `AbortController`, monotonic `opId`, idempotent
  listener tracking
- ~30 unit tests, all transitions, classifier coverage

**Step 6 — `WebUsbCameraDriver` + `WebUsbSessionPort`**
- Wrap `@latent/ptp-fuji-webusb` request flow
- Guarded `claimWithReset`, USB event subscription with
  vendor+product+permission filter, `fireCloseSession`, `probe`
- Local `FakeUSBDevice` and `FakeCameraDriver` fixtures in `tests/fakes.ts`
- ~18 tests

**Step 7 — `ConnectionManager`**
- Compose state machine + driver
- Page-unload handler installation, USB event wiring,
  `wrapOperation` hook with `opId`, retry timer logic
- ~15 tests with `FakeCameraDriver`

**Step 8 — Replace store + UI components**
- Refactor `apps/web/src/stores/camera.ts` to subscribe to manager
- Decompose `CameraConnect.tsx` into `components/camera/*`
- Add `ErrorBanner` with all 8 reason variants
- Migrate i18n keys from `error.<category>` to `camera.error.<reason>`
  in both `en.ts` and `it.ts`
- ~12 integration tests

**Step 9 — macOS path: beta warning + setup wizard**
- `MacosBetaWarning.tsx` modal
- `MacosSetupWizard.tsx` with safer-first default + advanced opt-in
- Copy buttons, localStorage flags (`macosBetaAcknowledged`, `macosSetupAcknowledged`, `macosPersistentDisableConfigured`), gated on `MACOS_SETUP_CONFIRMED`
- ~6 component tests

**Step 10 — Hardware validation**
- `docs/qa/hardware-test-plan.md` with 27 items
- Run on X-S20, capture results
- File issues for any failures, fix, re-run

**Step 11 — Optional: Homebrew formula**
- `formray/homebrew-latent` tap repo with
  `Formula/release-camera.rb`
- Single-purpose script that runs the disable command
- Mention in wizard advanced step only after publication

Steps 0–2 are prerequisite refactors of existing packages and land
first. Steps 3–9 are the new work. Step 10 runs against the merged
work; Step 11 is independent.

## 12. Open questions

The following are real unknowns that should be resolved during
implementation. They do not block writing the implementation plan, but
they inform specific tasks within it.

**Q1. Exact failure point on X-S20 post-`Cmd+R`**

When the page is refreshed while connected to the X-S20, the next
connect attempt fails. We do not yet have captured logs identifying
whether the failure happens at `claimInterface`, at `OpenSession`, or
both in sequence. Reproducing with DevTools open and capturing the
`stage` of the thrown error is a Step 0 task once §11 Step 0 lands
(structured `stage` metadata exists). The recovery sequence in §7.3
(reset → reconfig → rediscover → reclaim → reopen) is designed to
cover both, so the design is robust to either answer; the open
question affects only test priorities.

**Q2. Whether to publish the Homebrew formula in this work or later**

Marked optional in §11 Step 11. Decision can land any time without
affecting the rest of the system.

**Q3. Whether to expose `firmwareVersion` in the `connected` state for UI**

The state holds it (§6.1). Whether to render it in the badge is a UI
decision. Default: yes, small, monospace, next to model. Trivial.

Items deferred-by-design (not unknowns):

- Camera serial in per-device backup key — Phase 4 with verified backups
- Battery preflight in connect flow — Phase 4 §6.3
- WebGL preview approximation for browser-only no-camera users — V2

## 13. Out of scope

These are valid concerns, but not part of this design:

- **Verified backup before push** — Phase 4, §6.3.
- **Camera-side preview round-trip** — Phase 4, §6.4.
- **AI agent integration** — Phase 5.
- **Recipe diff UI wire-up** — Phase 4 / 6.
- **WCAG 2.2 AA audit** — Phase 6.
- **Tauri 2.0 V2 migration** — V2 roadmap.
- **Bluetooth / WiFi alternatives** — V3+.
- **iOS fallback** — V3 (SD card path).

## 14. References

- V1 spec: `docs/specs/2026-05-03-fujicomp-v1-design.md` §6.1, §6.6,
  §6.9, §10, §14
- Phase 1 plan: `docs/plans/2026-05-03-fujicomp-v1-phase-1-foundation.md`
- Existing transport: `packages/ptp-fuji-webusb/src/`
- Existing session: `packages/ptp-fuji/src/ptp/session.ts`
- `PtpFraming.fireCloseSession()` (currently dangling, will be wired in
  Step 1): `packages/ptp-fuji/src/ptp/transport.ts:142`
- macOS reference: filmkit notes on `ptpcamerad`,
  `gphoto2`/`libusb` macOS docs (linked from `docs/macos-beta.md`
  once written)

## 15. Revision history

- **r1, 2026-05-04**: initial design after brainstorming session.
- **r2, 2026-05-04**: incorporates Codex external review round 1.
  Material changes: V2 boundary moved from `FujiCameraSession` to
  `CameraSessionPort` (B1); page-unload close demoted to strict
  best-effort with connect-time recovery as the real path (B2);
  state machine gains exit actions, per-attempt `AbortController`,
  monotonic `opId` (B3); classifier moved off substring matching to
  structured `stage` metadata, `LatentError` extended (B4); `degraded`
  state restored per V1 §6.6 (H4); macOS path realigned to V1 §10 with
  beta warning + safer-first default + advanced opt-in (H5);
  `device.reset()` made guarded recovery with reconfig (H1);
  `getDeviceInfo()` specified as DATA→RESPONSE with firmware extraction,
  and `FujiCameraSession` refactored onto `PtpFraming` as prerequisite
  (H2); `subscribeConnectEvents` filter switched from object identity
  to vendor+product+permission (H3); `presets` restored to store (M3);
  `window.isSecureContext` distinguished from `webusb-unsupported`
  (M2); local fakes specified instead of relying on private exports
  (M1); CI gates aligned to scripts that will exist in the new package
  (M4); `cable-unplugged` title renamed from "Camera disconnected"
  to comply with §2 acceptance criterion (L2); §12 reframed as real
  open questions (L3); event payload types reconciled with handler
  signatures (L4); breaking i18n migration called out (L1).

- **r3, 2026-05-04**: incorporates Codex external review round 2.
  Material changes:
  - **NB1**: Step 1 of the rollout now requires adding txid + response
    code validation to `PtpFraming.sendCommand()` *before* refactoring
    `FujiCameraSession` onto it, so the existing
    `assertResponseOK`-style guarantees are preserved. New tests in
    `packages/ptp-fuji/tests/ptp-framing.test.ts` cover the cases.
  - **B4 round 2**: `OpenSession` failures are explicitly wrapped with
    `stage: "open"` by a driver-level `openSessionWithStaging` helper,
    so a `transfer-in` failing inside `OpenSession` does not misroute
    to `cable-unplugged`.
  - **B3 round 2**: stale-completion cleanup added — when
    `driver.connect()` resolves with a stale `opId`, the manager calls
    `driver.disconnect()` on the late-arriving port to close the
    device that may have been opened during the abandoned connect.
  - **H1 round 2**: the post-reset final `claimInterface` is now
    explicitly wrapped with `stage: "claim"` so a second claim
    failure cannot escape as a raw DOMException.
  - **H2 round 2**: the §11 Step 1 plan now explicitly requires
    adding txid + response-code validation to `PtpFraming.sendCommand`
    *before* the `FujiCameraSession` refactor.
  - **H3 round 2**: the connect/disconnect event filter now matches
    vendor + product + (optional) serial + permission state, with
    explicit code rather than just the decision-table claim.
  - **H4 round 2**: `degraded` runs `probe()` on every
    `OPERATION_FAILED`, not only after 3 soft failures. A hard
    failure during degraded escalates immediately. The state's
    `lastFailure` is preserved through `PROBE_RESULT`.
  - **H5 round 2**: `MACOS_SETUP_DONE` split into
    `MACOS_SETUP_ATTEMPTED` (user click) and `MACOS_SETUP_CONFIRMED`
    (manager-emitted on real reconnect success). Wizard never claims
    setup is done from a click alone.
  - **NH1**: `PROBE_RESULT` payload extended to carry
    `{ ok, err, opId }` so transitions have access to the original
    failure for classification, without introducing a `probing`
    sub-state.
  - **NH2**: listener lifecycle is now connection-generation-owned;
    listeners are installed once on entering `connected` from a
    fresh `connecting` and uninstalled once on entering `disconnected`
    or `error`. Internal `connected ↔ degraded` and alive →
    `reconnecting` → alive transitions preserve the listener handles.
    The contradiction between `connected` exit and `degraded` retain
    is removed.
  - **NH3**: `CameraSessionPort` is explicitly documented as the
    **minimal stability port for V1 Phase 2-min**. Phase 4 will extend
    it via a `Phase4SessionPort` sub-interface that adds
    `sendCommand` / `sendDataCommand` and vendor-opcode passthrough
    for §6.4 preview, object handle ops, and RAF upload. The V2
    Tauri port plans for the extension.
  - **NH4**: the macOS persistence flag split into
    `macosSetupAcknowledged` (one-time wizard education succeeded once)
    and `macosPersistentDisableConfigured` (advanced disable opt-in
    confirmed). The wizard auto-open behaviour and the assumed daemon
    state are gated on different flags so a successful `killall` does
    not get conflated with persistent setup.
  - **NM1**: `PtpTimeout` classified as `camera-off`; probe at the
    call site disambiguates from `session-stale`.
  - **NM2**: connect/disconnect event filter implementation explicitly
    matches the decision-table promise of vendor + product + optional
    serial.
