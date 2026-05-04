# FilmFork

Laboratorio open-source connesso alla fotocamera per iterare verso uno stile Fujifilm personale.

**Stato:** Fase 1 (Fondazione e pacchetti core) — vedi ROADMAP.md.

FilmFork è pensato per chi possiede una fotocamera Fujifilm. Non è affiliato né approvato da Fujifilm Holdings Corporation.

## Cosa contiene questo repository

- `packages/recipe-schema` — schema Zod per le ricette, schema Local Taste Profile, loader della matrice di capability, traduttore diff ricette, migrazioni di schema
- `packages/ptp-fuji` — layer PTP puro-protocollo per fotocamere Fujifilm (forkato da filmkit, MIT)
- `packages/ptp-fuji-webusb` — trasporto WebUSB (stub Fase 2)
- `packages/ai-agent` — wrapper API Claude (stub Fase 5)

## Sviluppo

Richiede Node 22 (`.nvmrc`). Installazione: `npm install`. Validazione: `npm run validate`.

## Licenza

App: AGPL-3.0. Librerie (`packages/*`): MIT.
