# Codex review output — Round 1

**Date:** 2026-05-03
**Reviewed:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R1 (510 lines)
**Prompt used:** `docs/superpowers/codex-review-prompt-r1.md`

Output preserved verbatim for traceability of the brainstorming back-and-forth.

---

# FujiComp V1 spec review

## BLOCKERS (must fix before implementation plan)
- [B1] §6.4 names the RAW upload flow incorrectly enough that a fresh implementation could fail.
  - Where: §6.4, §8
  - Why it's a blocker: filmkit does not use standard PTP `SendObjectInfo`/`SendObject` (`0x100C/0x100D`) for RAF upload. It uses Fuji vendor ops `0x900C` + `0x900D` (`SendObject2`) with RAF object format `0xF802` and filename `FUP_FILE.dat`. The spec wording hides that requirement. The rest of the flow is broadly filmkit-shaped: read `D185`, set patched `D185`, set `D183=0`, poll handles, `GetObject`, `DeleteObject`.
  - Suggested fix: Rewrite §6.4 as “Fuji vendor `SendObjectInfo(0x900C)` + `SendObject2(0x900D)`”, include required object info fields, and state that this must be validated on X-S20, not only inherited from X100VI code.

- [B2] V1's macOS WebUSB UX is not launchable for non-technical photographers.
  - Where: §6.1, §10, §16
  - Why it's a blocker: “run `sudo killall -9 ptpcamerad` and click Connect within 1 second” is hostile, timing-sensitive, and conflicts with the “zero install” promise. First-time pairing also involves Chrome's device picker, which eats the timing window. Once paired, `navigator.usb.getDevices()` may help, but first-run still fails for ordinary users.
  - Suggested fix: Either demote macOS browser push/preview to “developer/beta path” for V1, or pull the helper into V1 as an optional signed local helper. At minimum, V1 acceptance must include a first-run macOS success criterion on a clean machine.

- [B3] The security/privacy section is internally false about images.
  - Where: §7, §11
  - Why it's a blocker: §11 says image data never hits servers, but §7 sends reference photos to Claude for vision. That is a direct privacy contradiction. Also, the Anthropic TypeScript SDK browser mode is disabled by default specifically because browser API keys are exposed; it requires `dangerouslyAllowBrowser` per Anthropic's SDK docs.
  - Suggested fix: Split image flows: RAF preview stays local; AI reference/critique images are sent to Anthropic unless managed locally. Add explicit consent, size stripping/EXIF stripping, and do not store the API key in `localStorage` by default.

- [B4] Camera writes are specified as if rollback is reliable; it is not.
  - Where: §6.3, §11, §16
  - Why it's a blocker: PTP preset writes are multi-property writes. If the camera disconnects, stalls, loses power, or rejects a conditional property mid-write, “rollback to previous slot values” may be impossible. A failed rollback can leave a custom slot partially mutated.
  - Suggested fix: Replace rollback promise with a real atomicity model: preflight battery/mode, backup/export original raw props, write in verified order, stop on fatal errors, show recovery instructions, and provide “restore from backup” only when connection is healthy.

- [B5] The recipe schema is not lossless enough for the stated `.ffr.json` goal.
  - Where: §5, §6.3, §8, §13
  - Why it's a blocker: The spec says versioned, validated, lossless and FP1-equivalent, but omits real camera/custom-setting fields already visible in Fuji manuals and filmkit: monochromatic color WC/MG, D Range Priority, image size, image quality, color space, long exposure NR, white-balance auto submodes, and body-specific portrait/smooth-skin behavior.
  - Suggested fix: Decide whether V1 recipes are “creative JPEG look only” or “lossless custom-setting payload”. If lossless, schema must include preserved unknown/raw fields plus camera capability metadata.

