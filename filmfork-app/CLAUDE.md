# CLAUDE.md — FilmFork

Conventions for working in this repo with Claude Code.

## Working directory
All work in `~/fuji-comp/filmfork-app/`. Reference repo `~/fuji-comp/filmkit/` is read-only.

## Commits
Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. End every commit with `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.

## Stack
Node 22, TS 5.7 strict, Vitest, Zod 4, npm workspaces. No pnpm/yarn.

## License
AGPL-3.0 for `apps/*`, MIT for `packages/*`. NOTICE only in `packages/ptp-fuji` (filmkit fork).

## Schema↔translator lockstep
Adding a recipe field requires synchronized changes in `packages/recipe-schema/src/recipe.ts`, `data/camera-models.json` writableSlotProperties, the translator, and a round-trip test. The `npm run lockstep-check` CI gate enforces this.

## Phase tracking
Current phase: see ROADMAP.md. Phase plans live in `~/fuji-comp/docs/superpowers/plans/`.
