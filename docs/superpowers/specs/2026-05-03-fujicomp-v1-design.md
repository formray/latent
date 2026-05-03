# FujiComp V1 — Design Spec

**Status:** Draft awaiting user review
**Date:** 2026-05-03
**Author:** Giuseppe Albrizio + Claude (brainstorming session)
**Project codename:** FujiComp (final naming TBD — see Open Questions §15)

---

## 1. Vision

An open-source platform for Fujifilm photographers to discover, create, and apply film simulation recipes. Differentiated from existing tools (fujilab.vercel.app, fuji-x-weekly, FUJISTYLE) by four properties working together:

1. **AI agent** that generates recipes from photo references or natural-language vibes, with multi-turn refinement and per-parameter reasoning
2. **Direct browser-to-camera push** via WebUSB — zero install for V1
3. **Camera-side live preview** — the camera itself processes the JPEG with the recipe applied, returning pixel-accurate output (not a WebGL approximation)
4. **Open recipe spec** with provenance — fork tree, attribution, remix lineage encoded in the format

V1 success criteria: recipe library + AI generator + push to camera + camera-side preview, deployed publicly, validated working on Fujifilm X-S20 (already confirmed during validation session 2026-05-03). Public launch in 8-10 weeks.

---

## 2. Scope

### In V1

| Capability | Detail |
|---|---|
| Recipe library | Browse, filter (by film sim, camera generation, mood tags), search, share via URL hash, favorites |
| Recipe detail view | All settings rendered with validation per camera model + camera setup walkthrough |
| AI Recipe Agent | Multi-turn dialog from text vibe or reference photo, structured Recipe JSON via Claude tool use, per-parameter reasoning, critique mode on user's photos |
| WebUSB connect | Chrome/Edge desktop, Chrome Android via OTG; Fuji vendor filter (0x04CB) |
| Read presets | C1-C7 or C1-C4 depending on body |
| Push to camera | Translate Recipe JSON to FP1-equivalent property writes via PTP `SetDevicePropValue` |
| Camera-side preview | Send RAF + recipe → camera processes → download JPEG, side-by-side or split-slider |
| Recipe genealogy | Parent-child fork attribution stored in Recipe JSON |
| Open spec | `.ffr.json` — versioned, validated, lossless |
| Camera compatibility matrix | Per-body parameter availability in `data/camera-models.json` |

### Out of V1

| Deferred | Why | Target |
|---|---|---|
| iOS support | Safari has no WebUSB | Document SD card / FP1 fallback in V1 docs |
| Tauri desktop wrapper | Big surface, deserves its own milestone | V2 |
| macOS native helper for `ptpcamerad` | Manual workaround documented in V1 | V2 |
| Authenticated community sharing / accounts | Backend, auth, moderation | V2 |
| WebGL preview without camera connected | Adds complexity, "approximation" caveat conflicts with our positioning | V2 |
| WASM perf crates (RAF, FP1) | Premature optimization | V3 |
| `fuji-cli` Rust CLI | Power-user nice-to-have | V3 |

---

## 3. Stack & rationale

Locked decision (rationale captured during brainstorming):

| Layer | Tool | Why |
|---|---|---|
| Frontend framework | React 19 | Formray standard (module 12) |
| Language | TypeScript strict | Formray standard, ecosystem fit, WebUSB requires JS runtime |
| Build tool | Vite | Formray standard for SPAs |
| Styling | Tailwind CSS v4 | Formray standard |
| State | Zustand | Formray standard |
| Validation | Zod | Formray standard |
| Testing | Vitest + Testing Library | Formray standard |
| AI client | `@anthropic-ai/sdk` | Official Anthropic SDK |
| Package manager | npm | Formray standard |
| PTP layer | Fork of filmkit (MIT) → `@fujicomp/ptp-fuji` | Validated working, MIT license, TypeScript-native |
| App license | AGPL-3.0 | Formray default |
| Library license | MIT | Formray standard for extractable libraries |

Why **not** Rust for V1:

1. WebUSB is exposed only by JavaScript (`navigator.usb`); Rust→WASM cannot call it directly without a JS shim, removing any nominal advantage
2. filmkit's protocol implementation is TypeScript and already validated on the user's hardware — porting to Rust would discard 6 months of community RE for no functional gain
3. Formray's stack matrix (module 12) maps web frontend → React + TypeScript. Native desktop → Tauri + Rust + React. We use both, in the right places.

