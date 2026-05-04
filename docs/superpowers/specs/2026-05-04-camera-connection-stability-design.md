# Camera connection stability — design

**Status**: Draft, awaiting user review
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
   the next `claimInterface` fails. The only escape is power-cycling the
   camera physically. This is unsustainable for any iterative use.
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

Every failure surfaces a specific, actionable banner. The generic
"Camera disconnected" must never reach the user.

The implementation must be ready for the V2 transport swap (Tauri +
libusb) without rewriting the state machine, the store, or the UI.

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

## 4. Decisions taken during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Failure scope | All failure modes covered | User-stated requirement |
| UX style | Mix: silent auto-recover for soft errors, explicit banner + retry for hard errors | A pure-silent or pure-explicit approach is frustrating in opposite ways |
| Persistence | Auto-reconnect via WebUSB permission, no preset cache | YAGNI; cache invalidation cost > re-read cost |
| macOS daemon | Four-line defence: `device.reset()` retry → first-run wizard → optional Homebrew formula → docs | Treat as one-time setup, not recurring annoyance |
| Architecture | Approach 3: separate `ConnectionManager` + `CameraDriver` interface, store as thin view layer | V2 explicitly swaps the transport (Tauri + libusb); the abstraction pays for itself |
| State machine | 5 explicit states with discriminated union | Boolean composition produces contradictory combinations |
| `device.reset()` retry | Always, not platform-gated | Cheap, benign, avoids platform-specific fragility |
| `probe()` opcode | PTP `GetDeviceInfo` (0x1001) | Standard, vendor-agnostic; survives V2 + future bodies |
| Reconnect attempts | 3 with exponential backoff `[200ms, 800ms, 2000ms]` | Covers transient failures; 4th attempt is annoying enough to ask the user |
| Liveness probe timeout | 3000ms | Balance between false positives and recovery latency |

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ apps/web/src/components/camera/                             │
│   CameraConnect, ConnectButton, ConnectingIndicator,        │
│   ConnectedBadge, ErrorBanner, MacosFirstRunWizard          │
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
                              │ emits state events
                              │
┌─────────────────────────────────────────────────────────────┐
│ packages/camera-connection/src/manager.ts                   │
│ ConnectionManager — state machine, lifecycle, retry,        │
│ event subscription, page-unload cleanup, error              │
│ classification. Driver-agnostic.                            │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ implements CameraDriver
                              │
┌─────────────────────────────────────────────────────────────┐
│ packages/camera-connection/src/drivers/webusb.ts            │
│ WebUsbCameraDriver — wraps @latent/ptp-fuji-webusb.         │
│ V2: TauriCameraDriver replaces this; manager unchanged.     │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│ @latent/ptp-fuji + @latent/ptp-fuji-webusb (existing)       │
│ Untouched, except for one addition:                         │
│   FujiCameraSession.getDeviceInfo() — PTP op 0x1001         │
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
│   ├── classifier.ts        # LatentError → ErrorReason
│   ├── driver.ts            # CameraDriver interface
│   ├── drivers/
│   │   └── webusb.ts        # WebUsbCameraDriver
│   ├── types.ts             # ConnectionState, ErrorReason, etc.
│   └── index.ts             # public API barrel
├── tests/
│   ├── state-machine.test.ts
│   ├── manager.test.ts
│   └── webusb-driver.test.ts
└── package.json
```

Why a new package and not a folder under `apps/web`: V2 reuses
`ConnectionManager` and the driver interface from a Tauri shell. Putting
this in `apps/web` would couple it to the Vite build. Keeping it in
`packages/` matches the existing monorepo pattern.

### 5.2 Boundaries

- **UI components** never call the manager or driver directly. They read
  state from the Zustand store and dispatch actions defined on the store.
- **Store** never decides transitions. It is a passive subscriber to the
  manager. Actions on the store call `manager.dispatch(event)`.
- **Manager** owns the state machine, retry logic, USB event
  subscription, page-unload handling, and error classification. It does
  not know about WebUSB; it talks to a `CameraDriver`.
- **Driver** owns the platform-specific transport details: WebUSB
  picker, claim-with-reset retry, USB event filtering, fire-and-forget
  CloseSession. It throws `LatentError` from the existing typed
  taxonomy. It does not classify into `ErrorReason`.

## 6. State machine

### 6.1 States

```ts
type ConnectionState =
  | { kind: "idle" }
  | { kind: "connecting"; attempt: number }
  | { kind: "connected"; session: FujiCameraSession; cameraModel: string }
  | { kind: "reconnecting"; attempt: number; lastReason: ErrorReason }
  | { kind: "error"; reason: ErrorReason; underlying: LatentError }
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