## HIGH (should fix)
- [H1] The X-Trans-IV / X-Trans-V axis is the wrong compatibility model.
  - Where: §5, §9
  - Why it's high: X-S20, X-M5, X-S10, X-T4, X100VI do not reduce cleanly to sensor generation. Processor generation, firmware, body menu, slot count, film sim list, and custom-setting persistence differ.
  - Suggested fix: Make `cameraModel` + `firmwareVersion` + `capabilitySetId` primary. Keep generation only as descriptive metadata.

- [H2] §8's public `FujiCamera` API is too leaky and too browser-coupled.
  - Where: §8
  - Why it's high: `static requestDevice()` couples permission UI to session lifecycle; `convertRaf(...): Promise<Blob>` makes the library DOM/browser-specific; `RawPreset` exposes internals without capability typing; there is no `AbortSignal`, progress callback, command queue contract, or typed error taxonomy.
  - Suggested fix: Inject transport, return `Uint8Array` from core, expose capabilities, use explicit session states, and include progress/cancellation/error types.

- [H3] The fork strategy is legally allowed but operationally weak.
  - Where: §8, §13
  - Why it's high: MIT permits the fork, but “weekly diff latest release” is vague and filmkit may not publish stable releases. A public objection from the author would not defeat the MIT license, but it can create reputational and community friction.
  - Suggested fix: Vendor a pinned commit, preserve NOTICE, document divergence, avoid implying upstream endorsement, and open issues only for protocol evidence, not PRs.

- [H4] Direct browser AI with BYO key is a security footgun.
  - Where: §7, §11, §15.3
  - Why it's high: `localStorage` API keys are exposed to XSS, extensions, shared-device users, and accidental screenshots. `localStorage` persona data has similar privacy problems.
  - Suggested fix: Default to per-session key entry or managed proxy. If persistent BYO is kept, make it opt-in with clear risk text and a one-click wipe.

- [H5] Malicious but valid recipe URLs are not handled.
  - Where: §6.5, §11
  - Why it's high: Zod rejection only catches invalid JSON. A valid recipe can still target unsupported body fields, extreme settings, misleading attribution, huge reasoning payloads, or social-engineered names.
  - Suggested fix: Validate decoded recipes against URL payload size, schema, camera capability matrix, attribution limits, and require explicit user confirmation before any camera write.

- [H6] AI vision recipe generation is oversold.
  - Where: §7
  - Why it's high: A model can describe a look, but inferring exact Fuji parameters from a rendered image is underdetermined. Lighting, lens, exposure, editing, compression, and display transforms dominate.
  - Suggested fix: Phrase it as “proposes a plausible starting recipe,” require camera-side preview/refinement, and add confidence/uncertainty to outputs.

- [H7] Acceptance criteria do not match scope.
  - Where: §2, §15, §16
  - Why it's high: §2 includes favorites, share URLs, genealogy, Chrome Android, compatibility matrix, and camera validation; §16 omits several of those while adding unresolved PWA and X-M5 requirements.
  - Suggested fix: Make §16 a traceable checklist with every §2 item, or cut §2.

- [H8] Accessibility and i18n are not designed, only indirectly wished into Lighthouse.
  - Where: §12, §16
  - Why it's high: A Lighthouse A11y score is not a WCAG plan. Formray also has bilingual conventions; V1 has no English/Italian content strategy, no keyboard camera workflow, no screen-reader states for sliders/progress/errors.
  - Suggested fix: Add WCAG 2.2 AA target, keyboard matrix, screen-reader states, and `en`/`it` content architecture.

- [H9] Recipe seed licensing remains a launch risk.
  - Where: §13, §15.2
  - Why it's high: §13 says only explicit permission/original work, but §15 still treats Fuji X Weekly outreach as open. Bundling community recipes without permission risks takedowns and bad community relations even if individual settings may be factual.
  - Suggested fix: Ship only original or explicitly permitted recipes. Allow user import/paste for everything else.

- [H10] The project name/domain likely creates trademark risk.
  - Where: §15.5, §15.8
  - Why it's high: A `fuji*` product/domain can look affiliated with Fujifilm. Open source does not remove trademark exposure.
  - Suggested fix: Use a non-Fuji name and describe compatibility as “for Fujifilm cameras.”

