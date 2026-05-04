# @filmfork/web

The FilmFork web app — recipe library and camera companion for Fujifilm
photographers. Browse curated recipes, study every parameter, and connect
your camera over WebUSB.

> See the monorepo [README](../../README.md) and [ROADMAP](../../ROADMAP.md)
> for the V1 scope, the Formray brand voice, and the licensing model. This
> app is **AGPL-3.0**; the underlying libraries are MIT.

## Run locally

```bash
# from the monorepo root
cd apps/web
npm run dev          # Vite at http://localhost:5173
```

The dev server runs against the source of all `@filmfork/*` workspace
packages — no extra build step needed for normal iteration.

## Build

```bash
npm run build        # type-check + Vite production build into apps/web/dist
npm run preview      # serve the built bundle locally
```

## Test

```bash
npm test             # Vitest in jsdom mode for this app
# or, from the repo root:
npx vitest run --project web
```

The repo root `npm run validate` runs lint, typecheck, the full test
suite (packages and web), license check, and the schema-translator
lockstep gate.

## Camera support (Phase 3-base)

- **Connect & list presets:** uses `@filmfork/ptp-fuji-webusb` to open a
  WebUSB session and read whatever camera-side preset slots the session
  exposes. Per-slot reads land progressively in Phase 2-full.
- **Push to camera, AI agent, side-by-side preview:** out of scope for
  Phase 3-base (Phase 4 and Phase 5 territory).

## Browser requirements

WebUSB is supported in Chromium-based browsers (Chrome, Edge, Arc) on
desktop. The app falls back to a clear error banner on unsupported
browsers and on insecure (non-HTTPS, non-localhost) origins.

## Layout

```
apps/web/
  src/
    components/   # Recipe cards, library, detail, camera connect
    stores/       # Zustand stores: recipes, camera
    i18n/         # en + it message catalogs and useT() hook
    App.tsx       # Top-level layout
    main.tsx      # React root
    index.css     # Tailwind v4 entry
  tests/          # jsdom + Testing Library specs
  index.html
  vite.config.ts
  vitest.config.ts
  tsconfig.json
```

Seed recipes live in `~/Repos/Formray/filmfork/filmfork-app/data/seed-recipes.json`
and are loaded at startup, validated against the Recipe schema from
`@filmfork/recipe-schema`.
