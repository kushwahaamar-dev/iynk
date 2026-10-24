// The t() helper shared by server and client code. Messages are plain JSON
// objects; a leaf is a string with {name} placeholders, or a set of plural
// forms ({ "one": "...", "other": "..." }) picked by params.count.

import { htmlLang, type Locale } from "./config";

export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

export type MessageParams = Record<string, string | number>;

/** Dot paths to every leaf of a message tree: "notFound.title", "client.figure.loading". */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends { other: string }
      ? K
      : T[K] extends object
        ? `${K}.${MessageKey<T[K]>}`
        : never;
}[keyof T & string];

export type Translate<T> = (key: MessageKey<T>, params?: MessageParams) => string;

function isPlural(value: unknown): value is PluralForms {
  return typeof value === "object" && value !== null && typeof (value as PluralForms).other === "string";
}

/**
 * The value at a dot path. A JSON key may itself contain dots (the connector
 * id "barrel-5.5x2.1"), and MessageKey joins such a key unchanged, so each
 * level tries the whole rest of the path first, then shorter heads.
 */
export function messageAt(messages: unknown, key: string): unknown {
  if (typeof messages !== "object" || messages === null) return undefined;
  const node = messages as Record<string, unknown>;
  if (Object.hasOwn(node, key)) return node[key];
  for (let dot = key.lastIndexOf("."); dot > 0; dot = key.lastIndexOf(".", dot - 1)) {
    const head = key.slice(0, dot);
    if (!Object.hasOwn(node, head)) continue;
    const found = messageAt(node[head], key.slice(dot + 1));
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Builds t() for one message tree. `scope` only names the tree in errors
 * ("es/common"). A missing key or parameter throws: t() never fills a gap
 * from another language or shows a raw key. (A whole item's prose can fall
 * back to English, with a notice: getContentProse.)
 */
export function createTranslator<T extends object>(locale: Locale, messages: T, scope: string = locale): Translate<T> {
  const tag = htmlLang(locale);
  let plurals: Intl.PluralRules | undefined;
  let numbers: Intl.NumberFormat | undefined;

  return (key, params) => {
    const value = messageAt(messages, key);
    let text: string;
    if (typeof value === "string") {
      text = value;
    } else if (isPlural(value)) {
      const count = Number(params?.count);
      if (!Number.isFinite(count)) throw new Error(`SimLab i18n: "${scope}:${key}" has plural forms and needs a numeric "count".`);
      plurals ??= new Intl.PluralRules(tag);
      text = value[plurals.select(count)] ?? value.other;
    } else {
      throw new Error(`SimLab i18n: no string "${key}" in ${scope}.`);
    }

    return text.replace(/\{(\w+)\}/g, (_, name: string) => {
      const param = params?.[name];
      if (param === undefined) throw new Error(`SimLab i18n: "${scope}:${key}" needs the parameter "${name}".`);
      if (typeof param === "number") {
        numbers ??= new Intl.NumberFormat(tag);
        return numbers.format(param);
      }
      return param;
    });
  };
}

/** Every leaf path of a message tree, for checking that locales match. */
export function messageKeys(messages: unknown, prefix = ""): string[] {
  if (typeof messages !== "object" || messages === null) return [];
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" || isPlural(value)) return [path];
    return messageKeys(value, path);
  });
}
