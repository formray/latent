# Latent

Laboratorio open-source connesso alla fotocamera per iterare verso uno
stile Fujifilm personale. Si collega alla tua macchina via WebUSB, gestisce
le tue ricette in locale, e ti aiuta a sviluppare l'immagine che non
sapevi di avere già.

> **Stato:** pre-lancio. Fase 1, Fase 2-min, Fase 3-base completate. Vedi
> [`ROADMAP.md`](./ROADMAP.md) e [`PROGRESS.md`](./PROGRESS.md).
>
> English: see [`README.md`](./README.md).

Latent è pensato per chi possiede una fotocamera Fujifilm. **Non è
affiliato né approvato da Fujifilm Holdings Corporation.** "Eterna",
"Velvia", "Provia", "Acros", "Classic Chrome" e gli altri nomi di
simulazione citati nelle ricette sono marchi dei rispettivi proprietari.

## Cosa contiene questo repository

| Percorso | Cosa è |
| --- | --- |
| `apps/web` | L'app web di Latent — libreria ricette, dettaglio, connessione fotocamera via WebUSB, bilingue EN/IT |
| `packages/recipe-schema` | Schema Zod ricette, schema taste profile, loader matrice capability, traduttore diff, migrazioni di schema |
| `packages/ptp-fuji` | Layer PTP puro-protocollo per fotocamere Fujifilm (fork di [filmkit](https://github.com/...) a commit pinnato, MIT) |
| `packages/ptp-fuji-webusb` | Trasporto WebUSB che implementa il layer PTP nel browser |
| `packages/ai-agent` | Wrapper API Claude con cinque modalità di iterazione (stub; attivo in Fase 5) |
| `data/` | Matrice capability dei modelli e ricette di seed |
| `docs/` | Specifiche, piani, ADR e trascrizioni di review esterne |

## Esecuzione locale

```bash
nvm use                   # Node 22 (pinned in .nvmrc)
npm install
npm run validate          # lint + typecheck + test + license-check + lockstep
cd apps/web
npm run dev               # Vite su http://localhost:5173
```

WebUSB richiede un browser Chromium-based (Chrome, Edge, Arc) su
`localhost` o HTTPS. La libreria funziona senza fotocamera; il pulsante
**Connect camera** richiede un corpo Fujifilm in modalità PTP.

## Licenza

- **App** (`apps/*`): [AGPL-3.0](./LICENSE) — le modifiche distribuite
  come servizio devono pubblicare il sorgente sotto la stessa licenza
- **Librerie** (`packages/*`): MIT — usabili in qualsiasi progetto

La combinazione è intenzionale. L'app community-facing resta aperta
come servizio; le librerie sottostanti sono libere per qualsiasi
progetto che voglia dialogare con una fotocamera Fujifilm.

## Contribuire

Vedi [`CONTRIBUTING.md`](./CONTRIBUTING.md). La roadmap è volutamente
stretta; le richieste fuori scope vengono gestite di conseguenza.

## Sicurezza

Vedi [`SECURITY.md`](./SECURITY.md). Non aprire issue pubbliche per
vulnerabilità di sicurezza.

## Ringraziamenti

- Il progetto [filmkit](https://github.com/...), il cui lavoro PTP ha
  reso possibile `packages/ptp-fuji`
- La community X-Series su dpreview, fujix-forum e fujifeed, che ha
  ricostruito gran parte di ciò che sappiamo sul wire format
- [Formray](https://formray.io) — lo studio dentro cui Latent è costruito

---

*Latent. Develop the image you didn't know you had.*