### 6.2 Events

| Event | Origin | Payload |
|---|---|---|
| `CONNECT_REQUESTED` | UI click on Connect | — |
| `AUTOCONNECT_AT_BOOT` | Manager `start()` if `getAlreadyPairedFujiCameras()` non-empty | — |
| `DISCONNECT_REQUESTED` | UI click on Disconnect | — |
| `USB_DEVICE_DISCONNECTED` | `navigator.usb` `disconnect` event filtered for Fuji vendor | `device: USBDevice` |
| `USB_DEVICE_CONNECTED` | `navigator.usb` `connect` event filtered for Fuji vendor | `device: USBDevice` |
| `OPERATION_FAILED` | Driver throws during I/O | `err: LatentError` |
| `RETRY_REQUESTED` | UI click on retry | — |
| `MACOS_SETUP_DONE` | Wizard "I've run it" click | — |
| `PAGE_HIDING` | `beforeunload` or `pagehide` | — |

### 6.3 Transitions

```
idle
  ─[CONNECT_REQUESTED]→ connecting{attempt: 1}
  ─[AUTOCONNECT_AT_BOOT]→ connecting{attempt: 1}

connecting{attempt: n}
  ─[connect-success]→ connected
  ─[OPERATION_FAILED]→ error{reason: classify(err)}
                        // classify() returns "macos-claim-collision" when err.message
                        // contains "claim" — this is the post-reset surfaced error
  ─[USB_DEVICE_DISCONNECTED]→ error{reason: "cable-unplugged"}

connected
  ─[USB_DEVICE_DISCONNECTED]→ reconnecting{attempt: 1, lastReason: "cable-unplugged"}
  ─[OPERATION_FAILED + probe-fail]→ reconnecting{attempt: 1, lastReason: classify(err)}
  ─[DISCONNECT_REQUESTED]→ disconnected
  ─[PAGE_HIDING]→ (fireCloseSession; no transition)

reconnecting{attempt: n, lastReason}
  ─[reconnect-success]→ connected
  ─[reconnect-failure, n < 3]→ reconnecting{attempt: n+1, lastReason}
  ─[reconnect-failure, n == 3]→ error{reason: lastReason}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}  // skip remaining backoff
  ─[DISCONNECT_REQUESTED]→ disconnected

error{reason}
  ─[RETRY_REQUESTED]→ connecting{attempt: 1}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}
                            // skipped when reason == "macos-claim-collision":
                            // replugging does not free the daemon, retry would loop
  ─[MACOS_SETUP_DONE]→ connecting{attempt: 1}      // only if reason was macos-claim-collision
  ─[DISCONNECT_REQUESTED]→ disconnected

disconnected
  ─[CONNECT_REQUESTED]→ connecting{attempt: 1}
  ─[USB_DEVICE_CONNECTED]→ connecting{attempt: 1}  // auto-recover for paired device
```

### 6.4 Entry actions (side effects)

| State | Entry action |
|---|---|
| `connecting` | Call `driver.connect({autoSelectPaired: true})`. On rejection, dispatch `OPERATION_FAILED` with the thrown `LatentError`. (The `device.reset()` retry on claim collision is internal to the driver — see §7.3 — and never surfaces to the manager unless the retry also fails.) |
| `connected` | Subscribe to `navigator.usb` disconnect event; install `pagehide`/`beforeunload` handler that calls `driver.fireCloseSession()`. Reset `attempt` counter. |
| `reconnecting` | Wait per backoff schedule, then call `driver.connect({autoSelectPaired: true})`. Schedule: `[200ms, 800ms, 2000ms]` indexed by `attempt - 1`. |
| `error` | None. Wait for user action. |
| `disconnected` | Unsubscribe USB events; remove `pagehide`/`beforeunload` handlers; call `driver.disconnect()` (graceful CloseSession + releaseInterface). |

### 6.5 Error classifier

