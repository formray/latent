# Changelog

All notable changes are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
follows [SemVer](https://semver.org/) starting from V1.0.0 (Phase 7
launch).

## [Unreleased]

### Added

- Self-contained recipe URL share links that import and select a recipe from
  `?share=...#library`, excluding structured reasoning from the shared payload.
- Recipe genealogy display in the detail metadata for recipes derived from a
  parent recipe.
- macOS WebUSB camera release runbook covering `ptpcamerad`, `icdd`, stale
  Chromium WebUSB sessions, clean-profile recovery, restore commands, and
  verification steps.

### Fixed

- macOS camera claim-collision recovery now points at both macOS camera daemons
  and stale browser sessions instead of only Image Capture.
- macOS setup retry now reopens the WebUSB picker instead of silently reusing a
  stale paired device.
- macOS setup copy now includes a camera power-cycle step, and advanced setup
  suspends live camera daemons because `launchctl disable` can leave existing
  processes running.
- Optional local macOS camera helper can expose daemon status plus one-click
  release/restore actions to the setup wizard during hardware QA.
- Failed WebUSB connect attempts now clean up partially opened transports or raw
  USB devices.
- Camera slot reads now emit partial results and slot-level failures, with a
  timeout for stuck slots instead of leaving the UI indefinitely in the scanning
  state.

## [0.1.0] - 2026-05-05

### Changed

- **Project renamed `FilmFork` → `Latent`** (2026-05-04). All `@filmfork/*`
  packages renamed to `@latent/*`; `FilmForkError` renamed to `LatentError`.
  Historical references (`docs/specs/`, `docs/plans/`, `docs/reviews/`)
  preserve the prior name.
- **Repo restructured to standard OSS monorepo layout** (2026-05-04). The
  former `filmfork-app/` umbrella subdirectory has been promoted to root.
  Git history preserved via rename detection.

### Added

- OSS governance: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor
  Covenant 2.1), `SECURITY.md`, `GOVERNANCE.md`
- GitHub community: issue templates (bug, feature, config), PR template,
  `CODEOWNERS`, `FUNDING.yml`, `dependabot.yml`
- `docs/adr/` for forthcoming Architecture Decision Records (§15.9–15.16
  in the V1 spec)
- Camera connection stability layer with explicit connection states,
  structured error classification, stale-session cleanup, and macOS
  claim-collision guidance.
- Camera recipe read/import/write flows for verified custom-slot properties.
- RAF preview workspace that renders local RAF files through the connected
  camera and includes diagnostic parameter-group renders.
- Open-source readiness docs: contributor onboarding, use cases, and launch
  checklist.

### Fixed

- Refresh/reconnect handling no longer leaves the browser UI stuck in a
  generic disconnected state for known camera failure paths.
- The public docs now use the Latent package names and current camera/RAF
  workflow scope.

## Pre-rename history (under "FilmFork")

### Phase 3-base — 2026-05-04

- Web app shell at `apps/web/`: Vite + React 19 + Tailwind v4 + Zustand
- 12 seed recipes, recipe library with search and filters and favorites,
  recipe detail with copy-as-JSON, camera connect via WebUSB with
  full error recovery, EN+IT i18n with `navigator.language` detection
- Browser-safe entry point added to `@latent/recipe-schema/browser`

### Phase 2-min — 2026-05-04

- `@latent/ptp-fuji-webusb`: WebUSB transport implementing PtpTransport
  with chunked 512KB transfers, AbortSignal propagation, full typed
  error surface (`WebUSBSecureContextRequired`, `WebUSBUnsupported`,
  `UsbPermissionDenied`, `UsbDisconnect`)
- 19 tests against mocked `navigator.usb` and `USBDevice`

### Phase 1 — 2026-05-04

- Monorepo bootstrap, `@latent/recipe-schema` (Recipe, TasteProfile,
  capability matrix, diff with EN+IT, schema migrations,
  AmbiencePriority codec), `@latent/ptp-fuji` (forked from filmkit at
  pinned commit, DI-ready transport, state machine, typed error
  taxonomy, `FakeTransport` test helper)
- Schema↔translator lockstep CI gate
