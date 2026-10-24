import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { messageKeys } from "@/i18n/translate";
import { loadHwMessages } from "./messages";

function leaf(messages: unknown, key: string): string {
  return key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages) as string;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("hw strings", () => {
  it("every locale has exactly the English keys, the same placeholders and no empty text", async () => {
    const en = await loadHwMessages("en");
    const keys = messageKeys(en).sort();
    for (const locale of LOCALES) {
      const messages = await loadHwMessages(locale);
      expect(messageKeys(messages).sort(), locale).toEqual(keys);
      for (const key of keys) {
        const text = leaf(messages, key);
        expect(text.trim(), `${locale}:${key}`).not.toBe("");
        expect(placeholders(text), `${locale}:${key}`).toEqual(placeholders(leaf(en, key)));
      }
    }
  });

  it("the other locales are translated, not English copies", async () => {
    const en = await loadHwMessages("en");
    const keys = messageKeys(en);
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      const messages = await loadHwMessages(locale);
      const same = keys.filter((key) => leaf(messages, key) === leaf(en, key));
      // Only literals stay: HIGH/LOW, units, "USB", "PWM {duty}" and the like.
      expect(same.length / keys.length, `${locale}: ${same.join(", ")}`).toBeLessThan(0.2);
    }
  });
});
