// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { LOCALES } from "./config";
import { messageAt, messageKeys } from "./translate";

const B8_NAMESPACES = ["fidelity", "instruments", "run"] as const;
// prettier-ignore
const BANNED_WORDS_B8 = ["validated", "accurate", "exact", "realistic physics", "hardware-accurate", "safe to build"];

const root = process.cwd();
const messagesFile = (locale: string, ns: string) =>
  join(root, "src/i18n/messages", locale, `${ns}.json`);
const read = (locale: string, ns: string): unknown =>
  JSON.parse(readFileSync(messagesFile(locale, ns), "utf8"));
const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const leaf = (messages: unknown, key: string) =>
  String(messageAt(messages, key));

const englishKeys = B8_NAMESPACES.flatMap((ns) =>
  messageKeys(read("en", ns)).map((key) => `${ns}.${key}`),
);

// Keys the B8 components build from a template literal, by the prefix they share.
const DYNAMIC_PREFIXES = [
  "fidelity.tier.",
  "fidelity.layer.",
  "fidelity.states.",
  "instruments.kind.",
  "instruments.meter.mode.",
  "instruments.run.unit.",
  "run.state.",
  "run.halt.",
  "run.reason.",
];

const SCANNED = [
  ...[
    "TierChips",
    "SpeedControl",
    "InstrumentDock",
    "ModelsPanel",
    "RunBar",
    "StudioEntry",
  ].map((name) => `src/components/studio/${name}.tsx`),
  "src/components/studio/instruments",
  ...["RunIndicator", "RunnerPicker"].map(
    (name) => `src/components/studio/room/${name}.tsx`,
  ),
  "src/studio/room/run-state.ts",
  "src/studio/run/plot.ts",
  "src/sim/probe",
  "src/sim/analog/states.ts",
];

function sourceFiles(path: string): string[] {
  const full = join(root, path);
  if (!existsSync(full)) return [];
  if (/\.tsx?$/.test(path)) return [full];
  return readdirSync(full)
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => join(full, name));
}

describe.each(B8_NAMESPACES)("namespace %s", (ns) => {
  test("every language has exactly the English keys and placeholders", () => {
    const english = read("en", ns);
    const keys = messageKeys(english).sort();
    for (const locale of LOCALES) {
      if (locale === "en") continue;
      const translated = read(locale, ns);
      const have = new Set(messageKeys(translated));
      const missing = keys.filter((key) => !have.has(key));
      const extra = [...have].filter((key) => !keys.includes(key));
      expect(
        { missing, extra },
        `src/i18n/messages/${locale}/${ns}.json against en`,
      ).toEqual({ missing: [], extra: [] });
      for (const key of keys) {
        expect(
          placeholders(leaf(translated, key)),
          `${locale}/${ns}.json ${key}`,
        ).toEqual(placeholders(leaf(english, key)));
      }
    }
  });

  test("no string is empty and none uses an em dash", () => {
    for (const locale of LOCALES) {
      const text = readFileSync(messagesFile(locale, ns), "utf8");
      expect(text, `${locale}/${ns}.json`).not.toContain("—");
      const translated = read(locale, ns);
      for (const key of messageKeys(translated))
        expect(
          leaf(translated, key).trim(),
          `${locale}/${ns}.json ${key}`,
        ).not.toBe("");
    }
  });

  test("the English file has none of the banned words", () => {
    const text = readFileSync(messagesFile("en", ns), "utf8").toLowerCase();
    for (const word of BANNED_WORDS_B8)
      expect(text, `en/${ns}.json`).not.toContain(word);
  });
});

test("the non-English files are translated, not copied from English", () => {
  const english = read("en", "fidelity");
  for (const locale of LOCALES) {
    if (locale === "en") continue;
    expect(leaf(read(locale, "fidelity"), "panel.title"), locale).not.toBe(
      leaf(english, "panel.title"),
    );
    expect(leaf(read(locale, "run"), "state.running"), locale).not.toBe(
      leaf(read("en", "run"), "state.running"),
    );
  }
});

test("every key the B8 files use exists in the English files", () => {
  const known = new Set(englishKeys);
  const literal = /(?:\bt\(\s*|messageKey:\s*)["'`]([\w.]+)["'`]/g;
  for (const path of SCANNED.flatMap(sourceFiles)) {
    for (const [, key] of readFileSync(path, "utf8").matchAll(literal)) {
      if (!B8_NAMESPACES.some((ns) => key.startsWith(`${ns}.`))) continue;
      expect(known.has(key), `${path} uses ${key}`).toBe(true);
    }
  }
});

test("each dynamic prefix matches at least one English key", () => {
  for (const prefix of DYNAMIC_PREFIXES) {
    expect(
      englishKeys.some((key) => key.startsWith(prefix)),
      prefix,
    ).toBe(true);
  }
});
