// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LOCALES } from "./config";

// Figures look up every string by its English text (CF_T), and an entry missing from a language's dictionary
// shows English inside an otherwise translated page. src/i18n/figure-keys.json lists every string the built
// figures use (node scripts/figure-strings.mjs); each dictionary must cover it, placeholders kept.
const root = join(process.cwd(), "src/i18n");
const keys = Object.keys(JSON.parse(readFileSync(join(root, "figure-keys.json"), "utf8")) as Record<string, string[]>);
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const file = (locale: string) => join(root, "figures", `${locale}.json`);
const written = LOCALES.filter((l) => l !== "en" && existsSync(file(l)));

test("the key list names where each string comes from", () => {
  const list = JSON.parse(readFileSync(join(root, "figure-keys.json"), "utf8")) as Record<string, string[]>;
  expect(keys.length).toBeGreaterThan(1000);
  expect(Object.entries(list).filter(([, from]) => !from.length)).toEqual([]);
});

describe.runIf(written.length > 0).each(written)("figure strings, %s", (locale) => {
  const dict = JSON.parse(readFileSync(file(locale), "utf8")) as Record<string, unknown>;

  test("translates every figure string, keeping its placeholders, and nothing else", () => {
    const missing = keys.filter((k) => typeof dict[k] !== "string" || !(dict[k] as string).trim());
    const extra = Object.keys(dict).filter((k) => !keys.includes(k));
    expect({ missing: missing.slice(0, 20), extra: extra.slice(0, 20) }).toEqual({ missing: [], extra: [] });
    for (const k of keys) expect(placeholders(dict[k] as string), k).toEqual(placeholders(k));
  });

  test("is translated, not copied", () => {
    const sentences = keys.filter((k) => k.split(/\s+/).length >= 3);
    const copied = sentences.filter((k) => dict[k] === k);
    expect(copied.length / sentences.length, copied.slice(0, 5).join(" | ")).toBeLessThan(0.1);
  });
});
