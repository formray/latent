# Codex review prompt — Round 5 (innovation pass validation)

**Date:** 2026-05-03
**Reviewing:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R5 (1182 lines, FilmFork)
**Previous convergence:** R4 reached "READY" verdict per `codex-review-output-r4.md`
**Purpose:** validate the R5 innovation pass — five additions that did not exist in R4. Confirm they don't violate locked constraints, don't regress privacy, don't expand V1 scope into community/backend territory, and that the cross-references / acceptance / timeline claims hold.

---

You are reviewing a USER-DRIVEN revision (R4 → R5) that adds a stronger innovation layer to FilmFork V1. R4 was already approved by you ("READY"). R5 is additive, NOT a re-litigation of R4. Your job:

1. **Validate the five R5 additions are coherent and safe.**
2. **Verify locked constraints from R4 are preserved** (no accounts, no backend, no managed proxy, no new unsupported camera fields, no weakened privacy, TS-only stack).
3. **Catch any new regression introduced by R5** (renumbering, cross-references, payload caps, schema integrity, acceptance traceability).
4. **Issue a clean verdict.**

Be terse. This is a focused validation, not an open-ended adversarial review.

# What R5 added (read-only summary — do NOT re-argue these as concepts; only validate the implementation)

1. **§6.7 Camera-side iteration loop** — V1 headline workflow composing AI (§6.2) + camera-side preview (§6.4) + recipe diff (§6.8). User loads RAF → AI proposes recipe → camera renders real JPEG → natural-language feedback → AI changes 1-3 targeted parameters → re-render. Last 10 iterations session-only (cleared on tab close). RAF stays in browser memory. AI receives only recipe text + feedback text, NOT the RAF.
2. **§6.8 Recipe diff & visual comparison** — deterministic rule-based, NOT AI. Lookup tables map parameter deltas to localized human-readable phrases ("WB shift +R/+B → warmer magenta cast"). API: `diffRecipes(a, b, locale: "en" | "it"): RecipeDiff`. Rule tables live in `packages/recipe-schema/src/diff/`.
3. **§5 Structured `reasoning`** — replaces flat `explanation` field with three fields per parameter: `visualEffect` (≤200 chars), `reason` (≤300 chars), `risk` (≤200 chars optional), plus `confidence`. Total payload caps preserved (max 40 entries; excluded from URL share by default).
4. **§5 Local Taste Profile** — separate Zod schema (`taste-profile.ts`), NOT embedded in Recipe. Stored at localStorage key `filmfork-taste-profile-v1`. Fields: `enabled` (opt-in gate, off by default), `tonePreference`, `grainTolerance`, `contrastPreference`, `preferredFilmSimulations`, `avoidedFilmSimulations`, `shootingContexts`, `notes` (capped 500 chars), `lastTouchedAt` (90-day TTL). AI uses it as system-prompt context only when `enabled: true`, after sanitization. First-class settings UI (inspect/edit/export/wipe). Included in library export/import.
5. **§1 innovation positioning** — single sentence: "FilmFork is not only a recipe browser; it is a camera-backed look lab for iterating toward a personal Fuji style." Five-property differentiation list expanded to include iteration loop and Taste Profile.

# Locked constraints — must be preserved (R5 must NOT have changed any of these)

- V1 stack: TypeScript / React 19 / Vite / Tailwind v4 / Zustand / Zod 4 / Vitest
- macOS = beta path in V1 (V2 ships Tauri helper)
- `.ffr.json` = creative recipe subset (not lossless)
- Recipe schema = filmkit-proven slot-writable fields only (no `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`, extra WB modes, `DRAuto`)
- No accounts, no community marketplace, no backend, no managed AI proxy in V1
- Privacy posture from R4: RAF stays local, AI key session-only by default, JPEG-only EXIF strip, etc.

# Files to read