## MEDIUM (consider)
- [M1] Browser support is underspecified.
  - Where: §2, §6.1, §12
  - Why it's medium: WebUSB is limited and secure-context-only per MDN. Chrome/Edge desktop and Chrome Android are not enough; specify min versions, OS support, Android OTG caveats, no Safari/Firefox/iOS, and localhost vs LAN dev behavior.
  - Suggested fix: Add a support matrix and test plan.

- [M2] The live preview handle polling is too naive.
  - Where: §6.4
  - Why it's medium: filmkit currently takes the first object handle returned. If the camera returns stale or multiple handles, FujiComp could download/delete the wrong object.
  - Suggested fix: Snapshot handles before conversion, poll for new handles, inspect object info/format if available, and delete only known temp results.

- [M3] Error handling is not a design.
  - Where: §6, §10, §12
  - Why it's medium: Missing patterns for USB stalls, camera disconnect, PTP session already open, network failure, AI rate limit, 413 image upload, invalid RAF, camera wrong mode, and user cancellation.
  - Suggested fix: Add typed error categories and recovery UX per flow.

- [M4] No crash/debug reporting story despite "no telemetry".
  - Where: §11, §12
  - Why it's medium: A no-telemetry app still needs supportability, especially for USB protocol bugs.
  - Suggested fix: Add "copy diagnostic bundle" with redaction, local-only logs, browser/version/camera firmware capture, and optional GitHub issue template.

- [M5] Data portability is missing.
  - Where: §2, §5, §11, §16
  - Why it's medium: Favorites, persona, and local recipes live in browser storage with no backup/import/export plan.
  - Suggested fix: Add export/import for full user library and a migration path for `schemaVersion`.

- [M6] PWA/offline is inconsistent.
  - Where: §12, §15.4, §16
  - Why it's medium: §15 says PWA unresolved; §16 requires Lighthouse PWA ≥95.
  - Suggested fix: Either remove PWA from V1 acceptance or define install-only PWA scope.

- [M7] URL sharing size claim is optimistic.
  - Where: §6.5
  - Why it's medium: Full recipe plus reasoning/provenance/tags may exceed ~1KB even compressed.
  - Suggested fix: Exclude reasoning from share URLs by default, cap payload size, and support file export.

- [M8] Anthropic model IDs are currently correct but should not be frozen as prose.
  - Where: §7, §15.6
  - Why it's medium: Current Anthropic docs list `claude-sonnet-4-6` and `claude-opus-4-7`, so the spec is not wrong today. Model availability and cost will change.
  - Suggested fix: Put defaults in config, document "verified 2026-05-03", and optionally query the Models API.

## LOW (nitpicks)
- [L1] §4 says `docs/ffr-format.md` is a binary format reference, but §5/§6.5 define `.ffr.json`.
  - Where: §4, §5, §6.5
  - Why it's low: It creates avoidable confusion between JSON recipe format and binary FP1/profile codecs.
  - Suggested fix: Rename to `recipe-format.md` and keep FP1/binary docs separate.

- [L2] `D185 byte map` language is misleading for preset writes.
  - Where: §6.3
  - Why it's low: Preset writes use `D18E..D1A5`; live conversion uses `D185`.
  - Suggested fix: Keep "preset property map" and "RAW conversion profile" terminology separate.

- [L3] "Chrome Android via OTG" should not be listed without a hardware note.
  - Where: §2
  - Why it's low: OTG cable, power, camera mode, and mobile browser permission behavior matter.
  - Suggested fix: Add it to the compatibility matrix as "experimental until tested."

