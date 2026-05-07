# Latent

Laboratorio open-source connesso alla fotocamera per fotografi Fujifilm.
Latent ti permette di mantenere una libreria locale di ricette, leggere e
ripristinare gli slot custom della camera, renderizzare RAF tramite il
processore della fotocamera e iterare su un look usando la pipeline Fujifilm
reale, non una simulazione del browser.

Latent e' un fork indipendente e un'espansione di prodotto ispirata a
[FilmKit](https://github.com/eggricesoy/filmkit). FilmKit ha dimostrato che
un browser puo' gestire preset Fujifilm e renderizzare RAF tramite la camera
via WebUSB; Latent parte da quell'idea e la porta verso un workspace
open-source piu' ampio per librerie ricette, backup camera, affidabilita'
della connessione, tracking delle capability dei modelli e pacchetti
protocollo pensati per contributor.

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

- **Libreria ricette:** cerca, importa, esporta, condivide link, elimina,
  ripristina i default e conserva tutto localmente nel browser.
- **Creator ricette:** parte da intenti fotografici, duplica look esistenti
  mantenendo metadati di parentela, modifica controlli Fujifilm validati dallo
  schema ed esporta JSON senza hardware collegato.
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

## Relazione con FilmKit

Latent non nasce per competere con FilmKit. Esiste perche' il lavoro
WebUSB/PTP di FilmKit ha reso credibile questa strada, e perche' c'e' spazio
per un progetto community con un'enfasi diversa.

Differenze oggi:

- **Sicurezza del workflow:** backup, rilettura, ripristino e scrittura
  esplicita dello slot sono flussi centrali.
- **Affidabilita' connessione:** Latent aggiunge un connection manager,
  classificazione strutturata degli errori, reconnect e guida per collisioni
  PTP su macOS.
- **Boundary dei pacchetti:** protocollo, WebUSB, connessione e schema ricette
  vivono in pacchetti `@latent/*` separati.
- **Disciplina schema:** campi ricetta, capability camera, traduttori e test
  round-trip sono tenuti in lockstep dalla CI.
- **Onboarding OSS:** docs, casi d'uso, QA hardware, governance, issue
  template e launch checklist sono parte del repo.
- **Target validati:** oggi la validazione manuale si concentra su X-S20 e
  X-M5, mentre FilmKit documenta X100VI come corpo principale testato.

Dove Latent deve andare:

- editing ricette piu' ricco con auto-render, vicino al loop creativo rapido
  di FilmKit;
- report di compatibilita' per piu' modelli dalla community;
- scritture verificate e sicure per piu' campi camera-specific;
- workflow pubblico per importare, confrontare e condividere ricette;
- eventualmente, trasporto nativo quando WebUSB diventera' il limite.

## Avvio rapido

```bash
nvm use                   # Node 22, pinnato dal repo
npm install
npm run validate          # typecheck + lint + test + licenze + lockstep
npm run dev:macos         # Web app + helper locale macOS per la camera
```

Apri `http://127.0.0.1:5173/` in Chrome, Edge o Arc. WebUSB funziona solo su
`localhost` o HTTPS. La libreria funziona senza hardware; i flussi camera
richiedono un corpo Fujifilm in modalita' USB/PTP.

`npm run dev:macos` avvia i due processi locali necessari per lo sviluppo
hardware su macOS:

- `http://127.0.0.1:5173/` - app web Vite.
- `http://127.0.0.1:5174/` - helper locale macOS per la camera.

L'helper e' volutamente locale. Il browser non puo' eseguire `launchctl`,
sospendere `ptpcamerad`/`icdd` o ripristinare i servizi camera di macOS da
solo, quindi Latent usa un helper su localhost per esporre nell'app azioni
esplicite di Release e Restore. Ferma lo stack con `Ctrl+C`; se durante il
test hai rilasciato i servizi camera macOS, usa il controllo Restore nell'app
prima di scollegare tutto.

Per lavoro solo browser, senza controllo dei servizi camera, puoi ancora
avviare direttamente l'app:

```bash
npm --workspace @latent/web run dev -- --host 127.0.0.1
```

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
[`docs/qa/hardware-test-plan.md`](./docs/qa/hardware-test-plan.md). Le note
per sbloccare collisioni macOS/Image Capture/WebUSB sono in
[`docs/qa/macos-webusb-camera-release.md`](./docs/qa/macos-webusb-camera-release.md).

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

## Funding

Latent e' open source e non ha feature a pagamento. Se ti fa risparmiare
tempo o vuoi supportare i test hardware, puoi contribuire tramite
[Buy Me a Coffee](https://buymeacoffee.com/galbrizio).

## Licenza

- **App** (`apps/*`): [AGPL-3.0](./LICENSE).
- **Librerie** (`packages/*`): MIT.

La divisione e' intenzionale: l'app pubblica resta aperta, mentre le librerie
protocollo/schema restano riusabili anche fuori da Latent.

---

_Latent. Develop the image you did not know you had._