Rust earns its place in V2 (Tauri desktop wrapper) and V3 (WASM perf crates, `fuji-cli`), not V1.

---

## 4. Repository & monorepo structure

```
~/fuji-comp/
├── filmkit/                       # cloned reference, read-only, gitignored
├── docs/
│   └── superpowers/
│       ├── specs/                 # this design doc lives here
│       └── plans/                 # writing-plans output goes here
└── fujicomp-app/                  # the project (npm workspaces)
    ├── package.json               # workspaces root
    ├── tsconfig.base.json
    ├── apps/
    │   └── web/                   # Vite + React 19 + TS
    │       ├── src/
    │       │   ├── components/
    │       │   │   ├── ui/        # primitives (Button, Input, Slider...)
    │       │   │   └── features/  # library, editor, agent, camera, preview
    │       │   ├── stores/        # Zustand stores: recipes, camera, agent, ui
    │       │   ├── hooks/
    │       │   ├── lib/           # fetchers, URL hash codec, Anthropic client
    │       │   ├── pages/
    │       │   ├── types/
    │       │   └── main.tsx
    │       ├── public/
    │       ├── index.html
    │       └── vite.config.ts
    ├── packages/
    │   ├── ptp-fuji/              # MIT, fork of filmkit's PTP code
    │   │   ├── src/
    │   │   │   ├── ptp/
    │   │   │   ├── profile/
    │   │   │   └── index.ts
    │   │   ├── tests/
    │   │   ├── docs/protocol.md
    │   │   ├── LICENSE (MIT)
    │   │   ├── NOTICE
    │   │   └── package.json
    │   ├── recipe-schema/         # MIT, Zod schemas + FP1 codec
    │   │   ├── src/
    │   │   ├── tests/
    │   │   ├── LICENSE (MIT)
    │   │   └── package.json
    │   └── ai-agent/              # MIT, Claude API wrapper + prompts
    │       ├── src/
    │       ├── tests/
    │       ├── LICENSE (MIT)
    │       └── package.json
    ├── data/
    │   ├── seed-recipes.json      # curated initial library (~10-50)
    │   └── camera-models.json     # parameter matrix per body
    ├── docs/
    │   ├── ffr-format.md          # binary format reference
    │   ├── camera-compat.md       # tested cameras, known issues
    │   ├── ptpcamerad-workaround.md
    │   ├── architecture.md
    │   └── decisions/             # ADRs
    ├── .ops/                      # gitignored, formray module 04 pattern
    ├── .github/workflows/         # CI (lint, typecheck, test)
    ├── README.md
    ├── CHANGELOG.md
    ├── ROADMAP.md
    ├── PROGRESS.md
    ├── CLAUDE.md
    └── LICENSE                    # AGPL-3.0
```

Conventions:
- npm workspaces, all packages under `packages/`, all apps under `apps/`
- Path aliases: `@/*` for app source, package imports use real `@fujicomp/*` names
- No barrel exports
- Strict TS across every package, shared `tsconfig.base.json`

---

## 5. Data model — Recipe

```ts
// packages/recipe-schema/src/recipe.ts
import { z } from "zod";

export const FilmSimulation = z.enum([
  "ProviaStandard", "VelviaVivid", "AstiaSoft", "ClassicChrome",
  "ProNegHi", "ProNegStd", "ClassicNegative", "EternaCinema",
  "EternaBleachBypass", "AcrosStd", "AcrosYe", "AcrosR", "AcrosG",
  "Monochrome", "MonochromeYe", "MonochromeR", "MonochromeG", "Sepia",
  "NostalgicNeg", "RealaAce",
]);

export const TriState = z.enum(["Off", "Weak", "Strong"]);

export const Recipe = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  author: z.string().optional(),
  parentRecipeId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  cameraGeneration: z.enum(["X-Trans-IV", "X-Trans-V"]),

  filmSimulation: FilmSimulation,
  dynamicRange: z.enum(["DR100", "DR200", "DR400", "DRAuto"]),
  whiteBalance: z.object({
    mode: z.enum([
      "Auto", "Daylight", "Shade",
      "Fluorescent1", "Fluorescent2", "Fluorescent3",
      "Incandescent", "Underwater", "ColorTemperature",
    ]),
    colorTemperatureK: z.number().int().min(2500).max(10000).optional(),
    shiftR: z.number().int().min(-9).max(9),
    shiftB: z.number().int().min(-9).max(9),
  }),
  highlightTone: z.number().min(-2).max(4).step(0.5),
  shadowTone: z.number().min(-2).max(4).step(0.5),
  color: z.number().int().min(-4).max(4),
  sharpness: z.number().int().min(-4).max(4),
  noiseReduction: z.number().int().min(-4).max(4),
  clarity: z.number().int().min(-5).max(5),
  grainEffect: z.object({
    strength: TriState,
    size: z.enum(["Small", "Large"]),
  }),
  colorChromeEffect: TriState,
  colorChromeEffectBlue: TriState,
  smoothSkinEffect: TriState.optional(),

  reasoning: z.array(z.object({
    parameter: z.string(),
    explanation: z.string(),
  })).optional(),
});

export type Recipe = z.infer<typeof Recipe>;
```

