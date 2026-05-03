# Codex review output — Round 3

**Date:** 2026-05-03
**Reviewed:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R3 (964 lines, FilmFork)
**Prompt used:** `docs/superpowers/codex-review-prompt-r3.md`

Output preserved verbatim for traceability.

---

# FilmFork V1 spec R3 review

## R2 finding verification (item-by-item, terse)

### Blockers
- NB1 (schema vs filmkit-writable): ⚠️ PARTIAL — §5 removes most unproven fields and fixes `monochromaticColor`, but `dynamicRange` still includes `DRAuto`, while filmkit's preset translator only maps DR100/200/400.

### Highs
- NH1 (backup not verified): ⚠️ PARTIAL — §6.3 adds verified backup semantics, but does not explicitly switch to and verify `D18C == targetSlot` before reading backup fields, so a "verified" backup could still be from the wrong active slot.
- NH2 (unknown firmware writes): ✅ FIXED — §9 makes unknown firmware read-only by default with an explicit experimental-write confirmation gate and mandatory backup verification.
- NH3 (battery preflight): ✅ FIXED — §6.3 replaces unsupported automatic battery read with manual confirmation and defers auto-check until a property is identified.
- NH4 (EXIF strip): ✅ FIXED — §6.2/§11 narrow V1 to JPEG-only, canvas re-encode, metadata marker scan, and abort-on-failure.

### Mediums
- NM1: ✅ FIXED — §7 adds deterministic confidence caps plus post-processing tests.
- NM2: ✅ FIXED — §6.7 adds the missing categories and renames secure-context error.
- NM3: ✅ FIXED — §6.4 now deletes only positively identified handles.
- NM4: ✅ FIXED — §8 defines the transport/session responsibility split.
- NM5: ✅ FIXED — §10 uses safer-first macOS sequence and marks `-9` as last resort.
- NM6: ✅ FIXED — §11 adds `worker-src`, `manifest-src`, and CSP validation in CI.
- NM7: ✅ FIXED — §15.9-§15.16 now have owner/output/pass-fail conditions.

### Lows
- NL1: ✅ FIXED — §3 moves to Zod 4 with documented exception path.
- NL2: ✅ FIXED — §15.6 now says defaults are documented and stored in config.
- NL3: ✅ FIXED — §4/§13/§16 narrow NOTICE to forked/derived code.

### R2 schema-sanity verifications
R3 fixes the major overreach: `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`, `AutoWhitePriority`, and `Custom1-3` are out of V1. `monochromaticColor: true` for X-S20 now matches filmkit's `D193/D194` mapping. Reduced WB enum matches filmkit's enum except naming translation (`AutoAmbiencePriority` ↔ `AmbiencePriority`) must be handled explicitly. Remaining mismatch: `DRAuto` is still present without filmkit write proof.

## NEW regressions introduced by R3

### NEW BLOCKERS
- [NB1] `DRAuto` remains in a "filmkit-proven writable" schema.
  - Where: §5, §9, §16
  - Why blocker: R3's core correction is "only fields filmkit proves writable." filmkit's `UI_DR_TO_PRESET` maps only `1 → 100`, `2 → 200`, `3 → 400`; there is no proven Auto encoding for custom-slot writes. Keeping `DRAuto` recreates the R2 schema/capability mismatch in smaller form.
  - Suggested fix: Remove `DRAuto` from V1 schema and capability whitelist, or add a clearly verified filmkit translator mapping and X-S20 round-trip test before implementation planning.

### NEW HIGH
- [NH1] Backup verification does not explicitly prove it read the target slot.
  - Where: §6.3
  - Why high: Count + critical-field checks can pass while reading the wrong active slot if `D18C` state is stale or not switched before backup. The spec must verify slot selection as part of the backup transaction.
  - Suggested fix: Backup transaction should begin with `SetDevicePropValue(D18C, targetSlot)`, then read back `D18C` and require it equals `targetSlot` before reading `D18E…D1A5`.

### NEW MEDIUM
- [NM1] JPEG-only AI references are safe but a UX cliff for HEIC-heavy users.
  - Where: §6.2, §7, §11
  - Why medium: Modern iPhones commonly produce HEIC. Rejecting HEIF is acceptable for V1, but the UX should say how to export/convert to JPEG.
  - Suggested fix: Add a short user-facing fallback copy requirement: "Export/share as JPEG first."

### NEW LOW
- [NL1] `AutoAmbiencePriority` naming needs an explicit codec mapping.
  - Where: §5, §8/translator implication
  - Why low: filmkit calls the enum `AmbiencePriority`; schema calls it `AutoAmbiencePriority`. Fine, but the mapping must be tested so it does not become another silent unsupported WB mode.
  - Suggested fix: Add this to recipe-schema round-trip tests.

## Schema trim soundness (R3-specific)
- Retained fields all confirmed slot-writable via filmkit: partial — all except `DRAuto` are represented in filmkit's read/write translator; monochromatic color is conditional/non-zero for mono sims.
- WB enum reduction matches filmkit support: yes, with naming caveat for `AutoAmbiencePriority`.
- monochromaticColor capability flag for X-S20: plausible/locally verified via filmkit mapping; still needs X-S20 round-trip validation before public support claim.

## Challenged locked decisions
None. The locked decisions are still coherent after R3.

## Convergence assessment
- Are we ready for the implementation plan?: **one-more-round**
- If "one-more-round": exactly which findings still block:
  1. Remove or prove `DRAuto` slot-write support.
  2. Add explicit target-slot selection/readback verification to the backup transaction.
- Strongest improvement R2 → R3: The schema is now mostly honest and tied to filmkit's actual writable surface.
- Remaining biggest risk (acceptable to ship with): X-S20-specific behavior still needs real round-trip validation, but the spec now names that gate clearly.
- Final verdict on the 10-week timeline given R3's actual scope: **yes-with-two-small-fixes**.