1. **R5 spec (current):** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` (1182 lines, 19 sections — added §6.7, §6.8, renumbered §6.7 typed errors → §6.9, added §19 changelog)
2. **R4 spec history** is in git: `git show 4d5ea16:docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` if you want to diff
3. **R4 review output (your prior approval):** `docs/superpowers/codex-review-output-r4.md`
4. Other R1-R4 lineage in same folder

# Tasks

## Task 1: Validate each R5 addition

For each, mark ✅ SOUND / ⚠️ CONCERN / ❌ BROKEN with one-line justification + § ref.

| Addition                | Specific things to check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §6.7 iteration loop     | (a) RAF really stays browser-local (verify §11 storage row + §6.7 step 1 + §11 iteration history row); (b) iteration constraint "≥ 90% iterations change ≤ 5 fields" is actually testable (deterministic? what's the test fixture?); (c) interaction with §6.3 push (can a chosen iteration round-trip to camera with verified backup?); (d) interaction with §6.9 typed errors (camera disconnect mid-iteration handled?); (e) interaction with unknown-firmware mode from §9 (does iteration block writes? — only the save→push step should be gated, not the render step) |
| §6.8 recipe diff        | (a) rule-table approach scalable, or maintenance trap as schema grows? (b) rule-table for missing entries — does spec define a fallback phrase? (c) cross-camera diff (recipes from different capability sets) — spec says "flags incompatible fields rather than diffing them silently" — is this actually implemented as a clear contract? (d) en + it locales — is the i18n surface bounded or open-ended?                                                                                                                                                                |
| §5 structured reasoning | (a) payload caps still respected (40 entries × ~700 chars max = ~28KB worst case — does this break URL share even when reasoning is excluded?); (b) backward compat with hypothetical R4 recipes that have flat `explanation` — schema migration path?                                                                                                                                                                                                                                                                                                                       |
| §5 Local Taste Profile  | (a) opt-in gate `enabled: false` default — is enforcement clear in §7 prompt-injection path? (b) sanitization before prompt injection — what does "sanitized" actually mean operationally? (c) prompt-injection via `notes` field — is 500-char cap + sanitization enough? (d) export/import round-trip — does the Taste Profile reset its `lastTouchedAt` correctly on import?                                                                                                                                                                                              |
| §1 positioning          | (a) is it marketing fluff (the spec is implementation-oriented; does the sentence stay technical?); (b) five-property differentiation list — is the wording precise without overclaiming AI accuracy?                                                                                                                                                                                                                                                                                                                                                                        |

## Task 2: Verify locked constraints preserved

Walk through each locked constraint above and confirm R5 didn't violate it:

- [ ] Stack — only TypeScript/Vite/etc. additions; no Rust/Python/backend code introduced
- [ ] macOS = beta — no language suggesting macOS got upgraded
- [ ] Creative recipe subset — no new lossless capture claim
- [ ] Filmkit-proven fields only — no new camera parameter added (Taste Profile is user-level not camera-level; recipe diff is metadata)
- [ ] No backend, no accounts, no community marketplace, no managed proxy — verify the iteration loop and Taste Profile don't sneak any of these in
- [ ] Privacy — verify RAF stays local; AI image upload still JPEG-only; Taste Profile is opt-in and doesn't leave browser unless user exports

## Task 3: Cross-reference and acceptance integrity

R5 renumbered §6.7 (typed errors) → §6.9 and added §6.7 (iteration), §6.8 (diff). Verify:

- [ ] No dangling reference to old §6.7 (typed errors) anywhere in the spec body — spot-check §6.2 step 9, §7 retry/fallback, §8 errors thrown, §15.10 ADR task, §16 diagnostic bundle
- [ ] §16 acceptance has new checkboxes for iteration loop, recipe diff, Taste Profile, structured reasoning
- [ ] §16 acceptance still maps 1:1 to §2 capability list — no orphans introduced by R5

## Task 4: Timeline plausibility

Spec claims "~1 week net add absorbed by existing 2-week buffer; iteration loop composes existing surfaces; recipe diff is small bounded; Taste Profile is small schema + settings UI." Sanity check:

- Iteration loop UI complexity (history of 10 iterations with thumbnails, recipe state, feedback log, save-to-library): realistic in days, not weeks?
- Recipe diff with ~14 parameters × ~5 delta buckets × 2 locales = ~140 phrases: lookup table maintainable?
- Taste Profile settings UI + sanitization + export/import + tests: realistic absorption?

If the absorption claim is wrong, say so — but offer a candidate scope cut from §19, not new ones.

## Task 5: Final verdict

Choose one:

- **READY** — innovation pass converged, proceed to `superpowers:writing-plans`
- **ONE-MORE-ROUND** — list precise residual items
- **REGRESSION** — describe what R5 broke vs R4
- **SCOPE-VIOLATION** — describe which locked constraint was violated despite stated intent

If READY, optionally update the top 3 implementation risks from R4. The R4 risks were:

1. Recipe schema and filmkit translator in lockstep
2. X-S20 manual hardware validation reproducibility
3. WebUSB failure modes as first-class UX

R5 may have added a 4th risk worth flagging.

# Output format

```
# FilmFork V1 spec R5 review (innovation pass validation)

## R5 addition validation
- §6.7 iteration loop: [✅/⚠️/❌] <verdict + § refs>
- §6.8 recipe diff: [...]
- §5 structured reasoning: [...]
- §5 Local Taste Profile: [...]
- §1 positioning: [...]

## Locked constraints preserved
- Stack: [yes / no — cite]
- macOS beta: [...]
- Creative recipe subset: [...]
- Filmkit-proven fields only: [...]
- No backend/accounts/marketplace/proxy: [...]
- Privacy posture: [...]

## Cross-reference and acceptance integrity
- Dangling §6.7 references: [none / list]
- §16 acceptance new items: [present / missing list]
- §2 ↔ §16 traceability: [clean / orphans]

## Timeline plausibility
- Absorption claim: [plausible / optimistic / wrong]
- Suggested cut from §19 if needed: [...]

## Final verdict

**READY** / **ONE-MORE-ROUND** / **REGRESSION** / **SCOPE-VIOLATION**

[If READY: any new 4th implementation risk worth flagging?]
[If anything else: precise residual list]
```

# What NOT to do

- Don't re-argue R4 decisions — they were approved
- Don't ask the author to defend the iteration-loop concept itself — only validate its implementation
- Don't propose new features
- Don't validate by deference
- If you don't know something with confidence, say so

# Final self-check

This is meant to be a quick validation of an additive pass, not another deep round. If R5 is clean, say "READY" plainly so we can finally proceed to the implementation plan. If you find something legitimately blocking, say so precisely. The author would rather hear "go" or a 2-line list than a long round.