Notes:
- Schema versioned (`schemaVersion: 1`) so future migrations are safe
- All ranges match real Fujifilm camera limits, not arbitrary
- `parentRecipeId` enables genealogy without a backend
- `reasoning` is optional; AI-generated recipes populate it, manual ones don't
- Camera-specific subset of valid values lives in `data/camera-models.json`, not hardcoded into the Zod schema

---

## 6. Key flows

### 6.1 Connect camera

1. User clicks "Connect camera" button (visible only on browsers with WebUSB)
2. App calls `navigator.usb.requestDevice({ filters: [{ vendorId: 0x04CB }] })`
3. On macOS, app shows a banner before opening the picker: "macOS may block the camera. If pairing fails, run `sudo killall -9 ptpcamerad` and click Connect again within 1 second" + copy-button
4. After pairing, `@fujicomp/ptp-fuji` runs OpenSession → GetDeviceInfo → reads C1-Cn presets
5. Camera model identified, parameter matrix loaded from `camera-models.json`
6. Active recipes loaded into `useCameraStore`

### 6.2 AI recipe generation

1. User opens AI Agent panel: text input + photo drop zone
2. User submits prompt (text and/or image)
3. App calls Claude Sonnet 4.6 with the Recipe schema as a tool, vision input if image present
4. Streamed response: reasoning text + tool call payload
5. Recipe parsed and validated via Zod
6. Multi-turn refinement: user types follow-up ("more shadow detail"), agent iterates on previous Recipe
7. User can edit any parameter manually mid-iteration, see updated preview, save to library
8. Persona snippets stored in localStorage, injected into system prompt next session

### 6.3 Push recipe to camera

1. User selects a recipe and a target slot (C1-C4 on X-S20, C1-C7 on bigger bodies)
2. `recipe-schema` translates Recipe JSON to filmkit-style profile patch (D185 byte map)
3. App writes via PTP: `SetDevicePropValue(D18C, slot)` → patches via `SetDevicePropValue(D18E..D1A5, ...)` → renames slot via `SetDevicePropValue(D18D, name)`
4. Progress indicator: "Writing slot C2... 7/24 properties"
5. On success: "Recipe is now in slot C2. Switch your camera dial to C2 to use it."
6. On failure: rollback to previous slot values (we read them first)

### 6.4 Camera-side live preview

1. User drops a `.RAF` file onto the preview pane
2. App calls PTP `SendObjectInfo` + `SendObject` to upload the RAF as a temporary object
3. App reads current D185 base profile, patches with the active recipe's fields
4. App calls `SetDevicePropValue(D185, patchedProfile)` then triggers conversion via `SetDevicePropValue(D183, 0)`
5. App polls `GetObjectHandles` until the result JPEG appears
6. App downloads via `GetObject`, displays side-by-side with the original
7. Cleanup: `DeleteObject` on the temporary objects

This is the killer feature — the JPEG is exactly what the camera would have produced shooting with this recipe. Not a LUT approximation.

### 6.5 Share recipe via URL

1. User clicks Share on a recipe
2. App serializes Recipe JSON, zlib-compresses, base64url-encodes, builds URL: `https://fujicomp.io/#r/<encoded>`
3. Recipient opens URL → app decodes, validates via Zod, offers "Save to library"
4. If recipient saves a fork, the new recipe sets `parentRecipeId` to the original

