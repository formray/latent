# Codex review prompt — Round 1

**Date:** 2026-05-03
**Reviewing:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md`
**Purpose:** independent adversarial review of FujiComp V1 design before invoking superpowers:writing-plans.

---

You are reviewing a draft V1 design specification for an open-source software project. Your job is independent adversarial review, not validation by deference. The author wants you to find what's wrong, not tell them it looks good.

# Project context

**Name:** FujiComp (working title)
**One-liner:** Open-source web platform for Fujifilm photographers — recipe library + AI-generated film simulations + direct browser-to-camera push via WebUSB.

**Validated foundations (already proven during a live brainstorming session):**

- Filmkit (https://github.com/eggricesoy/filmkit) — MIT-licensed TypeScript web app — successfully connects via WebUSB to a Fujifilm X-S20 on macOS/Chrome. Reads C1-C4 custom slots. Implements PTP-over-USB to talk to the camera's image processor.
- macOS `ptpcamerad` daemon claims the USB interface; WebUSB succeeds only when ptpcamerad is killed (`killall -9`) within ~1 second of clicking Connect, before launchd respawns it.
- The camera processes RAF files itself given a recipe profile, returning a pixel-accurate JPEG via PTP — this means "live preview" can be the camera's actual output, not a WebGL approximation.

**Author's organization (Formray) has its own engineering guidelines** (private reference at the time; 17 modules, 00-16). Most relevant: `12-technology-stacks.md`, `13-macos-distribution.md`, `15-hardware-firmware.md`, `16-ai-native-patterns.md`. Formray root and foundation context were also private references at the time. The spec MUST align with these guidelines unless deviation is justified.

# Your task

Read this file end-to-end:
**`docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md`** (510 lines, 16 sections)

Then produce an adversarial review. I want to know what's actually wrong, missing, or risky — not where it succeeds.

# What to scrutinize

1. **Technical feasibility per section.** Pay special attention to:
   - §6.4 (camera-side live preview): is the PTP flow correct as written? `SendObjectInfo` + `SendObject` + `SetDevicePropValue D185` + `SetDevicePropValue D183=0` + poll `GetObjectHandles` + `GetObject` + `DeleteObject` — verify against filmkit's actual `src/ptp/session.ts` implementation. Will this actually work on macOS Chrome given the ptpcamerad race?
   - §8 (PTP layer extraction): is the proposed fork strategy sound given filmkit's "no PRs accepted" upstream policy? Is the typed `FujiCamera` API in §8 idiomatic TS or a poor abstraction?
   - §10 (ptpcamerad workaround): is the V1 manual instruction realistic for a non-technical photographer? Is there a less hostile UX path being missed?
   - §11 (security): what about malicious recipe URLs causing unwanted camera writes, AI prompt injection from reference photos, localStorage tampering?

2. **Scope realism.** 8-10 weeks for everything in §2 + §16, solo developer with AI assistance. Honest verdict: realistic / optimistic / fantasy?

3. **Internal consistency.** Does §3 stack match §4 monorepo? Does §5 Recipe schema cover everything §7 AI agent needs? Does §16 acceptance checklist match §2 scope?

4. **Gaps not addressed.** What's missing that should be in V1:
   - Error handling patterns (camera disconnect mid-write, AI rate limits, network failures, USB stall)
   - Accessibility (WCAG, keyboard nav, screen reader)
   - i18n strategy (Italian + English at minimum, given Formray's bilingual convention)
   - Telemetry-free crash reporting (Sentry self-hosted? raw error logging to clipboard?)
   - Backup/export/import of user library (data portability)
   - Camera disconnect mid-write recovery (atomicity of multi-property writes)
   - Recipe versioning & migration story (§5 says `schemaVersion: 1` — what's the v2 migration plan?)
   - Browser support matrix beyond "Chrome/Edge" (specific min versions, fallback for unsupported)
   - WebUSB requires HTTPS — is dev-time localhost story handled?

5. **License/legal.**
   - AGPL-3.0 app + MIT libraries — verify no license-compatibility traps in either direction.
   - filmkit fork: "no PRs accepted upstream" — what's the real risk if filmkit author publicly objects to FujiComp's existence or direction? Is the MIT license enough?
   - Seed recipe list (§15.2) — what's the actual legal/ethical exposure of bundling community recipes from fuji-x-weekly without explicit permission?

6. **Recipe schema (§5) — verify against actual Fuji documentation:**
   - Are the value ranges correct for X-S20 / X-M5? (Cross-check Fuji's official manuals or filmkit's `src/profile/enums.ts`.)
   - Missing parameters that exist on real cameras: Tone Curve, Push/Pull, Auto ISO ceiling, Long Exposure NR, Mirror Lock-up, B&W Adjustment Warm/Cool — flag any that should be in V1.
   - Is the X-Trans-IV / X-Trans-V split the right axis, or should it be more granular (e.g., specific bodies, since X-S10 ≠ X-T4 on parameter set despite both being X-Trans-IV)?

7. **AI agent (§7) — practical concerns:**
   - Is `claude-sonnet-4-6` actually the correct current model identifier? (Spec dated 2026-05-03; verify.)
   - Is `claude-opus-4-7` correct for the "deep critique" mode?
   - Tool-use structured output: is the full Recipe Zod schema small enough for reliable single-shot tool calls, or does it need to be split?
   - Vision input: how well does Claude actually do at "look at this photo and extract Fuji film sim parameters"? Realistic or wishful?
   - "Persona" stored in localStorage — quota concerns over time, privacy concerns if shared device, recovery story if cleared?

8. **Open questions (§15) — your independent recommendation on each:**
   1. X-M5 protocol coverage testing approach
   2. Recipe seed list licensing (BYO permissions vs ship without)
   3. AI API key UX: BYO vs managed proxy
   4. PWA + offline scope for V1
   5. Project name (FujiComp vs FujiPress, RecipeForge, FujiCast, FilmFork — or none of these)
   6. Anthropic model defaults
   7. Hosting (Vercel formray-standard vs Cloudflare Pages)
   8. Domain choice

9. **Alignment with Formray engineering guidelines.** Read modules 12, 13, 15, 16. Where does the spec deviate from Formray standards? Are deviations justified?

# Output format — use this exactly

```
# FujiComp V1 spec review

