import type { Locale } from "@/i18n/config";
import { htmlLang } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageParams, type Translate } from "@/i18n/translate";

export type DroneLabMessages = Messages["dronelab"];
export type DroneLabT = Translate<DroneLabMessages>;
/** t() over one craft's content JSON (src/i18n/content/<lang>/drones/<id>.json): keys are TextKeys. */
export type ContentT = ((key: string, params?: MessageParams) => string) & { has(key: string): boolean };

export function droneLabT(lang: Locale, messages: DroneLabMessages): DroneLabT {
  return createTranslator(lang, messages, `${lang}/dronelab`);
}

function lookup(tree: unknown, key: string): unknown {
  let node = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

export function contentT(lang: Locale, id: string, text: Record<string, unknown>): ContentT {
  const t = createTranslator(lang, text, `${lang}/drones/${id}`) as unknown as (key: string, params?: MessageParams) => string;
  return Object.assign((key: string, params?: MessageParams) => t(key, params), {
    has: (key: string) => {
      const v = lookup(text, key);
      return (
        typeof v === "string" || (typeof v === "object" && v !== null && typeof (v as { other?: unknown }).other === "string")
      );
    },
  });
}

/** Number formatting in the page's language with a fixed number of decimals. */
export function formatNumber(lang: Locale, value: number, digits: number): string {
  return new Intl.NumberFormat(htmlLang(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
