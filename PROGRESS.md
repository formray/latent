# Progress

> **Note:** This project was named _FilmFork_ through 2026-05-04. References
> to "FilmFork" or `@filmfork/*` in entries below describe the project's
> prior name; the current name is **Latent** and packages are `@latent/*`.
> See `CHANGELOG.md` for the rename entry.

## 2026-05-06 — Phase 6 polish pass

Phase 6 moved forward from general polish into concrete recipe portability
and genealogy features.

- Added self-contained recipe URL share via `?share=...#library`. Opening a
  shared URL imports and selects the shared recipe locally.
- URL share excludes structured `reasoning` by default, preserving the V1
  privacy rule that reasoning stays out of share links unless explicitly
  exported elsewhere.
- Added recipe genealogy display in the detail metadata. Creator duplicates
  already preserve `parentRecipeId`; the UI now shows the parent recipe name
  when it is available locally, or a shortened parent id when it is not.
- Added targeted tests for share encode/decode, URL import, share-link copy,
  and parent metadata display.
- Added a Phase 6 polish plan tracking remaining WCAG 2.2 AA and production
  CSP validation.

Remaining Phase 6 work:

- Run the WCAG 2.2 AA audit on a production-like build.
- Validate final CSP headers once Phase 7 chooses the portal hosting target.
- Smoke test URL share on the deployed portal.

## 2026-05-06 — X-S20 macOS WebUSB release fix

Hardware validation found a macOS/WebUSB claim-collision path where the camera
appeared in the browser picker but Latent could not claim the PTP interface.
The original recovery path was too narrow: it implied Image Capture alone,
recommended only `killall ptpcamerad`, and could reuse a stale paired WebUSB
device after the setup flow.

- Confirmed the effective release path on X-S20 FW 3.30: handle both
  `ptpcamerad` and `icdd`, reopen the WebUSB picker, and use a clean Chrome
  profile when the normal profile holds stale WebUSB state.
- Reproduced the claim bug after re-enabling `ptpcamerad` and `icdd`.
  `launchctl disable` marked the services disabled but left live processes
  running; suspending the live daemons plus a full camera power-cycle/battery
  reseat cleared the stale PTP session.
- Added an optional localhost macOS camera helper for hardware QA. When started
  with `npm run macos-camera-helper`, the setup wizard can read daemon status
  and run release/restore actions from the web UI.
- Moved the post-release restore affordance into a compact portal so users can
  close the setup panel without losing the ability to restore macOS services.
- Updated the app-side macOS wizard and copy to cover macOS services and stale
  browser sessions instead of blaming only Image Capture.
- Updated the connection manager so macOS setup retries force a picker reopen
  with `autoSelectPaired: false`.
- Hardened failed WebUSB connection cleanup so partially opened transports/raw
  devices are closed.
- Hardened preset reads so the UI receives partial results, slot-level
  failures, and a timeout for stuck reads instead of staying indefinitely on
  "Reading custom slots from the camera."
- Documented the incident, commands, restore path, app boundary, and test
  checklist in
  [`docs/qa/macos-webusb-camera-release.md`](./docs/qa/macos-webusb-camera-release.md).
- Follow-up: an X-T20 can now reach the connected/no-slots state, which should
  be investigated as a legacy model preset-read capability issue rather than a
  macOS release failure.

## 2026-05-05 — Latent 0.1.0 hardware-backed alpha

Latent `0.1.0` was tagged after the rename, repo flattening, camera-flow
work, RAF preview work, launch documentation, and UI polish. This makes Phase
4 alpha-complete, advances Phase 6, and starts Phase 7 launch work.

- Camera connection stability moved into `@latent/camera-connection`, with
  explicit connection states, structured error classification, stale-session
  cleanup, reconnect handling, and macOS PTP claim-collision guidance.
- Recipe library expanded beyond the Phase 3 shell: import/export, delete,
  factory default restore, camera imports, deduplication, rename persistence,
  and local-only storage behavior are implemented and tested.
- Recipe creator is implemented in the web app: users can start from
  photographic intents, duplicate an existing look, edit schema-backed Fuji
  settings, save into the local library, and export validated JSON without
  connecting hardware.
- Custom-slot flows are implemented for the verified field set: read camera
  C1-C4 presets, import them as recipes/backups, write recipes to selected
  slots, verify writes, and restore previously imported backups.
- RAF preview workspace is implemented: local RAF files can be rendered
  through the connected camera, with diagnostic parameter-group renders for
  investigating camera-output mismatches.
- Public OSS launch materials are in place: README/README.it, screenshots,
  onboarding, use cases, hardware test plan, launch checklist, governance
  files, GitHub templates, funding metadata, and FilmKit relationship docs.
- Hands-on hardware validation has focused on X-S20 and X-M5. Other Fujifilm
  bodies remain community-report territory until the hardware checklist is
  run against them.

Remaining V1 work after `0.1.0`:

- Phase 5: replace the `@latent/ai-agent` stub with the real AI helper, or
  explicitly defer it from the public V1 launch.
- Phase 6: finish WCAG 2.2 AA audit and production CSP validation.
- Phase 7: finish ADRs, trademark review, final seed list, release checklist,
  and deploy path.
- Hardware QA: collect repeatable reports beyond X-S20/X-M5 and keep the
  write whitelist narrow until fields are proven on real bodies.

## 2026-05-04 — Rename to Latent + repo restructure

