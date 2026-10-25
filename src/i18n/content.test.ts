// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LOCALES } from "./config";
import { messageAt, messageKeys } from "./translate";

// An item's prose in another language replaces the English file whole (getContentProse), and t() throws on a
// missing key or placeholder, so a translation must carry exactly the English keys and placeholders.
const root = join(process.cwd(), "src/i18n/content");
const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function leaf(tree: unknown, key: string): string {
  const value = messageAt(tree, key);
  return typeof value === "string" ? value : (JSON.stringify(value) ?? "");
}

const english = readdirSync(join(root, "en")).flatMap((lab) =>
  readdirSync(join(root, "en", lab))
    .filter((f) => f.endsWith(".json"))
    .map((f) => `${lab}/${f}`),
);
const translations = LOCALES.filter((l) => l !== "en").flatMap((locale) =>
  english.filter((item) => existsSync(join(root, locale, item))).map((item) => [locale, item] as const),
);

test("every translated file has an English original", () => {
  const strays = LOCALES.filter((l) => l !== "en" && existsSync(join(root, l))).flatMap((locale) =>
    readdirSync(join(root, locale)).flatMap((lab) =>
      readdirSync(join(root, locale, lab))
        .map((f) => `${locale}/${lab}/${f}`)
        .filter((path) => !english.includes(path.slice(locale.length + 1))),
    ),
  );
  expect(strays).toEqual([]);
});

describe.runIf(translations.length > 0).each(translations)("%s %s", (locale, item) => {
  const en = read(join(root, "en", item));
  const tr = read(join(root, locale, item));

  test("has exactly the English keys and placeholders", () => {
    const keys = messageKeys(en).sort();
    const have = new Set(messageKeys(tr));
    const missing = keys.filter((key) => !have.has(key));
    const extra = [...have].filter((key) => !keys.includes(key));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    for (const key of keys) expect(placeholders(leaf(tr, key)), key).toEqual(placeholders(leaf(en, key)));
  });

  test("is translated, not copied: the sentences differ from English", () => {
    // Pin names, part numbers and units stay as they are; a sentence of three words or more is prose.
    const sentences = messageKeys(en).filter((key) => leaf(en, key).split(/\s+/).length >= 3);
    const copied = sentences.filter((key) => leaf(tr, key) === leaf(en, key));
    expect(copied.length / sentences.length, copied.slice(0, 5).join(", ")).toBeLessThan(0.1);
  });
});
