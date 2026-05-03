# Progress

## 2026-05-04 — Phase 1 in progress

Scaffolded monorepo. Initialized recipe-schema and ptp-fuji packages. CI gates green.

## 2026-05-04 — Phase 1 complete

- Monorepo bootstrapped at ~/fuji-comp/filmfork-app/
- @filmfork/recipe-schema: Recipe + TasteProfile (R5) + capability matrix loader + recipe diff (R5, en+it) + schema migrations + AmbiencePriority codec test (NL1 R3)
- @filmfork/ptp-fuji: forked filmkit at pinned commit, PtpTransport DI, FujiCameraSession with state machine, typed error taxonomy (§6.9), AbortSignal propagation, FakeTransport test helper
- @filmfork/ptp-fuji-webusb + @filmfork/ai-agent: stub packages locked
- Schema↔translator lockstep CI gate (Codex risk #1) green
- license-check + lint + typecheck + tests all green

Phase 2 next: WebUSB transport + X-S20 hardware validation rig.
