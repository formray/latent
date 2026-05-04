# Codex review output — Round 2

**Date:** 2026-05-03
**Reviewed:** `docs/superpowers/specs/2026-05-03-fujicomp-v1-design.md` R2 (864 lines, FilmFork)
**Prompt used:** `docs/superpowers/codex-review-prompt-r2.md`

Output preserved verbatim for traceability of the brainstorming back-and-forth.

---

# FilmFork V1 spec R2 review

## R1 fix verification (item-by-item, terse)

### Blockers
- B1 (vendor opcodes): ✅ FIXED — §6.4 now uses Fuji vendor `0x900C/0x900D`, object format `0xF802`, `FUP_FILE.dat`, and X-S20 re-validation.
- B2 (macOS UX): 🔁 LOCKED — accepted as V1 beta path with Linux/Windows/Android as happy path.
- B3 (privacy contradiction): ✅ FIXED — §6.2, §7, §11 now split AI images sent to Anthropic from RAF preview staying local.
- B4 (rollback claim): ⚠️ PARTIALLY FIXED — §6.3 removes atomic rollback claims, but backup itself is not verified before being trusted.
- B5 (schema lossless vs creative): 🔁 LOCKED — accepted as creative-recipe subset, not lossless preset capture.

### High
- H1: ✅ FIXED — §5/§9 use `capabilitySetId`, `cameraModel`, and `firmwareVersion`; generation is descriptive only.
- H2: ✅ FIXED — §8 splits pure protocol package from WebUSB adapter and removes `Blob` from core API.
- H3: ✅ FIXED — §8 pins upstream commit, preserves NOTICE, and avoids implying filmkit endorsement.
- H4: ✅ FIXED — §7/§11 make API key session-only by default; persistent storage is opt-in with risk text.
- H5: ✅ FIXED — §6.5/§11 add payload caps, capability validation, save-before-push, and confirmation gates.
- H6: ✅ FIXED — §1/§7 now frame AI recipes as plausible starting points, not exact extraction.
- H7: ✅ FIXED — §16 is much closer to §2 and removes the old orphan X-M5/PWA blockers.
- H8: ✅ FIXED — §2/§4/§12/§16 add en/it i18n and WCAG 2.2 AA plan.
- H9: ✅ FIXED — §13 ships only original or explicitly permitted seed recipes.
- H10: 🔁 LOCKED — FilmFork chosen as working title pending TM/domain check; Fuji-prefixed names rejected.

### Medium / Low
- M1: ✅ FIXED — §2/§10/§12 define browser/platform matrix, though `docs/browser-matrix.md` still must be written.
- M2: ✅ FIXED — §6.4 now snapshots handles and avoids deleting pre-existing objects.
- M3: ⚠️ PARTIALLY FIXED — §6.7 adds taxonomy, but missing common categories listed below.
- M4: ✅ FIXED — §2/§6.7/§11 add diagnostic bundle export and redaction.
- M5: ✅ FIXED — §2/§5/§11 add library export/import and migration scaffolding.
- M6: ✅ FIXED — §2/§12 remove PWA Lighthouse as a release blocker.
- M7: ✅ FIXED — §6.5 excludes reasoning from URL share and caps compressed payload.
- M8: ✅ FIXED — §15.6 keeps model IDs configurable; current Anthropic docs confirm `claude-sonnet-4-6` and `claude-opus-4-7`.
- L1: ✅ FIXED — §4 renames `ffr-format.md` to `recipe-format.md`.
- L2: ✅ FIXED — §6.3/§6.4 now separate preset properties from `D185` conversion profile.
- L3: ✅ FIXED — §2/§10 mark Android OTG experimental.

### Schema specifics, Formray alignment, §15 recommendations
- Schema specifics: ⚠️ PARTIALLY FIXED — R2 correctly chooses creative subset, but new fields exceed what filmkit currently proves writable to slots.
- Formray Module 12: ✅ FIXED — §3 adds Node 22, strict flags, lockfile policy, and npm.
- Formray Module 13: ✅ FIXED FOR V1 — macOS helper is V2; §10 now references signed/notarized `.pkg`/`.dmg`.
- Formray Module 15: ⚠️ PARTIALLY FIXED — §6.3/§6.6 improve recovery, but backup verification and unsupported battery reads remain unresolved.
- Formray Module 16: ⚠️ PARTIALLY FIXED — §7 adds caching/retry/memory/cost controls, but confidence remains mostly model self-reporting.
- §15 recommendations: ✅ MOSTLY FIXED — all R1 questions now have resolutions or concrete docs/tests, except some are still acceptance/doc placeholders.

## NEW issues introduced or surfaced in R2