URL hash chosen so the recipe payload never hits a server. Compression keeps URLs under typical limits (~1KB encoded for a full Recipe).

---

## 7. AI agent design

V1 capabilities:

| Mode | Input | Output |
|---|---|---|
| **One-shot from vibe** | Text only | Recipe + reasoning per parameter |
| **One-shot from reference** | Photo (vision input) | Recipe matching the look + reasoning |
| **Multi-turn refinement** | Previous Recipe + follow-up text | Adjusted Recipe + delta explanation |
| **Critique mode** | Recipe + user photos shot with it | Suggested tweaks + reasoning |
| **Persona-aware** | Same as above + localStorage history | Recipe biased toward user's expressed preferences |

Implementation:
- System prompt template per mode (`packages/ai-agent/src/prompts/`)
- Tool use: single tool `proposeRecipe` with the Recipe schema as input schema
- Vision: pass image bytes to Claude when present
- Streaming: token-by-token reasoning displayed live; final tool call materializes the Recipe atomically
- Persona: rolling buffer of last N edits + explicit user-saved preferences ("I shoot mostly portraits", "I dislike strong grain")
- Default model: `claude-sonnet-4-6` for cost+quality; "Deep critique" mode uses `claude-opus-4-7` for higher reasoning depth

V2: cross-session persona (with auth), reference library lookup ("make it like Daido Moriyama" → search known references → synthesize), agent memory of community recipes the user liked.

---

## 8. PTP layer extraction strategy

filmkit (MIT) is the foundation. Its TypeScript PTP code (~1500 LOC across `src/ptp/*.ts` + `src/profile/*.ts`) is already validated against the user's X-S20.

Strategy:

1. Copy filmkit's `src/ptp/`, `src/profile/`, `src/util/binary.ts` into `packages/ptp-fuji/src/`
2. Add `LICENSE` (MIT), `NOTICE` crediting eggricesoy and the upstream RE chain (rawji, fudge, libgphoto2, ISO 15740)
3. Repackage as `@fujicomp/ptp-fuji` with a typed public API:
   ```ts
   class FujiCamera {
     static async requestDevice(): Promise<FujiCamera>;
     async getDeviceInfo(): Promise<DeviceInfo>;
     async getPreset(slot: number): Promise<RawPreset>;
     async setPreset(slot: number, preset: RawPreset): Promise<void>;
     async convertRaf(raf: ArrayBuffer, profile: ProfileBytes): Promise<Blob>;
     async close(): Promise<void>;
   }
   ```
4. Thin recipe-translate layer in `packages/recipe-schema/src/translate/` maps Recipe ↔ RawPreset
5. Vitest tests: PTP container pack/unpack, profile field encoding, edge cases (HighIsoNR non-linear table, monochrome film sim restrictions, ColorTemperature requires WB=ColorTemp)
6. Document the protocol in `packages/ptp-fuji/docs/protocol.md` linking filmkit's `QUICK_REFERENCE.md`
7. Upstream tracking: a small script (`scripts/check-filmkit-upstream.ts`) that diffs our copy against latest filmkit release and surfaces deltas. Run weekly, manual merge when relevant. Filmkit upstream does not accept PRs, so this is one-way.

License compatibility:
- filmkit is MIT → we can fork with attribution
- Our app is AGPL-3.0 → fine, MIT is upstream-compatible
- Our `@fujicomp/ptp-fuji` package is MIT → keeps it usable by other future Fuji tools (community goal)

---

## 9. Camera compatibility approach

Single source of truth: `data/camera-models.json`.

```jsonc
{
  "X-S20": {
    "usbProductId": "0x02F7",
    "generation": "X-Trans-IV",
    "customSlots": 4,
    "parameters": {
      "filmSimulation": [...],
      "dynamicRange": ["DR100", "DR200", "DR400", "DRAuto"],
      "highlightTone": { "min": -2, "max": 4, "step": 0.5 },
      "clarity": { "min": -5, "max": 5, "step": 1 },
      "colorChromeEffect": ["Off", "Weak", "Strong"],
      "colorChromeEffectBlue": ["Off", "Weak", "Strong"]
    },
    "tested": true,
    "knownIssues": []
  },
  "X-M5": {
    "usbProductId": "TBD",
    "tested": false,
    "knownIssues": ["Untested — pending hardware verification"]
  }
}
```

