# Contributor Onboarding

This is the shortest path from a clean checkout to a useful contribution.
Use it before opening issues, PRs, or hardware reports.

## 1. Install The Toolchain

- Node.js 22
- npm
- A Chromium-based browser for WebUSB work: Chrome, Edge, or Arc
- Optional but recommended for hardware work: a direct USB-C cable, no hub

```bash
nvm use
npm install
npm run validate
```

Expected result: typecheck, lint, tests, license-check, and the schema
lockstep gate pass.

## 2. Start The App

```bash
cd apps/web
npm run dev
```

Open `http://localhost:5173`. WebUSB is available only on `localhost` or
HTTPS; file URLs and insecure LAN hosts will fail by design.

## 3. Understand The Main Workflows

Start without hardware:

1. Open the library.
2. Search and filter recipes.
3. Import a JSON recipe.
4. Delete a recipe and restore factory defaults.
5. Open the RAF workspace and load a local RAF if one is available.

Then use hardware:

1. Put the camera in USB/PTP mode.
2. Connect from the app and choose the camera in the browser picker.
3. Read the camera slots.
4. Import a slot into the local library before writing anything.
5. Write only to a disposable slot.
6. Read the slot again and compare values.

## 4. Know The Package Boundaries

- `apps/web`: UI, stores, browser-only flows.
- `packages/camera-connection`: state machine, driver interface, WebUSB
  driver adapter, reconnect behavior.
- `packages/ptp-fuji`: PTP framing/session code. No DOM or WebUSB types.
- `packages/ptp-fuji-webusb`: browser transport for WebUSB bulk transfers.
- `packages/recipe-schema`: recipe schema, camera capability matrix,
  migrations, and translator from recipe fields to camera properties.

If a change crosses a boundary, add tests on both sides.

## 5. Recipe Field Rule

Adding or changing a recipe field requires synchronized edits:

1. `packages/recipe-schema/src/recipe.ts`
2. `data/camera-models.json`
3. `packages/recipe-schema/src/translate/`
4. A round-trip test

Run:

```bash
npm run lockstep-check
```

Preview-only fields can be present in the schema and RAF renderer without
being camera-slot writable. Keep that distinction explicit.

## 6. Hardware Reports

When reporting camera behavior, include:

- Camera model and firmware
- OS and browser version
- USB mode selected on the camera
- Direct cable or hub
- Whether other camera apps were open
- Console error, if any
- The recipe or property IDs involved

For release-grade validation, use
[`qa/hardware-test-plan.md`](./qa/hardware-test-plan.md).

## 7. Pull Request Expectations

- Keep PRs small enough to review.
- Include the user-visible reason for the change.
- Run `npm run validate`.
- For WebUSB or camera-write changes, state whether real hardware was tested.
- Do not edit the vendored `filmkit/` reference directory if it exists locally.

## 8. Common Failure Modes

| Symptom                              | Likely cause                             | First check                                |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------ |
| Browser says WebUSB is unavailable   | Non-Chromium or insecure origin          | Use Chrome on `localhost`                  |
| `Unable to claim interface` on macOS | `ptpcamerad` or another app owns PTP     | Close camera apps; follow the app wizard   |
| Camera connects but write fails      | Slot/property unsupported or camera busy | Read slot again and inspect missing fields |
| RAF preview looks wrong              | A parameter group is misencoded          | Run RAF diagnostics and compare variants   |
| Tests fail after schema edit         | Schema/translator drift                  | Run `npm run lockstep-check`               |
