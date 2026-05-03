# FilmFork

Open-source camera-backed look lab for iterating toward a personal Fujifilm style.

**Status:** Phase 1 (Foundation & Core Packages) — see ROADMAP.md.

FilmFork is for Fujifilm camera owners. It is not affiliated with or endorsed by Fujifilm Holdings Corporation.

## What's in this repo

- `packages/recipe-schema` — Zod recipe schema, Local Taste Profile schema, capability matrix loader, recipe diff translator, schema migrations
- `packages/ptp-fuji` — pure-protocol PTP layer for Fujifilm cameras (forked from filmkit, MIT)
- `packages/ptp-fuji-webusb` — WebUSB transport (Phase 2 stub)
- `packages/ai-agent` — Claude API wrapper (Phase 5 stub)

## Development

Requires Node 22 (`.nvmrc`). Install: `npm install`. Validate: `npm run validate`.

## License

App: AGPL-3.0. Libraries (`packages/*`): MIT.
