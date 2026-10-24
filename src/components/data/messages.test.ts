// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { createTranslator, messageKeys } from "@/i18n/translate";
import { getDataMessages } from "./messages";

const placeholders = (text: unknown) => [...new Set([...JSON.stringify(text).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

function at(messages: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], messages);
}

describe("data messages", () => {
  it("has the English keys and placeholders in every language, translated", async () => {
    const english = await getDataMessages("en");
    const keys = messageKeys(english).sort();
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      const messages = await getDataMessages(locale);
      expect(messageKeys(messages).sort(), locale).toEqual(keys);
      for (const key of keys) {
        expect(placeholders(at(messages, key)), `${locale}:${key}`).toEqual(placeholders(at(english, key)));
      }
      // Brand words ("HackTX", "Live") may stay, but the text as a whole is the language's own.
      const same = keys.filter((key) => JSON.stringify(at(messages, key)) === JSON.stringify(at(english, key)));
      expect(same.length, `${locale} copies English for ${same.join(", ")}`).toBeLessThanOrEqual(2);
    }
  });

  it("renders every string, plural forms included, in every language", async () => {
    for (const locale of LOCALES) {
      const m = await getDataMessages(locale);
      const board = createTranslator(locale, m.leaderboard);
      const live = createTranslator(locale, m.live);
      for (const count of [0, 1, 2, 5, 1_000_000]) {
        expect(board("pilots", { count })).toMatch(/\S/);
        expect(live("builders", { count })).toMatch(/\S/);
        expect(live("leds", { count })).toMatch(/\S/);
        expect(live("drones", { count })).toMatch(/\S/);
      }
      expect(board("caption", { course: "Bando" })).toContain("Bando");
      expect(board("yourRank", { rank: 3 })).toContain("3");
    }
  });
});
