import { useMemo } from "react";
import { en, type MessageKey } from "./en";
import { it } from "./it";

export type Locale = "en" | "it";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language?.toLowerCase() ?? "en";
  if (lang.startsWith("it")) return "it";
  return "en";
}

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en,
  it,
};

export type Translator = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

export function createT(locale: Locale): Translator {
  const catalog = catalogs[locale];
  return (key, vars) => {
    const template = catalog[key] ?? en[key] ?? key;
    if (!vars) return template;
    return Object.entries(vars).reduce(
      (acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)),
      template,
    );
  };
}

/** Returns a memoised translator for the user's locale (en|it). */
export function useT(): Translator {
  return useMemo(() => createT(detectLocale()), []);
}

export type { MessageKey };
