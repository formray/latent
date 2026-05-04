import type { DeltaRule } from "./rules-en.js";

export const rulesIt: Record<string, DeltaRule[]> = {
  "whiteBalance.shiftR": [
    { kind: "numericRange", min: 1, max: 3, phrase: "leggera dominante rossa, più caldo", ruleKey: "wbR.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "marcata dominante rossa, decisamente più caldo", ruleKey: "wbR.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "leggermente più freddo, riduce il rosso", ruleKey: "wbR.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "decisamente più freddo, riduce il rosso", ruleKey: "wbR.-4.-9" },
  ],
  "whiteBalance.shiftB": [
    { kind: "numericRange", min: 1, max: 3, phrase: "leggera dominante blu", ruleKey: "wbB.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "marcata dominante blu", ruleKey: "wbB.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "leggermente più caldo, riduce il blu", ruleKey: "wbB.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "decisamente più caldo, riduce il blu", ruleKey: "wbB.-4.-9" },
  ],
  "shadowTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "ombre più aperte; recupera dettaglio", ruleKey: "shadow.open" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "ombre più profonde e chiuse", ruleKey: "shadow.deep" },
  ],
  "highlightTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "rolloff delle alte luci più morbido", ruleKey: "highlight.soft" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "alte luci più aggressive, più mordente", ruleKey: "highlight.bite" },
  ],
  "clarity": [
    { kind: "numericRange", min: 1, max: 3, phrase: "leggero aumento del contrasto locale", ruleKey: "clarity.subtle" },
    { kind: "numericRange", min: 4, max: 5, phrase: "contrasto locale e mordente sui bordi marcati", ruleKey: "clarity.strong" },
    { kind: "numericRange", min: -5, max: -1, phrase: "resa più morbida e diffusa", ruleKey: "clarity.soft" },
  ],
  "noiseReduction": [
    { kind: "numericRange", min: 1, max: 4, phrase: "texture più liscia, meno grana (può ammorbidire il dettaglio)", ruleKey: "nr.smooth" },
    { kind: "numericRange", min: -4, max: -1, phrase: "più texture di grana; preserva il dettaglio", ruleKey: "nr.gritty" },
  ],
  "color": [
    { kind: "numericRange", min: 1, max: 4, phrase: "colori più saturi", ruleKey: "color.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "colori più tenui", ruleKey: "color.down" },
  ],
  "sharpness": [
    { kind: "numericRange", min: 1, max: 4, phrase: "bordi più duri", ruleKey: "sharp.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "bordi più morbidi", ruleKey: "sharp.down" },
  ],
  "grainEffect.strength": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "aggiunge una texture leggera di grana cinematografica", ruleKey: "grain.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "aggiunge una texture visibile di grana cinematografica", ruleKey: "grain.off.strong" },
    { kind: "enumChange", from: "Weak", to: "Strong", phrase: "intensifica la grana", ruleKey: "grain.weak.strong" },
    { kind: "enumChange", from: "Strong", to: "Weak", phrase: "ammorbidisce la grana", ruleKey: "grain.strong.weak" },
    { kind: "enumChange", from: "Weak", to: "Off", phrase: "rimuove la grana", ruleKey: "grain.weak.off" },
    { kind: "enumChange", from: "Strong", to: "Off", phrase: "rimuove la grana", ruleKey: "grain.strong.off" },
  ],
  "colorChromeEffect": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "colori saturi più densi (sottile)", ruleKey: "cce.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "colori saturi più densi (marcato)", ruleKey: "cce.off.strong" },
  ],
  "colorChromeEffectBlue": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "blu più ricchi nei cieli e nell'acqua", ruleKey: "ccb.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "blu molto più ricchi", ruleKey: "ccb.off.strong" },
  ],
};

export const fallbackPhraseIt = (parameter: string, before: unknown, after: unknown): string =>
  `${parameter} cambiato da ${JSON.stringify(before)} a ${JSON.stringify(after)}`;
