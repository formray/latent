# FilmFork V1 — Phase 1 Implementation Plan: Foundation & Core Packages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the monorepo foundation at `~/fuji-comp/filmfork-app/` with two production-ready core packages (`@filmfork/recipe-schema`, `@filmfork/ptp-fuji`) plus stubs for the remaining workspaces, full test coverage, the schema↔translator lockstep CI gate, and the initial documentation set. Output is testable in pure Node — no browser, no hardware required.

**Architecture:** npm workspaces monorepo. Two functional packages in Phase 1: `recipe-schema` (Zod schemas + capability matrix loader + camera-property translator + migration scaffolding) and `ptp-fuji` (pure-protocol fork of filmkit with PtpTransport DI, typed errors, AbortSignal). Two stub packages to lock workspace names: `ptp-fuji-webusb`, `ai-agent`. All packages MIT licensed; only `ptp-fuji` ships a NOTICE for filmkit attribution. CI gate enforces that every Recipe schema field is in the `writableSlotProperties` whitelist of every capability set (Codex risk #1).

**Tech Stack:** Node 22 LTS, TypeScript 5.7 strict, Vitest, Zod 4, npm workspaces, ESLint, Prettier, license-checker.

---

## Scope: Phase 1 of 7

This plan covers Phase 1 only. The full implementation is split across 7 phases, each producing testable output:

| Phase | Output | Target weeks |
|---|---|---|
| **1: Foundation & Core Packages (this plan)** | Monorepo + `recipe-schema` + `ptp-fuji` core + CI gates | 1-2 |
| 2: WebUSB Transport + Hardware Validation Rig | `ptp-fuji-webusb` + X-S20 round-trip + reproducible rig | 3-4 |
| 3: Web App Shell + Recipe Library | Vite/React/Tailwind/i18n + library/detail/editor pages | 4-5 |
| 4: Camera Flows + WebUSB UX | Connect, push, preview, transactional backup, error UX per category | 5-7 |
| 5: AI Agent | `ai-agent` + 5 modes + EXIF strip + confidence rubric + AI panel | 7-9 |
| 6: Polish | URL share, genealogy, export/import, diagnostic bundle, WCAG, CSP | 9-10 |
| 7: Launch | §15 ADRs, TM search, seed list, final smoke, deploy | 10-12 |

After Phase 1 ships and is reviewed, the user requests the Phase 2 plan via a fresh brainstorming → writing-plans cycle.

**Codex-flagged risks Phase 1 must explicitly address:**
- Risk #1 (schema↔translator lockstep) — implemented as a CI gate in Task 18
- Risk #3 (typed errors as first-class concept) — implemented in Task 13 (taxonomy in code, UX wiring in Phase 4)
- Risk #2 (X-S20 reproducible validation) — Phase 2 (hardware required)

---

## File structure created or modified by Phase 1

```
~/fuji-comp/
├── filmfork-app/                            (NEW)
│   ├── .nvmrc                               (NEW — node 22 LTS)
│   ├── .gitignore                           (NEW)
│   ├── .editorconfig                        (NEW)
│   ├── .eslintrc.cjs                        (NEW)
│   ├── .prettierrc                          (NEW)
│   ├── package.json                         (NEW — workspaces root)
│   ├── tsconfig.base.json                   (NEW — strict TS shared config)
│   ├── vitest.config.ts                     (NEW — root vitest config)
│   ├── README.md                            (NEW — English)
│   ├── README.it.md                         (NEW — Italian)
│   ├── ROADMAP.md                           (NEW)
│   ├── CHANGELOG.md                         (NEW)
│   ├── PROGRESS.md                          (NEW)
│   ├── local agent notes                            (NEW — project conventions)
│   ├── LICENSE                              (NEW — AGPL-3.0)
│   ├── .github/
│   │   └── workflows/
│   │       └── ci.yml                       (NEW — lint/typecheck/test/license/lockstep)
│   ├── scripts/
│   │   └── check-schema-translator-lockstep.ts  (NEW — Codex risk #1 CI gate)
│   ├── data/
│   │   └── camera-models.json               (NEW — X-S20 verified entry)
│   └── packages/
│       ├── recipe-schema/                   (NEW)
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   ├── LICENSE                      (MIT)
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   ├── recipe.ts                (Zod schemas — §5)
│       │   │   ├── capability.ts            (capability matrix loader)
│       │   │   ├── translate/
│       │   │   │   ├── index.ts
│       │   │   │   └── d18e-d1a5.ts         (Recipe ↔ camera-property bytes)
│       │   │   └── migrations/
│       │   │       └── index.ts             (v1→vN scaffolding)
│       │   └── tests/
│       │       ├── recipe.test.ts
│       │       ├── capability.test.ts
│       │       ├── translate.test.ts
│       │       ├── ambience-priority-codec.test.ts   (NL1 R3)
│       │       └── migrations.test.ts
│       ├── ptp-fuji/                        (NEW — fork of filmkit, MIT, with NOTICE)
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   ├── LICENSE                      (MIT)
│       │   ├── NOTICE                       (filmkit + RE chain)
│       │   ├── UPSTREAM                     (pinned filmkit commit SHA)
│       │   ├── docs/
│       │   │   └── protocol.md
│       │   ├── src/
│       │   │   ├── index.ts
│       │   │   ├── errors.ts                (typed taxonomy — §6.7)
│       │   │   ├── transport/
│       │   │   │   └── transport.ts         (PtpTransport interface)
│       │   │   ├── ptp/
│       │   │   │   ├── container.ts         (from filmkit, adapted)
│       │   │   │   ├── session.ts           (FujiCameraSession)
│       │   │   │   ├── transport.ts         (filmkit transport, refactored)
│       │   │   │   └── constants.ts
│       │   │   ├── profile/
│       │   │   │   ├── d185.ts              (from filmkit)
│       │   │   │   ├── enums.ts
│       │   │   │   └── preset-translate.ts
│       │   │   └── util/
│       │   │       └── binary.ts
│       │   └── tests/
│       │       ├── container.test.ts
│       │       ├── session.test.ts
│       │       ├── errors.test.ts
│       │       ├── abort.test.ts
│       │       └── fake-transport.ts
│       ├── ptp-fuji-webusb/                 (NEW — STUB, real impl in Phase 2)
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   ├── LICENSE                      (MIT)
│       │   ├── src/
│       │   │   └── index.ts                 (placeholder export + TODO marker)
│       │   └── tests/
│       │       └── stub.test.ts
│       └── ai-agent/                        (NEW — STUB, real impl in Phase 5)
│           ├── package.json
│           ├── tsconfig.json
│           ├── LICENSE                      (MIT)
│           ├── src/
│           │   └── index.ts
│           └── tests/
│               └── stub.test.ts
```

Files NOT touched in Phase 1: anything under `apps/`, `docs/decisions/` (Phase 7), `docs/privacy.md` (Phase 6), `docs/macos-beta.md` (Phase 4), `docs/browser-matrix.md` (Phase 6).

---

## Tasks

Continued in subsequent edits to this file.