## BLOCKERS (must fix before implementation plan)
- [B1] <issue>
  - Where: §<section>
  - Why it's a blocker: <reasoning>
  - Suggested fix: <concrete change>

## HIGH (should fix)
[same format]

## MEDIUM (consider)
[same format]

## LOW (nitpicks)
[same format]

## Recipe schema specifics
- Wrong ranges: ...
- Missing parameters: ...
- Wrong axis: ...

## Formray alignment deviations
- Module 12: ...
- Module 13: ...
- Module 15: ...
- Module 16: ...

## Open questions §15 — my recommendation per question
1. X-M5 protocol coverage: <recommendation + reasoning>
2. Recipe seed list licensing: <recommendation + reasoning>
3. AI API key UX: <recommendation + reasoning>
4. PWA + offline: <recommendation + reasoning>
5. Project name: <recommendation + reasoning>
6. Anthropic model defaults: <recommendation + reasoning>
7. Hosting: <recommendation + reasoning>
8. Domain: <recommendation + reasoning>

## Questions missing from §15 that should be added
[any new open questions to track]

## Overall verdict
- Ship-ready after blockers fixed: yes / no
- Realistic 8-10 week timeline: yes / no / with caveats
- Strongest part of the spec: <one sentence>
- Weakest part of the spec: <one sentence>
```

# What NOT to do

- Don't rewrite the spec, only review it
- Don't validate by deference ("looks comprehensive", "good structure")
- Don't propose implementation code
- Don't speculate about features beyond V1 scope
- If you don't know something with confidence (specific Fuji ranges, exact current Anthropic model IDs), say so explicitly — don't guess

# Final self-check before submitting

After your review is done, ask yourself: "If I were the author and I read this back, would I find it actionable, or just diplomatic?" Cut anything that's diplomatic.