```ts
function classifyDriverError(err: LatentError): ErrorReason {
  if (err.category === "UsbDisconnect") {
    const msg = err.message.toLowerCase();
    if (msg.includes("claim")) return "macos-claim-collision";
    if (msg.includes("transferin") || msg.includes("transferout")) return "cable-unplugged";
    return "session-stale";
  }
  if (err.category === "PtpStall") return "camera-off";
  if (err.category === "UsbPermissionDenied") return "permission-denied";
  if (err.category === "WebUSBSecureContextRequired") return "secure-context";
  if (err.category === "WebUSBUnsupported") return "webusb-unsupported";
  return "unknown";
}
```

The classifier is the single point where transport-layer errors become
UX semantics. Lives in `classifier.ts`, tested in isolation.

## 7. CameraDriver interface

### 7.1 Contract

```ts
export interface CameraDriver {
  connect(opts?: ConnectOptions): Promise<DriverConnectResult>;
  disconnect(): Promise<void>;
  subscribeDisconnectEvents(handler: () => void): () => void;
  subscribeConnectEvents(handler: () => void): () => void;
  fireCloseSession(): void;
  probe(timeoutMs?: number): Promise<boolean>;
}

export interface ConnectOptions {
  autoSelectPaired?: boolean;
  signal?: AbortSignal;
}

export interface DriverConnectResult {
  session: FujiCameraSession;
  cameraModel: string;
}
```

### 7.2 V2 contract preservation

In V2 (Tauri + libusb backend), the swap is a single line in
`apps/web/src/main.tsx`:

```ts
// V1
const driver = new WebUsbCameraDriver();
// V2
const driver = new TauriCameraDriver(invoke);
```

Manager, store, components, error reasons, copy, wizard — all unchanged.
The state machine is platform-agnostic. The driver is the only V2
delta.

### 7.3 WebUsbCameraDriver — V1 implementation

Wraps `@latent/ptp-fuji-webusb`. Adds three behaviours:

**`device.reset()` retry on claim failure**

```ts
try {
  await device.claimInterface(iface);
} catch (firstClaimErr) {
  try {
    await device.reset();
    await device.claimInterface(iface);
  } catch {
    throw firstClaimErr;
  }
}
```

Cheap and benign on every platform. Resolves a portion of macOS claim
collisions transparently. The original error is preserved if reset+retry
also fails, so the classifier still produces `macos-claim-collision`.

**USB event subscription**

```ts
subscribeDisconnectEvents(handler) {
  const listener = (e: USBConnectionEvent) => {
    if (e.device.vendorId === FUJI_VENDOR_ID && e.device === this.device) {
      handler();
    }
  };
  navigator.usb.addEventListener("disconnect", listener);
  return () => navigator.usb.removeEventListener("disconnect", listener);
}
```

Mirror for `connect` events. Filtered by vendor and device identity to
avoid firing on unrelated USB activity.

**Liveness probe via `GetDeviceInfo`**

Requires extending `FujiCameraSession` in `@latent/ptp-fuji` with a
`getDeviceInfo()` method that issues PTP op `0x1001`. Roughly 30 lines
of code in `session.ts`, modelled after the existing `open()` /
`close()` pattern. Standard PTP, no Fuji vendor opcode.

```ts
async probe(timeoutMs = 3000): Promise<boolean> {
  if (!this.session || this.session.state !== "open") return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    await this.session.getDeviceInfo(ctrl.signal);
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}
```

## 8. UI layer

### 8.1 Store shape

```ts
interface CameraStore {
  state: ConnectionState;
  macosSetupDone: boolean;
  macosWizardOpen: boolean;

  connect: () => void;
  disconnect: () => void;
  retry: () => void;
  acknowledgeMacosSetup: () => void;
  openMacosWizard: () => void;
  closeMacosWizard: () => void;

  isConnected: () => boolean;
  isConnecting: () => boolean;
  errorReason: () => ErrorReason | null;
}
```

`macosSetupDone` hydrated from `localStorage` key
`latent:macos-setup-done-v1` at boot.

### 8.2 Wiring

In `apps/web/src/main.tsx`, executed once at module load:

```ts
const driver = new WebUsbCameraDriver();
const manager = new ConnectionManager(driver);

manager.subscribe((state) => useCameraStore.setState({ state }));
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
- `ConnectedBadge.tsx` — `connected`, includes disconnect control
- `ErrorBanner.tsx` — `error`, switch on `reason`, dispatches retry / wizard
- `MacosFirstRunWizard.tsx` — three-step modal, gated on `macosSetupDone`

Each tested in isolation with mock store.

### 8.4 Error banner copy (i18n keys)

| `reason` | Title | Body | Action |
|---|---|---|---|
| `macos-claim-collision` | macOS is holding the camera | Image Capture is claiming exclusive access. Run a one-time setup to release it. | Run setup → wizard |
| `camera-off` | Camera not responding | Power-cycle the camera (off → on) and check the cable, then click retry. | Retry |
| `cable-unplugged` | Camera disconnected | The USB cable was unplugged. Reconnect it — Latent will reconnect automatically. | (auto on replug) |
| `permission-denied` | Permission needed | Click Connect and allow access to the camera in the picker. | Connect |
| `secure-context` | Insecure context | Latent needs HTTPS or localhost to access USB devices. | (link to docs) |
| `webusb-unsupported` | Browser not supported | Latent needs a Chromium browser (Chrome, Edge, Brave, Arc). | (link to docs) |
| `session-stale` | Camera in stale state | The previous session did not close cleanly. Power-cycle the camera and retry. | Retry |
| `unknown` | Connection failed | (underlying message) + Show details (collapsible debug panel) | Retry |

i18n keys structured as `camera.error.<reason>.{title,body,action}` in
both `en.ts` and `it.ts`.

### 8.5 macOS first-run wizard

Three steps, linear, no skip. Triggered automatically on first
`error{reason: "macos-claim-collision"}` while `macosSetupDone === false`.

**Step 1 — Why this is needed**: short explanation that macOS auto-mounts
cameras for Image Capture and Photos, blocking Latent. Reversibility
stated up front.

**Step 2 — Run the command**: a copyable code block with

```
launchctl disable gui/$(id -u)/com.apple.ptpcamerad && killall ptpcamerad
```

plus instructions for opening Terminal. Button "I've run it" closes step
and proceeds.

**Step 3 — Done**: confirmation, plus the re-enable command for later

```
launchctl enable gui/$(id -u)/com.apple.ptpcamerad
```

shown copyable. A bullet for power users mentions
`brew install formray/latent/release-camera` (Homebrew formula
distributed separately, optional). Clicking "Connect" sets
`macosSetupDone = true` in localStorage and dispatches
`MACOS_SETUP_DONE`.

If the user hits `macos-claim-collision` again after `macosSetupDone`
is true, the banner reads "macOS is holding the camera again" and
offers "Re-open setup" rather than auto-opening the wizard.

## 9. Failure mode catalog

### 9.1 Page lifecycle (Category A)

| Failure | Detection | Transition | UX | Recovery |
|---|---|---|---|---|
| Refresh `Cmd+R` | `beforeunload` | `connected` → fire CloseSession (no await) → page dies | Spinner ~1s on boot, then connected | Auto-reconnect via `AUTOCONNECT_AT_BOOT` |
| Tab close | `pagehide` | Same | (page gone) | Auto-reconnect on next boot |
| Browser quit | `pagehide` | Same | N/A | N/A |
| Navigation away | `pagehide` | Same | (new page) | Auto-reconnect when returning |
| Vite HMR | `beforeunload` | Same | Brief spinner | Auto-reconnect |
| Tab crash | None possible | Session left dangling on camera | At next boot, reconnect likely fails with `session-stale` | `device.reset()` retry covers most; banner otherwise |

### 9.2 USB-level disconnects (Category B)

All three indistinguishable at the technical level (camera leaves the bus).

| Failure | Detection | Transition | Recovery |
|---|---|---|---|
| Cable unplugged | `navigator.usb` `disconnect` event (~10ms) | `connected` → `reconnecting` → if replug within 5s reconnected, else `error{cable-unplugged}` | `USB_DEVICE_CONNECTED` event auto-triggers `connecting` |
| Camera switch OFF | Same (camera leaves bus on power-down) | Same | Switch ON → enumeration → auto-connect |
| Battery dies | Same | Same | Battery swap → switch ON → auto-connect |
| USB hub power-cycle | Same (vendor-filtered) | Same | Hub recovery → auto-connect |

### 9.3 Camera alive but not responding (Category C)

| Failure | Detection | Recovery |
|---|---|---|
| Camera in sleep | `OPERATION_FAILED` with `PtpStall` or 30s timeout; probe fails | "Wake camera (half-press shutter)" + retry |
| Wrong USB mode | `OPERATION_FAILED` with `PtpUnsupportedOperation` on standard op | "Set camera to USB RAW Conv./Backup Restore" + retry |
| Stale PTP session post-crash | `OpenSession` fails immediately | `device.reset()` retry → if still fails, `error{session-stale}` + power-cycle prompt |

### 9.4 Claim collision (Category D)

| Variant | Detection | UX |
|---|---|---|
| First-time `ptpcamerad` collision | `claimInterface` fails with "claim" in message; reset retry fails | Wizard auto-opens (only if `!macosSetupDone`) |
| Repeat collision after setup done | Same, but `macosSetupDone === true` | Banner with "Re-open setup" button, wizard not auto-opened |
| `Image Capture.app` open by user | Same signature (claims via `mscamerad-xpc`) | Same banner / wizard path |

### 9.5 Browser environment (Category E)

| Failure | Detection | Recovery |
|---|---|---|
| HTTP page, not localhost | `navigator.usb` undefined at boot | Direct to `error{secure-context}`; user changes URL |
| Non-Chromium | `navigator.usb` undefined | `error{webusb-unsupported}`; user switches browser |
| Picker cancellation | `requestDevice()` throws `NotFoundError` | `error{permission-denied}`; user re-clicks Connect |

### 9.6 Mid-operation (Category F — Phase 4 preview)

The manager exposes `wrapOperation<T>(fn: () => Promise<T>): Promise<T>`.
Phase 4 reads/writes go through it. On failure, the manager classifies
and dispatches `OPERATION_FAILED` to the state machine.

For Phase 2-min, only the failures that already exist (read failures
during `connectAndReadPresets` Phase 2-full work) flow through this hook.

### 9.7 User-effort summary

```
Automatic recovery (no user action):
  - Refresh / tab close / navigation / hot reload         (Category A)
  - Cable unplugged then replugged                        (Category B, event-driven)
  - Camera switch OFF then ON                             (Category B, event-driven)
  - Transient PTP stall                                   (Category C, probe + retry)

