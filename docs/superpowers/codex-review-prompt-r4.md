# Codex review prompt — Round 4 (final convergence check)

**Date:** 2026-05-03
**Reviewing:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R4 (995 lines, FilmFork)
**Previous round:** `codex-review-prompt-r3.md` + `codex-review-output-r3.md`
**Purpose:** verify the four R3 findings are closed in R4 and no regression was introduced by the small surgical edits. Drive to "ready for implementation plan" or surface the precise residual blocker.

---

You are doing Round 4 of an adversarial review on the same project. Round 3 produced four findings (NB1, NH1, NM1, NL1) and verdict **"yes-with-two-small-fixes"** on the 10-week timeline. The author has revised the spec to R4 with surgical edits intended to close all four findings. Your job:

1. **Verify each R3 finding is closed in R4.**
2. **Confirm no regression was introduced by the R4 surgical edits** (9 small Edit operations, not a full rewrite).
3. **Issue a clean verdict:** ready / one-more-round (with a precise residual list).

This is a convergence pass, not an open-ended adversarial review. Be terse.

# Locked decisions (do NOT re-flag)

- B2 macOS = beta path in V1
- B5 `.ffr.json` = creative-recipe subset
- H10 working title = FilmFork
- Stack = TypeScript V1 (Rust = V2 helper + V3 perf)
- All R1/R2 fixes already accepted

# Files to read

1. **R4 spec (current):** `the repo root/docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` (995 lines, 18 sections, includes §17 R2→R3 changelog + §18 R3→R4 changelog + convergence statement)
2. **R3 review output (your prior R3 output):** `the repo root/docs/superpowers/codex-review-output-r3.md`
3. **Other lineage** (if needed): R1/R2 prompts and outputs in same folder

# Tasks

## Task 1: R3 finding closure check

For each R3 finding, mark ✅ FIXED / ⚠️ PARTIAL / ❌ NOT FIXED with one-line justification + § ref.

| R3 finding | Required change in R4 |
|---|---|
| NB1 R3 (DRAuto in schema without filmkit proof) | §5 dynamicRange enum trimmed to `["DR100", "DR200", "DR400"]`; DRAuto value documented as deferred to V2 in deferred tables |
| NH1 R3 (backup did not verify target slot) | §6.3 transactional backup begins with `SetDevicePropValue(D18C, targetSlot)` + readback verification; mismatch aborts with `BackupIncomplete`, persists nothing |
| NM1 R3 (HEIC UX cliff) | §6.2 EXIF rejection message is platform-aware with iPhone-specific guidance |
| NL1 R3 (AutoAmbiencePriority codec mapping) | §16 acceptance requires schema↔filmkit codec round-trip test for WB mode name |

## Task 2: R4 surgical-edit regression check

R4 made 9 small targeted edits, not a rewrite. Verify each spec section it touched still reads coherently, no internal contradictions:

a. **§5 schema** — Zod enum reduced; does the prose around it still match? Any orphan reference to `DRAuto` elsewhere in the spec?

b. **§2 deferred table** — "Dynamic Range Auto value" added; reads cleanly with the rest of the row?

c. **§5 explicitly out V1 schema table** — `DRAuto` row added; row formatting and reinstatement criteria consistent with the others?

d. **§6.3 transactional backup** — slot-selection gate added as first step; does the rest of the sequence (read all properties, verify count + critical fields, persist) still flow logically?

e. **§6.2 EXIF policy** — platform-aware message; the prose change doesn't break the surrounding accept/reject/abort logic?

f. **§16 acceptance** — both X-S20 round-trip checkbox AND new AutoAmbiencePriority test checkbox; mapping back to §2 still clean?

g. **§18 changelog R3→R4** — accurate to what was actually edited, or claims a fix that isn't fully there?

h. **Convergence statement** at end of §18 — is it warranted, or premature?

## Task 3: Final verdict

Choose one:

- **READY** — green light. Recommend invoking `superpowers:writing-plans` next.
- **ONE-MORE-ROUND** — list precise residual items (use codes NB2/NH2/NM2/NL2 if new) and what each requires.
- **REGRESSION** — describe what R4 broke that R3 didn't have.

If READY, also provide a one-paragraph "what to expect during implementation" — top 2-3 risks the implementation plan should explicitly address.

# Output format

```
# FilmFork V1 spec R4 review (final convergence check)

## R3 finding closure
- NB1 R3 (DRAuto): [✅/⚠️/❌] <verdict + § ref>
- NH1 R3 (backup slot verify): [...]
- NM1 R3 (HEIC UX): [...]
- NL1 R3 (AmbiencePriority codec): [...]

## R4 surgical-edit regression check
- §5 schema enum trim: [clean / regression]
- §2 deferred table: [clean / regression]
- §5 explicitly-out table: [clean / regression]
- §6.3 transactional backup with slot gate: [clean / regression]
- §6.2 EXIF platform-aware message: [clean / regression]
- §16 acceptance updates: [clean / regression]
- §18 changelog accuracy: [accurate / overclaims]
- Convergence statement: [warranted / premature]

## Final verdict

**READY** / **ONE-MORE-ROUND** / **REGRESSION**

[If READY, top 2-3 implementation risks the plan should address]
[If ONE-MORE-ROUND, precise residual list with codes]
[If REGRESSION, description of what broke]
```

# What NOT to do

- Don't re-litigate locked decisions
- Don't propose new features
- Don't validate by deference
- If you don't know something with confidence, say so

# Final self-check

This is meant to be the last round. If the spec is genuinely converged, say "READY" plainly so we can move to the implementation plan. If you find something legitimately blocking, say so precisely. The author would rather hear "go" or a 2-line list than a long round.
