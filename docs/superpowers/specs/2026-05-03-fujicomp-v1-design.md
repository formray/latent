# FilmFork V1 — Design Spec (R5)

**Status:** Innovation pass on top of R4 (which converged after Codex R1+R2+R3 adversarial reviews)
**Date:** 2026-05-03 (R5 iteration, same day)
**Author:** Giuseppe Albrizio + Claude (brainstorming session)
**Project working title:** FilmFork (final naming subject to trademark check — see §15.5)
**Previous title:** FujiComp (deprecated due to trademark exposure with Fujifilm — see §15.5)

---

## 1. Vision

**FilmFork is not only a recipe browser; it is a camera-backed look lab for iterating toward a personal Fuji style.** Open-source web platform for photographers using Fujifilm cameras to discover, create, refine, and apply film simulation recipes — with the camera itself in the rendering loop and AI as an iteration assistant.

Differentiated from existing tools (fujilab.vercel.app, fuji-x-weekly, FUJISTYLE) by five properties working together:

1. **Camera-side iteration loop** (the headline V1 workflow) — load a RAF, get an AI-proposed starting recipe, the camera renders the real JPEG, the user gives natural-language feedback ("warmer", "less digital", "softer skin"), the AI changes only a small targeted set of parameters, the camera re-renders, the user compares iterations and saves the chosen version. The camera is the rendering engine; the AI is the assistant; the user is the editor.
2. **AI agent** that proposes a plausible starting recipe from a text vibe or reference photo, with multi-turn refinement, **structured per-parameter explanation** (visual effect, reason, risk) and a deterministic confidence rubric (see §7).
3. **Direct browser-to-camera push** via WebUSB on Linux, Windows, and Android Chrome (with OTG cable). macOS supported as an experimental/beta path in V1; first-class macOS support arrives in V2 via a signed native helper.
4. **Camera-side live preview + deterministic recipe diff** — the camera processes JPEGs with the recipe applied (pixel-accurate, not WebGL approximation); a rule-based diff translator turns parameter deltas between two recipes into human-readable visual impact ("WB shift +R/+B → warmer magenta cast", "Shadow −0.5 → more open shadows") so the user can compare AI iterations, forks, and before/after camera slots.
5. **Open creative-recipe spec + Local Taste Profile** — provenance with fork tree, attribution, remix lineage; an opt-in local-only Taste Profile (tone preference, grain tolerance, preferred film sims, shooting contexts) that the user inspects, edits, exports, and wipes — never leaves the browser unless they export it themselves.

V1 success criteria: recipe library + AI generator with iteration loop + recipe diff & comparison + push to camera (with verified backup/restore) + camera-side preview + Local Taste Profile (opt-in), deployed publicly, validated end-to-end on Fujifilm X-S20 (already confirmed during validation session 2026-05-03). Public launch in 10 weeks honest baseline, +2 weeks buffer.

---

## 2. Scope

### In V1

| Capability | Detail | Platform notes |
|---|---|---|
| Recipe library | Browse, filter (by film sim, capability set, mood tags), search, share via URL hash, favorites | All supported browsers |
| Recipe detail view | All settings rendered with validation per camera capability set + camera setup walkthrough | All |
| AI Recipe Agent | Multi-turn dialog from text vibe or reference photo, structured Recipe JSON via Claude tool use, **structured per-parameter explanation (visualEffect / reason / risk) + deterministic confidence rubric**, critique mode on user's photos | All |
| **Camera-side iteration loop** | Load RAF → AI proposes starting recipe → camera renders real JPEG → user gives natural-language feedback → AI changes a small targeted parameter set → camera re-renders → user compares and saves. Headline V1 workflow (see §6.7). | Connected camera required for render step |
| **Recipe diff & visual comparison** | Deterministic rule-based delta translator: given two recipes, returns parameter deltas annotated with human-readable visual impact ("WB shift +R/+B → warmer magenta cast"). Used for AI iterations, forks, before/after slot comparison. Not AI-generated; lookup-table-driven (see §6.8). | All |
| **Local Taste Profile (opt-in)** | Structured user preferences (tone, grain tolerance, preferred film sims, shooting contexts) stored locally only. Off by default. User can inspect, edit, export, and wipe. AI uses it as context only when explicitly enabled. TTL applies. Included in library export/import. | All |
| WebUSB connect | Chrome/Edge ≥ 122 desktop on Linux/Windows; macOS = experimental/beta; Chrome ≥ 122 on Android via OTG = experimental | See §9 + §10 |
| Read presets | C1-C7 or C1-C4 depending on body | All |
| Push to camera | Pre-flight checks → **transactional verified backup** of current slot to local storage → translate Recipe to property writes via PTP `SetDevicePropValue` → fail-loud on first error → manual "restore from backup" available **only when backup is verified complete and connection is healthy** | See §6.3 |
| Camera-side preview | Send RAF via Fuji vendor ops → camera processes → download JPEG, side-by-side or split-slider | See §6.4 |
| Recipe genealogy | Parent-child fork attribution stored in Recipe JSON | All |
| Open spec | `.ffr.json` — versioned creative-recipe format with capability metadata, restricted to filmkit-proven writable fields | All |
| Camera capability matrix | Per-body capability set with `writableSlotProperties` whitelist in `data/camera-models.json` (see §9) | All |
| Diagnostic bundle | Manual export of redacted local logs + browser/camera/firmware capture for issue reporting | All |
| Library import/export | Full export/import of user library JSON for portability and backup | All |
| Bilingual UI | English + Italian, with i18n architecture supporting more languages later | All |

### Out of V1 (explicitly deferred to V2 or later)

| Deferred | Why | Target |
|---|---|---|
| First-class macOS support | Requires signed/notarized native helper to manage `ptpcamerad` cleanly. Real engineering surface — not "in V1" honest. | V2 |
| Full atomic write rollback | PTP multi-property writes cannot be made atomic over USB. V1 uses verified backup + restore-on-demand instead. | Never (out by physics); backup/restore covers it |
| Lossless full-preset capture | Schema in V1 is creative-recipe subset of filmkit-proven writable fields. Full lossless capture (Image Size, Quality, Color Space, body-specific menus) requires per-body RE. | V2 if user demand justifies |
| **Recipe fields not yet proven slot-writable via filmkit** (D Range Priority, Dynamic Range Auto value, Long Exposure NR, Lens Modulation Optimizer, WB modes White Priority/Custom 1-3) | Listed in Fuji menus but filmkit's translator does not currently write them to C-slots. We do not ship recipe fields that we cannot actually push. | V2 — add per field as PTP-write proof is captured (Wireshark + verified round-trip) |
| Authenticated community sharing / accounts | Backend, auth, moderation surface. V1 = local + URL-based + import/export only. | V2 |
| Managed AI proxy | V1 = bring-your-own-key, session-only by default. Managed proxy with rate-limiting is a backend project. | V2 |
| WebGL approximation preview when no camera connected | Adds complexity and a "this is approximate" caveat conflicts with our positioning. V1 shows "camera required" state. | V2 |
| iOS support | Safari has no WebUSB. V1 documents SD card / FP1 fallback; no UI for it. | V3 (FP1 export path) |
| WASM perf crates (RAF, FP1) | Premature optimization. | V3 |
| `fuji-cli` Rust CLI | Power-user nice-to-have. | V3 |
| PWA offline mode | V1 ships installable PWA shell; no offline cache. Lighthouse PWA score is NOT a release blocker. | V2 |
| Automatic battery preflight | Filmkit does not currently expose battery property. V1 uses a manual confirmation gate. Auto-check upgradable in dev if the property is identified. | V1 if proven during dev, else V2 |

---

## 3. Stack & rationale

Locked decision (rationale captured during brainstorming, validated by adversarial review):

| Layer | Tool | Version pin policy |
|---|---|---|
| Runtime (CI/build) | Node.js 22 LTS | Exact in `.nvmrc`, `engines.node` in package.json |
| Frontend framework | React 19 (latest stable) | Exact in lockfile |
| Language | TypeScript ≥ 5.7, strict mode + `noUncheckedIndexedAccess`, `noImplicitReturns`, `exactOptionalPropertyTypes`, `forceConsistentCasingInFileNames` | Per formray module 12 |
| Build tool | Vite ≥ 6 | Exact in lockfile |
| Styling | Tailwind CSS v4 | Exact in lockfile |
| State | Zustand | Exact in lockfile |
| Validation | **Zod 4 (latest stable)** unless Anthropic tool-helper compatibility forces Zod 3 (document the exception in `docs/decisions/`) | Exact in lockfile |
| Testing | Vitest + Testing Library + jsdom | Exact in lockfile |
| AI client | `@anthropic-ai/sdk` (official) | Browser mode requires `dangerouslyAllowBrowser: true` per SDK docs, used only with explicit user consent |
| Package manager | npm | `package-lock.json` committed |
| PTP layer | Pinned-commit fork of filmkit (MIT) → `@filmfork/ptp-fuji` | See §8 for fork strategy |
| App license | AGPL-3.0 | Formray default |
| Library license | MIT | Formray standard for extractable libraries |

Why **not** Rust for V1 (decision unchanged from R1):

1. WebUSB is exposed only by JavaScript (`navigator.usb`); Rust→WASM cannot call it without a JS shim.
2. filmkit's protocol implementation is TypeScript and already validated on the user's hardware.
3. Formray's stack matrix (module 12) maps web frontend → React + TypeScript. Native desktop → Tauri + Rust + React. We use both, in the right places. V2 helper = Rust + Tauri.

---

## 4. Repository & monorepo structure

