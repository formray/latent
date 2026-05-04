# Contributing to Latent

Thanks for considering a contribution. Latent is a small, opinionated
project — we'd rather move slowly and keep things coherent than ship
broadly and accumulate inconsistency.

## Before you open a PR

- **For bug fixes**: open an issue first only if the bug isn't obviously
  reproducible from the code; otherwise just send the patch.
- **For features**: open an issue or a draft PR with a short rationale
  before writing significant code. The roadmap is intentionally narrow,
  and "useful but off-roadmap" features get declined more often than not.
- **For refactors that don't fix a user-visible problem**: please don't.
  We prefer code that someone can read in five minutes over code that's
  abstractly cleaner.

## Local development

```bash
nvm use                # Node 22, pinned in .nvmrc
npm install
npm run validate       # lint + typecheck + test + license-check + lockstep
cd apps/web
npm run dev            # boots Vite at http://localhost:5173
```

WebUSB requires HTTPS or `localhost`, a Chromium-based browser, and a
real Fujifilm camera in PTP mode for end-to-end testing.

## Code style

- TypeScript strict mode everywhere. No `any` without a comment explaining
  why and what's checked at the boundary.
- No build-step abstractions added "for the future". Three similar lines
  beats a premature helper.
- Comments only for the non-obvious *why*. The code says *what*.
- Tests live next to the package they test (`packages/<pkg>/tests/`).
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`,
  `refactor:`. End every commit with the standard `Co-Authored-By:`
  trailer if you used an AI assistant.

## The schema↔translator lockstep

This repo enforces — via `npm run lockstep-check` and the matching CI gate
— that any change to a recipe field arrives as a synchronized set of
edits across:

1. `packages/recipe-schema/src/recipe.ts` (or `taste-profile.ts`)
2. `data/camera-models.json` `writableSlotProperties`
3. The translator in `packages/recipe-schema/src/translate/`
4. A round-trip test

If you touch one, touch them all in the same commit. The gate exists
because the failure mode (silent drift between schema and wire format)
is hard to detect at runtime.

## Licensing of contributions

By submitting a PR you agree that your contribution is licensed under the
project's prevailing license (see `LICENSE` for apps; `packages/<pkg>/LICENSE`
for individual packages).

## Reviewing

Reviews focus on correctness, then naming, then performance. Style
nitpicks live in a separate PR and never block a fix.
