# Latent V1 — Phase 6 Polish Plan

Phase 6 turns the hardware-backed alpha into a shareable, launch-ready web
app surface without changing the core camera safety model.

## Scope

- Responsive polish for the existing Camera, RAF, Library, and Creator
  workspaces.
- Recipe portability: import/export, JSON download, and self-contained URL
  share links.
- Recipe genealogy: duplicated/derived recipes keep parent metadata and show
  their source in the detail view.
- Accessibility and security launch checks: WCAG 2.2 AA audit and production
  CSP validation.

## Delivered

- Responsive desktop/mobile polish is in the `0.1.0` alpha UI.
- Recipe import/export and JSON download are implemented.
- URL share is implemented as a self-contained `?share=` payload that imports
  and selects a shared recipe on load.
- URL share excludes structured `reasoning` by default so explanatory/private
  generation notes are not embedded in public links.
- Recipe genealogy is implemented for creator duplicates via `parentRecipeId`
  and surfaced in recipe metadata.

## Remaining Acceptance

- Run a WCAG 2.2 AA audit on the production-like build, including keyboard
  navigation, focus visibility, semantic labels, contrast, and reduced-motion
  behavior.
- Validate the final production CSP after the hosting target is chosen. WebUSB
  requires HTTPS or localhost; RAF files and recipe JSON must remain local.
- Smoke test URL share on the deployed portal once Phase 7 chooses Vercel or
  GCP.
- Re-run full validation before marking Phase 6 complete in `ROADMAP.md`.
