import { afterEach, describe, expect, it } from "vitest";
import { pageLanguage, pageText } from "./pageText";

// cspell:disable-next-line -- Spanish and French
const texts = { en: "Discard?", es: "¿Descartar?", fr: "Abandonner ?" };

describe("pageText", () => {
  afterEach(() => {
    document.documentElement.lang = "";
  });

  it("speaks the language of the page", () => {
    document.documentElement.lang = "fr";
    expect(pageText(texts)).toBe(texts.fr);
    document.documentElement.lang = "es-CO";
    expect(pageLanguage()).toBe("es");
    expect(pageText(texts)).toBe(texts.es);
  });

  it("speaks English for any other language, or none", () => {
    expect(pageText(texts)).toBe("Discard?");
    document.documentElement.lang = "de";
    expect(pageText(texts)).toBe("Discard?");
    document.documentElement.lang = "EN-us";
    expect(pageLanguage()).toBe("en");
  });
});