Behavior:
- Camera connect → `GetDeviceInfo` → match by product ID → load matrix
- Recipe Editor greys out parameters not in the matrix
- Recipes from other cameras: visible but Editor warns "uses parameters your camera does not support"
- Unknown camera: app shows "We have not tested this camera. Connect at your own risk." + link to compatibility issue tracker

New camera support workflow (community contribution):
1. Issue: "Add support for X-T50"
2. Contributor captures Wireshark traffic with Fuji X RAW Studio (per filmkit README)
3. Submit `.pcapng` + matrix entry as PR
4. Maintainer reviews, merges

---

## 10. ptpcamerad workaround for V1

V1 ships with the manual workaround documented and assisted in-app:

- On first connect attempt, app detects macOS via UA
- Shows instruction card with copy-button: "macOS will block this. Run `sudo killall -9 ptpcamerad` in Terminal, then click Connect within 1 second."
- On repeated failure (3+ attempts), escalates: "If this keeps failing, we have a more detailed guide here →" linking to `docs/ptpcamerad-workaround.md`
- Adds dock icon visual cue: small badge while expecting connection

Doc covers:
- What `ptpcamerad` is and why it interferes
- The kill command
- Why we don't auto-disable it (security/permissions)
- "If this is a deal-breaker, V2 will ship a signed helper that solves this permanently"

V2 plan:
- Tauri 2.0 helper, Developer ID signed + notarized via formray module 13
- Listens on localhost WebSocket
- On request: `launchctl unload com.apple.PTPCamera`, holds offline for the session
- On disconnect: `launchctl load` to restore
- Web app auto-detects helper at `ws://localhost:7777` and uses it transparently

---

## 11. Security & privacy

| Concern | V1 posture |
|---|---|
| Accounts | None |
| Telemetry | None |
| Tracking / analytics | None |
| Storage | localStorage only (favorites, persona snippets, last-seen version, AI API key) |
| WebUSB | HTTPS-only, user gesture per session, vendor-filtered to Fujifilm only |
| AI calls | User's own Anthropic API key in V1 (entered once, stored in localStorage). Future: managed proxy as a community sustainability path |
| Image data | RAF round-trips camera→browser→camera, never hits our servers |
| URL share | Recipe payload only, no user identifiers |
| External fonts | Self-hosted (Inter or Geist via npm) — no Google Fonts |

Threat model for V1: malicious recipe URL → user opens → app decodes invalid JSON → Zod rejects, no execution. We never `eval` recipe content. WebUSB is sandboxed by browser. AI prompts are user-entered, not injected from external sources in V1.

---

## 12. Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (`recipe-schema`) | Vitest | 100% on parsers/codecs, edge cases per parameter, JSON ↔ FP1 round-trip |
| Unit (`ptp-fuji`) | Vitest | Container pack/unpack, profile patch, encoding tables (HighIsoNR, monochrome restrictions), error paths |
| Unit (`ai-agent`) | Vitest with mocked Claude | Prompt construction, tool call schema, recipe validation post-response |
| Component (web) | Testing Library | Library filter/search, Recipe editor parameter validation, Camera connect button states |
| Integration (real camera) | Manual smoke checklist | Pre-release: connect X-S20, read C1-C4, write to C2, camera-side preview, AI generate |
| Performance | Lighthouse CI | PWA ≥ 95, Performance ≥ 90, Accessibility ≥ 95 |
| Type safety | `tsc --noEmit` in CI | Zero errors, strict mode |
| Lint | ESLint + Prettier | Zero warnings in CI |

Integration tests with real cameras are deferred to V2 (CI hardware is impractical solo).

---

## 13. License & attribution

| Artifact | License |
|---|---|
| `apps/web` (the FujiComp app) | AGPL-3.0 (formray default for products) |
| `packages/ptp-fuji` | MIT (matches filmkit upstream) |
| `packages/recipe-schema` | MIT (so other Fuji tools can use it) |
| `packages/ai-agent` | MIT |
| `data/seed-recipes.json` entries | per-recipe attribution; only ship recipes with explicit permission or original work |