End-of-session bookkeeping: project renamed from FilmFork to Latent,
monorepo flattened from `filmfork-app/` umbrella to root, OSS governance
files added (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, GOVERNANCE),
GitHub community templates added (issues, PR, CODEOWNERS, dependabot).

- 4 commits: flatten, docs restructure, governance, GitHub community
- All `@filmfork/*` packages renamed to `@latent/*`; `FilmForkError`
  renamed to `LatentError`; user-facing strings (titles, error
  messages, i18n) updated; localStorage key `filmfork-favorites-v1`
  renamed to `latent-favorites-v1`
- Historical artifacts (`docs/specs/`, `docs/plans/`, `docs/reviews/`)
  preserve the project's prior names ("fujicomp", "FilmFork") as
  honest archive rather than retroactive rewrite
- `filmkit/` reference repo remains gitignored at the project root

## 2026-05-04 — Phase 1 in progress

Scaffolded monorepo. Initialized recipe-schema and ptp-fuji packages. CI gates green.

## 2026-05-04 — Phase 1 complete

- Monorepo bootstrapped at the repo root/
- @filmfork/recipe-schema: Recipe + TasteProfile (R5) + capability matrix loader + recipe diff (R5, en+it) + schema migrations + AmbiencePriority codec test (NL1 R3)
- @filmfork/ptp-fuji: forked filmkit at pinned commit, PtpTransport DI, FujiCameraSession with state machine, typed error taxonomy (§6.9), AbortSignal propagation, FakeTransport test helper
- @filmfork/ptp-fuji-webusb + @filmfork/ai-agent: stub packages locked
- Schema↔translator lockstep CI gate (Codex risk #1) green
- license-check + lint + typecheck + tests all green

Phase 2 next: WebUSB transport + X-S20 hardware validation rig.

## 2026-05-04 — Phase 2-min complete (overnight subagent-driven session)

`@filmfork/ptp-fuji-webusb` upgraded from stub to working WebUSB transport.

- `WebUsbPtpTransport` implements the `PtpTransport` interface from `@filmfork/ptp-fuji` over `navigator.usb` bulk transfers (chunked 512KB, AbortSignal-aware)
- `requestFujiCamera()` — Fuji vendor filter (0x04CB), USB interface claim, endpoint discovery, full typed-error surface (`WebUSBSecureContextRequired` / `WebUSBUnsupported` / `UsbPermissionDenied` / `UsbDisconnect`)
- `getAlreadyPairedFujiCameras()` — soft reconnect after first pairing
- `connectAndReadPresets()` — high-level convenience wrapper used by the web app
- Tests with mocked `navigator.usb` and `USBDevice` cover transport I/O, abort, error categories, claim/release lifecycle (19 tests, all green)

5 commits, no hardware required for this phase. First real X-S20 round-trip happens in Phase 2-full when the validation rig (Codex risk #2) is built.

## 2026-05-04 — Phase 3-base complete (overnight subagent-driven session)

Web app shell at `apps/web/` with recipe library + camera connect. Visible/demonstrable surface.

- Vite + React 19 + TypeScript strict + Tailwind v4 + Zustand + Vitest + jsdom
- 12 original seed recipes (`data/seed-recipes.json`) covering Classic Chrome, Classic Negative, Velvia, Acros B&W, Eterna Cinema, Nostalgic Neg, Pro Neg Std variants — all `capabilitySetId: "x-s20-fw1.10"`, all schema-validated
- Recipe library: search, film-sim filter, favorites with localStorage persistence (`filmfork-favorites-v1`), grid layout, dark editorial theme
- Recipe detail: full parameter table, copy-as-JSON, camera-setup walkthrough toggle
- Camera connect: WebUSB picker via `connectAndReadPresets()`, idle / connecting / connected / error states with category-keyed recovery copy
- Bilingual EN + IT i18n with `navigator.language` detection (50+ message keys, no react-intl complexity)
- Browser-safe entry point added to `@filmfork/recipe-schema/browser` to keep `node:fs/promises` out of the Vite bundle

8 commits. 16 new tests on the web app (RecipeLibrary, RecipeDetail, CameraConnect, recipes store) — total 80 tests across the monorepo, all green. Validate green (lint + typecheck + tests + license-check + schema↔translator lockstep gate).

`cd apps/web && npm run dev` boots Vite at http://localhost:5173 and serves the working app.

### What's deferred (Phase 4 + 5 + 6, hardware-and-time-dependent)

- Push recipe to camera with transactional verified backup (§6.3 — needs hardware validation)
- Camera-side live preview via Fuji vendor opcodes (§6.4 — needs RAF round-trip on X-S20)
- AI agent with five modes + iteration loop + structured reasoning + EXIF strip (§6.7, §7 — needs Anthropic API key)
- Recipe diff UI (deterministic translator already exists in `recipe-schema/src/diff/`; UI wire-up is small, deferred to compare flow)
- URL share + recipe genealogy (§6.5)
- macOS beta workaround docs polish (§10)
- WCAG 2.2 AA audit (§12)
- All §15.9-15.16 ADRs

### Overnight session totals (2026-05-03 to 2026-05-04)

- 38 commits across Phase 1 + Phase 2-min + Phase 3-base since the spec/plan baseline
- 80 unit tests across 4 packages and the web app, all green
- Validate green (lint, typecheck, test, license-check, lockstep-check)
- Working web app at `apps/web/` boots and renders
- Foundation rock-solid for Phase 4+5 hardware + AI work

Next session: Phase 4 (camera flows + iteration loop UI) + Phase 5 (AI agent), best executed with the user's X-S20 connected for real round-trip validation.
