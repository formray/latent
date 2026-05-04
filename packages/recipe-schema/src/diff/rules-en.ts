export type DeltaRule =
  | { kind: "numericRange"; min: number; max: number; phrase: string; ruleKey: string }
  | { kind: "enumChange"; from: string; to: string; phrase: string; ruleKey: string };

export const rulesEn: Record<string, DeltaRule[]> = {
  "whiteBalance.shiftR": [
    { kind: "numericRange", min: 1, max: 3, phrase: "slightly warmer red cast", ruleKey: "wbR.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "noticeably warmer red cast", ruleKey: "wbR.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "slightly cooler, removing red", ruleKey: "wbR.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "noticeably cooler, removing red", ruleKey: "wbR.-4.-9" },
  ],
  "whiteBalance.shiftB": [
    { kind: "numericRange", min: 1, max: 3, phrase: "slightly bluer cast", ruleKey: "wbB.+1.3" },
    { kind: "numericRange", min: 4, max: 9, phrase: "noticeably bluer cast", ruleKey: "wbB.+4.9" },
    { kind: "numericRange", min: -3, max: -1, phrase: "slightly warmer, removing blue", ruleKey: "wbB.-1.-3" },
    { kind: "numericRange", min: -9, max: -4, phrase: "noticeably warmer, removing blue", ruleKey: "wbB.-4.-9" },
  ],
  "shadowTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "more open shadows; recovers detail", ruleKey: "shadow.open" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "deeper, more closed shadows", ruleKey: "shadow.deep" },
  ],
  "highlightTone": [
    { kind: "numericRange", min: -2, max: -0.5, phrase: "softer highlight rolloff", ruleKey: "highlight.soft" },
    { kind: "numericRange", min: 0.5, max: 4, phrase: "harsher highlights, more bite", ruleKey: "highlight.bite" },
  ],
  "clarity": [
    { kind: "numericRange", min: 1, max: 3, phrase: "subtle local contrast lift", ruleKey: "clarity.subtle" },
    { kind: "numericRange", min: 4, max: 5, phrase: "noticeable local contrast and edge bite", ruleKey: "clarity.strong" },
    { kind: "numericRange", min: -5, max: -1, phrase: "softer, more diffuse rendering", ruleKey: "clarity.soft" },
  ],
  "noiseReduction": [
    { kind: "numericRange", min: 1, max: 4, phrase: "smoother, less grain texture (can soften detail)", ruleKey: "nr.smooth" },
    { kind: "numericRange", min: -4, max: -1, phrase: "more grain texture; preserves detail", ruleKey: "nr.gritty" },
  ],
  "color": [
    { kind: "numericRange", min: 1, max: 4, phrase: "more saturated colors", ruleKey: "color.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "more muted colors", ruleKey: "color.down" },
  ],
  "sharpness": [
    { kind: "numericRange", min: 1, max: 4, phrase: "harder edges", ruleKey: "sharp.up" },
    { kind: "numericRange", min: -4, max: -1, phrase: "softer edges", ruleKey: "sharp.down" },
  ],
  "grainEffect.strength": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "adds light film-grain texture", ruleKey: "grain.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "adds visible film-grain texture", ruleKey: "grain.off.strong" },
    { kind: "enumChange", from: "Weak", to: "Strong", phrase: "increases grain intensity", ruleKey: "grain.weak.strong" },
    { kind: "enumChange", from: "Strong", to: "Weak", phrase: "softens grain", ruleKey: "grain.strong.weak" },
    { kind: "enumChange", from: "Weak", to: "Off", phrase: "removes grain", ruleKey: "grain.weak.off" },
    { kind: "enumChange", from: "Strong", to: "Off", phrase: "removes grain", ruleKey: "grain.strong.off" },
  ],
  "colorChromeEffect": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "denser saturated colors (subtle)", ruleKey: "cce.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "denser saturated colors (strong)", ruleKey: "cce.off.strong" },
  ],
  "colorChromeEffectBlue": [
    { kind: "enumChange", from: "Off", to: "Weak", phrase: "richer blues in skies and water", ruleKey: "ccb.off.weak" },
    { kind: "enumChange", from: "Off", to: "Strong", phrase: "much richer blues", ruleKey: "ccb.off.strong" },
  ],
};

export const fallbackPhraseEn = (parameter: string, before: unknown, after: unknown): string =>
  `${parameter} changed from ${JSON.stringify(before)} to ${JSON.stringify(after)}`;
