# macOS WebUSB Camera Release Runbook

Operational notes for releasing a Fujifilm camera when Chromium/WebUSB reports
that macOS or another session has exclusive access to the PTP interface.

Observed during X-S20 hardware validation on 2026-05-06.

## 2026-05-06 Incident Summary

Hardware/session:

- camera: Fujifilm X-S20, firmware 3.30;
- app: local Vite dev server at `http://127.0.0.1:5173/`;
- browser: Google Chrome on macOS;
- failure surface: Latent camera workspace after the WebUSB picker.

What happened:

1. The camera appeared in the browser's WebUSB picker, but the connection failed
   when the app tried to claim the PTP interface.
2. Latent showed the macOS claim-collision recovery message. The original copy
   over-attributed the failure to Image Capture.
3. Clicking "Open setup" did not reliably expose the setup wizard because the
   beta acknowledgement and the collision setup UI were coupled too tightly.
4. Running only `killall ptpcamerad` did not fix the session.
5. Process and USB diagnostics showed that the competing owner could be
   `ptpcamerad`, `icdd`, or a stale Google Chrome WebUSB session.
6. The successful release path combined three things:
   - stop both macOS camera daemons: `killall ptpcamerad icdd`;
   - force Latent to reopen the WebUSB picker instead of reusing a paired
     device after the setup attempt;
   - use a clean Chrome profile when the normal profile kept a stale WebUSB
     claim or pairing state.
7. After reconnecting, the camera was detected as `X-S20 · FW 3.30`.
8. A second issue appeared: the app could connect but stay on "Reading custom
   slots from the camera" with `0 slots read`.
9. The app now emits partial preset-read results, records per-slot failures,
   and times out stuck slot reads instead of leaving the UI indefinitely in the
   scanning state.
10. After intentionally re-enabling `ptpcamerad` and `icdd`, the claim bug
    reproduced. `launchctl disable ... && killall ...` left the jobs disabled
    but still running, so the reliable dev workaround was to suspend the live
    daemon PIDs and fully power-cycle the camera.
11. In the observed case, unplugging USB was not enough; removing and
    reinserting the camera battery cleared the camera-side stale PTP session.

Outcome:

- camera connection recovered;
- camera recipes became visible in the UI;
- the macOS release procedure is now documented here;
- the app contains guardrails for the same class of failure, but the browser
  still cannot execute macOS release commands itself.

Follow-up observed after the fix:

- A Fujifilm X-T20 can connect far enough for Latent to leave the macOS
  claim-collision path, but may show "The camera did not return any readable
  custom slots."
- Treat that as a separate model capability or preset-read compatibility issue,
  not as evidence that macOS is still holding the camera.
- Debug it through PTP operation/property support, slot count assumptions, and
  legacy custom-setting behavior for that body.

## Symptom

Latent shows a macOS claim-collision error after the WebUSB picker:

- the camera appears in the browser picker;
- connection fails at USB interface claim time;
- retrying the same paired device returns to the same error;
- running only `killall ptpcamerad` may not release the camera.

## Cause

On macOS, more than one process can interfere with browser PTP access:

- `ptpcamerad` can claim PTP cameras automatically;
- `icdd`, the Image Capture daemon, can also hold the camera;
- a previous Chromium WebUSB session can leave the browser-side device pairing
  or claim state stale until the picker is reopened or the browser profile is
  isolated.

Do not assume the owner is only Image Capture. Diagnose the active owner first
when possible.

## Fix Boundary

This is partly an application fix and partly an operating-system procedure.

Fixed in the app:

- the setup UI can be reached from the macOS collision state;
- the recovery copy says "macOS or another browser session" instead of blaming
  only Image Capture;
- the basic setup command shown by Latent is `killall ptpcamerad icdd`;
- the advanced setup command covers both `com.apple.ptpcamerad` and
  `com.apple.icdd`, and suspends live daemon processes with `killall -STOP`;
- the setup copy tells the user to power-cycle the camera after running the
  release command;
- after a macOS setup attempt, the connection manager requests the browser
  picker again by setting `autoSelectPaired: false`;
- failed WebUSB connection attempts clean up partially opened transports and
  raw USB devices;
- preset reads report partial success and slot-level failures;
- stuck preset reads are guarded by a per-slot timeout.
- when the optional local helper is running, the setup wizard can read daemon
  status and run release/restore actions through `http://127.0.0.1:5174`.

