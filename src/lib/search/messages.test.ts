import { describe, expect, it } from "vitest";
import de from "@/i18n/messages/de/search.json";
import en from "@/i18n/messages/en/search.json";
import es from "@/i18n/messages/es/search.json";
import fr from "@/i18n/messages/fr/search.json";
import hi from "@/i18n/messages/hi/search.json";
import zh from "@/i18n/messages/zh/search.json";
import { LOCALES, type Locale } from "@/i18n/config";
import { createTranslator, messageKeys } from "@/i18n/translate";
import { LABELLED_PARTS } from "./bom";
import { NEARBY_KINDS, OFFER_SOURCES } from "./types";

const all: Record<Locale, unknown> = { en, es, fr, de, zh, hi };

function leaf(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages);
}

const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("search.json", () => {
  const keys = messageKeys(en).sort();

  it.each(LOCALES)("%s has exactly the English keys, with the same placeholders", (locale) => {
    expect(messageKeys(all[locale]).sort()).toEqual(keys);
    for (const key of keys) {
      const source = JSON.stringify(leaf(en, key));
      const target = JSON.stringify(leaf(all[locale], key));
      expect(params(target), `${locale}:${key}`).toEqual(params(source));
    }
  });

  it.each(LOCALES)("%s renders every string", (locale) => {
    const t = createTranslator(locale, all[locale] as typeof en);
    const sample = { count: 2, time: "9:41", store: "Amazon", part: "Frame", amount: "$150", tw: "5.0", minutes: "4.2", cheapest: "$162", slot: "Motors", from: "A", to: "B", value: "1", rating: "4.5", km: "1.2", place: "Austin", event: "Meetup", title: "T", channel: "C", duration: "4:20", site: "example.com" };
    for (const key of keys) expect(t(key as never, sample).length, `${locale}:${key}`).toBeGreaterThan(0);
  });

  it("labels every part, store and kind the panels show", () => {
    for (const id of LABELLED_PARTS) expect(typeof (en.part as Record<string, string>)[id], id).toBe("string");
    for (const source of OFFER_SOURCES) expect(typeof en.store[source]).toBe("string");
    for (const kind of NEARBY_KINDS) expect(typeof en.nearby.kind[kind]).toBe("string");
  });
});
