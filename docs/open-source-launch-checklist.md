# Open Source Launch Checklist

Use this before making the repository public or announcing it broadly.

## Repository Metadata

- [ ] GitHub description explains the product in one sentence.
- [ ] Website field points to the public demo or project page.
- [ ] Topics include `fujifilm`, `webusb`, `ptp`, `recipes`, `photography`,
      `typescript`, `react`.
- [ ] Default branch is protected.
- [ ] CI is required before merge.
- [ ] Dependabot is enabled.

## Community Files

- [x] `README.md`
- [x] `README.it.md`
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md`
- [x] `SECURITY.md`
- [x] `GOVERNANCE.md`
- [x] Issue templates
- [x] Pull request template
- [x] `CODEOWNERS`
- [x] `FUNDING.yml`

## Product Documentation

- [x] Quick start
- [x] Contributor onboarding
- [x] Use cases
- [x] Hardware QA checklist
- [x] License explanation
- [x] Safety notes for camera writes
- [ ] Public screenshots or demo video
- [ ] Compatibility table populated with community results

## Legal And Attribution

- [x] Root AGPL-3.0 license for the app.
- [x] MIT licenses for reusable packages.
- [x] filmkit attribution in `packages/ptp-fuji/NOTICE`.
- [x] Fujifilm non-affiliation notice in README.
- [ ] Confirm final public contact emails or replace placeholders with a
      working address before launch.
- [ ] Confirm trademark policy ADR before V1.0.0.

## Release Safety

- [ ] `npm run validate` passes on a clean checkout.
- [ ] Web app production build passes.
- [ ] Hardware checklist passes on the launch target camera.
- [ ] Write-to-camera flow has a fresh backup/restore demo.
- [ ] RAF preview has at least one known-good sample run.
- [ ] macOS claim-collision wizard has been re-tested after browser update.

## Announcement Notes

Keep launch language precise:

- Say "hardware-backed alpha", not "universal Fujifilm support".
- Say "tested on X-S20 and X-M5 during development" unless more cameras are
  validated.
- Emphasize local-first behavior and explicit camera writes.
- Ask for model/firmware reports from the community.
- Avoid implying affiliation with Fujifilm or filmkit.
