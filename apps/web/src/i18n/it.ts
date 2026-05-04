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
  "camera.notSupported.short": "WebUSB non disponibile",

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
