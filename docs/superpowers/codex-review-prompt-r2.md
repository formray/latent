# Codex review prompt — Round 2

**Date:** 2026-05-03
**Reviewing:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R2 (864 lines, project renamed FilmFork)
**Previous round:** `codex-review-prompt-r1.md` + `codex-review-output-r1.md`
**Purpose:** verify R2 actually fixed R1's findings + catch new issues introduced by the revisions, without re-litigating locked decisions.

---

You are doing Round 2 of an adversarial review on the same project you reviewed in Round 1. Round 1 produced specific findings (BLOCKERS B1-B5, HIGH H1-H10, MEDIUM M1-M8, LOW L1-L3, plus schema/Formray/open-question recommendations). The author has revised the spec to R2 in response. Your job now:

1. **Verify each R1 finding was actually fixed** — not just paid lip service to.
2. **Find anything new that broke or got introduced in R2** that wasn't in R1.
3. **Don't re-litigate decisions the author has explicitly locked.**

# Locked decisions (do NOT re-flag as BLOCKERS)

The author chose specific paths through some R1 questions and is committed to them. If you still disagree, say so once in a "Challenged locked decisions" section, but DO NOT raise these as BLOCKERS or HIGH:

- **B2 macOS** — chose "beta path in V1" over "pull V2 helper into V1" (timeline reasoning). macOS is experimental in V1; happy-path platforms are Linux + Windows + Android Chrome. V2 ships Tauri helper for first-class macOS.
- **B5 .ffr.json** — chose "creative recipe subset" over "lossless preset capture." Lossless deferred to V2 if demand justifies.
- **H10 naming** — chose "FilmFork" as working title. Any Fuji-prefixed name (FujiComp, FujiPress, etc.) rejected. Final naming pending TM check.
- **Stack** — TypeScript + React 19 + Vite + Zustand + Tailwind for V1. Rust earns place in V2 (Tauri helper) and V3 (WASM perf, CLI). This was locked before R1.

# Files to read

1. **Revised spec (R2):** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` (864 lines, 17 sections, includes §17 changelog R1→R2)
2. **R1 review prompt:** `docs/superpowers/codex-review-prompt-r1.md`
3. **R1 review output (your prior output):** `docs/superpowers/codex-review-output-r1.md`
4. **Formray engineering guidelines:** `Formray engineering guidelines (private reference at the time)` (modules 12, 13, 15, 16 most relevant)
5. **Formray root context:** `Formray root context (private reference at the time)` and `formray-foundation/local agent notes`

# Tasks

## Task 1: Item-by-item R1 fix verification

For each finding in your R1 output, mark one of:

- ✅ FIXED — the spec change actually addresses the issue. State where (§ ref).
- ⚠️ PARTIALLY FIXED — change made but doesn't fully resolve. Explain gap.
- ❌ NOT FIXED — spec claims fix but issue still present. Explain.
- 🔁 LOCKED-DECISION — author chose a path you accept (B2, B5, H10). Do not relitigate.

Cover every B1-B5, H1-H10, M1-M8, L1-L3, plus the schema-specifics, Formray-alignment, and §15 recommendations from R1. Be terse — one to two sentences per item.

## Task 2: New issues in R2 (use BLOCKER/HIGH/MEDIUM/LOW severity)

R2 added or significantly rewrote: §5 (schema with new fields), §6.3 (push with backup model), §6.4 (vendor opcodes), §6.6 (disconnect recovery), §6.7 (typed error taxonomy), §7 (AI confidence + privacy gates), §8 (PtpTransport DI + split packages), §9 (capabilitySetId axis), §10 (macOS beta), §11 (expanded threat model), §13 (trademark stance), §15 (resolutions + new questions §15.9-15.16), §16 (traceable acceptance), §17 (changelog).

Specific things to scrutinize in R2:

a. **§5 schema additions** — `monochromaticColor`, `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`, expanded WB modes (`AutoWhitePriority`, `AutoAmbiencePriority`, `Custom1/2/3`). Are these actually exposed via PTP property writes to the C1-C7 slots, or are some of them body-level menu settings that don't persist in custom slots? If they don't persist via PTP, they shouldn't be in the recipe. Verify against filmkit's `src/profile/d185.ts`/`enums.ts` if available.

b. **§6.4 vendor opcodes** — is `0x900C SendObjectInfo` + `0x900D SendObject2` the complete sequence, or are there session-state preconditions or other vendor ops the author still missed? E.g. does filmkit set any vendor property before/after to prepare the camera?

c. **§6.3 backup model** — "read full slot state" via PTP property reads is itself a multi-property read. Could it be partial (e.g. camera disconnects mid-backup)? Spec doesn't address this. Should backup itself have a verification step before claiming success?

d. **§6.7 typed errors** — categories complete and non-overlapping? Any common case missing (e.g. `RafFormatInvalid`, `CameraFirmwareUnsupportedOp`, `WebUSBSecureContextRequired`)?

e. **§7 confidence model** — "low/medium/high" with the model self-assigning. Is this pseudo-precision? How does the author actually constrain Claude to assign accurate confidence rather than parroting "high" everywhere? Any prompting strategy or rubric?

f. **§8 package split** — `@filmfork/ptp-fuji` (no DOM) + `@filmfork/ptp-fuji-webusb`. Does the API actually achieve testability, or does the `PtpTransport` interface still leak DOM concepts (e.g. AbortSignal is fine, but anything else)? Is it possible to write the core in pure Node + Vitest?

g. **§9 firmware-keyed capability sets** — what happens when Fujifilm releases a firmware update mid-FilmFork-life? Is there a fallback to "nearest known firmware" without forcing the user to update FilmFork? Spec mentions this once briefly — is it enough?

h. **§10 macOS beta workaround** — `sudo killall -9 ptpcamerad` then click within 1s. Is this safe to recommend? Any worse outcomes (kernel state corruption, USB stack confusion, ImageCapture daemon issues, Photos app interactions)? Should there be a minimum macOS version target?

i. **§11 strict CSP** — `connect-src 'self' https://api.anthropic.com`. Does the Anthropic SDK make calls to other endpoints (e.g. metrics, model API listing)? Is `blob:` in `img-src` safe for camera-side preview JPEGs?

