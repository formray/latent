# Progress

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