One-click recovery (retry button):
  - Camera in sleep                                       (wake + retry)
  - Wrong USB mode                                        (fix mode + retry)
  - Session stale after tab crash                         (power-cycle + retry)
  - Permission denied                                     (re-click Connect)

One-time setup (wizard):
  - macOS ptpcamerad claim                                (run command once)

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
Driver tests (FakeUSB)
    ↑
Existing PTP/WebUSB tests (untouched, still green)
```

### 10.2 State machine tests (`@latent/camera-connection`)

Pure TypeScript, no DOM, no USB. Tests transitions only.

Target: ~25 tests covering every declared transition. Backoff timing
verified with `vi.useFakeTimers()`. Classifier covered with one test
per `ErrorReason`.

### 10.3 Driver tests

Reuse `FakeTransport` from `@latent/ptp-fuji` and the existing
`FakeUSBDevice` shape from `packages/ptp-fuji-webusb/tests/`.

Target: ~15 tests. `connect` with paired vs picker; `device.reset()`
retry path success and failure; disconnect graceful close;
event subscription filtering; `probe` OK / timeout / stall; idempotent
disconnect.

### 10.4 Integration tests (`apps/web`)

Mock the driver with `FakeCameraDriver` implementing `CameraDriver`.
Drives the full UI flow.

Target: ~10 tests. Cold connect; auto-connect at boot; macOS wizard
open / "I've run it" → retry → connected; cable unplug shows banner;
USB connect event auto-recovers; disconnect button; `pagehide` calls
`fireCloseSession`; banner copy matches reason for all 8 reasons;
`macosSetupDone` localStorage hydration.

### 10.5 Hardware test plan

`docs/qa/hardware-test-plan.md` (new directory). Manual checklist run
before every release. 24 items grouped:

- Connection happy path (3)
- USB events (3)
- Camera state (4)
- macOS-specific (4)
- Edge environment (4)
- Refresh / lifecycle (3)
- Wizard flow (3)

Each item is a boolean pass/fail. Result table per device + macOS
version.

### 10.6 Success criteria

| # | Criterion | Measure |
|---|---|---|
| 1 | Refresh requires no power-cycle | 50/50 consecutive refreshes reconnect within 2s |
| 2 | USB unplug-replug recovers | 20/20 cycles connected within 5s of replug |
| 3 | Camera off/on recovers without click | 10/10 cycles |
| 4 | macOS wizard shown only once per setup | One week of use after setup, wizard never re-opens |
| 5 | No generic "Camera disconnected" copy | 0 occurrences in any failure scenario |
| 6 | TypeScript exhaustiveness on state | 0 `// @ts-ignore` or `as any` on state switches |
| 7 | Coverage of `@latent/camera-connection` | ≥ 90% line coverage |
| 8 | Hardware checklist | 24/24 green pre-merge |

