import { getLanguage } from "obsidian";
import { de } from "./de";
import { en, type TranslationDictionary } from "./en";

type TranslationParameters = Record<string, number | string>;

const dictionaries: Record<string, TranslationDictionary> = {
  de,
  en,
};

let activeDictionary: TranslationDictionary = en;
let activeLocale = "en";

export function initializeI18n(): void {
  const requestedLocale = getLanguage() || "en";
  const normalizedLocale = requestedLocale.replace("_", "-");
  const baseLanguage = normalizedLocale.split("-")[0] ?? "en";

  activeLocale = dictionaries[normalizedLocale]
    ? normalizedLocale
    : dictionaries[baseLanguage]
      ? baseLanguage
      : "en";

  activeDictionary = dictionaries[activeLocale] ?? en;
}

export function getLocale(): string {
  return activeLocale;
}

export function t(
  path: string,
  parameters: TranslationParameters = {},
): string {
  const translated =
    getTranslation(activeDictionary, path) ??
    getTranslation(en, path) ??
    path;

  return translated.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    String(parameters[name] ?? `{{${name}}}`),
  );
}

function getTranslation(
  dictionary: TranslationDictionary,
  path: string,
): string | undefined {
  let current: unknown = dictionary;

  for (const segment of path.split(".")) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}