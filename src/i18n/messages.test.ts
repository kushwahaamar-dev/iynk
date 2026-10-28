// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LOCALES } from "./config";
import { NAMESPACES } from "./namespaces";
import { messageAt, messageKeys } from "./translate";

const root = join(process.cwd(), "src/i18n/messages");
const file = (locale: string, ns: string) => join(root, locale, `${ns}.json`);
const read = (locale: string, ns: string): unknown => JSON.parse(readFileSync(file(locale, ns), "utf8"));

// Placeholders must survive translation, or t() throws at render time.
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function leaf(messages: unknown, key: string): string {
  const value = messageAt(messages, key);
  return typeof value === "string" ? value : (JSON.stringify(value) ?? "");
}

describe.each(NAMESPACES)("namespace %s", (ns) => {
  test("has a file in every language", () => {
    const missing = LOCALES.filter((locale) => !existsSync(file(locale, ns)));
    expect(missing, `missing src/i18n/messages/<lang>/${ns}.json for: ${missing.join(", ")}`).toEqual([]);
  });

  test.runIf(existsSync(file("en", ns)))("every language has exactly the English keys and placeholders", () => {
    const english = read("en", ns);
    const keys = messageKeys(english).sort();
    for (const locale of LOCALES) {
      if (locale === "en" || !existsSync(file(locale, ns))) continue;
      const translated = read(locale, ns);
      const have = new Set(messageKeys(translated));
      const missing = keys.filter((key) => !have.has(key));
      const extra = [...have].filter((key) => !keys.includes(key));
      expect({ missing, extra }, `src/i18n/messages/${locale}/${ns}.json against en`).toEqual({ missing: [], extra: [] });
      for (const key of keys) {
        expect(placeholders(leaf(translated, key)), `${locale}/${ns}.json ${key}`).toEqual(placeholders(leaf(english, key)));
      }
    }
  });
});

test("the common strings are translated, not copied from English", () => {
  const english = read("en", "common");
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    const translated = read(locale, "common");
    expect(leaf(translated, "notFound.title"), locale).not.toBe(leaf(english, "notFound.title"));
    expect(leaf(translated, "client.figure.loading"), locale).not.toBe(leaf(english, "client.figure.loading"));
  }
});

test("a removed namespace is gone", () => {
  expect(NAMESPACES).not.toContain(["sol", "ana"].join(""));
});

test("the strings of removed features are gone from every language", () => {
  const removed: [string, string][] = [
    ["ai", "story"],
    ["ai", `tools.tabs.${["pass", "port"].join("")}`],
    ["common", `client.dock.tabs.${["pass", "port"].join("")}`],
    ["shell", `nav.${["pass", "port"].join("")}`],
    ["shell", "nav.verify"],
    ["together", "lobby.buddies"],
    ["together", "lobby.plan"],
    ["together", "lobby.aiOff"],
  ];
  for (const locale of LOCALES) {
    for (const [ns, key] of removed) {
      expect(messageAt(read(locale, ns), key), `${locale}/${ns}.json ${key}`).toBeUndefined();
    }
  }
});

test("Studio strings never say validated and never use an em dash", () => {
  for (const locale of LOCALES) {
    for (const ns of NAMESPACES.filter((name) => name.startsWith("studio"))) {
      const text = readFileSync(file(locale, ns), "utf8");
      expect(text.toLowerCase(), `${locale}/${ns}.json`).not.toContain("validated");
      expect(text, `${locale}/${ns}.json`).not.toContain("—");
    }
  }
});
