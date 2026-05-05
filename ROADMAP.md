# Latent V1 Roadmap

| Phase  | Output                                                          | Status      |
| ------ | --------------------------------------------------------------- | ----------- |
| 1      | Foundation & core packages                                      | ✅ Complete |
| 2-min  | WebUSB transport (no hardware)                                  | ✅ Complete |
| 2-full | X-S20 validation rig + first real round-trip                    | ✅ Complete |
| 3-base | Web app shell + recipe library + connect button                 | ✅ Complete |
| 4      | Camera flows (read/write slots, backup restore, RAF preview)    | In progress |
| 5      | AI agent (5 modes, iteration loop, EXIF strip)                  | Planned     |
| 6      | Polish (responsive UI, URL share, genealogy, export, WCAG, CSP) | In progress |
| 7      | Launch (ADRs, TM search, seed list, deploy)                     | Planned     |

The full V1 design lives in
[`docs/specs/2026-05-03-fujicomp-v1-design.md`](./docs/specs/2026-05-03-fujicomp-v1-design.md)
(written under the project's prior name "fujicomp" — the spec is otherwise
authoritative). Phase plans are in [`docs/plans/`](./docs/plans/).

## Current Launch Focus

- Stabilize the X-S20 and X-M5 WebUSB workflows with real hardware.
- Keep custom-slot writes limited to verified fields.
- Improve RAF preview parity by validating parameter groups against camera
  output.
- Prepare public OSS onboarding, use cases, and hardware-report paths.