Implementation map:

| Area | Files | Behavior |
| --- | --- | --- |
| macOS recovery UI | `apps/web/src/components/camera/CameraConnect.tsx`, `apps/web/src/components/camera/MacosSetupWizard.tsx` | Setup is reachable from the collision state and shows commands for both `ptpcamerad` and `icdd`; advanced mode suspends live daemon processes. |
| macOS recovery copy | `apps/web/src/i18n/en.ts`, `apps/web/src/i18n/it.ts` | Copy now says macOS or another browser session may own the camera, avoiding a false single-cause Image Capture diagnosis. |
| Picker retry | `packages/camera-connection/src/manager.ts` | `MACOS_SETUP_ATTEMPTED` reconnects with `autoSelectPaired: false`, forcing the browser picker and avoiding stale paired-device reuse. |
| Failed connect cleanup | `packages/camera-connection/src/drivers/webusb.ts` | Failed connect attempts close partially opened PTP transports or raw USB devices. |
| Preset read guardrail | `packages/camera-connection/src/manager.ts`, `apps/web/src/stores/camera.ts`, `apps/web/src/components/camera/CameraRecipesPanel.tsx` | Slot reads emit snapshots, record per-slot failures, and time out stuck reads instead of leaving the UI in permanent scanning. |
| Local macOS helper | `scripts/macos-camera-helper.ts`, `apps/web/src/lib/macos-camera-helper.ts` | Optional localhost helper reads daemon status and runs release/restore actions from buttons in the setup wizard. |
| Regression tests | `packages/camera-connection/tests/manager.test.ts`, `packages/camera-connection/tests/webusb-driver.test.ts`, `apps/web/tests/CameraConnect.test.tsx`, `apps/web/tests/macos-setup-wizard.test.tsx`, `apps/web/tests/CameraRecipesPanel.test.tsx` | Tests cover picker forcing, cleanup, command text, setup state, partial preset failures, and stuck-slot timeout. |

Not fixable directly from the web app:

- a browser page cannot run `killall`, `launchctl`, `kill -STOP`, or reopen
  macOS privacy/system dialogs without the optional local helper;
- the browser must still show the WebUSB picker for permission;
- macOS services can restart or reclaim the camera outside the app's control;
- a stale browser profile may need a clean-profile launch or full browser
  restart.

## Diagnose

List the camera and any exclusive USB owner:

```bash
ioreg -p IOUSB -l -w0 | rg -i "X-S20|X-M5|Fujifilm|UsbExclusiveOwner"
```

Useful interpretations:

- no `UsbExclusiveOwner` line: macOS may not currently show an owner, but a
  stale browser pairing or daemon restart can still make the next claim fail;
- owner is Google Chrome: close/restart the tab or use the clean-profile
  browser step;
- owner is a macOS daemon: use the temporary release command first;
- owner changes between attempts: unplug/replug the camera and reopen the
  WebUSB picker after each release attempt.

List likely macOS camera daemons:

```bash
ps -axo pid,comm,args | rg "ptpcamerad|icdd|Image Capture|Photos"
```

If `UsbExclusiveOwner` points at Google Chrome, the browser session is the stale
owner. Use the clean-profile browser step below before changing more macOS
services.

## Temporary Release

Use this first. It is session-scoped and less invasive than disabling launch
agents:

```bash
killall ptpcamerad icdd
```

Then:

1. Unplug and replug the camera.
2. Power-cycle the camera. If the claim remains stuck, remove and reinsert the
   battery to clear the camera-side PTP session.
3. Keep the camera awake and in USB/PTP mode.
4. Reopen the WebUSB picker in Latent and select the camera again.

The app should force the picker after the macOS setup flow; reusing a stale
paired device can reproduce the same claim error.

## Clean Chromium Profile

If the active owner is Chrome, or the normal browser profile keeps returning to
the same error, start a disposable profile:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=/private/tmp/latent-chrome-webusb \
  --no-first-run \
  --new-window \
  http://127.0.0.1:5173/
