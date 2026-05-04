# CLAUDE.md — Latent

Conventions for working in this repo with Claude Code.

## Working directory

The repo root is `~/Repos/Formray/latent/` (renamed from `filmfork/` on
2026-05-04). The monorepo is **flat at the root** — no umbrella
subdirectory. `apps/`, `packages/`, `docs/`, `data/`, `scripts/` all live
directly under the git root.

`filmkit/` may be present at the root as a gitignored vendor reference
(the upstream we forked `packages/ptp-fuji` from). It has its own `.git/`
and is not part of this repo. Do not modify it; do not commit it.

## Stack

Node 22, TypeScript 5.7 strict, Vitest, Zod 4, npm workspaces.
No pnpm or yarn.

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`,
`refactor:`. End every commit with the standard trailer:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Update the model name when the model changes.

## Naming

- npm packages: `@latent/<name>` for everything in `packages/`
- App: `@latent/web` (private)
- Internal error class: `LatentError` (in `@latent/ptp-fuji`)
- Project's prior names ("fujicomp", "filmfork") survive **only** in
  historical artifacts: `docs/specs/`, `docs/plans/`, `docs/reviews/`,
  and the historical entries in `CHANGELOG.md` / `PROGRESS.md`. Do not
  retroactively rewrite those.

## License

- `apps/*` → AGPL-3.0
- `packages/*` → MIT
- `packages/ptp-fuji` carries a `NOTICE` because it's the filmkit fork

## Schema↔translator lockstep

Adding a recipe field requires synchronized changes in:

1. `packages/recipe-schema/src/recipe.ts` (or `taste-profile.ts`)
2. `data/camera-models.json` `writableSlotProperties`
3. The translator in `packages/recipe-schema/src/translate/`
4. A round-trip test

The `npm run lockstep-check` CI gate enforces this. The PR template
includes the matching checklist.

## Phase tracking

Current phase: see [`ROADMAP.md`](./ROADMAP.md). Phase plans live in
[`docs/plans/`](./docs/plans/). Cross-phase progress in
[`PROGRESS.md`](./PROGRESS.md). External reviews in
[`docs/reviews/`](./docs/reviews/).
