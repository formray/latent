# Latent V1 Roadmap

| Phase  | Output                                                          | Status            |
| ------ | --------------------------------------------------------------- | ----------------- |
| 1      | Foundation & core packages                                      | ✅ Complete       |
| 2-min  | WebUSB transport (no hardware)                                  | ✅ Complete       |
| 2-full | X-S20 validation rig + first real round-trip                    | ✅ Complete       |
| 3-base | Web app shell + recipe library + connect button                 | ✅ Complete       |
| 4      | Camera flows (read/write slots, backup restore, RAF preview)    | ✅ Alpha complete |
| 5      | AI agent (5 modes, iteration loop, EXIF strip)                  | Planned           |
| 6      | Polish (responsive UI, URL share, genealogy, export, WCAG, CSP) | In progress       |
| 7      | Launch (ADRs, TM search, seed list, online portal, deploy)      | In progress       |

The full V1 design lives in
[`docs/specs/2026-05-03-fujicomp-v1-design.md`](./docs/specs/2026-05-03-fujicomp-v1-design.md)
(written under the project's prior name "fujicomp" — the spec is otherwise
authoritative). Phase plans are in [`docs/plans/`](./docs/plans/).

## Current Launch Focus

- Keep X-S20 and X-M5 WebUSB workflows stable while collecting more hardware
  reports from other Fujifilm bodies.
- Keep custom-slot writes limited to verified fields, with backup, read-back,
  and restore paths treated as part of the write workflow.
- Improve RAF preview parity by validating remaining parameter groups against
  camera output, especially known Kelvin/white-balance limitations.
- Finish Phase 6 polish items that are not yet complete: WCAG 2.2 AA audit and
  production CSP validation.
- Finish Phase 7 launch items: ADRs, trademark review, final seed list,
  dedicated online portal, release checklist, and deploy path.
- Decide the portal hosting target. Vercel is likely the fastest static/PWA
  launch path; GCP is better if Latent needs tighter infrastructure control,
  custom observability, or future server-side services.
- Decide whether Phase 5 AI agent remains in V1 scope or moves behind the
  post-alpha launch line.

## Known Hardware Follow-Ups

- macOS release can be automated locally for `ptpcamerad`/`icdd`, but a stale
  camera-side PTP session may still require full body power-cycle or battery
  reseat. A future native transport/helper should investigate whether a lower
  level USB reset can replace the physical battery step.
- X-T20 currently reaches the connected/no-readable-slots state; investigate
  whether legacy custom settings expose different PTP operations, slot counts,
  or property mappings before widening model support.