### 10.7 CI gates

In `.github/workflows/ci.yml`:

```yaml
- run: npm run test --workspace=@latent/camera-connection
- run: npm run typecheck --workspace=@latent/camera-connection
- run: npm run lint --workspace=@latent/camera-connection
```

Existing `lockstep-check` continues unchanged.

## 11. Rollout plan

Implementation order (each step independently testable, mergeable):

**Step 1 — Scaffold the new package**
- Create `packages/camera-connection/` with `package.json`, `tsconfig.json`, `vitest.config.ts`
- Empty `src/index.ts` exporting nothing yet
- Wire into `vitest.workspace.ts` and root `package.json` workspaces
- CI runs the empty test suite green

**Step 2 — `FujiCameraSession.getDeviceInfo()`**
- Add PTP op `0x1001` issuance to `packages/ptp-fuji/src/ptp/session.ts`
- Test with `FakeTransport` covering OK, stall, abort
- ~5 tests, ~30 lines of code

**Step 3 — Types + state machine (no I/O)**
- `types.ts`, `state-machine.ts`, `classifier.ts`
- ~25 unit tests, all transitions, classifier coverage
- Public API export

**Step 4 — `CameraDriver` interface + `WebUsbCameraDriver`**
- Wrap `@latent/ptp-fuji-webusb` request flow
- `device.reset()` retry, USB event subscription, `fireCloseSession`,
  `probe`
- ~15 tests with FakeUSB

**Step 5 — `ConnectionManager`**
- Compose state machine + driver
- Page-unload handler installation, USB event wiring,
  `wrapOperation` hook, retry timer logic
- ~15 tests with `FakeCameraDriver`

**Step 6 — Replace store + UI components**
- Refactor `apps/web/src/stores/camera.ts` to subscribe to manager
- Decompose `CameraConnect.tsx` into `components/camera/*`
- Add `ErrorBanner` with all 8 reason variants
- i18n keys for both `en.ts` and `it.ts`
- ~10 integration tests

**Step 7 — macOS first-run wizard**
- `MacosFirstRunWizard.tsx` three-step modal
- Copy buttons, localStorage flag, re-open path
- ~5 component tests

**Step 8 — Hardware validation**
- `docs/qa/hardware-test-plan.md` with 24 items
- Run on X-S20, capture results
- File issues for any failures, fix, re-run

**Step 9 — Optional: Homebrew formula**
- `formray/homebrew-latent` tap repo with
  `Formula/release-camera.rb`
- Single-purpose script that runs the disable command
- Mention in wizard Step 3 only after publication

Each step is a separate commit (or PR). Step 1 is small enough to land
immediately. Steps 2–7 are sequenced; Step 8 runs against the merged
work; Step 9 is independent.

## 12. Open questions

None blocking. The brainstorming session resolved every prior
ambiguity. Items below are deferred-by-design, not unknowns:

- Whether to publish the Homebrew formula as part of this work or
  later — answered "later, optional".
- Whether to integrate camera serial into a per-device backup key —
  answered "Phase 4, with verified backups".
- Whether to surface battery preflight in the connect flow — answered
  "Phase 4, §6.3".

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
- `fireCloseSession()` already implemented:
  `packages/ptp-fuji/src/ptp/transport.ts:142`
- macOS reference: filmkit notes on `ptpcamerad`,
  `gphoto2`/`libusb` macOS docs (will be linked from
  `docs/macos-beta.md`)
