# Camera Connection Stability Hardware Test Plan

Manual release checklist for the camera connection stability feature.
Run every item against each supported physical setup before release.

## Test Matrix

| Date | Tester | Camera | Firmware | OS | Browser | USB cable/hub | Result |
|---|---|---|---|---|---|---|---|
|  |  | Fujifilm X-S20 |  | macOS  | Chrome  | Direct USB-C |  |

## Pass Criteria

- All 27 checklist items pass for the release target hardware.
- Refresh reconnects 50/50 times within 2 seconds without camera power-cycle.
- Unplug/replug reconnects 20/20 times within 5 seconds of replug.
- Camera off/on reconnects 10/10 times without clicking Connect again.
- No failure path shows generic "Camera disconnected" copy.
- macOS setup flags are written only after a real reconnect succeeds.

## Checklist

### Connection Happy Path

- [ ] 1. From a clean browser profile, click Connect, select the X-S20, and reach the connected badge with model and firmware shown.
- [ ] 2. Disconnect from the UI, then click Connect again and reconnect without power-cycling the camera.
- [ ] 3. Reload the app after a successful connection and confirm the paired-device fast path reconnects without opening the picker when browser permission is retained.

### USB Events

- [ ] 4. While connected, unplug the USB cable and confirm the UI shows cable-unplugged copy, not generic disconnected copy.
- [ ] 5. Replug the same cable and confirm automatic recovery to connected within 5 seconds.
- [ ] 6. Replug through a different physical port or hub and confirm the listener still matches the same camera permission.

### Camera State Including Degraded

- [ ] 7. Put the camera to sleep while connected and confirm the UI enters reconnecting or camera-off recovery copy.
- [ ] 8. Wake the camera with a half-press and confirm recovery to connected without clicking Connect.
- [ ] 9. Trigger two consecutive soft operation failures and confirm the UI remains degraded with the connected controls still available.
- [ ] 10. Trigger a third consecutive soft operation failure and confirm escalation to reconnecting.
- [ ] 11. Switch the camera to a wrong USB mode and confirm the app surfaces the camera-off or unsupported-mode recovery path without stale session corruption.

### macOS-Specific

- [ ] 12. With `ptpcamerad` able to claim the camera, connect and confirm the first claim collision shows the macOS beta warning.
- [ ] 13. Acknowledge the beta warning, retry the collision, and confirm the beta warning is not shown again in the same browser profile.
- [ ] 14. Run the safer-first `killall ptpcamerad icdd` command from the wizard, reconnect, and confirm only the setup-acknowledged flag is stored.
- [ ] 15. Use the advanced persistent command for both `com.apple.ptpcamerad` and `com.apple.icdd`, reconnect successfully, and confirm both setup-acknowledged and persistent-disable flags are stored.
- [ ] 16. Re-enable `ptpcamerad` and `icdd`, reproduce a claim collision, and confirm the stale persistent flag is cleared and the UI explains that macOS or another browser session may have re-enabled the claim path.

### Edge Environment

- [ ] 17. Open the app over an insecure origin and confirm secure-context copy appears before any WebUSB prompt.
- [ ] 18. Open in a browser without WebUSB support and confirm webusb-unsupported copy appears before any connection attempt.
- [ ] 19. Open Image Capture or another camera app before connecting and confirm the app reports another-app/session-stale style recovery copy instead of a crash.
- [ ] 20. Cancel the WebUSB picker and confirm the UI returns to idle or permission-denied copy without retry loops.

### Refresh And Lifecycle

- [ ] 21. While connected, press Cmd+R 50 consecutive times and confirm every reload reconnects within 2 seconds without camera power-cycle.
- [ ] 22. Close the tab while connected, reopen the app, and confirm reconnect succeeds without a stale-session power-cycle.
- [ ] 23. Navigate away from the app while connected, then go back and confirm reconnect succeeds.
- [ ] 24. Simulate a tab crash by killing the browser tab process, reopen the app, and confirm stale-session recovery attempts reset/reopen before asking for power-cycle.

### Wizard Flow

- [ ] 25. On macOS basic wizard failure, confirm no setup flags are stored and the UI still offers retry plus Show advanced.
- [ ] 26. On macOS advanced wizard success, confirm the success step displays the re-enable command.
- [ ] 27. Use Reset macOS setup status from the success step and confirm both setup flags are removed from localStorage.

## Result Notes

| Item | Pass/Fail | Notes |
|---|---|---|
| 1 |  |  |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |
| 8 |  |  |
| 9 |  |  |
| 10 |  |  |
| 11 |  |  |
| 12 |  |  |
| 13 |  |  |
| 14 |  |  |
| 15 |  |  |
| 16 |  |  |
| 17 |  |  |
| 18 |  |  |
| 19 |  |  |
| 20 |  |  |
| 21 |  |  |
| 22 |  |  |
| 23 |  |  |
| 24 |  |  |
| 25 |  |  |
| 26 |  |  |
| 27 |  |  |
