# Codex review output — Round 5 (innovation-pass validation)

**Date:** 2026-05-04
**Reviewed:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R5 (1182 lines, FilmFork)
**Prompt used:** `docs/superpowers/codex-review-prompt-r5.md`
**Verdict:** **ONE-MORE-ROUND** — two surgical fixes; after fixes, R5 ready for writing-plans

Output preserved verbatim for traceability.

---

# FilmFork V1 spec R5 review (innovation pass validation)

## R5 addition validation
- §6.7 iteration loop: ⚠️ CONCERN — RAF privacy is preserved (§6.7, §11), but unknown-firmware wording wrongly appears to block render step 3 unless write-gate/backup conditions exist. Only save→push should be governed by §6.3.
- §6.8 recipe diff: ✅ SOUND — deterministic rule-table API is bounded, localized to en/it, has generic fallback and incompatible-field handling (§6.8).
- §5 structured reasoning: ✅ SOUND — payload is capped and excluded from URL share by default (§5, §6.5); R4 data migration is not a real issue pre-implementation.
- §5 Local Taste Profile: ⚠️ CONCERN — opt-in/local/privacy posture is good (§5, §6.2, §7, §11), but "sanitized" should explicitly mean injected as quoted data, not instructions. Also two stale "persona" references remain.
- §1 positioning: ✅ SOUND — precise enough; does not overclaim AI accuracy (§1).

## Locked constraints preserved
- Stack: yes — TS/React/Vite/Tailwind/Zustand/Zod/Vitest unchanged (§3, §19).
- macOS beta: yes — unchanged (§10, §19).
- Creative recipe subset: yes — Taste Profile is separate, not embedded in Recipe (§5).
- Filmkit-proven fields only: yes — no new camera parameters added (§5, §9).
- No backend/accounts/marketplace/proxy: yes — all such items remain V2/deferred (§2, §14, §19).
- Privacy posture: yes — RAF local, AI image flow still JPEG-only, Taste Profile opt-in/local/export-only (§6.2, §6.7, §11).

## Cross-reference and acceptance integrity
- Dangling §6.7 references: none found for typed errors; references now point to §6.9 where needed.
- §16 acceptance new items: present — iteration loop, diff, Taste Profile, structured reasoning all covered.
- §2 ↔ §16 traceability: clean, except stale wording: "persona-opt-in" should become "Taste Profile opt-in" in §16; §11 threat model also says "persona opt-in".

## Timeline plausibility
- Absorption claim: optimistic — not fantasy, but iteration UI + thumbnails/history + diff surfaces + Taste Profile settings/export/import is likely more than "small glue".
- Suggested cut from §19 if needed: use the proposed cut: defer last-10 iteration history comparison to V2; ship last-3 or current/previous only.

## Final verdict

**ONE-MORE-ROUND**

Precise residual list:

1. Fix §6.7 unknown-firmware behavior: render/preview should not require slot-write backup conditions. Gate only save→push via §6.3; add a separate preview warning only if desired.
2. Replace stale "persona" wording with "Taste Profile" and clarify Taste Profile notes are injected as delimited preference data, never as system instructions.

These are surgical edits. After that, R5 is ready for `superpowers:writing-plans`.
