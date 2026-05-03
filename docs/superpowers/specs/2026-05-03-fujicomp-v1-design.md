# FilmFork V1 — Design Spec (R2)

**Status:** Draft awaiting user review (revised after Codex adversarial review R1)
**Date:** 2026-05-03 (revised same day)
**Author:** Giuseppe Albrizio + Claude (brainstorming session)
**Project working title:** FilmFork (final naming subject to trademark check — see §15.5)
**Previous title:** FujiComp (deprecated due to trademark exposure with Fujifilm — see §15.5)

---

## 1. Vision

An open-source web platform for photographers using Fujifilm cameras to discover, create, and apply film simulation recipes. Differentiated from existing tools (fujilab.vercel.app, fuji-x-weekly, FUJISTYLE) by four properties working together:

1. **AI agent** that proposes a plausible starting recipe from a text vibe or reference photo, with multi-turn refinement, per-parameter reasoning, and explicit confidence indicators. The agent is positioned as a starting point for camera-side iteration, not an exact match.
2. **Direct browser-to-camera push** via WebUSB on Linux, Windows, and Android Chrome (with OTG cable). macOS supported as an experimental/beta path in V1; first-class macOS support arrives in V2 via a signed native helper.
3. **Camera-side live preview** — the camera itself processes the JPEG with the recipe applied, returning pixel-accurate output. This is the camera's real image processor, not a WebGL approximation.
4. **Open creative-recipe spec** with provenance — fork tree, attribution, remix lineage encoded in the format. The schema captures the look-affecting subset of camera settings; lossless full-preset capture is V2.

V1 success criteria: recipe library + AI generator + push to camera (with backup/restore) + camera-side preview, deployed publicly, validated end-to-end on Fujifilm X-S20 (already confirmed during validation session 2026-05-03). Public launch in 10 weeks honest baseline, +2 weeks buffer.

---

## 2. Scope

### In V1

| Capability | Detail | Platform notes |
|---|---|---|
| Recipe library | Browse, filter (by film sim, capability set, mood tags), search, share via URL hash, favorites | All supported browsers |
| Recipe detail view | All settings rendered with validation per camera capability set + camera setup walkthrough | All |
| AI Recipe Agent | Multi-turn dialog from text vibe or reference photo, structured Recipe JSON via Claude tool use, per-parameter reasoning + confidence, critique mode on user's photos | All |
| WebUSB connect | Chrome/Edge ≥ 122 desktop on Linux/Windows; macOS = experimental/beta; Chrome ≥ 122 on Android via OTG = experimental | See §9 + §10 |
| Read presets | C1-C7 or C1-C4 depending on body | All |
| Push to camera | Pre-flight checks → backup current slot to local storage → translate Recipe to property writes via PTP `SetDevicePropValue` → fail-loud on first error → manual "restore from backup" available when connection healthy | See §6.3 |
| Camera-side preview | Send RAF via Fuji vendor ops → camera processes → download JPEG, side-by-side or split-slider | See §6.4 |
| Recipe genealogy | Parent-child fork attribution stored in Recipe JSON | All |
| Open spec | `.ffr.json` — versioned creative-recipe format with capability metadata | All |
| Camera capability matrix | Per-body capability set in `data/camera-models.json` (see §9) | All |
| Diagnostic bundle | Manual export of redacted local logs + browser/camera/firmware capture for issue reporting | All |
| Library import/export | Full export/import of user library JSON for portability and backup | All |
| Bilingual UI | English + Italian, with i18n architecture supporting more languages later | All |

### Out of V1 (explicitly deferred to V2 or later)

| Deferred | Why | Target |
|---|---|---|
| First-class macOS support | Requires signed/notarized native helper to manage `ptpcamerad` cleanly. Real engineering surface — not "in V1" honest. | V2 |
| Full atomic write rollback | PTP multi-property writes cannot be made atomic over USB. V1 uses backup-and-restore-on-demand instead. | Never (out by physics); backup/restore covers it |
| Lossless full-preset capture | Schema in V1 is creative-recipe subset. Full lossless capture (Image Size, Quality, Color Space, all body-specific menus) requires per-body RE. | V2 if user demand justifies |
| Authenticated community sharing / accounts | Backend, auth, moderation surface. V1 = local + URL-based + import/export only. | V2 |
| Managed AI proxy | V1 = bring-your-own-key, session-only by default. Managed proxy with rate-limiting is a backend project. | V2 |
| WebGL approximation preview when no camera connected | Adds complexity and a "this is approximate" caveat conflicts with our positioning. V1 shows "camera required" state. | V2 |
| iOS support | Safari has no WebUSB. V1 documents SD card / FP1 fallback; no UI for it. | V3 (FP1 export path) |
| WASM perf crates (RAF, FP1) | Premature optimization. | V3 |
| `fuji-cli` Rust CLI | Power-user nice-to-have. | V3 |
| PWA offline mode | V1 ships installable PWA shell; no offline cache. Lighthouse PWA score is NOT a release blocker. | V2 |

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
| Validation | Zod ≥ 3.23 | Exact in lockfile |
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
│       └── codex-review-prompt-r1.md  # review artifact for reproducibility
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
    │   ├── ptp-fuji/              # MIT, pinned-commit fork of filmkit
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
    │   ├── ptp-fuji-webusb/       # MIT, browser-coupled helpers (DOM, Blob, Chrome WebUSB transport)
    │   │   ├── src/
    │   │   ├── tests/
    │   │   ├── LICENSE (MIT)
    │   │   └── package.json
    │   ├── recipe-schema/         # MIT, Zod schemas + creative-recipe codec
    │   │   ├── src/
    │   │   │   ├── recipe.ts
    │   │   │   ├── translate/    # Recipe ↔ camera property bytes
    │   │   │   ├── migrations/   # schemaVersion v1→vN migrators
    │   │   │   └── index.ts
    │   │   ├── tests/
    │   │   ├── LICENSE (MIT)
    │   │   └── package.json
    │   └── ai-agent/              # MIT, Claude API wrapper + prompts
    │       ├── src/
    │       │   ├── prompts/
    │       │   ├── modes/         # vibe | reference | refinement | critique
    │       │   ├── confidence.ts  # confidence/uncertainty model
    │       │   └── index.ts
    │       ├── tests/
    │       ├── LICENSE (MIT)
    │       └── package.json
    ├── data/
    │   ├── seed-recipes.json      # original or explicitly permitted only (see §13)
    │   └── camera-models.json     # capability matrix (see §9)
    ├── docs/
    │   ├── recipe-format.md       # creative-recipe JSON spec (renamed from ffr-format)
    │   ├── camera-compat.md       # tested cameras, capability sets, known issues
    │   ├── macos-beta.md          # macOS workaround for power users (was ptpcamerad-workaround)
    │   ├── browser-matrix.md      # supported browsers, versions, platforms, dev story
    │   ├── privacy.md             # explicit privacy policy
    │   ├── trademark.md           # naming/domain trademark position
    │   ├── architecture.md
    │   └── decisions/             # ADRs
    ├── .ops/                      # gitignored, formray module 04 pattern
    ├── .github/workflows/         # CI: lint, typecheck, test, license-check
    ├── README.md (en)
    ├── README.it.md
    ├── CHANGELOG.md
    ├── ROADMAP.md
    ├── PROGRESS.md
    ├── local agent notes
    └── LICENSE                    # AGPL-3.0
