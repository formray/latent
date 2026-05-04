import type { MessageKey } from "./en";

export const it: Record<MessageKey, string> = {
  // App shell
  "app.tagline": "Ricette per fotocamere Fujifilm",
  "footer.license": "Software libero · AGPL-3.0 · Costruito per la comunità Fujifilm",

  // Library
  "library.title": "Libreria ricette",
  "library.search.placeholder": "Cerca tra le ricette",
  "library.filter.allFilms": "Tutte le simulazioni pellicola",
  "library.filter.favoritesOnly": "Solo preferite",
  "library.empty.noResults": "Nessuna ricetta corrisponde ai filtri attuali.",
  "library.empty.loading": "Caricamento ricette",
  "library.count.one": "1 ricetta",
  "library.count.other": "{n} ricette",
  "library.importJson": "Importa file",
  "library.import.success": "{n} importate",
  "library.import.error": "JSON ricetta non valido",
  "library.reset": "Ripristina default",
  "library.reset.confirm":
    "Ripristinare la libreria ricette di default? Le ricette importate verranno rimosse.",
  "library.reset.done": "Default ripristinati",

  // Detail
  "detail.title": "Dettaglio ricetta",
  "detail.empty":
    "Seleziona una ricetta dalla libreria per leggere tutti i parametri della fotocamera e la procedura di configurazione passo passo.",
  "detail.copyJson": "Copia come JSON",
  "detail.copyJson.copied": "Copiato",
  "detail.downloadJson": "Scarica .json",
  "detail.delete": "Elimina",
  "detail.delete.hideDefault": "Nascondi",
  "detail.delete.confirm": "Rimuovere questa ricetta dalla libreria?",
  "detail.previewRaf": "Preview su RAF",
  "detail.previewRaf.rendering": "Rendering",
  "detail.previewRaf.title":
    "Scegli un RAF e renderizzalo con questa ricetta sulla fotocamera collegata.",
  "detail.previewRaf.file": "File RAF per preview ricetta",
  "detail.previewRaf.disconnected":
    "Collega una fotocamera per vedere questa ricetta su un file RAF.",
  "detail.previewRaf.diagnostic": "Diagnostica RAF",
  "detail.previewRaf.diagnostic.title":
    "Renderizza base, solo film, senza WB e ricetta completa per isolare bug colore della preview.",
  "detail.action.preview.section": "Preview",
  "detail.action.preview.body":
    "Renderizza questa ricetta su un RAF attraverso la fotocamera collegata.",
  "detail.action.file.section": "File ricetta",
  "detail.action.write.body": "Scegli lo slot custom da sovrascrivere sulla fotocamera collegata.",
  "detail.cameraWrite.section": "Scrivi su fotocamera",
  "detail.cameraWrite.slot": "Scrivi C{slot}",
  "detail.cameraWrite.writing": "Scrittura",
  "detail.cameraWrite.confirm":
    "Scrivere questa ricetta nello slot C{slot}? Latent farà backup dello slot attuale e verificherà dopo la scrittura.",
  "detail.cameraWrite.success": "C{slot} scritto e {n} proprietà verificate.",
  "detail.cameraWrite.error": "Scrittura non riuscita: {message}",
  "detail.cameraWrite.disconnected":
    "Collega una fotocamera per scrivere questa ricetta in uno slot custom.",
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
  "param.filmSimulation": "Film Simulation",
  "param.dynamicRange": "Dynamic Range",
  "param.whiteBalance": "White Balance",
  "param.whiteBalance.shift": "WB Shift",
  "param.highlightTone": "Highlight Tone",
  "param.shadowTone": "Shadow Tone",
  "param.color": "Color",
  "param.sharpness": "Sharpness",
  "param.noiseReduction": "High ISO NR",
  "param.clarity": "Clarity",
  "param.grainEffect": "Grain Effect",
  "param.colorChromeEffect": "Color Chrome Effect",
  "param.colorChromeEffectBlue": "Color Chrome FX Blue",
  "param.smoothSkinEffect": "Smooth Skin Effect",
  "param.monochromaticColor": "Monochromatic Color",

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
  "camera.macos.beta.title": "Il supporto fotocamera su macOS è beta",
  "camera.macos.beta.body":
    "macOS può montare automaticamente le fotocamere per Acquisizione Immagine o Foto. Parti dal comando temporaneo; la correzione persistente è avanzata.",
  "camera.macos.beta.ack": "Ho capito",
  "camera.macos.setup.title": "Libera la fotocamera da macOS",
  "camera.macos.basic.body": "Esegui questo comando temporaneo, poi conferma.",
  "camera.macos.ran": "L'ho eseguito",
  "camera.macos.showAdvanced": "Mostra opzione avanzata",
  "camera.macos.advanced.title":
    "Avanzato — disabilita Acquisizione Immagine finché non la riattivi",
  "camera.macos.advanced.enable": "Comando per riattivare:",
  "camera.macos.done.title": "Configurazione macOS confermata",
  "camera.macos.reset": "Reimposta stato configurazione macOS",
  "camera.macos.close": "Chiudi",
  "camera.recipes.title": "Ricette dalla fotocamera",
  "camera.recipes.verified": "Verificata via USB",
  "camera.recipes.cached": "Ultima lettura camera",
  "camera.recipes.awaiting": "In attesa dei dati dalla fotocamera",
  "camera.recipes.slotsRead": "{n} slot letti",
  "camera.recipes.readOnly": "Sola lettura",
  "camera.recipes.scanning": "Lettura degli slot custom dalla fotocamera",
  "camera.recipes.empty": "Collega una fotocamera per leggere gli slot custom.",
  "camera.recipes.inspector": "ispettore slot",
  "camera.recipes.import": "Importa come ricetta",
  "camera.recipes.imported": "Importata",
  "camera.recipes.updateImport": "Aggiorna ricetta",
  "camera.recipes.importDisabled":
    "L'import sarà abilitato dopo la verifica della UI in sola lettura.",
  "camera.recipes.properties": "Proprietà",
  "camera.recipes.missing": "Mancanti",
  "camera.recipes.mode": "Modalità",
  "camera.recipes.rawProperties": "Proprietà raw",
  "camera.recipes.raw.code": "Codice",
  "camera.recipes.raw.name": "Nome",
  "camera.recipes.raw.value": "Valore",
  "camera.recipes.raw.bytes": "Byte",
  "camera.recipes.raw.missing": "Mancante",

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