```
~/fuji-comp/
├── filmkit/                       # cloned reference, read-only, gitignored
├── docs/
│   └── superpowers/
│       ├── specs/                 # this design doc lives here
│       ├── plans/                 # writing-plans output goes here
│       ├── codex-review-prompt-r1.md
│       ├── codex-review-output-r1.md
│       ├── codex-review-prompt-r2.md
│       └── codex-review-output-r2.md
└── filmfork-app/                  # the project (npm workspaces)
    ├── package.json               # workspaces root
    ├── tsconfig.base.json
    ├── .nvmrc                     # node 22
    ├── apps/
    │   └── web/                   # Vite + React 19 + TS
    │       ├── src/
    │       │   ├── components/
    │       │   │   ├── ui/        # primitives
    │       │   │   └── features/  # library, editor, agent, camera, preview
    │       │   ├── stores/        # Zustand: recipes, camera, agent, ui
    │       │   ├── hooks/
    │       │   ├── lib/           # fetchers, URL hash codec, Anthropic client
    │       │   ├── i18n/          # en + it message catalogs
    │       │   ├── pages/
    │       │   ├── types/
    │       │   └── main.tsx
    │       ├── public/
    │       ├── index.html
    │       └── vite.config.ts
    ├── packages/
    │   ├── ptp-fuji/              # MIT, pinned-commit fork of filmkit (LICENSE + NOTICE)
    │   │   ├── src/
    │   │   │   ├── ptp/
    │   │   │   ├── profile/
    │   │   │   ├── transport/    # transport interface (DI)
    │   │   │   ├── errors.ts     # typed error taxonomy
    │   │   │   └── index.ts
    │   │   ├── tests/
    │   │   ├── docs/protocol.md
    │   │   ├── LICENSE (MIT)
    │   │   ├── NOTICE
    │   │   └── package.json
    │   ├── ptp-fuji-webusb/       # MIT, browser-coupled helpers (LICENSE only)
    │   │   ├── src/
    │   │   ├── tests/
    │   │   ├── LICENSE (MIT)
    │   │   └── package.json
    │   ├── recipe-schema/         # MIT, Zod schemas + creative-recipe codec (LICENSE only)
    │   │   ├── src/
    │   │   │   ├── recipe.ts
    │   │   │   ├── translate/    # Recipe ↔ camera property bytes
    │   │   │   ├── migrations/   # schemaVersion v1→vN migrators
    │   │   │   └── index.ts
    │   │   ├── tests/
    │   │   ├── LICENSE (MIT)
    │   │   └── package.json
    │   └── ai-agent/              # MIT, Claude API wrapper + prompts (LICENSE only)
    │       ├── src/
    │       │   ├── prompts/
    │       │   ├── modes/         # vibe | reference | refinement | critique
    │       │   ├── confidence.ts  # deterministic confidence rubric (§7)
    │       │   └── index.ts
    │       ├── tests/
    │       ├── LICENSE (MIT)
    │       └── package.json
    ├── data/
    │   ├── seed-recipes.json      # original or explicitly permitted only (see §13)
    │   └── camera-models.json     # capability matrix incl. writableSlotProperties (see §9)
    ├── docs/
    │   ├── recipe-format.md       # creative-recipe JSON spec
    │   ├── camera-compat.md       # tested cameras, capability sets, known issues
    │   ├── macos-beta.md          # macOS workaround for power users
    │   ├── browser-matrix.md      # supported browsers, versions, platforms, dev story
    │   ├── privacy.md             # explicit privacy policy (en + it)
    │   ├── trademark.md           # naming/domain trademark position
    │   ├── architecture.md
    │   └── decisions/             # ADRs incl. one per §15.9–§15.16 question
    ├── .ops/                      # gitignored, formray module 04 pattern
    ├── .github/workflows/         # CI: lint, typecheck, test, license-check, csp-check
    ├── README.md (en)
    ├── README.it.md
    ├── CHANGELOG.md
    ├── ROADMAP.md
    ├── PROGRESS.md
    ├── CLAUDE.md
    └── LICENSE                    # AGPL-3.0
```

NOTICE policy (corrected R3): NOTICE files are required only for packages containing forked or derived third-party code (`packages/ptp-fuji` from filmkit). Original packages need only LICENSE.

Conventions:
- npm workspaces, all packages under `packages/`, all apps under `apps/`
- Path aliases: `@/*` for app source, package imports use `@filmfork/*` workspace names
- No barrel exports
- Strict TS across every package, shared `tsconfig.base.json`

---

## 5. Data model — Recipe (filmkit-proven writable subset only)

`.ffr.json` is a **creative recipe** format. V1 schema is restricted to fields that filmkit's translator currently writes to C-slot custom settings via PTP. Fields visible in Fuji menus but not yet proven slot-writable via the validated PTP path are explicitly out of V1 and tracked for V2 expansion.

