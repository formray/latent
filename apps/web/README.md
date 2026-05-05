# @latent/web

The Latent web app — recipe library and camera companion for Fujifilm
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

The dev server runs against the source of all `@latent/*` workspace
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

## Camera support

- **Connect & recover:** uses `@latent/camera-connection` and
  `@latent/ptp-fuji-webusb` to connect over WebUSB, recover from refresh,
  unplug, sleep, and common macOS PTP claim collisions.
- **Read slots:** reads camera-side C slots and imports decoded recipes into
  the local library.
- **Write slots:** writes verified custom-slot recipe fields to the selected
  C slot. Preview-only fields remain excluded from slot writes until the
  camera path is verified.
- **RAF preview:** sends a local RAF to the connected camera and displays the
  JPEG rendered by the camera processor. Diagnostic renders isolate parameter
  groups when a look diverges from expectation.
- **AI agent:** still future scope; `@latent/ai-agent` remains a stub.

## Browser requirements

WebUSB is supported in Chromium-based browsers (Chrome, Edge, Arc) on
desktop. The app falls back to a clear error banner on unsupported
browsers and on insecure (non-HTTPS, non-localhost) origins.

## Layout

```
apps/web/
  src/
    components/   # Recipe cards, library, detail, camera, RAF preview
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

Seed recipes live in `data/seed-recipes.json` (relative to the monorepo
root) and are loaded at startup, validated against the Recipe schema
from `@latent/recipe-schema`.
