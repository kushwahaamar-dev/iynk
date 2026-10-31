import { describe, expect, it } from "vitest";
import { LOCALES } from "./config";
import { TERM_IDS, termsFor } from "./terms";

describe("glossary", () => {
  it("has about forty terms", () => {
    expect(TERM_IDS.length).toBeGreaterThanOrEqual(40);
  });

  it("has a word in every language for every term", () => {
    for (const lang of LOCALES) {
      const terms = termsFor(lang);
      for (const id of TERM_IDS) {
        expect(terms[id].local.trim(), `${lang}/${id}`).not.toBe("");
        expect(terms[id].en.trim(), `en/${id}`).not.toBe("");
      }
    }
  });

  it("keeps English as the English word", () => {
    for (const id of TERM_IDS) expect(termsFor("en")[id].local).toBe(termsFor("en")[id].en);
  });

  it("has no duplicate English words", () => {
    const words = TERM_IDS.map((id) => termsFor("en")[id].en.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });
});