## Recipe schema specifics
- Wrong ranges: The main numeric ranges for X-S20/X-M5 JPEG look controls match Fuji manuals for tone curve `-2..+4`, color/sharpness/high ISO NR `-4..+4`, clarity `-5..+5`, WB temperature `2500..10000K`. The issue is not these ranges; it is claiming "all ranges match" while `DRAuto` is in schema but not in filmkit's current encoder, and while body-specific availability is deferred.
- Missing parameters: Monochromatic Color warm/cool and green/magenta; D Range Priority; White Balance White Priority/Ambience Priority and Custom 1-3; Image Size; Image Quality; Color Space; Long Exposure NR; Lens Modulation Optimizer; Portrait Enhancer/Smooth Skin body-specific handling; Auto Update Custom Setting; possibly JPEG/HEIF if custom slots preserve it.
- Wrong axis: `cameraGeneration: "X-Trans-IV" | "X-Trans-V"` is too coarse. Use body + firmware + capability set. X-S20 and X-M5 are a good example: similar era, different film sim/menu surface.

## Formray alignment deviations
- Module 12: Stack mostly aligns, but the spec lacks exact current version policy, Node version, strict TS flags like `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`, and lockfile/version pinning. The repo path also conflicts with the Formray root registry pattern.
- Module 13: V2 helper mentions signed/notarized Tauri, but does not define Developer ID, notarization, entitlements, `.dmg`/`.pkg`, or privileged-helper design. Deferring it is only justified if macOS V1 is explicitly beta.
- Module 15: Treats camera firmware writes like normal API calls. Missing diagnostics, recovery, preflight checks, full backup/restore, USB stall handling, and failure-mode documentation.
- Module 16: Has schema validation, but misses prompt caching, cache metrics, AI retry/fallback strategy, confidence handling, prompt-injection treatment, memory TTL/consolidation, and rate/cost controls.

## Open questions §15 — my recommendation per question
1. X-M5 protocol coverage: Require physical X-M5 testing before claiming support. Capture X RAW Studio traffic for profile read, preset save, RAW conversion, and add firmware version to the matrix.
2. Recipe seed list licensing: Ship only original or explicitly permitted recipes. Do not bundle Fuji X Weekly/community recipes without written permission.
3. AI API key UX: V1 can be BYO, but not persistent `localStorage` by default. Use session entry first; add managed proxy only if you accept backend/rate-limit/security scope.
4. PWA + offline: Defer offline. If desired, make V1 installable shell only; do not make PWA score a release blocker unless scoped.
5. Project name: Avoid Fuji-prefixed names. Of the listed options, `FilmFork` is the least problematic, but I would still do a trademark/domain check before committing.
6. Anthropic model defaults: Use `claude-sonnet-4-6` default and `claude-opus-4-7` optional deep mode, verified against current Anthropic docs. Keep configurable.
7. Hosting: Vercel if using a managed proxy or Formray-standard deployment. Cloudflare Pages is fine for a pure static SPA, but document the deviation.
8. Domain: Do not buy/use `fujicomp.io` for launch. Use a non-Fuji project domain or a Formray subpath until naming/legal is settled.

## Questions missing from §15 that should be added
- What is the minimum browser/OS/camera firmware support matrix for V1?
- What is the camera-write failure and restore procedure?
- What is the exact privacy policy for AI reference images and API keys?
- What is the data export/import/migration plan?
- What is the bilingual content scope for English/Italian?
- What is the no-telemetry support/debug bundle design?
- What is the trademark position on project name, domain, and Fujifilm compatibility language?
- What is the acceptance threshold for "X-S20 validated": live demo only, or repeatable checklist plus logs?

## Overall verdict
- Ship-ready after blockers fixed: no
- Realistic 8-10 week timeline: no, unless V1 is cut to X-S20-only beta with borrowed filmkit flows, no X-M5 guarantee, no polished macOS first-run, and narrower AI.
- Strongest part of the spec: The filmkit-based technical foundation is real and materially better than inventing a Fuji PTP layer from scratch.
- Weakest part of the spec: It treats validated prototype behavior as product-grade UX, especially around macOS connection, camera-write recovery, and privacy.
