<!--
Thanks for the PR. Keep this template minimal — feel free to delete sections
that don't apply.
-->

## What this changes

<!-- One paragraph. The "why", not just the "what". -->

## Roadmap link

<!-- Phase N task M, issue #X, or "out of scope - see motivation above" -->

## Verification

<!-- How you tested. Tick what applies. -->

- [ ] `npm run validate` passes locally
- [ ] Tested in browser (Chrome on the dev server)
- [ ] Tested with real Fujifilm hardware (model + firmware: ____)
- [ ] N/A — docs / config only

## Schema↔translator lockstep

<!-- Required if you touched recipe-schema, the translator, the camera-models
matrix, or related tests. Otherwise delete this section. -->

- [ ] Updated `packages/recipe-schema/src/recipe.ts` (or `taste-profile.ts`)
- [ ] Updated `data/camera-models.json` `writableSlotProperties`
- [ ] Updated `packages/recipe-schema/src/translate/`
- [ ] Added or updated round-trip test
- [ ] `npm run lockstep-check` passes

## Anything reviewers should look at first?