```

This avoids stale WebUSB permissions and stale device state in the normal
profile while keeping the local dev server unchanged.

Use this when:

- `killall ptpcamerad icdd` succeeds but Latent still returns to the same
  claim-collision state;
- `ioreg` shows Chrome as `UsbExclusiveOwner`;
- resetting the normal profile's site permission does not clear the failure;
- the WebUSB picker does not appear again after the setup flow.

## Persistent Dev Workaround

Use only on a development machine while doing hardware validation. This disables
macOS auto-claiming services until they are re-enabled:

```bash
launchctl disable gui/$(id -u)/com.apple.ptpcamerad
launchctl disable gui/$(id -u)/com.apple.icdd
killall -STOP ptpcamerad icdd
```

If the services are already running, `launchctl disable` can mark them disabled
while the current processes remain alive. `killall -STOP` freezes those live
processes so they cannot claim the next camera attach.

If `killall -STOP` is unavailable or you need to target exact PIDs, stop the
current processes for the test session:

```bash
ps -axo pid,comm,args | rg "ptpcamerad|icdd"
kill -STOP <ptpcamerad-pid>
kill -STOP <icdd-pid>
```

Record the stopped PIDs. Do not leave them suspended after testing.

After suspending the daemons, physically reset the camera connection:

1. Unplug USB.
2. Turn the camera off.
3. If the browser still reports a claim collision after reconnect, remove and
   reinsert the battery.
4. Turn the camera on, keep it awake, and reopen the WebUSB picker.

## Optional Local Helper

For hardware QA, start the local helper before opening Latent:

```bash
npm run macos-camera-helper
```

The helper listens only on `127.0.0.1:5174` and accepts browser requests only
from `localhost` or `127.0.0.1` origins. When it is running, the macOS setup
wizard shows daemon status plus one-click Release and Restore buttons.

Release runs:

```bash
launchctl disable gui/$(id -u)/com.apple.ptpcamerad
launchctl disable gui/$(id -u)/com.apple.icdd
killall -STOP ptpcamerad icdd
```

Restore runs:

```bash
killall -CONT ptpcamerad icdd
launchctl enable gui/$(id -u)/com.apple.ptpcamerad
launchctl enable gui/$(id -u)/com.apple.icdd
```

The helper cannot power-cycle the camera. If the camera-side PTP session is
stale, still unplug USB and power-cycle the body, including battery reseat when
needed.

Notes:

- `launchctl bootout` may be denied or ineffective for protected Apple agents
  depending on the macOS version and login session. Prefer `disable` plus
  `killall` for this dev workflow.
- If `kill -STOP` is used, the stopped services remain frozen only until they
  are continued, killed, or the machine reboots.
- Do not run this workaround on a user's production machine without explaining
  how to restore the defaults.

## Restore macOS Defaults

When hardware testing is finished, re-enable the services:

```bash
killall -CONT ptpcamerad icdd
launchctl enable gui/$(id -u)/com.apple.ptpcamerad
launchctl enable gui/$(id -u)/com.apple.icdd
```

If you used `kill -STOP` on exact PIDs, resume the same PIDs:

```bash
kill -CONT <ptpcamerad-pid>
kill -CONT <icdd-pid>
```

A reboot after re-enabling is the cleanest way to return macOS camera handling
to its default state.

## Verification Checklist

After applying the release procedure:

- reopen the WebUSB picker and select the Fujifilm camera;
- confirm Latent shows the connected badge with model and firmware;
- confirm a full camera power-cycle or battery reseat clears a stale PTP
  session when USB replug alone does not;
- confirm `Slots read` increments, or a final slot-level failure is shown;
- confirm a failed read does not stay forever on "Reading custom slots from the
  camera";
- export a camera backup only after at least one slot has been read;
- run the targeted tests:

```bash
npm --workspace @latent/camera-connection test -- manager webusb-driver
npm --workspace @latent/web test -- CameraConnect macos-setup-wizard CameraRecipesPanel
npm test -- scripts/macos-camera-helper.test.ts
npm run typecheck
npm run lint
npm run lockstep-check
```

## App-Side Guardrails

Latent should support this runbook with product behavior:

- the macOS setup wizard uses `killall ptpcamerad icdd`, not only
  `ptpcamerad`;
- advanced setup uses `killall -STOP ptpcamerad icdd` because `launchctl
  disable` can leave existing daemon processes running;
- setup copy asks for a camera power-cycle after the release command;
- after setup confirmation, the connection manager reopens the WebUSB picker
  instead of silently reusing a stale paired device;
- failed WebUSB connection attempts close any partially opened transport or raw
  device;
- preset reads emit partial results and slot-level failures instead of leaving
  the UI indefinitely on "Reading custom slots from the camera".