Attribution practice:
- `packages/ptp-fuji/NOTICE` credits filmkit + RE chain
- README acknowledges the Fuji X Weekly community
- Each seed recipe includes `author` field linking to source
- Contributors agree to MIT for library packages, AGPL-3.0 for app contributions (DCO sign-off)

---

## 14. V2 / V3 roadmap (notes only, not in V1)

**V2 — Tauri desktop wrapper + community library** (~4-8 weeks after V1 ships):
- Tauri 2.0 wraps the same React UI; Rust backend uses libusb directly (no WebUSB constraints)
- Auto-managed `ptpcamerad` (launchctl unload/load lifecycle)
- Background camera watch — auto-pull settings on connect
- Filesystem integration: watch a drop folder for RAFs
- Distribution: signed + notarized .pkg via formray module 13 build pipeline
- Community library: Postgres via Supabase managed hosting, accessed via direct postgres client (not Supabase SDK), custom JWT auth
- Recipe genealogy graph queries
- WebGL approximation preview for browser-only no-camera users

**V3 — Performance, CLI, mobile fallback** (~3-6 months out):
- WASM crates: RAF parsing, FP1 binary codec written in Rust, called from React via wasm-bindgen
- `fuji-cli` (Rust + clap): scripting recipe push from terminal, batch operations
- iOS-friendly fallback via SD card "Save/Load Custom Settings" using FP1 export — no WebUSB needed, works on every camera and OS

---

## 15. Open questions (must resolve before locking the implementation plan)

1. **X-M5 protocol coverage.** Filmkit is X100VI-tested; our X-S20 confirmation extends to X-Trans-IV recent bodies. X-M5 is even newer and may have new properties (e.g., new film simulations). Resolution: connect X-M5 in the next session, run filmkit, document deltas.
2. **Recipe seed list licensing.** Bundling recipes from fuji-x-weekly without explicit permission is risky. Default safe path: ship ~10 original/explicitly-permitted recipes; everything else via community PR with author attribution. Need to reach out to Ritchie Roesch (Fuji X Weekly) and similar community sources before launch.
3. **AI API key UX.** User-provided key in V1 is privacy-clean but high friction. Alternative: optional managed proxy with rate limit (Vercel function or similar) for casual users; bring-your-own-key for power users. This adds backend surface to V1 — defer or include?
4. **PWA installable + offline mode.** Service worker scope, offline recipe library cache. Recommend: ship as installable PWA in V1, no offline for now, add full offline in V2.
5. **Project name.** "FujiComp" reads as Composition or Computer. Alternatives: FujiPress, RecipeForge, FujiCast, FilmFork. Decision needed before public assets are made.
6. **Anthropic model defaults.** Sonnet 4.6 for default cost/quality, Opus 4.7 for "deep critique" mode. Document the cost-per-recipe tradeoff in user-facing docs.
7. **Hosting.** Vercel (formray standard for frontends per module 12) or self-host on Cloudflare Pages? Vercel preferred unless cost is a concern.
8. **Domain.** `fujicomp.io`, `fujicomp.dev`, or under `formray.io/fujicomp`? Branding decision.

---

## 16. Acceptance — what "V1 done" looks like

Concrete checklist for declaring V1 shippable:

- [ ] Monorepo scaffolded per §4
- [ ] `@fujicomp/ptp-fuji` extracted from filmkit, tests passing, X-S20 round-trip verified
- [ ] `@fujicomp/recipe-schema` complete with Zod schemas + FP1 codec + tests
- [ ] `@fujicomp/ai-agent` complete with all 5 modes (§7), tests with mocked Claude
- [ ] Web app: library, detail view, editor, AI panel, camera panel, preview pane all functional
- [ ] X-S20 manual smoke checklist passes end-to-end (connect, read, write, preview, AI generate)
- [ ] X-M5 tested and documented (works or known-issue list)
- [ ] Lighthouse: PWA ≥ 95, Perf ≥ 90, A11y ≥ 95
- [ ] CI green: lint + typecheck + test
- [ ] Docs complete: README, ROADMAP, CHANGELOG, PROGRESS, ptpcamerad-workaround, ffr-format, camera-compat, decisions
- [ ] Public deploy live with HTTPS
- [ ] LICENSE + NOTICE files in place per §13
- [ ] Open questions §15 resolved (or explicitly marked deferred to V2)

---

*End of design spec. Awaiting user review before invoking `superpowers:writing-plans`.*
