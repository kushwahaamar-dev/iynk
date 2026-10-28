import { expect, test } from "vitest";
import { buildFaqJsonLd, faqJsonLdScript } from "./faq-schema";

const pairs = Array.from({ length: 8 }, (_, i) => ({ q: `Question ${i + 1}?`, a: `Answer ${i + 1} with <b>markup</b>.` }));

test("the schema is a FAQPage of eight questions with accepted answers", () => {
  const schema = buildFaqJsonLd(pairs);
  expect(schema["@type"]).toBe("FAQPage");
  expect(schema.mainEntity).toHaveLength(8);
  for (const [i, entity] of schema.mainEntity.entries()) {
    expect(entity["@type"]).toBe("Question");
    expect(entity.name).toBe(pairs[i].q);
    expect(entity.acceptedAnswer).toEqual({ "@type": "Answer", text: pairs[i].a });
  }
});

test("the serialised script has no raw less-than sign and parses back", () => {
  const script = faqJsonLdScript(pairs);
  expect(script).not.toContain("<");
  expect(JSON.parse(script)).toEqual(buildFaqJsonLd(pairs));
});
