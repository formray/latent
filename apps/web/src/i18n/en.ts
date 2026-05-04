export const en = {
  // App shell
  "app.tagline": "Recipes for Fujifilm cameras",
  "footer.license": "Open source · AGPL-3.0 · Built for the Fujifilm community",

  // Library
  "library.title": "Recipe library",
  "library.search.placeholder": "Search recipes",
  "library.filter.allFilms": "All film simulations",
  "library.filter.favoritesOnly": "Favourites only",
  "library.empty.noResults": "No recipes match the current filters.",
  "library.empty.loading": "Loading recipes",
  "library.count.one": "1 recipe",
  "library.count.other": "{n} recipes",

  // Detail
  "detail.title": "Recipe detail",
  "detail.empty":
    "Select a recipe from the library to read its full set of camera parameters and a step-by-step setup walkthrough.",
  "detail.copyJson": "Copy as JSON",
  "detail.copyJson.copied": "Copied",
  "detail.setupWalkthrough": "Set up on camera",
  "detail.setupWalkthrough.intro":
    "Follow these steps to enter the recipe in a custom slot on your camera.",
  "detail.parameters.section": "Parameters",
  "detail.metadata.section": "About this recipe",
  "detail.metadata.author": "Author",
  "detail.metadata.camera": "Target camera",
  "detail.metadata.created": "Added",
  "detail.metadata.tags": "Tags",
  "detail.favourite.add": "Add to favourites",
  "detail.favourite.remove": "Remove from favourites",
  "detail.favourite.short.add": "save",
  "detail.favourite.short.saved": "saved",

  // Recipe parameters
  "param.filmSimulation": "Film simulation",
  "param.dynamicRange": "Dynamic range",
  "param.whiteBalance": "White balance",
  "param.whiteBalance.shift": "WB shift",
  "param.highlightTone": "Highlight tone",
  "param.shadowTone": "Shadow tone",
  "param.color": "Color",
  "param.sharpness": "Sharpness",
  "param.noiseReduction": "Noise reduction",
  "param.clarity": "Clarity",
  "param.grainEffect": "Grain effect",
  "param.colorChromeEffect": "Color chrome effect",
  "param.colorChromeEffectBlue": "Color chrome blue",
  "param.smoothSkinEffect": "Smooth skin effect",
  "param.monochromaticColor": "Monochromatic color",

  // Camera connect
  "camera.connect": "Connect camera",
  "camera.connecting": "Connecting",
  "camera.connected": "Connected",
  "camera.disconnect": "Disconnect",
  "camera.notSupported.short": "WebUSB unavailable",

  // Errors
  "error.UsbPermissionDenied.title": "No camera selected",
  "error.UsbPermissionDenied.body":
    "The browser permission dialog was dismissed. Try again and pick the camera in the picker.",
  "error.WebUSBUnsupported.title": "Browser not supported",
  "error.WebUSBUnsupported.body":
    "FilmFork uses WebUSB to talk to the camera. Open this app in a Chromium-based browser (Chrome, Edge, or Arc) to connect.",
  "error.WebUSBSecureContextRequired.title": "Secure context required",
  "error.WebUSBSecureContextRequired.body":
    "WebUSB requires HTTPS or localhost. Reload the app over a secure URL.",
  "error.UsbDisconnect.title": "Camera disconnected",
  "error.UsbDisconnect.body":
    "The connection to the camera was lost. Check the cable and the camera state, then reconnect.",
  "error.generic.title": "Could not connect",
  "error.generic.body":
    "An unexpected error happened while talking to the camera. Try unplugging and reconnecting.",
} as const;

export type MessageKey = keyof typeof en;
