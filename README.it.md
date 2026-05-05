# Latent

Laboratorio open-source connesso alla fotocamera per fotografi Fujifilm.
Latent ti permette di mantenere una libreria locale di ricette, leggere e
ripristinare gli slot custom della camera, renderizzare RAF tramite il
processore della fotocamera e iterare su un look usando la pipeline Fujifilm
reale, non una simulazione del browser.

> **Stato:** alpha pre-lancio con hardware reale. Pacchetti core,
> stabilita' connessione WebUSB, import/export ricette, lettura/scrittura
> slot camera e preview RAF sono implementati. Vedi
> [`ROADMAP.md`](./ROADMAP.md) e [`PROGRESS.md`](./PROGRESS.md).
>
> English: see [`README.md`](./README.md).

Latent e' pensato per chi usa fotocamere Fujifilm. **Non e' affiliato ne'
approvato da Fujifilm Holdings Corporation**. "Eterna", "Velvia",
"Provia", "Acros", "Classic Chrome" e gli altri nomi di simulazioni citati
nelle ricette sono marchi dei rispettivi proprietari.

## Cosa fa oggi

- **Libreria ricette:** cerca, importa, esporta, elimina, ripristina i default
  e conserva tutto localmente nel browser.
- **Connessione camera:** si collega via WebUSB su browser Chromium, recupera
  da refresh/unplug/sleep e guida l'utente quando macOS prende il controllo
  dell'interfaccia PTP.
- **Slot custom:** legge C1-C4, importa gli slot nella libreria e scrive sulla
  camera solo i campi verificati.
- **Preview RAF:** invia un RAF locale alla camera, applica la ricetta scelta
  con il processore della fotocamera e mostra diagnostiche per gruppi di
  parametri.
- **Pacchetti riusabili:** schema ricette, traduttori capability-aware, PTP,
  WebUSB e state machine di connessione sono separati in librerie MIT.

## Perche' esiste

Molti strumenti per ricette sono form statici: copi i valori a mano e speri
che la camera produca il risultato atteso. Latent usa la camera come motore
di rendering. Il flusso ideale e':

1. Fare backup degli slot custom gia' presenti.
2. Importare o progettare ricette localmente.
3. Provare una ricetta su un RAF conosciuto tramite il processore camera.
4. Scrivere una ricetta verificata su uno slot sacrificabile.
5. Ripristinare lo slot originale se l'esperimento non funziona.

## Avvio rapido

```bash
nvm use                   # Node 22, pinnato dal repo
npm install
npm run validate          # typecheck + lint + test + licenze + lockstep
cd apps/web
npm run dev               # Vite su http://localhost:5173
```

Apri `http://localhost:5173` in Chrome, Edge o Arc. WebUSB funziona solo su
`localhost` o HTTPS. La libreria funziona senza hardware; i flussi camera
richiedono un corpo Fujifilm in modalita' USB/PTP.

## Note hardware

Durante lo sviluppo sono stati provati Fujifilm X-S20 e X-M5. Altri corpi
X-series recenti potrebbero funzionare, ma vanno considerati non verificati
finche' qualcuno non esegue la checklist hardware.

Prima di scrivere sulla camera:

- Importa lo slot esistente nella libreria, cosi' puoi ripristinarlo.
- Usa uno slot sacrificabile. Non sovrascrivere l'unica copia di un look
  importante.
- Tieni la camera sveglia e collegata direttamente via USB quando possibile.
- Su macOS chiudi Image Capture, Foto, X RAW Studio e qualsiasi app che possa
  prendere l'interfaccia PTP.

La checklist manuale e' in
[`docs/qa/hardware-test-plan.md`](./docs/qa/hardware-test-plan.md).

## Casi d'uso

I flussi dettagliati sono in [`docs/use-cases.md`](./docs/use-cases.md).
In breve:

- **Backup ricette camera:** connetti, leggi slot, importa ogni slot nella
  libreria, esporta JSON se serve.
- **Preview su RAF:** apri il workspace RAF, seleziona una ricetta, renderizza,
  modifica i controlli preview-only e confronta le diagnostiche.
- **Scrittura su camera:** seleziona una ricetta, scrivi su C1-C4 e rileggi lo
  slot per verificare.
- **Ripristino:** scegli la ricetta backup importata in precedenza e riscrivila
  nello stesso slot.

## Struttura repo

| Percorso                     | Contenuto                                                      |
| ---------------------------- | -------------------------------------------------------------- |
| `apps/web`                   | App AGPL: libreria, pannello camera, RAF workspace, UI EN/IT   |
| `packages/camera-connection` | Manager connessione, state machine, classifier e driver WebUSB |
| `packages/recipe-schema`     | Schema Zod, capability camera, migrazioni, diff e traduttori   |
| `packages/ptp-fuji`          | Layer PTP MIT per Fujifilm, fork di filmkit con attribution    |
| `packages/ptp-fuji-webusb`   | Trasporto WebUSB per il boundary PTP                           |
| `packages/ai-agent`          | Pacchetto AI futuro, attualmente stub                          |
| `data/`                      | Capability dei modelli camera e ricette incluse                |
| `docs/`                      | Specifiche, piani, ADR, casi d'uso, QA e review                |

## Contribuire

Leggi [`CONTRIBUTING.md`](./CONTRIBUTING.md) e poi
[`docs/onboarding.md`](./docs/onboarding.md). La roadmap e' stretta perche'
i percorsi di scrittura su camera richiedono validazione hardware seria.

## Licenza

- **App** (`apps/*`): [AGPL-3.0](./LICENSE).
- **Librerie** (`packages/*`): MIT.

La divisione e' intenzionale: l'app pubblica resta aperta, mentre le librerie
protocollo/schema restano riusabili anche fuori da Latent.

---

_Latent. Develop the image you did not know you had._