j. **§11 EXIF stripping** — "EXIF stripped client-side" — what library? `piexifjs`? Custom? Reliable across JPEG + HEIF + PNG that users may drop? Does it handle thumbnails, MakerNotes, GPS, all reliably?

k. **§13 FilmFork trademark stance** — is "FilmFork" actually safe? Any prior art / domain squatters / competing trademarks to flag from a quick search? (You don't need to do a full TM search; just sanity-check.)

l. **§15.9-15.16 new questions** — do they have concrete resolution paths in the spec body, or are they just open-ended deferrals dressed as plans?

m. **§16 acceptance** — does each checkbox really map to a §2 capability? Any orphans introduced by R2's expansion?

n. **§17 changelog** — accurate to what actually changed in R2, or does it claim fixes that aren't fully in the body?

## Task 3: Schema sanity vs. Fuji documentation

You flagged schema gaps in R1. R2 added several fields. Verify them against actual Fuji documentation if you can:

- `monochromaticColor` (warmCool, greenMagenta) ranges — match Fuji X-S20 manual?
- `dRangePriority` enum (`Off / Auto / Weak / Strong`) — correct for X-S20?
- WB submodes (`AutoWhitePriority`, `AutoAmbiencePriority`, `Custom1-3`) — actually exposed via PTP custom-setting writes vs only menu-level?
- `longExposureNR` — settable via PTP property write or body-level only?
- `lensModulationOptimizer` — settable via PTP custom-setting write?

If you don't know with confidence, say so explicitly — don't guess.

# Output format — use this exactly

```
# FilmFork V1 spec R2 review

## R1 fix verification (item-by-item, terse)

### Blockers
- B1 (vendor opcodes): [✅/⚠️/❌] <verdict + § ref>
- B2 (macOS UX): 🔁 LOCKED — <accept the resolution>
- B3 (privacy contradiction): [...]
- B4 (rollback claim): [...]
- B5 (schema lossless vs creative): 🔁 LOCKED — <accept>

### High
- H1 through H10: [each one line]

### Medium / Low
- M1-M8, L1-L3: [each one line]

### Schema specifics, Formray alignment, §15 recommendations
[brief verification per topic]

## NEW issues introduced or surfaced in R2

### NEW BLOCKERS
- [NB1] <issue>
  - Where: §<section>
  - Why blocker: <reasoning>
  - Suggested fix: <concrete>

### NEW HIGH
[same format]

### NEW MEDIUM
[same format]

### NEW LOW
[same format]

## Schema sanity vs. Fuji docs (R2 additions)
- monochromaticColor ranges: [verified / unable to verify / wrong]
- dRangePriority enum: [...]
- WB submodes via PTP: [...]
- longExposureNR via PTP: [...]
- lensModulationOptimizer via PTP: [...]

## Challenged locked decisions (one paragraph max each, optional)
[only if you genuinely think the author got a locked decision wrong, even after their reasoning]

## Convergence assessment
- Are we ready for the implementation plan?: yes / no / one-more-round
- If "one-more-round": what specifically blocks?
- Strongest improvement R1 → R2: <one sentence>
- Remaining biggest risk: <one sentence>
- Honest verdict on the 10-week timeline given R2's actual scope: <yes / no / yes-with-X-cut>
```

# What NOT to do

- Don't re-review the original R1 draft — it's been replaced
- Don't re-argue locked decisions as BLOCKERS or HIGH
- Don't propose implementation code
- Don't validate by deference
- If you don't know something with confidence (specific Fuji ranges, current Anthropic SDK behavior), say so explicitly

# Final self-check

Before submitting: would the author's R3 changelog be ≥10 substantive lines, or are you stretching? If R2 is converging, say so honestly. If it's converged, say so and recommend moving to the implementation plan.