This is a deliberate trim from R2 driven by Codex review R2: shipping recipe fields we cannot actually push to the camera would mean recipes that load nicely in the UI and silently fail to apply. Better to ship a smaller honest schema than a larger lying one.

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
  // Identity & provenance
  id: z.string().uuid(),
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  author: z.string().max(80).optional(),
  parentRecipeId: z.string().uuid().optional(),
  tags: z.array(z.string().max(32)).max(20).default([]),
  createdAt: z.string().datetime(),

  // Camera capability targeting (see §9)
  capabilitySetId: z.string(),                  // e.g. "x-s20-fw1.10"
  cameraModel: z.string(),                      // e.g. "X-S20" — descriptive
  cameraGeneration: z.string().optional(),      // descriptive metadata only

  // Look-affecting parameters — restricted to filmkit-proven slot-writable
  filmSimulation: FilmSimulation,
  monochromaticColor: z.object({                // monochrome film sims only
    warmCool: z.number().int().min(-9).max(9),  // filmkit D193 (monoWC)
    greenMagenta: z.number().int().min(-9).max(9), // filmkit D194 (monoMG)
  }).optional(),
  dynamicRange: z.enum(["DR100", "DR200", "DR400"]),  // DRAuto deferred to V2 — see §2 / §5 deferred tables
  whiteBalance: z.object({
    mode: z.enum([
      "Auto", "AutoAmbiencePriority",            // filmkit-supported only in V1
      "Daylight", "Shade",
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

  // AI-generated structured explanation (optional, excluded from URL share by default)
  // R5: replaces flat `explanation` with three-field structure for better explainability
  reasoning: z.array(z.object({
    parameter: z.string(),
    visualEffect: z.string().max(200),     // what this parameter visually does (e.g. "lifts shadows, opens detail in dark areas")
    reason: z.string().max(300),           // why chosen for this recipe / feedback (e.g. "user asked for less crushed blacks")
    risk: z.string().max(200).optional(),  // when this setting may fail or look bad (e.g. "noise becomes visible above ISO 3200")
    confidence: z.enum(["low", "medium", "high"]).optional(),
  })).max(40).optional(),
});

export type Recipe = z.infer<typeof Recipe>;
```

### Local Taste Profile schema (R5 — opt-in user preferences, not part of Recipe)

The Taste Profile is **not** embedded in recipes. It is a user-level structure stored separately in `localStorage` under key `filmfork-taste-profile-v1`. It is opt-in, off by default, and AI uses it as context only after the user explicitly enables it. TTL applies (90 days unless touched). It is included in library export/import for portability and exits the browser only when the user exports it themselves.

```ts
// packages/recipe-schema/src/taste-profile.ts
import { z } from "zod";
import { FilmSimulation } from "./recipe";

export const ShootingContext = z.enum([
  "portraits", "travel", "street", "landscape", "night",
  "documentary", "wedding", "studio",
]);

export const TasteProfile = z.object({
  schemaVersion: z.literal(1),
  enabled: z.boolean().default(false),                  // opt-in gate
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastTouchedAt: z.string().datetime(),                 // for 90-day TTL

  // structured preferences (all optional)
  tonePreference: z.enum(["warm", "neutral", "cool"]).optional(),
  grainTolerance: z.enum(["none", "low", "medium", "high"]).optional(),
  contrastPreference: z.enum(["soft", "balanced", "punchy"]).optional(),
  preferredFilmSimulations: z.array(FilmSimulation).max(10).default([]),
  avoidedFilmSimulations: z.array(FilmSimulation).max(10).default([]),
  shootingContexts: z.array(ShootingContext).max(8).default([]),

  // free-form notes (capped, sanitized before injection into AI prompt)
  notes: z.string().max(500).optional(),
});

export type TasteProfile = z.infer<typeof TasteProfile>;
```

The AI agent reads the Taste Profile from `localStorage` only when `enabled === true`. The profile is sanitized (HTML/markdown stripped, length capped) before being injected into the system prompt. Wipe and export are first-class UI affordances in settings, not buried.

### Explicitly out of V1 schema (visible in Fuji menus, NOT proven slot-writable via filmkit)

| Field | Why removed in V1 | Reinstatement criteria |
|---|---|---|
| `dRangePriority` (Off/Auto/Weak/Strong) | filmkit parses but does not translate it into slot writes | V2 — needs Wireshark capture proving the slot property write + filmkit translator update |
| `dynamicRange: "DRAuto"` value | filmkit's `UI_DR_TO_PRESET` only maps `1→100`, `2→200`, `3→400`; no proven Auto encoding for slot writes | V2 — needs Wireshark capture proving the Auto-mode slot write + filmkit translator update |
| `longExposureNR` (boolean) | filmkit identifies `D1A3` but preserves base/default rather than user-writable | V2 — same |
| `lensModulationOptimizer` (boolean) | No filmkit custom-slot property mapping found | V2 — same |
| WB modes `AutoWhitePriority`, `Custom1`, `Custom2`, `Custom3` | Not in filmkit's enum or translator | V2 — same |

### Explicitly out of recipe schema (body-level, not creative-look) — unchanged

| Field | Rationale |
|---|---|
| Image Size | Body setting, doesn't define "the look" |
| Image Quality (JPEG/RAW/HEIF mix) | Body setting |
| Color Space (sRGB / Adobe RGB) | Body setting; affects display, not creative character |
| Auto-Update Custom Setting behavior | Body preference |
| Push/Pull processing | Exposure, not look |
| Auto ISO ceiling | Exposure preference, not recipe |
| Mirror Lock-up | Mechanical, not look |

These may move into a separate "Body Profile" schema in V2 if users request lossless preset capture.

### Schema migrations

Recipes are versioned (`schemaVersion: 1`). `packages/recipe-schema/src/migrations/` holds v1→v2 migrators when v2 ships. Recipes from older schema versions parse through the migrator chain before validation. Recipes from newer schema versions are rejected with a clear "update FilmFork to read this recipe" error.

---

## 6. Key flows

### 6.1 Connect camera

1. User clicks **Connect camera** (visible only on browsers with WebUSB)
2. App calls `navigator.usb.requestDevice({ filters: [{ vendorId: 0x04CB }] })`
3. **On Linux/Windows/Android Chrome:** primary path. Connect proceeds normally.
4. **On macOS:** banner before opening picker explains: "macOS support is experimental in V1 because of how the system manages USB cameras. You can try the documented power-user workaround, or wait for V2 which will include a signed helper to fix this properly." Link to `docs/macos-beta.md` (see §10 for the workaround content).
5. After pairing, `@filmfork/ptp-fuji` runs `OpenSession` → `GetDeviceInfo` (reads model + firmware version) → reads C1-Cn presets
6. Capability set looked up from `cameraModel + firmwareVersion` (see §9)
7. Active recipes loaded into `useCameraStore`; the user is informed of any unrecognized properties

Error handling: if `OpenSession` reports session already open, app prompts user to disconnect/reconnect. If model is unknown, app marks session as "experimental — read-only by default" (see §9 unknown-firmware policy) and surfaces a confirmation gate before any write.

### 6.2 AI recipe generation

1. User opens AI Agent panel: text input + photo drop zone
2. **Privacy gate:** if photo is dropped, app shows explicit consent: "This image will be sent to Anthropic for analysis. EXIF data will be stripped before upload. Continue?" Yes/No.
3. **EXIF stripping policy (V1, narrow & safe):**
   - Accepted formats for AI reference: **JPEG only**. HEIF / PNG / TIFF / RAW are rejected at upload with a fallback message tailored to the user's platform. iPhone-detected uploads (HEIC default since iOS 11): "Modern iPhones save photos as HEIC by default. To use this image as a reference, share or export it as JPEG first — Photos app: Share → Save to Files → choose JPEG, or Settings → Camera → Formats → Most Compatible." Generic fallback for other unsupported formats: "This format is not supported in V1. Convert to JPEG and try again."
   - Stripping method: decode source JPEG to a `<canvas>` (drops every metadata segment by construction since canvas only carries pixel data), re-encode as JPEG at quality 0.85 with no metadata writers used. Resize so max edge ≤ 2048px, target file size ≤ 1MB.
   - Verification: confirm that the re-encoded blob's header contains no `Exif`, `XMP`, `IPTC`, or `MakerNote` markers (a tiny byte-scan helper, not a full parser). If verification fails, abort and surface "We could not strip metadata from this image. Try saving it as a fresh JPEG with no metadata first."
4. On consent + successful strip, image is sent to Claude Sonnet 4.6 (default — see §15.6) with the Recipe schema as a tool input, vision input, and prompt caching enabled per formray module 16
5. Streamed response: per-parameter reasoning text with confidence indicators per the deterministic rubric (§7); final tool call materializes the Recipe atomically
6. Recipe parsed and validated via Zod against the user's selected capability set
7. Multi-turn refinement: user types follow-up ("more shadow detail"), agent iterates on previous Recipe with delta reasoning
8. The UI explicitly frames AI output as a **starting recipe**, not a match — with "Refine on camera with live preview" as the next-step CTA
9. On Anthropic API failure: typed error category per §6.9 with user-facing recovery copy
10. **Local Taste Profile** (opt-in only, R5): user maintains a structured profile (tone preference, grain tolerance, preferred film sims, shooting contexts, free-form notes). Schema in §5. Stored locally only. Off by default. AI reads it as system-prompt context only when `enabled: true`. One-click wipe + export in settings. 90-day TTL on `lastTouchedAt`. No persistent BYO API key in localStorage by default — see §11.

### 6.3 Push recipe to camera (transactional verified backup, no rollback claim)

1. User selects a recipe and a target slot (C1-C4 on X-S20, C1-C7 on bigger bodies)
2. **Pre-flight checks:**
   - **Battery preflight (V1 manual):** UI shows "Confirm your camera battery is sufficiently charged before continuing. A failed write mid-flow can leave a custom slot in an inconsistent state." with a required confirmation. Auto-check upgradable to a PTP property read if the relevant property is identified during V1 development (see §15.9).
   - Camera mode confirmed compatible (USB RAW Conv./Backup Restore)
   - PTP session healthy (ping by reading a known property)
   - Capability set known and not in "unknown firmware → read-only" mode (§9). If the active body is in unknown-firmware fallback, an extra "experimental writes" confirmation gate appears with explicit text about risks.
3. **Transactional verified backup:**
   - **Slot selection gate:** app calls `SetDevicePropValue(D18C, targetSlot)` to switch the camera's active slot, then immediately reads back `D18C` and verifies it equals `targetSlot`. If not, abort with `BackupIncomplete` and **do not persist anything** — a backup taken from the wrong active slot is worse than no backup.
   - App requests the full set of writable slot properties for the active capability set (writableSlotProperties whitelist from §9)
   - For each property, app reads via `GetDevicePropValue` and stores result in a temporary backup buffer
   - On any read error, the partial backup is **discarded** (NOT persisted)
   - After all expected properties are read, app verifies count of read properties equals count of expected properties, and that critical fields (FilmSimulation, WB mode, HighlightTone, ShadowTone) are non-null
   - Only after this verification, app persists the backup to localStorage as a `SlotBackup` keyed by camera serial + slot + timestamp + `verified: true`
   - Backups without `verified: true` are never offered for restore
   - Retain last 10 verified backups per slot
4. **Translate** Recipe to property writes via `@filmfork/recipe-schema`'s capability-aware translator
5. **Write** in canonical order: switch slot → write each property → rename slot → close. Each write checked. On first error, **stop**, do **not** attempt rollback (writes are not atomic over USB; mid-write disconnect or stall makes rollback unreliable). Display: "Write failed at property X. Slot may be in an inconsistent state. To restore the previous values, ensure the camera is connected and click Restore from backup."
6. On success: "Recipe is now in slot C2. Switch your camera dial to C2 to use it."
7. **Restore from backup** is available any time: (a) the camera is connected and healthy, and (b) the backup exists with `verified: true`. Backups are listed by timestamp + recipe name. Restore performs the same write loop in reverse, with the same fail-loud semantics.
8. **Confirmation gate:** before any camera write, the user must explicitly confirm. Recipes loaded from URL hash require an extra confirm step (see §11).

### 6.4 Camera-side live preview

The RAF→JPEG conversion uses **Fuji vendor PTP operations**, not standard PTP. Standard `SendObjectInfo (0x100C)` and `SendObject (0x100D)` are NOT used by filmkit and will not work on Fuji bodies for this flow. The vendor opcodes are:

| Op | Purpose |
|---|---|
| `0x900C` (SendObjectInfo, vendor) | Announce object metadata |
| `0x900D` (SendObject2, vendor) | Stream the RAF bytes |
| `0xF802` (object format) | RAF object format identifier |
| Filename | `FUP_FILE.dat` (filmkit-observed convention) |

Flow:

1. User drops a `.RAF` file onto the preview pane
2. App calls vendor `SendObjectInfo (0x900C)` with object format `0xF802` and filename `FUP_FILE.dat`
3. App calls vendor `SendObject2 (0x900D)` to stream the RAF in chunks (filmkit uses 512 KB chunks)
4. App reads current `D185` base RAW-conversion profile (this is the conversion profile, distinct from preset properties `D18E…D1A5` which are slot settings — see §6.3)
5. App patches the `D185` profile with the active recipe's fields via `@filmfork/recipe-schema/translate/d185`
6. App calls `SetDevicePropValue(D185, patchedProfile)` then triggers conversion via `SetDevicePropValue(D183, 0)`
7. **Snapshot existing object handles BEFORE conversion**, then poll `GetObjectHandles` until a NEW handle appears (don't take "first handle returned"; it could be stale). Inspect object info/format to confirm it's the JPEG result, not something else
8. App downloads via `GetObject` for the new handle only
9. App displays side-by-side with the original (or split-slider)
10. **Cleanup (best-effort, only positively-identified handles):** App deletes handles it positively identifies as belonging to this conversion — primarily the JPEG output handle. The RAF upload handle is deleted **only if** the vendor `SendObjectInfo` response surfaces a usable handle that the implementation can track. If the upload handle is not observable, cleanup of the RAF object is best-effort and camera/session-scoped — the camera typically clears it on session close. We never delete pre-existing handles or guess at handle IDs.

**Validation requirement:** §6.4 must be re-validated end-to-end on X-S20 before V1 ships. Filmkit verified this on X100VI; we have only verified read on X-S20 so far. Round-trip preview verification is in V1 acceptance.

### 6.5 Share recipe via URL

1. User clicks Share on a recipe
2. App serializes Recipe JSON **excluding `reasoning`** by default (it can balloon the payload), zlib-compresses, base64url-encodes
3. Hard cap on URL hash payload: 1.5 KB compressed. If over: show "This recipe is too large for URL sharing. Use Export to file instead." and offer file download
4. URL: `https://<host>/#r/<encoded>`
5. Recipient opens URL → app decodes → validates against Zod schema → validates against the recipient's selected camera capability set → checks payload size and attribution length caps → only then offers "Save to library"
6. **Camera-write protection:** A recipe loaded from URL hash CANNOT be pushed to the camera in one click. The user must explicitly save it to library first, then push from there. This prevents drive-by camera writes from malicious links.
7. If recipient saves a fork, the new recipe sets `parentRecipeId` to the original

### 6.6 Camera disconnect mid-flow recovery

| Scenario | Recovery |
|---|---|
| Disconnect during `Backup` (read phase of §6.3) | Discard partial backup buffer, do NOT persist. Surface "Backup failed; cannot proceed with write." Restore-from-earlier-backup remains available. |
| Disconnect during `Push` write | Stop, mark slot "may be inconsistent", offer Restore-from-backup (only if a verified backup exists) as soon as reconnected |
| Disconnect during `Preview` | Discard partial result; surface "Connection lost during preview" error. No cleanup of camera-side handles in this state. |
| Disconnect during `Read presets` | Re-attempt connect; if fails 3x, surface "Camera unreachable" and clear stale state |
| USB stall (camera unresponsive but technically connected) | Timeout per operation (default 30s, see §8 transport contract), abort the in-flight op, mark session degraded, offer reconnect |
| Camera in wrong mode mid-flow | Detect via property read failure; show "Camera left RAW Conv. mode" and ask user to reset |

### 6.7 Camera-side iteration loop (R5 — headline V1 workflow)

This is the differentiating flow. It composes §6.2 (AI), §6.4 (camera-side preview), and the new recipe diff (§6.8) into a single user experience: the camera is the rendering engine, the AI is the iteration assistant, the user is the editor.

Pre-conditions: camera connected and healthy (§6.1); user has a RAF file ready; AI API key entered (session-only by default per §11).

1. **Load.** User drops a RAF onto the iteration loop pane. App keeps the RAF in a session-scoped buffer (not persisted, not uploaded — see §11).
2. **AI proposes starting recipe.** App calls the AI agent in vibe-or-reference mode (§7). User sees the proposed recipe with structured per-parameter explanation (visualEffect / reason / risk) and confidence badges. This is iteration `i = 0`.
3. **Camera renders real JPEG (iteration `i`).** App runs the §6.4 camera-side preview flow with the current iteration's recipe. The user sees the actual JPEG the camera would produce. No WebGL approximation.
4. **User feedback.** User types natural-language feedback in the iteration panel (e.g. "warmer", "less digital", "softer skin", "more film grain", "less crushed blacks"). Free text, but framed in the UI as "what would you change?".
5. **AI proposes targeted delta (iteration `i + 1`).** AI agent receives: previous recipe + user feedback + Taste Profile (if opt-in enabled). It produces a new recipe **with a constraint to change only a small targeted set of parameters** (system-prompt instruction: prefer changing 1-3 parameters that map to the feedback; do not retune everything). The structured explanation describes only the changed parameters and their visualEffect/reason/risk.
6. **Recipe diff displayed.** App shows the deterministic recipe diff (§6.8) between iteration `i` and `i + 1` so the user sees exactly what changed and the human-readable visual impact, before committing to re-render.
7. **User decides:** apply the proposed delta (go to step 3 with iteration `i + 1`), reject (return to iteration `i`), or edit any parameter manually before re-render.
8. **Re-render.** Camera processes the new recipe; back to step 3.
9. **Iteration history.** App keeps the last N iterations (N = 10 in V1) with their JPEG output thumbnails, recipe state, user feedback, and confidence/explanation. Stored in session memory only — cleared on tab close. User can pick any iteration as "the one" and save it to library.
10. **Save & push.** Chosen iteration is saved to the recipe library with provenance (parent = whatever recipe seeded the loop, if any). User can push it to a camera slot via §6.3 from the saved entry.

Constraints and safety:
- AI is constrained per system prompt to change a **small targeted parameter set per iteration** (1-3 parameters typical). The structured explanation reflects only the changed parameters. Test: assert that ≥ 90% of iterations change ≤ 5 fields.
- The RAF stays in browser memory for the iteration session. It is never uploaded to Anthropic. Only the AI-generated recipe text and the user's feedback text go to the AI.
- All §6.9 typed errors apply (camera disconnect mid-render, AI rate limit, invalid RAF, etc.).
- Unknown-firmware mode (§9) blocks step 3 unless the user has accepted the experimental-write gate AND a verified backup exists for any push action.
- Iteration history is opt-out from URL sharing (cannot share an iteration session by URL — the user must save the chosen iteration to library first).

Acceptance for the loop end-to-end is in §16.

### 6.8 Recipe diff & visual comparison (R5 — deterministic, rule-based)

Given two recipes (`A`, `B`), produce a structured diff annotated with human-readable visual impact strings. Used inside the iteration loop (§6.7 step 6), in the recipe library (compare two saved recipes side-by-side), and in the push flow (compare the recipe-to-be-pushed against the slot's current contents from the verified backup).

The translator is **deterministic and lookup-table-driven**, not AI-generated. Every parameter has rule entries that map a delta range to a human-readable phrase. AI generates explanations for AI-proposed recipes (`reasoning` field per §5); the diff translator generates explanations for *changes between two recipes*.

Example rules (illustrative, full table lives in `packages/recipe-schema/src/diff/`):

| Parameter | Delta | Human-readable visual impact (en) |
|---|---|---|
| `whiteBalance.shiftR` | +1 to +3 | "slightly warmer red cast" |
| `whiteBalance.shiftR` | +4 to +9 | "noticeably warmer red cast" |
| `whiteBalance.shiftR` | −1 to −3 | "slightly cooler, removing red" |
| `whiteBalance.shiftB` | +1 to +3 | "slightly bluer cast" |
| `shadowTone` | −2 to −0.5 | "more open shadows; recovers detail" |
| `shadowTone` | +0.5 to +4 | "deeper, more closed shadows" |
| `highlightTone` | −2 to −0.5 | "softer highlight rolloff" |
| `highlightTone` | +0.5 to +4 | "harsher highlights, more bite" |
| `clarity` | +1 to +3 | "subtle local contrast lift" |
| `clarity` | +4 to +5 | "noticeable local contrast and edge bite" |
| `clarity` | −1 to −5 | "softer, more diffuse rendering" |
| `noiseReduction` | +1 to +4 | "smoother, less grain texture (can soften detail)" |
| `noiseReduction` | −1 to −4 | "more grain texture; preserves detail" |
| `grainEffect.strength` | Off → Weak | "adds light film-grain texture" |
| `grainEffect.strength` | Off → Strong | "adds visible film-grain texture" |
| `colorChromeEffect` | Off → Weak | "denser saturated colors (subtle)" |
| `colorChromeEffectBlue` | Off → Weak | "richer blues in skies and water" |
| `filmSimulation` | A → B | "switches base look from {A-name} to {B-name}" |

Italian translations live alongside in the i18n catalog. The diff API:

```ts
// packages/recipe-schema/src/diff/index.ts (signature only — no implementation here)
export interface RecipeDiffEntry {
  parameter: string;
  before: unknown;
  after: unknown;
  delta?: number;             // for numeric params
  visualImpact: string;       // localized phrase from rule lookup
  ruleKey: string;            // diagnostic key, useful for tests
}

export interface RecipeDiff {
  changedCount: number;
  unchangedCount: number;
  entries: RecipeDiffEntry[];
  summary: string;            // localized one-liner ("3 parameters changed: warmer, more open shadows, less grain")
}

export function diffRecipes(a: Recipe, b: Recipe, locale: "en" | "it"): RecipeDiff;
```

Tested with property-based tests against the rule table: every numeric parameter range produces a localized phrase; missing rule entries default to a generic phrase; cross-camera diff (recipes from different capability sets) flags incompatible fields rather than diffing them silently.

### 6.9 Typed error taxonomy

`@filmfork/ptp-fuji/errors.ts` exports:

```ts
type FilmForkErrorCategory =
  // PTP / session
  | "PtpSessionAlreadyOpen"
  | "PtpDeviceBusy"
  | "PtpUnsupportedOperation"
  | "PtpStall"
  | "PtpTimeout"
  // USB / browser
  | "UsbDisconnect"
  | "UsbPermissionDenied"
  | "WebUSBSecureContextRequired"   // renamed from UsbHttpsRequired (R3)
  | "WebUSBUnsupported"
  // Camera
  | "CameraInWrongMode"
  | "CameraBatteryLow"               // when auto-detect is enabled
  | "CameraUnknownModel"
  | "FirmwareUnsupported"
  // Write / restore flow
  | "WriteFailed"
  | "RestoreFailed"
  | "BackupIncomplete"
  | "ConversionFailed"
  | "RafFormatInvalid"
  // AI
  | "AiRateLimit"
  | "AiNetwork"
  | "AiAuth"
  | "AiServer"
  | "AiPayloadTooLarge"              // 413 from API
  | "AiModelUnavailable"
  // Recipe
  | "RecipeSchemaInvalid"
  | "RecipeCapabilityMismatch"
  | "RecipeUrlPayloadTooLarge";
```

Each low-level DOM/PTP/Anthropic error maps one-to-one to a category in `errors.ts`. Every error surfaced in the UI maps to a category, which maps to a recovery prompt and a "Copy diagnostic bundle" button.

---

## 7. AI agent design (with deterministic confidence rubric)

V1 capabilities, with explicit confidence framing:

| Mode | Input | Output | Honest framing |
|---|---|---|---|
| **One-shot from vibe** | Text only | Recipe + per-parameter reasoning + confidence | "This is a plausible starting recipe. Refine on camera." |
| **One-shot from reference** | Photo (vision input, with explicit consent) | Recipe matching general look characteristics + confidence (typically lower) | "Photos contain lighting, lens, and edit information that camera recipes can't fully match. Use this as a direction, not a copy." |
| **Multi-turn refinement** | Previous Recipe + follow-up text | Adjusted Recipe + delta explanation | "I changed X and Y because…" |
| **Critique mode** | Recipe + user photos shot with it | Suggested tweaks + reasoning | "Try lifting shadows by +0.5 — your blacks look crushed in these shots." |
| **Taste Profile-aware (opt-in)** | Same as above + Local Taste Profile (§5) | Recipe biased toward user's structured preferences (tone, grain tolerance, preferred sims, shooting contexts) | Explicit opt-in via Taste Profile `enabled: true`; one-click wipe; 90-day TTL |
| **Camera-side iteration loop (R5)** | Previous iteration's recipe + user feedback ("warmer", "less digital") + RAF rendered by camera | Targeted-delta Recipe (1-3 parameters typical) + structured per-parameter explanation, used to drive a real camera re-render | See §6.7 — composes AI + §6.4 preview + §6.8 diff |

### Deterministic confidence rubric (R3)

Confidence is **not** purely model self-reported. The agent operates under a deterministic rubric enforced via prompt instruction + post-processing override:

| Source of parameter value | Max confidence allowed | Notes |
|---|---|---|
| Text-explicit in user prompt ("warm tones", "+R WB") | `high` | Direct user instruction |
| Text-implicit / mood-derived ("moody", "Wong Kar-wai feel") | `medium` | Style maps to plausible parameter ranges |
| Photo-derived film simulation (broad classification) | `medium` (`high` only if visually unmistakable, e.g. clear ACROS B&W from a B&W input) | Vision can identify mode with reasonable accuracy |
| Photo-derived numeric value (clarity, sharpness, NR, tones) | `medium` cap | Display transforms, lens, exposure, edit confound numerics |
| WB shifts inferred from photo color cast | `medium` cap | Cannot disambiguate from lighting / display profile |
| Inferred-without-evidence (no signal in input) | `low` | Schema requires a value; agent picked a sane default |
| Multi-turn refinement explicit delta | inherits from delta source above | E.g. "more shadow detail" → high on shadowTone |

Implementation:
- The system prompt instructs Claude to apply this rubric.
- A post-processing step in `packages/ai-agent/src/confidence.ts` enforces the caps: any photo-derived numeric value tagged `high` by the model is automatically downgraded to `medium`. Tests assert this in `tests/confidence.test.ts`.
- The UI surfaces confidence per parameter as a small badge. Photo-reference mode shows an explicit info card: "Photos cannot uniquely determine recipe values. This is a starting direction."

### Implementation patterns (formray module 16 alignment)

- **Prompt caching:** static system prompts and the Recipe schema cached per Anthropic's prompt-caching API
- **Retry/fallback:** exponential backoff on rate limit; fallback to non-vision flow if vision fails; user-facing typed error per §6.9
- **Rate/cost controls:** soft per-session budget warning (e.g. ≥ $0.50/session) with opt-in to continue
- **Prompt-injection treatment:** reference photos are vision input only; user text is sandboxed; tool-use schema is the only writeable surface
- **Memory TTL:** Taste Profile expires after 90 days unless touched (`lastTouchedAt` updated); explicit "wipe Taste Profile" + "export Taste Profile" in settings

### API key handling

- **Default V1:** session-only entry. User pastes key on first AI call; key held in memory only. Cleared on tab close.
- **Opt-in persistent:** "Remember key on this device" checkbox, with explicit risk text: "Stored in localStorage, accessible to browser extensions, dev tools, and shared-device users. We recommend session-only on shared devices." One-click wipe in settings.
- **No key in URL params, never.** No key ever leaves the browser except in the `Authorization` header to `api.anthropic.com`.
- **Browser SDK note:** `@anthropic-ai/sdk` requires `dangerouslyAllowBrowser: true` for browser use. We set it explicitly with the consent gate above.

### Image handling for AI reference/critique

See §6.2 EXIF stripping policy. Summary:
- V1 accepts JPEG only for AI reference; HEIF/PNG/RAW rejected at upload
- Decode-to-canvas + re-encode is the strip method; verifier scans the output for residual EXIF/XMP/IPTC/MakerNote markers
- Failure to verify = abort with user-facing message
- No retention on our side (we have no backend in V1)
- Anthropic's data handling is governed by their commercial terms; documented in `docs/privacy.md`

V2 plan: cross-session persona with auth, reference library lookup, agent memory of community recipes the user liked, optional managed proxy that hides API key, expanded image format support with hardened parsers.

---

## 8. PTP layer: pinned-commit fork + transport contract

filmkit (MIT) is the foundation. Pinned-commit fork strategy:

1. **Pin** to a specific commit SHA (recorded in `packages/ptp-fuji/UPSTREAM`), not "latest release" — filmkit may not publish stable tags consistently
2. **Copy** filmkit's `src/ptp/`, `src/profile/`, `src/util/binary.ts` into `packages/ptp-fuji/src/`
3. **License & attribution:** `LICENSE` (MIT), `NOTICE` crediting eggricesoy and the upstream RE chain (rawji, fudge, libgphoto2, ISO 15740). README explicitly states "FilmFork is an independent fork; not endorsed by or affiliated with filmkit's authors."
4. **Repackage** as two packages:
   - `@filmfork/ptp-fuji` — pure protocol logic, NO browser/DOM dependencies. Returns `Uint8Array`. Accepts a `PtpTransport` interface via DI. Testable in pure Node + Vitest.
   - `@filmfork/ptp-fuji-webusb` — browser-coupled adapter: implements `PtpTransport` over WebUSB, provides `Blob` helpers
5. **Public API** of `@filmfork/ptp-fuji`:

   ```ts
   export interface PtpTransport {
     // Owns: USB bulk endpoint I/O, abort propagation, max chunk size, op-level timeout
     send(data: Uint8Array, signal?: AbortSignal): Promise<void>;
     receive(signal?: AbortSignal): Promise<Uint8Array>;
     close(): Promise<void>;
   }

   export class FujiCameraSession {
     // Owns: PTP container pack/unpack, transaction IDs, DATA/RESPONSE container boundaries
     constructor(transport: PtpTransport, options?: { onProgress?: (p: Progress) => void });
     readonly state: "open" | "closed" | "degraded";
     readonly capabilities: CameraCapabilities;
     open(signal?: AbortSignal): Promise<void>;
     getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;
     getPreset(slot: number, signal?: AbortSignal): Promise<RawPreset>;
     setPreset(slot: number, preset: RawPreset, signal?: AbortSignal): Promise<void>;
     convertRaf(raf: Uint8Array, profile: ProfileBytes, signal?: AbortSignal): Promise<Uint8Array>;
     close(): Promise<void>;
   }
   ```

   Keys:
   - Transport injected (not coupled to WebUSB)
   - `Uint8Array` in/out (browser-agnostic)
   - `AbortSignal` on every async op
   - Progress callback in constructor
   - Explicit session state
   - Capabilities exposed
   - Typed errors thrown per §6.9

### Transport contract (R3 — added per Codex NM4)

`PtpTransport` is a thin USB-bulk byte-stream adapter:

| Responsibility | Owner |
|---|---|
| USB bulk endpoint open/close | Transport |
| Abort signal propagation to in-flight USB transfers | Transport |
| Max chunk size (filmkit uses 512 KB for SendObject2 RAF streaming) | Transport (configurable, default 512 KB) |
| Per-operation timeout (default 30s, configurable per call) | Transport |
| PTP container pack (12-byte header + payload) | Session |
| PTP container unpack | Session |
| Transaction ID allocation and matching | Session |
| Container type discrimination (CMD/DATA/RESPONSE) | Session |
| Multi-container DATA reassembly | Session |
| Op-level timeout policy | Session can request a longer timeout per op via the transport call |

This split keeps the protocol logic 100% pure and node-testable: tests inject a fake `PtpTransport` that returns canned byte sequences and verifies session-level packing/parsing/transaction state without any browser dependency.

6. **Tests** (Vitest): PTP container pack/unpack, profile field encoding, edge cases (HighIsoNR non-linear table, monochrome film sim restrictions, ColorTemperature requires WB=ColorTemp), error paths, AbortSignal propagation, transaction ID reuse, multi-container DATA reassembly, transport contract conformance
7. **Document** the protocol in `packages/ptp-fuji/docs/protocol.md` — link filmkit's `QUICK_REFERENCE.md`, but write our own with the vendor opcodes called out (per §6.4)
8. **Upstream tracking script:** `scripts/check-filmkit-upstream.ts` diffs our pinned SHA against filmkit `main`, surfaces deltas, opens a tracking issue. Manual merge decision per delta. We do NOT open PRs upstream (filmkit policy).
9. **Community contribution path:** new-camera support flows to FilmFork via Wireshark capture submitted as issues, not PRs to filmkit

License compatibility:
- filmkit is MIT → we can fork with attribution
- Our app is AGPL-3.0 → fine, MIT inputs are upstream-compatible
- Our `@filmfork/ptp-fuji*` packages are MIT → keeps them usable by other future Fuji tools
- License-compatibility check in CI verifies no AGPL bleed into MIT packages

---

## 9. Camera compatibility approach

**Primary key: `capabilitySetId` = `cameraModel` + `firmwareVersion`** (e.g. `x-s20-fw1.10`). Sensor generation (X-Trans-IV, X-Trans-V) is descriptive metadata only.

```jsonc
// data/camera-models.json
{
  "capabilitySets": {
    "x-s20-fw1.10": {
      "cameraModel": "X-S20",
      "firmwareVersion": "1.10",
      "usbProductId": "0x02F7",
      "generation": "X-Trans-IV",
      "customSlots": 4,
      "filmSimulations": [/* enumerated subset */],
      "parameterRanges": {
        "highlightTone": { "min": -2, "max": 4, "step": 0.5 },
        "clarity": { "min": -5, "max": 5, "step": 1 }
        /* ... */
      },
      "supports": {
        "monochromaticColor": true,         // R3 fix — filmkit D193/D194 are slot-writable
        "smoothSkinEffect": true,
        "colorChromeEffect": true,
        "colorChromeEffectBlue": true
      },
      "writableSlotProperties": [
        // R3 — explicit whitelist of recipe-writable slot properties via filmkit
        "filmSimulation",
        "monochromaticColor",
        "dynamicRange",
        "whiteBalance",
        "highlightTone",
        "shadowTone",
        "color",
        "sharpness",
        "noiseReduction",
        "clarity",
        "grainEffect",
        "colorChromeEffect",
        "colorChromeEffectBlue",
        "smoothSkinEffect"
      ],
      "tested": "verified-2026-05-03",
      "knownIssues": []
    }
  },
  "models": {
    "X-S20": {
      "knownCapabilitySets": ["x-s20-fw1.10"],
      "latestKnownFirmware": "1.10"
    },
    "X-M5": {
      "knownCapabilitySets": [],
      "latestKnownFirmware": "unknown",
      "status": "experimental — pending hardware verification"
    }
  }
}
```

Behavior:
- Camera connect → `GetDeviceInfo` returns model + firmware → look up `capabilitySetId`
- **If exact set found:** load full capability matrix; writes proceed normally with confirmation gates (§6.3)
- **If model known but firmware unknown** (nearest-firmware fallback): load capabilities from nearest known firmware, **mark session "unknown-firmware fallback — read-only by default"**. Writes require an explicit additional confirmation gate: "This firmware is not in our compatibility matrix. Writes may behave unexpectedly. Continue with experimental write?" Backup verification is mandatory in this mode.
- **If model unknown:** load minimal-baseline capabilities, mark session "experimental", same explicit-confirmation gate before any write
- Recipe Editor greys out parameters not in the active capability set's `writableSlotProperties` whitelist
- Recipes carry their authoring `capabilitySetId`; loading a recipe targeted at a different set surfaces a compatibility report

New camera support workflow:
1. Issue: "Add support for X-T50 fw1.00"
2. Contributor captures Wireshark traffic with Fuji X RAW Studio (per filmkit README)
3. Submit `.pcapng` + proposed capability set entry as issue (not PR to filmkit; PR to FilmFork)
4. Maintainer validates and merges — including filmkit-translator changes if a new property is being added to `writableSlotProperties`

V1 testing commitment:
- **Tested:** X-S20 fw1.10 — full end-to-end including round-trip preview
- **Pending:** X-M5 — must be physically tested before claiming support; documented as "untested" in V1 if not done by launch
- **Experimental:** all other Fuji bodies — protocol may work (filmkit was X100VI-tested) but FilmFork makes no claim; unknown-firmware safety mode applies

---

## 10. macOS path in V1 (revised UX framing)

V1 macOS is **explicitly experimental/beta**. This is a scope cut, not a hand-wave.

**V1 official happy-path platforms:**
- Linux + Chrome ≥ 122 / Edge ≥ 122 (primary)
- Windows + Chrome ≥ 122 / Edge ≥ 122 (primary)
- Android + Chrome ≥ 122 + USB OTG cable (experimental — see browser matrix)

**V1 macOS:** documented power-user workaround in `docs/macos-beta.md`. Minimum tested macOS version: **macOS 13 Ventura**. The web app detects macOS and shows a banner: "macOS support is experimental in V1. You can try the workaround (link), or wait for V2 which will include a signed helper to fix this properly."

### `docs/macos-beta.md` — recommended sequence (R3, safer-first)

The doc walks the user through, **in order**, the safest steps before suggesting more aggressive ones:

1. **Quit conflicting apps:** Photos, Image Capture, Capture One, Fuji X RAW Studio, Lightroom, anything that may have claimed the camera
2. **Replug the camera:** unplug the USB cable, wait 3 seconds, plug back in
3. **Verify camera mode:** confirm camera is in `USB RAW CONV./BACKUP RESTORE`
4. **Try Connect in FilmFork.** Most cases resolve here.
5. **If still blocked:** open Terminal and run `killall ptpcamerad` (plain, no `-9`). Click Connect immediately. This is sufficient in most situations.
6. **Last resort only:** if the daemon is restarting too fast, `sudo killall -9 ptpcamerad`. Click Connect within 1 second. Note: this is an unsupported power-user path; it can confuse other apps that depend on `ptpcamerad` (Image Capture, Photos auto-import) until next reboot.

The doc is explicit that this is unsupported power-user territory and that V2 ships a proper signed helper. It is NOT framed as a normal setup step.

**V2 plan (deferred from R1, no scope changes here):**
- Tauri 2.0 native helper, Developer ID signed + notarized via formray module 13 (entitlements TBD, signing pipeline `build_pkg.sh` per module 13)
- Listens on localhost WebSocket
- On request: `launchctl unload com.apple.PTPCamera`, holds offline for the session
- On disconnect: `launchctl load` to restore
- Web app auto-detects helper at `ws://localhost:7777` and uses it transparently
- Distribution: signed `.pkg` for MDM-friendly install, `.dmg` for direct download

This is its own milestone. Timeline: ~6-10 weeks after V1 ships.

---

## 11. Security & privacy

| Concern | V1 posture |
|---|---|
| Accounts | None |
| Telemetry / analytics | None — no third-party scripts in V1 |
| Storage | localStorage only; explicit list documented in `docs/privacy.md` (favorites, **Local Taste Profile opt-in (R5)**, last-seen version, slot backups, UI prefs, iteration history is **session-only** not persisted) |
| WebUSB | HTTPS-only (or `localhost` for dev), user gesture per session, vendor-filtered to Fujifilm only |
| AI API key | **Session-only by default**, in memory only. Persistent localStorage opt-in with explicit risk text + one-click wipe. Never in URL params. Never logged. |
| AI reference images | JPEG only in V1. Sent to Anthropic only after **explicit per-image consent**. Decoded to canvas + re-encoded as JPEG with no metadata writers (drops EXIF/XMP/IPTC/MakerNote by construction). Verifier scans output for residual metadata markers; abort on failure. Resized to ≤ 2048px max edge, ≤ 1MB. No retention on our side. Anthropic data handling per their commercial terms — linked in `docs/privacy.md`. |
| RAF preview images | **Local only.** RAF round-trips camera→browser→camera. Never sent to any server. Enforced by code: the conversion path uses `@filmfork/ptp-fuji`, not the AI agent. |
| URL share | Recipe payload only, no user identifiers, no `reasoning` by default, capped at 1.5KB compressed |
| Recipe URL push | Cannot push to camera in one click. Save to library first, then push (with confirm). Capability matrix re-validation before any write. Unknown-firmware mode adds an additional confirmation gate. |
| External fonts | Self-hosted (Inter or Geist via npm) — no Google Fonts, no third-party CDN |
| **CSP (R3 expanded)** | `default-src 'self'`; `connect-src 'self' https://api.anthropic.com`; `img-src 'self' blob: data:`; `script-src 'self'`; `worker-src 'self'`; `manifest-src 'self'`; `style-src 'self' 'unsafe-inline'` (Tailwind v4 may need this; revisit during build). CSP validation is part of CI (`csp-check` workflow): a built-app smoke test loads each major route under the production CSP and fails on any console violation. |
| Diagnostic bundle | Manual export (no auto-upload). Includes browser/OS/firmware/error log; redacts API key, EXIF, image content |
| Dependencies | Lockfile committed, `npm audit` in CI, license-compatibility check in CI |

### Threat model

| Threat | Mitigation |
|---|---|
| Malicious recipe URL → unwanted camera write | Save-to-library required before push; capability matrix re-validation; explicit user confirmation gate; unknown-firmware mode adds extra confirm |
| Malicious recipe URL → resource exhaustion | URL payload size cap; reasoning array cap; tags/strings length caps |
| AI prompt injection from reference photo | Vision input is treated as image only; tool-use schema is the only writeable surface; user text is sandboxed |
| API key extraction via XSS | Strict CSP; no inline scripts; key is session-only by default |
| Stolen localStorage on shared device | Persistent key opt-in with risk text; one-click wipe; persona opt-in |
| Compromised npm dependency | Lockfile + `npm audit` CI; minimal dep tree |
| EXIF leak via AI reference photo | JPEG-only acceptance + canvas re-encode + verifier scan + abort-on-failure |
| Partial backup masquerading as valid restore point | Transactional backup (read all, verify count + critical fields) before mark `verified: true`; restore offered only on `verified: true` backups |
| Write attempt on unknown firmware silently corrupts slot | Unknown-firmware mode = read-only by default; writes require explicit confirmation gate + verified backup |

### Data export & portability

Users can export their full library (recipes + Local Taste Profile if enabled + favorites + slot backups) to a JSON file at any time, and re-import it. This is the only "backend" feature in V1. Iteration loop history (§6.7) is session-only and not part of export — the user must save a chosen iteration to library first to persist it.

---

## 12. Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (`recipe-schema`) | Vitest | 100% on parsers/codecs, edge cases per parameter, JSON ↔ camera-property round-trip, schema migration tests |
| Unit (`ptp-fuji`) | Vitest with fake `PtpTransport` | Container pack/unpack, profile patch, encoding tables, error paths, AbortSignal propagation, transaction ID handling, transport contract conformance |
| Unit (`ptp-fuji-webusb`) | Vitest with mocked `navigator.usb` | WebUSB transport adapter, abort propagation, max chunk size |
| Unit (`ai-agent`) | Vitest with mocked Anthropic SDK | Prompt construction, tool call schema, recipe validation post-response, deterministic confidence rubric (downgrade caps enforced), retry behavior, EXIF strip + verifier |
| Component (web) | Testing Library | Library filter/search, Recipe editor parameter validation per `writableSlotProperties`, Camera connect button states, error UI per category, i18n string presence, unknown-firmware confirmation gates |
| Accessibility | Vitest + axe-core + manual audit | WCAG 2.2 AA target. Keyboard matrix (every interactive element reachable), screen-reader states for sliders, progress indicators, error toasts. Documented in `docs/architecture.md#accessibility` |
| Integration (real camera) | Manual smoke checklist + recorded session | Pre-release: connect X-S20, read C1-C4, **transactional backup verify**, write to C2, restore from verified backup, camera-side preview round-trip, AI generate. Session recorded with diagnostic bundle for reproducibility. |
| CSP validation | CI smoke test on built app | Each major route loads under production CSP without console violations |
| Performance | Lighthouse CI | Performance ≥ 90, Accessibility ≥ 95. **PWA score is NOT a release blocker**. |
| Browser matrix | Manual + browserstack-equivalent | Linux Chrome ≥ 122, Linux Edge ≥ 122, Windows Chrome ≥ 122, Windows Edge ≥ 122, macOS 13+ (best-effort beta), Android Chrome ≥ 122 OTG (experimental) |
| Type safety | `tsc --noEmit` in CI | Zero errors, strict mode flags from §3 |
| Lint | ESLint + Prettier | Zero warnings in CI |
| License compatibility | `license-checker` in CI | No AGPL bleed into MIT packages, all deps compatible |

Real-camera integration tests in CI are deferred to V2 (CI hardware impractical solo). V1 manual checklist is the gate.

---

## 13. License, attribution, and trademark

| Artifact | License | NOTICE? |
|---|---|---|
| `apps/web` (the FilmFork app) | AGPL-3.0 (formray default for products) | No |
| `packages/ptp-fuji` | MIT | **Yes** (forked from filmkit) |
| `packages/ptp-fuji-webusb` | MIT | No |
| `packages/recipe-schema` | MIT | No |
| `packages/ai-agent` | MIT | No |
| `data/seed-recipes.json` entries | original or **explicitly permitted only** (see below) | per-recipe `author` field |

NOTICE policy (R3 corrected): NOTICE files are required only for packages containing forked or derived third-party code. Original-work packages need only LICENSE.

### Recipe seed list policy

V1 ships only:
- **Original recipes** authored by the project (10-15 starter recipes covering common looks)
- **Explicitly permitted recipes** with written consent from the original author, attributed in the `author` field

V1 does NOT bundle community recipes from fuji-x-weekly or similar without written permission. Users can import any recipe via paste/file/URL — that's their action, not our distribution.

### Fork attribution (filmkit)

`packages/ptp-fuji/NOTICE` includes the full RE chain (filmkit, rawji, fudge, libgphoto2, ISO 15740) and explicitly states FilmFork is an independent fork, not endorsed by or affiliated with filmkit's authors. The MIT license is sufficient legal authorization for the fork; the NOTICE is for community good citizenship.

### Trademark position

**FilmFork** is a working title. Final naming subject to:
1. USPTO + EUIPO trademark search before public assets/domain
2. Domain availability check
3. Formray brand-vocabulary alignment review

**Fuji-prefixed names rejected** ("FujiComp", "FujiPress", "FujiCast"): trademark exposure with Fujifilm Holdings Corporation is real even for open source.

Compatibility language in marketing/UI: "FilmFork is for Fujifilm cameras" or "compatible with Fujifilm X-series", **never** "Fujifilm FilmFork" or any phrasing that implies endorsement.

`docs/trademark.md` documents the position, the search results when done, and the public statement we use.

---

## 14. V2 / V3 roadmap (notes only, not in V1)

**V2 — macOS first-class + community library + schema expansion** (~6-10 weeks after V1 ships):
- Tauri 2.0 wraps the same React UI; Rust backend uses libusb directly (no WebUSB constraints)
- Auto-managed `ptpcamerad` (launchctl unload/load lifecycle); see formray module 13
- Background camera watch — auto-pull settings on connect
- Filesystem integration: watch a drop folder for RAFs
- Distribution: signed + notarized `.pkg` and `.dmg` via formray module 13
- Schema expansion: add D Range Priority, Long Exposure NR, Lens Modulation Optimizer, WB modes White Priority and Custom 1-3 — **only after** Wireshark capture proves each property's slot-write encoding and filmkit's translator is updated
- Optional managed AI proxy (rate-limited, hides API key, becomes Formray-hosted): backend becomes part of V2
- Authenticated community library: Postgres via Supabase managed hosting, accessed via direct postgres client (formray module 12 "Supabase as Infrastructure"), custom JWT auth
- Recipe genealogy graph queries
- WebGL approximation preview for browser-only no-camera users
- PWA offline mode

**V3 — Performance, CLI, mobile fallback** (~3-6 months out):
- WASM crates: RAF parsing, FP1 binary codec written in Rust, called from React via wasm-bindgen
- `filmfork-cli` (Rust + clap): scripting recipe push from terminal, batch operations
- iOS-friendly fallback via SD card "Save/Load Custom Settings" using FP1 export — no WebUSB needed, works on every camera and OS
- Lossless preset capture (full body settings, not just creative recipe)
- Hardened image format support (HEIF, PNG with audited parsers)

---

## 15. Open questions (now structured as ADR-eligible tasks per Codex NM7)

Each open question now has an explicit owner, output artifact, and pass/fail condition. Each becomes an ADR in `docs/decisions/` before V1 ships.

1. **X-M5 protocol coverage.** Owner: project lead. Output: `data/camera-models.json` entry for X-M5 + `docs/camera-compat.md` section. Pass: connected via WebUSB, full V1 manual smoke checklist passes (including round-trip preview). Fail: documented as "untested in V1 — pending Wireshark capture" with no support claim. Path: connect physical X-M5, run filmkit, capture deltas vs X-S20.
2. **Recipe seed list licensing.** Owner: project lead. Output: `data/seed-recipes.json` populated with ≥ 10 entries. Pass: every entry is original or has documented written permission from author. Fail: launch with fewer entries rather than ship without permission. Outreach to Ritchie Roesch is stretch.
3. **AI API key UX.** Resolved per §11: session-only by default, opt-in persistent. Managed proxy is V2.
4. **PWA + offline.** Resolved per §2 + §12: V1 ships installable PWA shell only.
5. **Project name.** Owner: project lead. Output: `docs/trademark.md` with TM/domain search results. Pass: at least one viable non-Fuji name with cleared TM search. Fail: re-brainstorm before public assets. Default working title: **FilmFork**.
6. **Anthropic model defaults.** Resolved: defaults stored in `apps/web/src/lib/ai-config.ts`. Current defaults verified 2026-05-03 against Anthropic docs. Models can be overridden per session.
7. **Hosting.** Resolved: **Vercel** (formray module 12 standard).
8. **Domain.** Pending name resolution (§15.5). Default: subpath under `formray.io/filmfork` for soft launch, then dedicated domain post-TM-check.

### New questions added in R2/R3 (now ADR-eligible per Codex NM7)

9. **Browser/OS/camera firmware support matrix.** Owner: project lead. Output: `docs/browser-matrix.md`. Pass: matrix lists Chrome ≥ 122 + Edge ≥ 122 + macOS 13+ minimum + Android Chrome ≥ 122 + OTG note + dev-time HTTPS/localhost story; each row tested at least once. Fail: ship without and document gaps.
10. **Camera-write failure and restore procedure UX.** Owner: project lead. Output: wireframes + recovery copy in `docs/architecture.md` + reviewed by self before V1. Pass: every error in §6.9 has a recovery prompt; transactional backup behavior is observable in the UI. Fail: no public V1 release until UX is reviewed.
11. **Privacy policy for AI reference images and API keys.** Owner: project lead. Output: `docs/privacy.md` (en + it). Pass: plain-language doc covering localStorage contents, AI image flow, key handling, EXIF policy, third-party (Anthropic) data handling. Fail: blocking — V1 cannot ship without this.
12. **Data export/import/migration plan.** Owner: project lead. Output: export/import implementation + tests + `docs/recipe-format.md` migration section. Pass: round-trip export/import test green; v1→v2 migrator scaffolding present. Fail: no public V1 release.
13. **Bilingual content scope (en/it).** Owner: project lead. Output: en + it message catalogs in `apps/web/src/i18n/`, README.it.md. Pass: every UI string i18n-keyed; both catalogs complete with no missing keys at build time (CI enforced). Fail: launch in English only and document the deviation.
14. **No-telemetry support/debug bundle design.** Owner: project lead. Output: bundle export implementation + `docs/architecture.md#diagnostic-bundle` section. Pass: bundle export tested with redaction verifier; sample bundle attached to a CONTRIBUTING.md issue template. Fail: ship without and add post-V1.
15. **Trademark position on project name, domain, Fuji compatibility language.** Owner: project lead. Output: `docs/trademark.md` with USPTO + EUIPO search results + decision record. Pass: name + domain confirmed safe before public-asset commits. Fail: blocking — public launch waits.
16. **"X-S20 validated" acceptance threshold.** Owner: project lead. Output: recorded session video + diagnostic bundle archive in `docs/decisions/v1-x-s20-validation.md`. Pass: full smoke checklist passes end-to-end with archived artifacts. Fail: V1 cannot claim X-S20 support.

---

## 16. Acceptance — what V1 done means (R3 update for new schema, backup verification, firmware fallback)

Every item in §2 In-V1 maps to an acceptance check below. No new requirements appear here that aren't in §2.

### Code & build
- [ ] Monorepo scaffolded per §4 with all packages and apps
- [ ] CI green: lint, typecheck (strict + R2 flags), test, license-check, csp-check, lighthouse
- [ ] All packages have own LICENSE; NOTICE only in `packages/ptp-fuji` per §13

### `@filmfork/ptp-fuji` + `@filmfork/ptp-fuji-webusb`
- [ ] Forked from pinned filmkit commit (SHA recorded in `UPSTREAM`), NOTICE present
- [ ] Public API per §8 (transport DI, AbortSignal, progress callbacks, typed errors)
- [ ] Transport contract per §8 documented and tested
- [ ] Tests pass: container codec, profile encoding, edge cases, error paths, AbortSignal propagation, fake-transport conformance
- [ ] X-S20 round-trip verified end-to-end (read presets, **slot-selection-gated** transactional backup with verify, write to C2, restore from verified backup, camera-side preview round-trip)

### `@filmfork/recipe-schema`
- [ ] Recipe schema per §5 (filmkit-proven writable subset only — no `dRangePriority`/`longExposureNR`/`lensModulationOptimizer`/extra WB modes / `DRAuto` in V1)
- [ ] **Structured `reasoning` (visualEffect / reason / risk / confidence) per §5 (R5)**
- [ ] **Local Taste Profile schema (R5) — separate Zod schema, opt-in `enabled` gate, TTL field, export/import round-trip tested**
- [ ] **Recipe diff translator (R5) — deterministic rule-based, lookup tables in `packages/recipe-schema/src/diff/`, en + it locales, property-based tests against rule table**
- [ ] Capability-aware translator gated by `writableSlotProperties` whitelist
- [ ] Schema v1 → v2 migration scaffolding present
- [ ] JSON ↔ property bytes round-trip tests pass for X-S20 capability set
- [ ] Explicit codec round-trip test for `AutoAmbiencePriority` (schema) ↔ `AmbiencePriority` (filmkit) WB mode naming

### `@filmfork/ai-agent`
- [ ] All five modes implemented (vibe, reference, refinement, critique, persona-opt-in)
- [ ] **Deterministic confidence rubric enforced** per §7 (post-processing caps; tested)
- [ ] EXIF strip + verifier per §6.2; tests cover JPEG accept, HEIF/PNG/RAW reject, residual-metadata abort
- [ ] Prompt caching enabled
- [ ] Retry/fallback per typed error category
- [ ] Mocked Anthropic tests pass

### Web app
- [ ] Recipe library: browse, filter (capability set, film sim, mood tags), search, favorites
- [ ] Recipe detail view + camera setup walkthrough
- [ ] Recipe editor with capability-aware parameter validation (only `writableSlotProperties` editable)
- [ ] AI Agent panel with explicit consent gates per §6.2 + §11
- [ ] **Camera-side iteration loop UI (R5) per §6.7 — load RAF, AI proposal, camera-rendered JPEG, natural-language feedback, deterministic diff between iterations, history of last 10 iterations (session-only), save chosen iteration to library**
- [ ] **AI iteration constraint test (R5): assert ≥ 90% of refinement-mode iterations change ≤ 5 schema fields**
- [ ] **Recipe diff comparison view (R5) per §6.8 — used in iteration loop, library compare-two-recipes, and push-flow before/after slot view**
- [ ] **Local Taste Profile settings UI (R5) — inspect / edit / export / wipe / opt-in toggle / last-touched indicator**
- [ ] Camera connect button with platform-aware messaging (macOS beta banner)
- [ ] Push to camera with **transactional verified backup** + restore-from-verified-backup UI per §6.3
- [ ] Unknown-firmware confirmation gate UI before any write
- [ ] Manual battery confirmation gate UI per §6.3
- [ ] Camera-side preview pane with side-by-side comparison per §6.4
- [ ] URL share with reasoning excluded by default + 1.5KB cap + file fallback per §6.5
- [ ] Recipe genealogy display (parent/fork attribution)
- [ ] Library export/import (JSON file)
- [ ] Diagnostic bundle export per §6.9
- [ ] Bilingual UI: en + it message catalogs, language switcher
- [ ] WCAG 2.2 AA target met (axe-core + manual audit per §12)
- [ ] Strict CSP per §11 incl. `worker-src`/`manifest-src`; CSP validation in CI
- [ ] Installable PWA shell (no offline cache; PWA Lighthouse score not blocking)

### Camera support
- [ ] X-S20 fw-on-test: full V1 manual smoke checklist passes end-to-end (recorded + diagnostic bundle archived per §15.16)
- [ ] X-M5: tested OR explicitly documented as "untested in V1, pending Wireshark capture"
- [ ] Other Fujifilm bodies: marked "experimental" in capability matrix; unknown-firmware safety mode applies; app surfaces warning

### Documentation
- [ ] README.md (en) + README.it.md
- [ ] ROADMAP.md, CHANGELOG.md, PROGRESS.md, CLAUDE.md
- [ ] docs/recipe-format.md (creative-recipe spec)
- [ ] docs/camera-compat.md (capability sets, tested cameras, contribution flow)
- [ ] docs/macos-beta.md (safer-first sequence per §10)
- [ ] docs/browser-matrix.md (per §15.9)
- [ ] docs/privacy.md (en + it, plain language, per §15.11)
- [ ] docs/trademark.md (per §15.15)
- [ ] docs/architecture.md (incl. accessibility + diagnostic-bundle sections)
- [ ] docs/decisions/ (ADRs for each §15.1–§15.16 question)

### Launch readiness
- [ ] Public deploy live with HTTPS on Vercel
- [ ] LICENSE + NOTICE files in place per §13 corrected policy
- [ ] Trademark search complete, name + domain confirmed safe
- [ ] All §15 questions resolved or explicitly deferred to V2 with rationale

---

## 17. Changelog (R2 → R3)

Driven by Codex adversarial review R2 (`docs/superpowers/codex-review-output-r2.md`).

### Blockers fixed
- **NB1 (schema vs filmkit-writable mismatch):** §5 schema trimmed to filmkit-proven slot-writable subset. Removed `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`. WB modes reduced to filmkit-supported (`Auto`, `AutoAmbiencePriority`, basic modes, ColorTemperature). All removed fields now listed in "explicitly out of V1 schema" with reinstatement criteria pointing to V2. §9 X-S20 capability fixed: `monochromaticColor: true`. §9 adds explicit `writableSlotProperties` whitelist per capability set. §16 acceptance updated.

### Highs fixed
- **NH1 (backup not verified before trusted):** §6.3 now describes transactional verified backup. Backup is read-all + verify-count + verify-critical-fields before mark `verified: true`. Restore offered only on verified backups. §6.6 updated. §16 acceptance updated.
- **NH2 (unknown firmware writes):** §9 adds explicit unknown-firmware policy: read-only by default, writes require explicit "experimental" confirmation gate. §11 threat model updated.
- **NH3 (battery preflight unprovable):** §6.3 replaces automatic battery check with manual confirmation UX gate. Auto-check upgrade is conditional on identifying the property during V1 dev (§15.9).
- **NH4 (EXIF strip underspecified):** §6.2 + §11 specify V1 = JPEG only, decode-to-canvas + re-encode + verifier scan + abort-on-failure. HEIF/PNG/RAW rejected at upload.

### Mediums fixed
- **NM1 (confidence pseudo-precision):** §7 adds deterministic confidence rubric with post-processing caps in `packages/ai-agent/src/confidence.ts`. Tests assert downgrade enforcement.
- **NM2 (error taxonomy gaps):** §6.7 adds `RafFormatInvalid`, `AiPayloadTooLarge`, `AiModelUnavailable`, `PtpTimeout`, `BackupIncomplete`, `FirmwareUnsupported`, `WebUSBUnsupported`. `UsbHttpsRequired` renamed to `WebUSBSecureContextRequired`.
- **NM3 (preview cleanup overreach):** §6.4 step 10 narrowed: only positively-identified handles deleted; RAF upload handle cleanup is best-effort and session-scoped. We never delete pre-existing handles.
- **NM4 (transport contract gaps):** §8 adds explicit transport contract table. Transport owns USB I/O + abort + chunk size + per-op timeout; session owns container pack/unpack + transaction IDs + DATA/RESPONSE boundaries.
- **NM5 (macOS workaround framing):** §10 + new `docs/macos-beta.md` outline use safer-first sequence (quit apps + replug + plain `killall`) before suggesting `-9`. Min macOS version: 13 Ventura.
- **NM6 (CSP incomplete):** §11 expanded CSP to include `worker-src`, `manifest-src`. CSP validation added to CI.
- **NM7 (open questions are placeholders, not plans):** §15.9-15.16 restructured as ADR-eligible tasks with explicit owner/output/pass/fail. Each becomes an ADR in `docs/decisions/` before V1 ships.

### Lows fixed
- **NL1 (Zod version):** §3 updated to Zod 4 (latest stable), with documented exception for Anthropic tool-helper compat.
- **NL2 (model IDs in prose vs config):** §15.6 reworded to "defaults documented here and stored in config".
- **NL3 (NOTICE for all packages):** §13 + §16 narrowed NOTICE requirement to forked/derived packages only (`packages/ptp-fuji`).

### Locked decisions reaffirmed
- B2 (macOS = beta in V1) — no change
- B5 (creative recipe, not lossless) — reaffirmed by NB1 trim (further from lossless, even more honestly creative)
- H10 (FilmFork working title) — no change
- Stack TS V1 — no change

### Honest re-assessment of timeline
R2 said "10 weeks honest baseline + 2 weeks buffer". R3 schema trim and unknown-firmware safety net actually **reduce** scope further (fewer recipe fields to translate; less UI surface). The 10-week baseline is more comfortable now. No timeline change requested; the buffer is a little fatter.

### What was NOT changed despite R2 review feedback
- macOS beta workaround retained as documented fallback (with safer-first sequence per NM5). Pulling V2 helper into V1 still rejected on timeline grounds.
- Full lossless preset capture still V2.
- Managed AI proxy still V2.

---

## 18. Changelog (R3 → R4)

Driven by Codex adversarial review R3 (`docs/superpowers/codex-review-output-r3.md`). Codex verdict: ready-with-two-small-fixes. R4 applies all four findings; spec is now considered converged.

### Blockers fixed
- **NB1 R3 (DRAuto remained in schema without filmkit proof):** §5 `dynamicRange` enum reduced to `["DR100", "DR200", "DR400"]`. §2 deferred row updated to mention "Dynamic Range Auto value". §5 explicitly-out table adds the `DRAuto` value with reinstatement criteria. §16 acceptance updated.

### Highs fixed
- **NH1 R3 (backup did not verify target slot):** §6.3 transactional backup now begins with explicit slot-selection gate: `SetDevicePropValue(D18C, targetSlot)` + readback verification. Mismatch aborts with `BackupIncomplete` and does NOT persist. §16 acceptance checklist now requires "slot-selection-gated transactional backup".

### Mediums fixed
- **NM1 R3 (HEIC UX cliff):** §6.2 EXIF rejection message now platform-aware. iPhone-detected uploads receive specific guidance: Photos app export to JPEG, or Settings → Camera → Formats → Most Compatible. Generic fallback for other formats.

### Lows fixed
- **NL1 R3 (`AutoAmbiencePriority` ↔ `AmbiencePriority` mapping):** §16 acceptance now explicitly requires a recipe-schema codec round-trip test for the WB mode name translation between schema and filmkit.

### What was NOT changed
- All locked decisions (B2 macOS-beta, B5 creative-recipe, H10 FilmFork, TS V1 stack) — unchanged.
- All R1/R2 fixes — unchanged.
- Timeline — Codex's verdict was "yes-with-two-small-fixes" on 10 weeks. R4 closes both. Timeline confirmed: 10 weeks honest baseline + 2 weeks buffer.

### Convergence statement
After three rounds of Codex adversarial review (R1 → R2 → R3) and three iterations of the spec (R2 → R3 → R4), all blockers and high-priority findings are closed or explicitly downgraded with rationale. The §15 open questions are now structured as ADR-eligible tasks with owner/output/pass-fail. Schema is restricted to filmkit-proven slot-writable fields. Backup transaction is verified at the target-slot level. macOS is honestly beta. EXIF stripping is narrow and safe. Confidence is deterministically capped where the model cannot truly know.

The spec is ready for `superpowers:writing-plans` to produce the implementation plan.

---

## 19. Changelog (R4 → R5) — Innovation Pass

User-driven (not Codex-driven) revision. Adds the differentiating product layer without expanding V1 scope into accounts/community/backend and without changing locked stack or scope decisions.

### What's added

1. **Camera-side iteration loop (§1, §2, §6.7, §7, §16)** — the headline V1 workflow: AI proposes a starting recipe, camera renders the real JPEG, user gives natural-language feedback ("warmer", "less digital"), AI changes a small targeted parameter set (1-3 typical, ≥ 90% iterations change ≤ 5 fields per acceptance), camera re-renders, deterministic diff displayed before commit. Iteration history is session-only (last 10), not persisted. Camera = rendering engine; AI = assistant; user = editor.
2. **Recipe diff & visual comparison (§2, §6.8, §16)** — deterministic, rule-based, lookup-table-driven (NOT AI). API: `diffRecipes(a, b, locale)` returns parameter deltas annotated with localized human-readable visual impact ("WB shift +R/+B → warmer magenta cast"). en + it locales. Used in iteration loop, library compare, push flow.
3. **Structured per-parameter explanation (§5)** — `reasoning` array entries upgraded from flat `explanation` to three fields: `visualEffect` (what it does, ≤ 200 chars) + `reason` (why chosen, ≤ 300 chars) + optional `risk` (when it fails, ≤ 200 chars) + `confidence`. Total payload caps preserved (max 40 entries, total still excluded from URL share by default).
4. **Local Taste Profile (§5, §6.2, §7, §11, §16)** — replaces vague "persona" with a structured Zod schema (tonePreference, grainTolerance, contrastPreference, preferredFilmSimulations, avoidedFilmSimulations, shootingContexts, notes). Stored in localStorage at `filmfork-taste-profile-v1`. **Opt-in via `enabled: true` field, off by default**. AI uses it as system-prompt context only when enabled, after sanitization. 90-day TTL on `lastTouchedAt`. First-class settings UI: inspect / edit / export / wipe. Included in library export/import.
5. **Innovation positioning (§1)** — "FilmFork is not only a recipe browser; it is a camera-backed look lab for iterating toward a personal Fuji style." Single sentence opening §1, no marketing bloat elsewhere.

### Section numbering changes

- §6.7 was "Typed error taxonomy" → moved to §6.9
- §6.7 is now "Camera-side iteration loop" (R5 new)
- §6.8 is now "Recipe diff & visual comparison" (R5 new)
- §6.9 is now "Typed error taxonomy" (was §6.7)
- All cross-references updated

### What's NOT changed (locked constraints from user)

- V1 stack: TypeScript / React 19 / Vite / Tailwind v4 / Zustand / Zod 4 / Vitest — unchanged
- macOS = beta in V1 — unchanged
- `.ffr.json` = creative recipe subset — unchanged (Taste Profile is separate)
- Schema = filmkit-proven writable fields only — unchanged (no new camera parameters added)
- No accounts, no community marketplace, no backend, no managed AI proxy in V1 — unchanged
- Privacy posture — unchanged or stronger: iteration RAF stays in browser, never uploaded to AI; iteration history session-only, not persisted; Taste Profile opt-in with sanitization before prompt injection

### What's still V2

- Tauri macOS helper (unchanged)
- Lossless preset capture (unchanged)
- Authenticated community library (unchanged)
- Managed AI proxy (unchanged)
- Iteration loop with no-camera fallback (V1 requires connected camera for the render step; WebGL approximation for the no-camera case is V2)
- Cross-session iteration history (V1 = session-only)
- Cross-session Taste Profile sync (V1 = local-only)

### Implementation impact

- `packages/recipe-schema` adds: `taste-profile.ts`, `diff/` subdirectory with rule tables (en + it) and `diffRecipes()` API
- `packages/ai-agent` adds: iteration-mode system prompt with "change a small targeted parameter set" constraint, Taste Profile injection (sanitized) when `enabled: true`, structured explanation generator (visualEffect / reason / risk)
- `apps/web` adds: iteration loop pane, recipe diff component, Taste Profile settings UI
- All changes additive; no refactor of validated R4 surfaces

### Timeline impact

The original 10-week + 2-week buffer accounted for AI agent + camera-side preview + library/editor. Iteration loop composes existing surfaces (AI + preview + diff). Recipe diff is small, deterministic, well-bounded. Taste Profile is a small Zod schema + settings UI. Net add: ~1 week of work, absorbed into the existing 2-week buffer. **Timeline target preserved: 10 weeks + 2 buffer.** If absorption proves optimistic during Phase 5 execution, candidate cut: defer iteration history "save and compare last 10" → V2, ship V1 with last-3 only.

---

*End of design spec R5. Innovation pass applied. Ready for Codex validation pass before resuming `superpowers:writing-plans`.*
