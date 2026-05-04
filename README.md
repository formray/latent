# Latent

Open-source camera-backed look lab for iterating toward a personal Fujifilm
style. Connects your camera over WebUSB, manages your recipes locally, and
helps you develop the image you didn't know you had.

> **Status:** Pre-launch. Phases 1, 2-min, and 3-base shipped. See
> [`ROADMAP.md`](./ROADMAP.md) and [`PROGRESS.md`](./PROGRESS.md).
>
> Italian: see [`README.it.md`](./README.it.md).

Latent is for Fujifilm camera owners. It is **not affiliated with or
endorsed by Fujifilm Holdings Corporation**. "Eterna", "Velvia", "Provia",
"Acros", "Classic Chrome" and other simulation names referenced in
recipes are trademarks of their respective owners.

## What's in this repo

| Path | What it is |
| --- | --- |
| `apps/web` | The Latent web app — recipe library, detail views, WebUSB camera connect, bilingual EN/IT |
| `packages/recipe-schema` | Zod recipe schema, taste profile schema, capability matrix loader, recipe diff translator, schema migrations |
| `packages/ptp-fuji` | Pure-protocol PTP layer for Fujifilm cameras (forked from [filmkit](https://github.com/...) at a pinned commit, MIT) |
| `packages/ptp-fuji-webusb` | WebUSB transport implementing the PTP layer in the browser |
| `packages/ai-agent` | Claude API wrapper with five iteration modes (stub; lit up in Phase 5) |
| `data/` | Camera models capability matrix and seed recipes |
| `docs/` | Specs, plans, ADRs, and external review transcripts |

## Run locally

```bash
nvm use                   # Node 22 (pinned in .nvmrc)
npm install
npm run validate          # lint + typecheck + test + license-check + lockstep
cd apps/web
npm run dev               # Vite at http://localhost:5173
```

WebUSB requires a Chromium-based browser (Chrome, Edge, Arc) on `localhost`
or HTTPS. The library view works without a camera; the **Connect camera**
button needs a Fujifilm body in PTP mode.

## License

- **App** (`apps/*`): [AGPL-3.0](./LICENSE) — modifications you ship as a
  service must publish their source under the same license
- **Libraries** (`packages/*`): MIT — drop them into anything

The combination is intentional. The community-facing app stays open as a
service; the underlying libraries are unencumbered for any project that
wants to talk to a Fujifilm camera.

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). The roadmap is intentionally
narrow; off-roadmap requests get triaged accordingly.

## Security

See [`SECURITY.md`](./SECURITY.md). Do not open public issues for security
vulnerabilities.

## Acknowledgements

- The [filmkit](https://github.com/...) project, whose PTP work made
  `packages/ptp-fuji` possible
- The X-Series community on dpreview, fujix-forum, and fujifeed who reverse-engineered most of what we know about the wire format
- [Formray](https://formray.io) — the studio Latent is built inside

---

*Latent. Develop the image you didn't know you had.*