### NEW BLOCKERS
- [NB1] Schema/capability set now claims writable recipe fields that filmkit does not prove.
  - Where: §5, §9, §16
  - Why blocker: `dRangePriority`, `longExposureNR`, `lensModulationOptimizer`, `AutoWhitePriority`, and `Custom1/2/3` are in the V1 schema/acceptance, but filmkit's slot translator does not write most of them as controllable recipe fields. `D1A3` exists for Long Exposure NR but is preserved/defaulted, not mapped from UI; Lens Modulation Optimizer has no slot property mapping; White Priority and Custom WB values are not in filmkit enums; D Range Priority is parsed/UI-visible but not translated into slot writes. Also §9 says X-S20 `monochromaticColor: false`, while Fuji docs and filmkit both indicate monochromatic color exists for monochrome sims.
  - Suggested fix: Split schema fields into `cameraWritableV1` vs `informational/previewOnly` or remove unproven fields from V1. For X-S20, set `monochromaticColor` correctly and require property-write proof before adding LMO/WB custom modes/D Range Priority as writable recipe fields.

### NEW HIGH
- [NH1] Backup is trusted before it is proven complete.
  - Where: §6.3, §6.6, §16
  - Why high: Reading a full slot backup is itself a multi-property operation. If disconnect/stall happens mid-backup, localStorage may contain a partial restore point that looks valid and can later overwrite a slot with incomplete state.
  - Suggested fix: Treat backup as a transaction: collect all expected properties, verify count/required IDs, read back selected critical fields, mark backup `complete=true` only after verification. Never offer restore from incomplete backups.

- [NH2] Unknown firmware fallback can enable unsafe writes.
  - Where: §9
  - Why high: "Fall back to nearest known firmware" is acceptable for read-only display, but risky for camera writes. Fuji firmware can change supported properties, encodings, or rejection behavior.
  - Suggested fix: Unknown firmware should default to read-only or require an explicit "experimental writes" confirmation plus automatic backup verification. Do not silently allow normal writes on nearest-known firmware.

- [NH3] Battery preflight is specified without evidence it is readable.
  - Where: §6.3
  - Why high: filmkit's current property map does not expose battery level. Making "abort below 30%" part of the write flow may be impossible via the validated PTP layer.
  - Suggested fix: Either identify the exact Fuji PTP battery property and validate it on X-S20, or replace with manual UX: "Confirm battery is sufficiently charged."

- [NH4] EXIF stripping is underspecified for a privacy-critical promise.
  - Where: §6.2, §7, §11
  - Why high: "EXIF stripped client-side" is not enough. JPEG, HEIF, PNG, embedded thumbnails, GPS, MakerNotes, and browser canvas re-encoding behave differently. A failed strip could leak location/device metadata.
  - Suggested fix: Define accepted AI image formats for V1, the stripping method, verification behavior, and failure mode. Conservative path: decode to canvas and re-encode JPEG only, dropping unsupported formats or warning that metadata stripping failed.

### NEW MEDIUM
- [NM1] Confidence model is still pseudo-precision.
  - Where: §7, §12
  - Why medium: The model self-assigns `low/medium/high`. The prose says photo mode "defaults" to lower confidence, but there is no deterministic rubric enforcement or post-processing.
  - Suggested fix: Add a deterministic confidence policy: e.g. text-explicit parameters can be medium/high, photo-derived numeric values are capped at medium, unsupported/inferred fields are low.

- [NM2] Error taxonomy misses common cases and overlaps naming.
  - Where: §6.7
  - Why medium: Missing `RafFormatInvalid`, `AiPayloadTooLarge`/413, `AiModelUnavailable`, `PtpTimeout`, `BackupIncomplete`, `FirmwareUnsupported`, and `WebUSBUnsupported`. `UsbHttpsRequired` should probably be `WebUSBSecureContextRequired` to avoid confusing HTTPS with USB.
  - Suggested fix: Add missing categories and define one-to-one mapping from low-level DOM/PTP/Anthropic errors to categories.

- [NM3] Preview cleanup may promise deletion of an upload handle the flow may not know.
  - Where: §6.4
  - Why medium: filmkit currently deletes the output JPEG handle only. R2 says delete "the RAF upload + JPEG output", but the vendor `SendObjectInfo` response handling for the RAF object handle is not specified.
  - Suggested fix: Only promise deletion of handles the implementation positively identifies. If the upload handle is not returned/observable, document that cleanup is best-effort and camera/session-scoped.

- [NM4] `PtpTransport` abstraction is testable, but underspecified for PTP transaction semantics.
  - Where: §8
  - Why medium: `send(data)`/`receive()` over raw bytes is Node-testable, but there is no timeout policy, transaction serialization contract, max read size, or DATA/RESPONSE boundary responsibility.
  - Suggested fix: Add a short contract: transport is byte-stream-ish USB bulk adapter; session owns PTP container pack/unpack and transaction IDs; transport owns timeout/abort/max chunk behavior.

