# Codex review prompt — Round 3

**Date:** 2026-05-03
**Reviewing:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R3 (964 lines, FilmFork)
**Previous rounds:** see `codex-review-prompt-r1.md` + `-output-r1.md` + `codex-review-prompt-r2.md` + `-output-r2.md`
**Purpose:** verify R3 actually closes R2's findings (NB1, NH1-4, NM1-7, NL1-3) and confirm we have convergence — or surface any regression introduced by the R3 changes.

---

You are doing Round 3 of an adversarial review on the same project. Round 2 produced specific findings (NB1 blocker, NH1-NH4 high, NM1-NM7 medium, NL1-NL3 low, plus schema sanity checks against Fuji docs). The author has revised the spec to R3 in response. Your job now:

1. **Verify each R2 finding is actually closed in R3** — not just paid lip service to.
2. **Find any new regression introduced by the R3 changes** (especially the schema trim and capability whitelist).
3. **Don't re-litigate locked decisions or already-resolved R1/R2 items.**
4. **Drive toward convergence.** R3 is meant to be the convergence round; if it converges, say so plainly so we can move to the implementation plan.

# Locked decisions (do NOT re-flag)

- B2 macOS = beta path in V1 (V2 ships Tauri helper)
- B5 `.ffr.json` = creative recipe subset, not lossless
- H10 working title = FilmFork; Fuji-prefixed names rejected
- Stack = TypeScript V1 (Rust = V2 Tauri helper + V3 perf crates)

These are settled. If you still disagree, mention briefly under "Challenged locked decisions" but do NOT raise them as BLOCKERS.

# Files to read

1. **R3 spec (current):** `the repo root/docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` (964 lines, 17 sections, includes §17 changelog R2→R3)
2. **R2 review output (your prior R2 output):** `the repo root/docs/superpowers/codex-review-output-r2.md`
3. **R2 review prompt (for context):** `the repo root/docs/superpowers/codex-review-prompt-r2.md`
4. **R1 artifacts (for full lineage):** `codex-review-prompt-r1.md` + `codex-review-output-r1.md` in same folder
5. **Formray engineering guidelines:** `Formray engineering guidelines (private reference at the time)` (12, 13, 15, 16 most relevant)

# Tasks

## Task 1: R2 finding verification (item-by-item, terse)

For each R2 finding, mark one of:

- ✅ FIXED — change actually addresses the issue (state where in §)
- ⚠️ PARTIAL — change made but doesn't fully resolve (explain gap)
- ❌ NOT FIXED — claim made but issue still present (explain)
- 🔁 LOCKED — author resolved per a locked decision; accept

Cover: NB1, NH1-NH4, NM1-NM7, NL1-NL3, plus the schema-sanity-vs-Fuji-docs verifications and the convergence-blocking concerns from R2's verdict ("schema/capability mismatch", "backup verification", "firmware-fallback write safety").

## Task 2: New regressions introduced by R3 (use BLOCKER/HIGH/MEDIUM/LOW)

R3 made significant changes to:
- **§5 schema** — trimmed (removed `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`, several WB modes); added `monochromaticColor: true` for X-S20 capability set
- **§6.3 push** — transactional verified backup with read-all + verify-count + verify-critical-fields gate
- **§6.4 preview cleanup** — narrowed to positively-identified handles only
- **§6.7 error taxonomy** — added 7 categories, renamed `UsbHttpsRequired` → `WebUSBSecureContextRequired`
- **§7 AI** — deterministic confidence rubric with post-processing caps + EXIF strip narrowed to JPEG only
- **§8 PTP** — explicit transport contract table
- **§9 capability** — added `writableSlotProperties` whitelist + unknown-firmware read-only-by-default policy
- **§10 macOS** — safer-first sequence in `docs/macos-beta.md`
- **§11 CSP** — added `worker-src`, `manifest-src`, csp-check in CI
- **§13 NOTICE** — narrowed to forked packages only
- **§15.9-15.16** — restructured as ADR-eligible tasks with owner/output/pass-fail

Specifically scrutinize for regressions:

a. **Schema trim soundness** — did we accidentally drop a field that filmkit actually does write? (Cross-check filmkit's `src/profile/preset-translate.ts` if you can.) Conversely, did we keep a field we shouldn't have?

b. **Transactional backup correctness** — is the verification step (count + critical fields) sufficient? Could a verified-but-actually-stale backup occur (e.g. property values that "look fine" but are from a different slot due to PTP state confusion)?

c. **Unknown-firmware read-only policy** — does it have escape-valves we'd actually want (e.g. user explicitly toggling "I know what I'm doing" for one-off recipe writes)? Or is it too restrictive?

d. **EXIF strip narrowed to JPEG-only** — does this exclude too many real-world reference photos (most modern phones save HEIC by default)? Is this a UX cliff?

e. **Confidence rubric** — is the post-processing cap on photo-derived numerics actually enforceable, or could the model bypass via creative parameter naming?

f. **Transport contract split** — does the contract really keep `@filmfork/ptp-fuji` testable in pure Node, or are there leaks (e.g. WebUSB-specific error codes in the typed taxonomy)?

g. **`writableSlotProperties` whitelist** — does it prevent the UI from offering edits to fields not in the whitelist, even if they're technically in the schema? Is the gating well-defined or implicit?

h. **§15.9-15.16 ADR structure** — are the pass/fail conditions actually testable, or aspirational?

i. **CSP additions** — does `manifest-src 'self'` actually cover Vite's PWA plugin behavior, or do we need explicit allowances for it?

j. **Changelog accuracy** — does §17 R2→R3 changelog accurately reflect what changed in the body, or claim fixes that aren't fully there?

## Task 3: Schema sanity (R3 trim)

You flagged in R2 that filmkit doesn't actually write certain fields. R3 removed them. Verify:
- The R3 retained set (`filmSimulation`, `monochromaticColor`, `dynamicRange`, `whiteBalance` [reduced enum], `highlightTone`, `shadowTone`, `color`, `sharpness`, `noiseReduction`, `clarity`, `grainEffect`, `colorChromeEffect`, `colorChromeEffectBlue`, `smoothSkinEffect`) — are ALL of these confirmed slot-writable via filmkit's translator?
- The reduced WB enum (`Auto`, `AutoAmbiencePriority`, `Daylight`, `Shade`, `Fluorescent1-3`, `Incandescent`, `Underwater`, `ColorTemperature`) — does this match filmkit's actual supported enum?
- `monochromaticColor: true` for X-S20 — is this verified writable, or just plausible?

If you don't know with confidence, say so.

# Output format

```
# FilmFork V1 spec R3 review

## R2 finding verification (item-by-item, terse)

### Blockers
- NB1 (schema vs filmkit-writable): [✅/⚠️/❌] <verdict + § ref>

### Highs
- NH1 (backup not verified): [...]
- NH2 (unknown firmware writes): [...]
- NH3 (battery preflight): [...]
- NH4 (EXIF strip): [...]

### Mediums
- NM1 through NM7: [each one line]

### Lows
- NL1 through NL3: [each one line]

### R2 schema-sanity verifications
[brief verification per topic, especially monochromaticColor flag fix and reduced WB enum]

## NEW regressions introduced by R3

### NEW BLOCKERS
[same format as R1/R2: where / why / suggested fix]

### NEW HIGH
[same format]

### NEW MEDIUM
[same format]

### NEW LOW
[same format]

## Schema trim soundness (R3-specific)
- Retained fields all confirmed slot-writable via filmkit: yes / no / partial — explain
- WB enum reduction matches filmkit support: yes / no / unverifiable
- monochromaticColor capability flag for X-S20: verified / plausible / wrong

## Challenged locked decisions (one paragraph max each, optional)
[only if you genuinely think a locked decision is now wrong in light of R3]

## Convergence assessment
- Are we ready for the implementation plan?: **yes / no / one-more-round**
- If "yes": one-line confirmation
- If "one-more-round": exactly which findings still block (numbered)
- Strongest improvement R2 → R3: <one sentence>
- Remaining biggest risk (acceptable to ship with): <one sentence>
- Final verdict on the 10-week timeline given R3's actual scope: **yes / no / yes-with-X**
```

# What NOT to do

- Don't re-review R1 or R2 drafts — they're superseded
- Don't re-argue locked decisions
- Don't propose implementation code
- Don't validate by deference
- If you don't know something with confidence, say so explicitly

# Final self-check

Before submitting, ask: "Is R3 converged enough that the next round would be diminishing returns?" If yes, recommend moving to the implementation plan plainly. If no, list exactly the items that still block. The author would rather hear "ready, ship the plan" or a precise short list than another long round.