```

Conventions:
- npm workspaces, all packages under `packages/`, all apps under `apps/`
- Path aliases: `@/*` for app source, package imports use `@filmfork/*` workspace names
- No barrel exports
- Strict TS across every package, shared `tsconfig.base.json`

---

## 5. Data model — Recipe (creative-recipe subset)

`.ffr.json` is a **creative recipe** format — the look-affecting subset of camera settings. It is not a lossless full-preset capture. Lossless preservation of body-level settings (Image Size, Image Quality, Color Space, Auto-Update behavior, etc.) is V2 if demand justifies it.

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
export const DRangePriority = z.enum(["Off", "Auto", "Weak", "Strong"]);

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
  cameraGeneration: z.string().optional(),      // e.g. "X-Trans-IV" — descriptive metadata only

  // Look-affecting parameters (validated against capability set at apply time)
  filmSimulation: FilmSimulation,
  monochromaticColor: z.object({                // applies only to monochrome film sims
    warmCool: z.number().int().min(-9).max(9),  // WC
    greenMagenta: z.number().int().min(-9).max(9), // MG
  }).optional(),
  dynamicRange: z.enum(["DR100", "DR200", "DR400", "DRAuto"]),
  dRangePriority: DRangePriority.optional(),
  whiteBalance: z.object({
    mode: z.enum([
      "Auto", "AutoWhitePriority", "AutoAmbiencePriority",
      "Custom1", "Custom2", "Custom3",
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
  longExposureNR: z.boolean().optional(),
  clarity: z.number().int().min(-5).max(5),
  grainEffect: z.object({
    strength: TriState,
    size: z.enum(["Small", "Large"]),
  }),
  colorChromeEffect: TriState,
  colorChromeEffectBlue: TriState,
  smoothSkinEffect: TriState.optional(),
  lensModulationOptimizer: z.boolean().optional(),

  // AI-generated reasoning (optional, excluded from URL share by default)
  reasoning: z.array(z.object({
    parameter: z.string(),
    explanation: z.string().max(500),
    confidence: z.enum(["low", "medium", "high"]).optional(),
  })).max(40).optional(),
});

export type Recipe = z.infer<typeof Recipe>;
```

### Explicitly out of recipe schema (body-level, not creative-look)

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

Recipes are versioned (`schemaVersion: 1`). `packages/recipe-schema/src/migrations/` will hold v1→v2 migrators when v2 ships. Recipes from older schema versions parse through the migrator chain before validation. Recipes from newer schema versions are rejected with a clear "update FilmFork to read this recipe" error.

---

## 6. Key flows

### 6.1 Connect camera

1. User clicks **Connect camera** (visible only on browsers with WebUSB)
2. App calls `navigator.usb.requestDevice({ filters: [{ vendorId: 0x04CB }] })`
3. **On Linux/Windows/Android Chrome:** primary path. Connect proceeds normally.
4. **On macOS:** banner before opening picker explains: "macOS support is experimental in V1. The system's `ptpcamerad` service may block the camera. Power-user workaround: see Beta guide. First-class macOS support arrives in V2 via a signed helper." Link to `docs/macos-beta.md`.
5. After pairing, `@filmfork/ptp-fuji` runs `OpenSession` → `GetDeviceInfo` (reads model + firmware version) → reads C1-Cn presets
6. Capability set looked up from `cameraModel + firmwareVersion` (see §9)
7. Active recipes loaded into `useCameraStore`; the user is informed of any unrecognized properties

Error handling: if `OpenSession` reports session already open, app prompts user to disconnect/reconnect. If model is unknown, app marks session as "experimental — at your own risk" and proceeds with best-effort capabilities.

### 6.2 AI recipe generation

1. User opens AI Agent panel: text input + photo drop zone
2. **Privacy gate:** if photo is dropped, app shows explicit consent: "This image will be sent to Anthropic for analysis. EXIF data will be stripped before upload. Continue?" Yes/No.
3. On consent, EXIF stripped client-side; image resized/recompressed to ≤ 1MB before transmission
4. App calls Claude Sonnet 4.6 (default, see §15.6) with the Recipe schema as a tool input, vision input if image present, prompt caching enabled per formray module 16
5. Streamed response: per-parameter reasoning text with confidence indicators; final tool call materializes the Recipe atomically
6. Recipe parsed and validated via Zod against the user's selected capability set
7. Multi-turn refinement: user types follow-up ("more shadow detail"), agent iterates on previous Recipe with delta reasoning
8. The UI explicitly frames AI output as a **starting recipe**, not a match — with "Refine on camera with live preview" as the next-step CTA
9. On Anthropic API failure: typed error category (rate limit / network / 4xx / 5xx) with user-facing recovery copy
10. **Persona** (opt-in only, V1): user can save preferences ("portraits, warm tones") to localStorage. One-click wipe is in settings. Off by default. No persistent BYO API key in localStorage by default — see §11.

### 6.3 Push recipe to camera (with backup, no rollback claim)

1. User selects a recipe and a target slot (C1-C4 on X-S20, C1-C7 on bigger bodies)
2. **Pre-flight checks:**
   - Camera battery level read via PTP — abort with warning if below 30%
   - Camera mode confirmed compatible (USB RAW Conv./Backup Restore)
   - PTP session healthy (ping by reading a known property)
3. **Backup:** read full current state of target slot (`D18C` selector + all `D18E…D1A5` properties), persist to localStorage as a `SlotBackup` keyed by camera serial + slot + timestamp, retain last 10 backups per slot
4. **Translate** Recipe to property writes via `@filmfork/recipe-schema`'s capability-aware translator
5. **Write** in canonical order: switch slot → write each property → rename slot → close. Each write checked. On first error, **stop**, do **not** attempt rollback (writes are not atomic over USB; mid-write disconnect or stall makes rollback unreliable). Display: "Write failed at property X. Slot may be in an inconsistent state. To restore the previous values, ensure the camera is connected and click Restore from backup."
6. On success: "Recipe is now in slot C2. Switch your camera dial to C2 to use it."
7. **Restore from backup** is available any time the camera is connected and healthy. Backups are listed by timestamp + recipe name. Restore performs the same write loop in reverse.
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
10. Cleanup: `DeleteObject` only on the known temporary objects (the RAF upload + the JPEG output), never on pre-existing handles

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
| Disconnect during `Push` | Stop, mark slot "may be inconsistent", offer Restore-from-backup as soon as reconnected |
| Disconnect during `Preview` | Discard partial result; surface "Connection lost during preview" error |
| Disconnect during `Read presets` | Re-attempt connect; if fails 3x, surface "Camera unreachable" and clear stale state |
| USB stall (camera unresponsive but technically connected) | Timeout per operation (default 30s), abort the in-flight op, mark session degraded, offer reconnect |
| Camera in wrong mode mid-flow | Detect via property read failure; show "Camera left RAW Conv. mode" and ask user to reset |

### 6.7 Typed error taxonomy

`@filmfork/ptp-fuji/errors.ts` exports:

```ts
type FilmForkErrorCategory =
  | "PtpSessionAlreadyOpen"
  | "PtpDeviceBusy"
  | "PtpUnsupportedOperation"
  | "PtpStall"
  | "UsbDisconnect"
  | "UsbPermissionDenied"
  | "UsbHttpsRequired"
  | "CameraInWrongMode"
  | "CameraBatteryLow"
  | "CameraUnknownModel"
  | "WriteFailed"
  | "RestoreFailed"
  | "ConversionFailed"
  | "AiRateLimit"
  | "AiNetwork"
  | "AiAuth"
  | "AiServer"
  | "RecipeSchemaInvalid"
  | "RecipeCapabilityMismatch"
  | "RecipeUrlPayloadTooLarge";
```

Every error surfaced in the UI maps to a category, which maps to a recovery prompt and a "Copy diagnostic bundle" button.

---

## 7. AI agent design (revised positioning)

V1 capabilities, with explicit confidence framing:

| Mode | Input | Output | Honest framing |
|---|---|---|---|
| **One-shot from vibe** | Text only | Recipe + per-parameter reasoning + confidence | "This is a plausible starting recipe. Refine on camera." |
| **One-shot from reference** | Photo (vision input, with explicit consent) | Recipe matching general look characteristics + confidence (typically lower, see below) | "Photos contain lighting, lens, and edit information that camera recipes can't fully match. Use this as a direction, not a copy." |
| **Multi-turn refinement** | Previous Recipe + follow-up text | Adjusted Recipe + delta explanation | "I changed X and Y because…" |
| **Critique mode** | Recipe + user photos shot with it | Suggested tweaks + reasoning | "Try lifting shadows by +0.5 — your blacks look crushed in these shots." |
| **Persona-aware (opt-in)** | Same as above + localStorage history | Recipe biased toward user's expressed preferences | Explicit opt-in, one-click wipe |

### Confidence model

Every AI-generated recipe carries a `reasoning[].confidence: "low" | "medium" | "high"` per parameter. Confidence is set by the AI based on:

- **High** — parameter is well-determined by the input (e.g. "warm look" → +R WB shift)
- **Medium** — parameter is plausible but underdetermined (e.g. exact clarity value from a photo)
- **Low** — parameter is essentially a guess (e.g. inferring grain from a low-res reference)

The UI surfaces these. Photo-reference mode defaults to medium-or-low confidence on most numeric parameters because rendered images cannot uniquely determine recipe values (lighting, lens, exposure, edit, display transform all confound).

### Implementation patterns (formray module 16 alignment)

- **Prompt caching:** static system prompts and the Recipe schema cached per Anthropic's prompt-caching API
- **Retry/fallback:** exponential backoff on rate limit; fallback to non-vision flow if vision fails; user-facing typed error per §6.7
- **Rate/cost controls:** soft per-session budget warning (e.g. ≥ $0.50/session) with opt-in to continue
- **Prompt-injection treatment:** reference photos are vision input only; user text is sandboxed; tool-use schema is the only writeable surface
- **Memory TTL:** persona snippets expire after 90 days unless touched; explicit "wipe persona" in settings

### API key handling (revised)

- **Default V1:** session-only entry. User pastes key on first AI call; key held in memory only. Cleared on tab close.
- **Opt-in persistent:** "Remember key on this device" checkbox, with explicit risk text: "Stored in localStorage, accessible to browser extensions, dev tools, and shared-device users. We recommend session-only on shared devices." One-click wipe in settings.
- **No key in URL params, never.** No key ever leaves the browser except in the `Authorization` header to `api.anthropic.com`.
- **Browser SDK note:** `@anthropic-ai/sdk` requires `dangerouslyAllowBrowser: true` for browser use. We set it explicitly with the consent gate above.

### Image handling for AI reference/critique

- EXIF stripped client-side before upload
- Resize to max edge 2048px and recompress to JPEG ≤ 1MB
- Sent to Anthropic only after explicit per-image consent
- No retention on our side (we have no backend in V1)
- Anthropic's data handling is governed by their commercial terms; documented in `docs/privacy.md`

V2 plan: cross-session persona with auth, reference library lookup, agent memory of community recipes the user liked, optional managed proxy that hides API key.

---

## 8. PTP layer extraction strategy (revised)

filmkit (MIT) is the foundation. Pinned-commit fork strategy:

1. **Pin** to a specific commit SHA (recorded in `packages/ptp-fuji/UPSTREAM`), not "latest release" — filmkit may not publish stable tags consistently
2. **Copy** filmkit's `src/ptp/`, `src/profile/`, `src/util/binary.ts` into `packages/ptp-fuji/src/`
3. **License & attribution:** `LICENSE` (MIT), `NOTICE` crediting eggricesoy and the upstream RE chain (rawji, fudge, libgphoto2, ISO 15740). README explicitly states "FilmFork is an independent fork; not endorsed by or affiliated with filmkit's authors."
4. **Repackage** as two packages:
   - `@filmfork/ptp-fuji` — pure protocol logic, NO browser/DOM dependencies. Returns `Uint8Array`. Accepts a `PtpTransport` interface via DI.
   - `@filmfork/ptp-fuji-webusb` — browser-coupled adapter: implements `PtpTransport` over WebUSB, provides `Blob` helpers
5. **Public API** of `@filmfork/ptp-fuji`:

   ```ts
   export interface PtpTransport {
     send(data: Uint8Array, signal?: AbortSignal): Promise<void>;
     receive(signal?: AbortSignal): Promise<Uint8Array>;
     close(): Promise<void>;
   }

   export class FujiCameraSession {
     constructor(transport: PtpTransport, options?: { onProgress?: (p: Progress) => void });
     readonly state: "open" | "closed" | "degraded";
     readonly capabilities: CameraCapabilities; // populated after open()
     open(signal?: AbortSignal): Promise<void>;
     getDeviceInfo(signal?: AbortSignal): Promise<DeviceInfo>;
     getPreset(slot: number, signal?: AbortSignal): Promise<RawPreset>;
     setPreset(slot: number, preset: RawPreset, signal?: AbortSignal): Promise<void>;
     convertRaf(raf: Uint8Array, profile: ProfileBytes, signal?: AbortSignal): Promise<Uint8Array>; // returns JPEG bytes, no Blob
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
   - Typed errors thrown per §6.7

6. **Tests** (Vitest): PTP container pack/unpack, profile field encoding, edge cases (HighIsoNR non-linear table, monochrome film sim restrictions, ColorTemperature requires WB=ColorTemp), error paths, AbortSignal propagation
7. **Document** the protocol in `packages/ptp-fuji/docs/protocol.md` — link filmkit's `QUICK_REFERENCE.md`, but write our own with the vendor opcodes called out (per §6.4)
8. **Upstream tracking script:** `scripts/check-filmkit-upstream.ts` diffs our pinned SHA against filmkit `main`, surfaces deltas, opens a tracking issue. Manual merge decision per delta. We do NOT open PRs upstream (filmkit policy).
9. **Community contribution path:** new-camera support flows to FilmFork via Wireshark capture submitted as issues, not PRs to filmkit

License compatibility:
- filmkit is MIT → we can fork with attribution
- Our app is AGPL-3.0 → fine, MIT inputs are upstream-compatible
- Our `@filmfork/ptp-fuji*` packages are MIT → keeps them usable by other future Fuji tools
- License-compatibility check in CI verifies no AGPL bleed into MIT packages

---

## 9. Camera compatibility approach (revised axis)

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
        "monochromaticColor": false,
        "dRangePriority": true,
        "longExposureNR": true,
        "lensModulationOptimizer": true
      },
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
- If exact set found: load full capability matrix
- If model known but firmware unknown: fall back to nearest known firmware, mark session "best-effort", surface warning
- If model unknown: mark session "experimental", load minimal-baseline capabilities, surface warning
- Recipe Editor greys out parameters not in the active capability set
- Recipes carry their authoring `capabilitySetId`; loading a recipe targeted at a different set surfaces a compatibility report

New camera support workflow:
1. Issue: "Add support for X-T50 fw1.00"
2. Contributor captures Wireshark traffic with Fuji X RAW Studio (per filmkit README)
3. Submit `.pcapng` + proposed capability set entry as issue (not PR to filmkit; PR to FilmFork)
4. Maintainer validates and merges

V1 testing commitment:
- **Tested:** X-S20 fw1.10 — full end-to-end including round-trip preview
- **Pending:** X-M5 — must be physically tested before claiming support; documented as "untested" in V1 if not done by launch
- **Experimental:** all other Fuji bodies — protocol may work (filmkit was X100VI-tested) but FilmFork makes no claim

---

## 10. macOS path in V1 (revised)

V1 macOS is **explicitly experimental/beta**. This is a scope cut, not a hand-wave.

**V1 official happy-path platforms:**
- Linux + Chrome ≥ 122 / Edge ≥ 122 (primary)
- Windows + Chrome ≥ 122 / Edge ≥ 122 (primary)
- Android + Chrome ≥ 122 + USB OTG cable (experimental — see browser matrix)

**V1 macOS:** documented power-user workaround in `docs/macos-beta.md`. The web app detects macOS and shows a banner: "macOS support is experimental in V1 because of how the system manages USB cameras. You can try a workaround (link), or wait for V2 which will include a signed helper to fix this properly." Connect button still works for users who want to try.

The workaround documents:
- What `ptpcamerad` is and why it interferes
- The `sudo killall -9 ptpcamerad` + click-within-1-second technique
- Why we don't auto-disable it (security/permissions)
- "Help wanted: V2 helper"

**V2 plan (deferred from R1, no scope changes here):**
- Tauri 2.0 native helper, Developer ID signed + notarized via formray module 13 (entitlements TBD, signing pipeline `build_pkg.sh` per module 13)
- Listens on localhost WebSocket
- On request: `launchctl unload com.apple.PTPCamera`, holds offline for the session
- On disconnect: `launchctl load` to restore
- Web app auto-detects helper at `ws://localhost:7777` and uses it transparently
- Distribution: signed `.pkg` for MDM-friendly install, `.dmg` for direct download

This is its own milestone. Timeline: ~4-6 weeks after V1 ships.

---

## 11. Security & privacy (revised)

| Concern | V1 posture |
|---|---|
| Accounts | None |
| Telemetry / analytics | None — no third-party scripts in V1 |
| Storage | localStorage only; explicit list documented in `docs/privacy.md` (favorites, persona snippets opt-in, last-seen version, slot backups, UI prefs) |
| WebUSB | HTTPS-only (or `localhost` for dev), user gesture per session, vendor-filtered to Fujifilm only |
| AI API key | **Session-only by default**, in memory only. Persistent localStorage opt-in with explicit risk text + one-click wipe. Never in URL params. Never logged. |
| AI reference images | Sent to Anthropic only after **explicit per-image consent**. EXIF stripped client-side. Resized + recompressed to ≤ 1MB. No retention on our side. Anthropic data handling per their commercial terms — linked in `docs/privacy.md`. |
| RAF preview images | **Local only.** RAF round-trips camera→browser→camera. Never sent to any server. This is enforced by code: the conversion path uses `@filmfork/ptp-fuji`, not the AI agent. |
| URL share | Recipe payload only, no user identifiers, no `reasoning` by default, capped at 1.5KB compressed |
| Recipe URL push | Cannot push to camera in one click. Save to library first, then push (with confirm). Capability matrix re-validation before any write. |
| External fonts | Self-hosted (Inter or Geist via npm) — no Google Fonts, no third-party CDN |
| CSP | Strict CSP: `default-src 'self'`, `connect-src 'self' https://api.anthropic.com`, `img-src 'self' blob: data:`, `script-src 'self'` |
| Diagnostic bundle | Manual export (no auto-upload). Includes browser/OS/firmware/error log; redacts API key, EXIF, image content |
| Dependencies | Lockfile committed, `npm audit` in CI, license-compatibility check in CI |

### Threat model

| Threat | Mitigation |
|---|---|
| Malicious recipe URL → unwanted camera write | Save-to-library required before push; capability matrix re-validation; explicit user confirmation gate |
| Malicious recipe URL → resource exhaustion | URL payload size cap; reasoning array cap; tags/strings length caps |
| AI prompt injection from reference photo | Vision input is treated as image only; tool-use schema is the only writeable surface; user text is sandboxed |
| API key extraction via XSS | Strict CSP; no inline scripts; key is session-only by default |
| Stolen localStorage on shared device | Persistent key opt-in with risk text; one-click wipe; persona opt-in |
| Compromised npm dependency | Lockfile + `npm audit` CI; minimal dep tree (Vite + React + a few others) |

### Data export & portability

Users can export their full library (recipes + persona + favorites + slot backups) to a JSON file at any time, and re-import it. This is the only "backend" feature in V1.

---

## 12. Testing strategy

| Layer | Tool | Coverage target |
|---|---|---|
| Unit (`recipe-schema`) | Vitest | 100% on parsers/codecs, edge cases per parameter, JSON ↔ camera-property round-trip, schema migration tests |
| Unit (`ptp-fuji`) | Vitest | Container pack/unpack, profile patch, encoding tables (HighIsoNR, monochrome restrictions), error paths, AbortSignal propagation, transport interface stubs |
| Unit (`ai-agent`) | Vitest with mocked Anthropic SDK | Prompt construction, tool call schema, recipe validation post-response, confidence assignment, retry behavior |
| Component (web) | Testing Library | Library filter/search, Recipe editor parameter validation, Camera connect button states, error UI per category, i18n string presence |
| Accessibility | Vitest + axe-core + manual audit | WCAG 2.2 AA target. Keyboard matrix (every interactive element reachable), screen-reader states for sliders, progress indicators, error toasts. Documented in `docs/architecture.md#accessibility` |
| Integration (real camera) | Manual smoke checklist + recorded session | Pre-release: connect X-S20, read C1-C4, write to C2 with backup, restore from backup, camera-side preview round-trip, AI generate. Session recorded with diagnostic bundle for reproducibility. |
| Performance | Lighthouse CI | Performance ≥ 90, Accessibility ≥ 95. **PWA score is NOT a release blocker** (V1 ships installable shell only). |
| Browser matrix | Manual + browserstack-equivalent | Linux Chrome ≥ 122, Linux Edge ≥ 122, Windows Chrome ≥ 122, Windows Edge ≥ 122, macOS (best-effort beta), Android Chrome ≥ 122 OTG (experimental) |
| Type safety | `tsc --noEmit` in CI | Zero errors, strict mode flags from §3 |
| Lint | ESLint + Prettier | Zero warnings in CI |
| License compatibility | `license-checker` in CI | No AGPL bleed into MIT packages, all deps compatible with AGPL-3.0 / MIT split |

Real-camera integration tests in CI are deferred to V2 (CI hardware impractical solo). V1 manual checklist is the gate.

---

## 13. License, attribution, and trademark

| Artifact | License |
|---|---|
| `apps/web` (the FilmFork app) | AGPL-3.0 (formray default for products) |
| `packages/ptp-fuji` | MIT (matches filmkit upstream, no DOM deps) |
| `packages/ptp-fuji-webusb` | MIT (browser adapter) |
| `packages/recipe-schema` | MIT |
| `packages/ai-agent` | MIT |
| `data/seed-recipes.json` entries | original or **explicitly permitted only** (see below) |

### Recipe seed list policy

V1 ships only:
- **Original recipes** authored by the project (10-15 starter recipes covering common looks)
- **Explicitly permitted recipes** with written consent from the original author, attributed in the `author` field

V1 does NOT bundle community recipes from fuji-x-weekly or similar without written permission, even though individual settings are factual. This is a policy choice to avoid takedowns and bad community relations. Users can import any recipe via paste/file/URL — that's their action, not our distribution.

Outreach to Ritchie Roesch (Fuji X Weekly) and similar community sources is V1 stretch goal, not blocker.

### Fork attribution (filmkit)

`packages/ptp-fuji/NOTICE` includes the full RE chain (filmkit, rawji, fudge, libgphoto2, ISO 15740) and explicitly states FilmFork is an independent fork, not endorsed by or affiliated with filmkit's authors. The MIT license is sufficient legal authorization for the fork; the NOTICE is for community good citizenship.

### Trademark position

**FilmFork** is a working title. Final naming is subject to:
1. USPTO + EUIPO trademark search before public assets/domain
2. Domain availability check
3. Formray brand-vocabulary alignment review (formray brand keywords: field, ray, space, gravity, signal, trace, archive, craft, precision, warmth)

**Fuji-prefixed names rejected** ("FujiComp", "FujiPress", "FujiCast"): trademark exposure with Fujifilm Holdings Corporation is real even for open source. Formray's brand voice also avoids overt vendor branding.

Compatibility language in marketing/UI: "FilmFork is for Fujifilm cameras" or "compatible with Fujifilm X-series", **never** "Fujifilm FilmFork" or any phrasing that implies endorsement.

`docs/trademark.md` documents the position, the search results when done, and the public statement we use.

---

## 14. V2 / V3 roadmap (notes only, not in V1)

**V2 — macOS first-class + community library** (~6-10 weeks after V1 ships):
- Tauri 2.0 wraps the same React UI; Rust backend uses libusb directly (no WebUSB constraints)
- Auto-managed `ptpcamerad` (launchctl unload/load lifecycle); see formray module 13 for distribution
- Background camera watch — auto-pull settings on connect
- Filesystem integration: watch a drop folder for RAFs
- Distribution: signed + notarized `.pkg` and `.dmg` via formray module 13 build pipeline
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

---

## 15. Open questions (must resolve before locking the implementation plan)

1. **X-M5 protocol coverage.** Resolution path locked: connect X-M5 in next session, run filmkit, capture deltas vs X-S20. If filmkit's X100VI-tested protocol covers X-M5: add capability set, ship as supported. If not: defer X-M5 to a post-V1 release with Wireshark capture, ship V1 X-S20-only.
2. **Recipe seed list licensing.** Resolved per §13: V1 ships originals + explicit permissions only. Outreach to Ritchie Roesch is stretch, not blocker.
3. **AI API key UX.** Resolved per §11: session-only by default, opt-in persistent with risk text. Managed proxy is V2.
4. **PWA + offline.** Resolved per §2 + §12: V1 ships installable PWA shell only, no offline cache, PWA Lighthouse score is NOT a release blocker. Full offline = V2.
5. **Project name.** Working title **FilmFork**. Final name pending TM/domain check (§13). Alternatives if FilmFork fails check: a non-photography-vocabulary Formray-style name (e.g. `Patina`, `Tracelight`). FujiComp deprecated due to TM exposure.
6. **Anthropic model defaults.** Resolved: `claude-sonnet-4-6` default, `claude-opus-4-7` for "deep critique", both verified against current Anthropic docs as of 2026-05-03. Stored in config (`apps/web/src/lib/ai-config.ts`), not in prose. Models can be overridden per session.
7. **Hosting.** Resolved: **Vercel** (formray module 12 standard). No managed proxy in V1, so static SPA on Vercel free tier works. Cloudflare Pages is acceptable alternative if Vercel quota becomes an issue post-launch.
8. **Domain.** Do NOT acquire `fujicomp.*` or any `fuji*.tld`. Pending name resolution (§15.5), default plan = subpath under `formray.io/filmfork` for soft launch, then dedicated domain post-TM-check (e.g. `filmfork.app`, `filmfork.dev`).

### New questions added in R2 (from Codex review)

9. **Browser/OS/camera firmware support matrix for V1.** Drafted in §10 + §12; needs full enumeration in `docs/browser-matrix.md` before V1 ships.
10. **Camera-write failure and restore procedure.** Drafted in §6.3 + §6.6; needs UX wireframe + recovery copy reviewed before V1 ships.
11. **Privacy policy for AI reference images and API keys.** Drafted in §11; needs `docs/privacy.md` written in plain language (en + it) before V1 ships.
12. **Data export/import/migration plan.** Drafted in §11 + §5 (schema migrations); needs full export schema + import tests before V1 ships.
13. **Bilingual content scope (en/it).** All UI strings i18n-ready, en + it message catalogs, README in both languages. Other languages = community-driven post-V1.
14. **No-telemetry support/debug bundle design.** Drafted in §6.7 + §11; needs format specification + redaction tests before V1 ships.
15. **Trademark position on project name, domain, Fujifilm compatibility language.** Drafted in §13; needs `docs/trademark.md` + actual TM searches done before public assets.
16. **"X-S20 validated" acceptance threshold.** Repeatable checklist (in §16) + recorded session + diagnostic bundle attached, not just live demo.

---

## 16. Acceptance — what V1 done means (revised, traceable to §2)

Every item in §2 In-V1 maps to an acceptance check below. No new requirements appear here that aren't in §2.

### Code & build
- [ ] Monorepo scaffolded per §4 with all packages and apps
- [ ] CI green: lint, typecheck (strict + R2 flags), test, license-check, lighthouse
- [ ] All packages have own LICENSE + NOTICE per §13

### `@filmfork/ptp-fuji` + `@filmfork/ptp-fuji-webusb`
- [ ] Forked from pinned filmkit commit, NOTICE present
- [ ] Public API per §8 (transport DI, AbortSignal, progress callbacks, typed errors)
- [ ] Tests pass: container codec, profile encoding, edge cases, error paths
- [ ] X-S20 round-trip verified end-to-end (read presets, write to C2 with backup, restore from backup, camera-side preview round-trip)

### `@filmfork/recipe-schema`
- [ ] Recipe schema per §5, including monochromaticColor, dRangePriority, longExposureNR, lensModulationOptimizer, expanded WB modes
- [ ] Capability-aware translator
- [ ] Schema v1 → v2 migration scaffolding present (no v2 yet, but the path is there)
- [ ] JSON ↔ property bytes round-trip tests pass for X-S20 capability set

### `@filmfork/ai-agent`
- [ ] All five modes implemented (vibe, reference, refinement, critique, persona-opt-in)
- [ ] Confidence indicators per parameter
- [ ] Prompt caching enabled for static prompts + Recipe schema
- [ ] Retry/fallback per typed error category
- [ ] Mocked Anthropic tests pass

### Web app
- [ ] Recipe library: browse, filter (capability set, film sim, mood tags), search, favorites
- [ ] Recipe detail view + camera setup walkthrough
- [ ] Recipe editor with capability-aware parameter validation
- [ ] AI Agent panel with explicit consent gates per §6.2 + §11
- [ ] Camera connect button with platform-aware messaging (macOS beta banner)
- [ ] Push to camera with backup + restore-from-backup UI per §6.3
- [ ] Camera-side preview pane with side-by-side comparison per §6.4
- [ ] URL share with reasoning excluded by default + 1.5KB cap + file fallback per §6.5
- [ ] Recipe genealogy display (parent/fork attribution)
- [ ] Library export/import (JSON file)
- [ ] Diagnostic bundle export per §6.7
- [ ] Bilingual UI: en + it message catalogs, language switcher
- [ ] WCAG 2.2 AA target met (axe-core + manual audit per §12)
- [ ] Strict CSP per §11
- [ ] Installable PWA shell (no offline cache; PWA Lighthouse score not blocking)

### Camera support
- [ ] X-S20 fw-on-test: full V1 manual smoke checklist passes end-to-end (recorded + diagnostic bundle archived)
- [ ] X-M5: tested OR explicitly documented as "untested in V1, pending Wireshark capture" — not silently claimed
- [ ] Other Fujifilm bodies: marked "experimental" in capability matrix, app surfaces warning

### Documentation
- [ ] README.md (en) + README.it.md
- [ ] ROADMAP.md, CHANGELOG.md, PROGRESS.md, local agent notes
- [ ] docs/recipe-format.md (creative-recipe spec)
- [ ] docs/camera-compat.md (capability sets, tested cameras, contribution flow)
- [ ] docs/macos-beta.md (workaround for power users)
- [ ] docs/browser-matrix.md (supported browsers/OS/firmware)
- [ ] docs/privacy.md (en + it, plain language)
- [ ] docs/trademark.md (position + TM search results)
- [ ] docs/architecture.md (incl. accessibility section)
- [ ] docs/decisions/ (ADRs for key choices in this spec)

### Launch readiness
- [ ] Public deploy live with HTTPS on Vercel (or Cloudflare Pages)
- [ ] LICENSE + NOTICE files in place per §13
- [ ] Trademark search complete, name + domain confirmed safe
- [ ] All §15 questions resolved or explicitly deferred to V2 with rationale

---

## 17. Changelog (R1 → R2)

Driven by Codex adversarial review (`docs/superpowers/codex-review-prompt-r1.md` + Codex output applied as constraints by user).

### Blockers fixed
- **B1:** §6.4 rewritten to explicitly call out Fuji vendor opcodes `SendObjectInfo (0x900C)` + `SendObject2 (0x900D)`, RAF object format `0xF802`, filename `FUP_FILE.dat`. Added explicit re-validation requirement on X-S20.
- **B2:** macOS demoted to experimental/beta path in V1 (chose this over pulling V2 helper into V1, which would break timeline). §10 rewritten. V1 happy-path platforms are Linux + Windows + Android Chrome. macOS first-class support is V2.
- **B3:** Privacy contradiction fixed. §7 + §11 clearly split: RAF preview = local-only (camera↔browser↔camera, never sent anywhere); AI reference/critique images = sent to Anthropic with explicit per-image consent + EXIF strip + size cap. API key = session-only by default, persistent opt-in with risk text. `dangerouslyAllowBrowser` flag explicitly documented.
- **B4:** Removed all "atomic rollback" language. §6.3 replaced with backup-before-write + fail-loud-on-error + restore-from-backup-on-demand model. Pre-flight checks (battery, mode, USB health) added.
- **B5:** `.ffr.json` declared as **creative recipe** (look-affecting subset), not lossless preset. §5 schema explicitly enumerates what's in scope and what's out (Image Size, Quality, Color Space, etc. = body-level, deferred to V2).

### High items addressed
- **H1:** §5 + §9 — compatibility axis is now `cameraModel + firmwareVersion = capabilitySetId`, with sensor generation as descriptive metadata only.
- **H2:** §8 — `FujiCamera` API replaced with `FujiCameraSession` + injected `PtpTransport`. Browser-coupled helpers split into `@filmfork/ptp-fuji-webusb`. AbortSignal, progress callbacks, typed errors, `Uint8Array` returns.
- **H3:** §8 — pinned-commit fork strategy with explicit "independent fork, not endorsed" language. Upstream-tracking script defined.
- **H4:** §11 — API key session-only by default; persona opt-in.
- **H5:** §6.5 + §11 — URL recipes cannot push to camera in one click; capability matrix re-validation; payload size + reasoning caps.
- **H6:** §7 — AI vision reframed as "starting recipe", confidence indicators per parameter, photo-reference mode defaults to medium-or-low confidence on most numerics.
- **H7:** §16 — acceptance checklist now traceable 1:1 to §2 scope, no orphan requirements.
- **H8:** §12 + new bilingual scope — WCAG 2.2 AA target, keyboard matrix, screen-reader states, en + it i18n architecture.
- **H9:** §13 — recipe seed list policy locked to originals + explicit permissions; community recipes via user import only.
- **H10:** §13 + §15.5 — project renamed to working title **FilmFork**; "FujiComp" and any `fuji*` naming/domain rejected for trademark exposure.

### Medium / Low items addressed
- **M1:** §10 + §12 + new `docs/browser-matrix.md` — full support matrix specified.
- **M2:** §6.4 — handle snapshot before conversion, poll for new handles, inspect format before download/delete.
- **M3:** §6.7 — typed error taxonomy with recovery prompts per category.
- **M4:** §6.7 + §11 — diagnostic bundle export with redaction.
- **M5:** §11 — full library export/import.
- **M6:** §2 + §12 — PWA score removed as release blocker; V1 ships installable shell only.
- **M7:** §6.5 — reasoning excluded from URL share by default; 1.5KB cap; file fallback.
- **M8:** §15.6 — Anthropic model IDs in config, not prose.
- **L1:** §4 — `ffr-format.md` renamed to `recipe-format.md`.
- **L2:** §6.3 + §6.4 — preset properties (`D18E…D1A5`) and conversion profile (`D185`) terminology kept distinct.
- **L3:** §10 + browser matrix — Android Chrome OTG explicitly marked experimental.

### New §15 questions added
- §15.9-15.16 covering browser/OS support matrix, write-failure procedure, privacy policy doc, data export/migration, bilingual content scope, debug bundle design, trademark position, X-S20 acceptance threshold.

### Timeline revision
- R1 estimate "8-10 weeks" → R2 "10 weeks honest baseline + 2 weeks buffer". Codex argued 8-10 unrealistic without scope cuts; V1 has been cut (macOS beta, X-M5 may slip, AI framing softer, no atomic rollback, no full PWA, no managed proxy, BYO key default), making 10 weeks honest.

### What was NOT changed despite review feedback
- **No** pull of V2 macOS helper into V1: would add Tauri + signing/notarization + WebSocket protocol surface, breaking timeline. Beta path chosen instead.
- **No** managed AI proxy in V1: pushes a backend into the project that doesn't yet have one. V2.
- **No** lossless full-preset capture: requires per-body RE. V2 if demand justifies.

---

*End of design spec R2. Awaiting user review before invoking `superpowers:writing-plans`.*
