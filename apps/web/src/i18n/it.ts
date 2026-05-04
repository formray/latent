import type { MessageKey } from "./en";

export const it: Record<MessageKey, string> = {
  // App shell
  "app.tagline": "Ricette per fotocamere Fujifilm",
  "footer.license":
    "Software libero · AGPL-3.0 · Costruito per la comunità Fujifilm",

  // Library
  "library.title": "Libreria ricette",
  "library.search.placeholder": "Cerca tra le ricette",
  "library.filter.allFilms": "Tutte le simulazioni pellicola",
  "library.filter.favoritesOnly": "Solo preferite",
  "library.empty.noResults": "Nessuna ricetta corrisponde ai filtri attuali.",
  "library.empty.loading": "Caricamento ricette",
  "library.count.one": "1 ricetta",
  "library.count.other": "{n} ricette",

  // Detail
  "detail.title": "Dettaglio ricetta",
  "detail.empty":
    "Seleziona una ricetta dalla libreria per leggere tutti i parametri della fotocamera e la procedura di configurazione passo passo.",
  "detail.copyJson": "Copia come JSON",
  "detail.copyJson.copied": "Copiato",
  "detail.setupWalkthrough": "Configura sulla fotocamera",
  "detail.setupWalkthrough.intro":
    "Segui questi passaggi per inserire la ricetta in uno slot personalizzato della fotocamera.",
  "detail.parameters.section": "Parametri",
  "detail.metadata.section": "Informazioni su questa ricetta",
  "detail.metadata.author": "Autore",
  "detail.metadata.camera": "Fotocamera di riferimento",
  "detail.metadata.created": "Aggiunta il",
  "detail.metadata.tags": "Tag",
  "detail.favourite.add": "Aggiungi ai preferiti",
  "detail.favourite.remove": "Rimuovi dai preferiti",
  "detail.favourite.short.add": "salva",
  "detail.favourite.short.saved": "salvata",

  // Recipe parameters
  "param.filmSimulation": "Simulazione pellicola",
  "param.dynamicRange": "Gamma dinamica",
  "param.whiteBalance": "Bilanciamento del bianco",
  "param.whiteBalance.shift": "Shift WB",
  "param.highlightTone": "Tono alte luci",
  "param.shadowTone": "Tono ombre",
  "param.color": "Colore",
  "param.sharpness": "Nitidezza",
  "param.noiseReduction": "Riduzione rumore",
  "param.clarity": "Chiarezza",
  "param.grainEffect": "Effetto grana",
  "param.colorChromeEffect": "Effetto color chrome",
  "param.colorChromeEffectBlue": "Color chrome blu",
  "param.smoothSkinEffect": "Effetto pelle liscia",
  "param.monochromaticColor": "Colore monocromatico",

  // Camera connect
  "camera.connect": "Collega fotocamera",
  "camera.connecting": "Connessione in corso",
  "camera.connected": "Collegata",
  "camera.disconnect": "Disconnetti",
  "camera.degraded": "La fotocamera risponde a intermittenza",
  "camera.notSupported.short": "WebUSB non disponibile",
  "camera.error.macos-claim-collision.title": "macOS sta usando la fotocamera",
  "camera.error.macos-claim-collision.body":
    "Acquisizione Immagine sta richiedendo accesso esclusivo. Apri la configurazione macOS per liberarla.",
  "camera.error.macos-claim-collision.action": "Apri configurazione",
  "camera.error.camera-off.title": "La fotocamera non risponde",
  "camera.error.camera-off.body":
    "Spegni e riaccendi la fotocamera, controlla il cavo e poi riprova.",
  "camera.error.camera-off.action": "Riprova",
  "camera.error.cable-unplugged.title": "Fotocamera scollegata dal cavo",
  "camera.error.cable-unplugged.body":
    "Il cavo USB è stato scollegato. Ricollegalo e Latent proverà a riconnettersi automaticamente.",
  "camera.error.permission-denied.title": "Permesso richiesto",
  "camera.error.permission-denied.body":
    "Fai clic su Collega e consenti l'accesso alla fotocamera nel selettore.",
  "camera.error.permission-denied.action": "Collega",
  "camera.error.secure-context.title": "Contesto non sicuro",
  "camera.error.secure-context.body":
    "Latent richiede HTTPS o localhost per accedere ai dispositivi USB.",
  "camera.error.webusb-unsupported.title": "Browser non supportato",
  "camera.error.webusb-unsupported.body":
    "Latent richiede un browser Chromium come Chrome, Edge, Brave o Arc.",
  "camera.error.session-stale.title": "Fotocamera in stato bloccato",
  "camera.error.session-stale.body":
    "La sessione precedente non si è chiusa correttamente, oppure un'altra app sta usando la fotocamera. Chiudi eventuali app fotografiche, spegni e riaccendi la fotocamera e riprova.",
  "camera.error.session-stale.action": "Riprova",
  "camera.error.unknown.title": "Connessione non riuscita",
  "camera.error.unknown.body":
    "Si è verificato un errore imprevisto mentre la fotocamera era in comunicazione.",
  "camera.error.unknown.action": "Riprova",

  // Errors
  "error.UsbPermissionDenied.title": "Nessuna fotocamera selezionata",
  "error.UsbPermissionDenied.body":
    "La finestra di selezione del browser è stata chiusa. Riprova e scegli la fotocamera dall'elenco.",
  "error.WebUSBUnsupported.title": "Browser non supportato",
  "error.WebUSBUnsupported.body":
    "Latent usa WebUSB per dialogare con la fotocamera. Apri l'app in un browser basato su Chromium (Chrome, Edge o Arc) per collegarla.",
  "error.WebUSBSecureContextRequired.title": "Contesto sicuro richiesto",
  "error.WebUSBSecureContextRequired.body":
    "WebUSB richiede HTTPS o localhost. Ricarica l'app su un URL sicuro.",
  "error.UsbDisconnect.title": "Fotocamera scollegata",
  "error.UsbDisconnect.body":
    "La connessione con la fotocamera è stata persa. Controlla il cavo e lo stato della fotocamera, poi riconnetti.",
  "error.generic.title": "Connessione non riuscita",
  "error.generic.body":
    "Si è verificato un errore imprevisto mentre la fotocamera era in comunicazione. Prova a scollegare e ricollegare.",
};