- [NM5] macOS beta workaround still recommends a hostile command.
  - Where: §10
  - Why medium: As beta it is acceptable not to polish, but `sudo killall -9 ptpcamerad` is still more aggressive than filmkit's own `killall ptpcamerad` guidance and may confuse Image Capture/Photos state.
  - Suggested fix: Document safer sequence first: quit Photos/Image Capture/X RAW Studio, unplug/replug, plain `killall ptpcamerad`, then only mention `-9` as last resort. Add minimum tested macOS version.

- [NM6] CSP is plausible but incomplete as an implementation contract.
  - Where: §11
  - Why medium: `connect-src 'self' https://api.anthropic.com` is likely enough for Anthropic Messages/Models APIs, and `blob:`/`data:` image sources are needed for previews. But Vite/PWA/service worker behavior may also require `worker-src`/`manifest-src`; if omitted, the installable shell can break under strict CSP.
  - Suggested fix: Add CSP validation to acceptance and specify `worker-src`/`manifest-src` after testing the built app.

- [NM7] §15.9-§15.16 are mostly acceptance placeholders, not resolved plans.
  - Where: §15
  - Why medium: The questions are now listed with "needs doc/tests before V1 ships," which is fine, but not the same as resolution. They still block implementation-plan lock if the plan needs estimates.
  - Suggested fix: Convert each into an ADR/doc acceptance task with owner, output file, and pass/fail condition before writing the implementation plan.

### NEW LOW
- [NL1] Zod version pin lags "latest stable" language.
  - Where: §3
  - Why low: §3 says Zod `≥ 3.23`; Formray latest-stable policy would likely prefer Zod 4 if current project constraints allow it.
  - Suggested fix: Use latest stable Zod unless Anthropic tool helpers or local compatibility require Zod 3; document the exception.

- [NL2] "Model IDs in config, not prose" is contradicted by prose.
  - Where: §15.6, §17
  - Why low: The spec still names exact model IDs in prose while saying they are not in prose.
  - Suggested fix: Reword as "defaults documented here and stored in config."

- [NL3] §16 says "all packages have own LICENSE + NOTICE" but only forked packages need NOTICE.
  - Where: §16
  - Why low: Not harmful, but it adds paperwork to packages without third-party copied code.
  - Suggested fix: Require NOTICE for forked/derived packages; LICENSE for all packages.

## Schema sanity vs. Fuji docs (R2 additions)
- monochromaticColor ranges: parameter verified in Fuji X-S20 manual; exact `-9..+9` numeric range not visible in the text manual page, but filmkit maps `D193/D194` as `monoWC/monoMG` `-9..+9`. R2's X-S20 capability flag saying `false` is wrong.
- dRangePriority enum: verified in Fuji X-S20 manual as `AUTO / STRONG / WEAK / OFF`; filmkit enum exists but marks values speculative and does not translate it into preset slot writes.
- WB submodes via PTP: Fuji manual verifies White Priority, Auto, Ambience Priority, Custom 1-3, Color Temperature, etc. Filmkit only has `Auto` and `AmbiencePriority` beyond the basic modes; White Priority and Custom 1-3 are not proven via PTP preset writes.
- longExposureNR via PTP: Fuji manual verifies ON/OFF. filmkit identifies `D1A3` as `P:LongExpNR`, but translator preserves base/default rather than exposing recipe-controlled writes.
- lensModulationOptimizer via PTP: Fuji manual verifies ON/OFF. I found no corresponding filmkit custom-slot property mapping, so PTP recipe write is unverified.

Sources used: Fuji X-S20 manual [Image Quality Setting](https://fujifilm-dsc.com/en/manual/x-s20/menu_shooting/image_quality_setting/), Anthropic [models overview](https://platform.claude.com/docs/en/about-claude/models/overview), Anthropic [TypeScript SDK docs](https://platform.claude.com/docs/en/api/sdks/typescript). Quick web sanity search found `Fork n' Film` and generic "Film Fork" uses, but no obvious direct software/photo-recipe collision; this is not a trademark clearance.

## Challenged locked decisions (one paragraph max each, optional)
macOS beta is acceptable as a locked V1 decision, but the public workaround should be framed as an unsupported power-user path with safer commands first. The current wording still risks making a fragile hack look like an endorsed setup step.

## Convergence assessment
- Are we ready for the implementation plan?: one-more-round
- If "one-more-round": what specifically blocks? The schema/capability/writable-property mismatch is the main blocker; backup verification and firmware-fallback write safety should also be tightened before implementation planning.
- Strongest improvement R1 → R2: R2 honestly cuts macOS, lossless presets, managed proxy, offline PWA, and exact AI matching instead of pretending they fit V1.
- Remaining biggest risk: The spec still confuses "Fuji menu setting exists" with "we can safely write this setting into C slots via the validated PTP path.".
- Honest verdict on the 10-week timeline given R2's actual scope: yes-with-X-cut. Ten weeks is plausible only if V1 schema is reduced to fields already proven writable/previewable on X-S20 and unknown-firmware writes are locked down.
