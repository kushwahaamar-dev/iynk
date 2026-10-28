export type FaqPair = { q: string; a: string };

export function buildFaqJsonLd(pairs: readonly FaqPair[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

/** The JSON for an inline script: `<` is escaped so no answer can close the tag. */
export function faqJsonLdScript(pairs: readonly FaqPair[]): string {
  return JSON.stringify(buildFaqJsonLd(pairs)).replaceAll("<", "\\u003c");
}
