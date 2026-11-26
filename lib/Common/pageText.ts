/** A text in each language the components speak. */
export interface PageTexts {
  en: string;
  es: string;
  fr: string;
}

export type PageLanguage = keyof PageTexts;

/**
 * The language of the page, from `<html lang>`: "es-CO" gives "es". Any
 * other language, or none, gives English, so that an application that does
 * not say its language keeps the English texts.
 */
export function pageLanguage(): PageLanguage {
  const lang = document.documentElement.lang.slice(0, 2).toLowerCase();
  return lang === "es" || lang === "fr" ? lang : "en";
}

/** The text of `texts` in the language of the page. */
export const pageText = (texts: PageTexts): string => texts[pageLanguage()];
