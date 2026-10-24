// The languages SimLab ships (D1). Everything that needs the list imports it
// from here, next.config.ts included.

export const LOCALES = ["en", "es", "fr", "de", "zh", "hi"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** The cookie the language picker writes and the "/" redirect reads. */
export const LANG_COOKIE = "simlab-lang";

/** Each language's own name, for the language picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "简体中文",
  hi: "हिन्दी",
};

// BCP 47 tags for <html lang>, hreflang and Intl. The URL segment stays short.
const HTML_LANG: Record<Locale, string> = {
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  zh: "zh-Hans",
  hi: "hi",
};

export function htmlLang(locale: Locale): string {
  return HTML_LANG[locale];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** First supported language in preference order, else English. */
export function pickLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** "fr-CH, fr;q=0.9, en;q=0.8, *;q=0.5" -> ["fr-CH", "fr", "en"], by q then by order. */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  const entries: { tag: string; q: number; index: number }[] = [];
  header.split(",").forEach((part, index) => {
    const [rawTag, ...params] = part.split(";").map((piece) => piece.trim());
    let q = 1;
    for (const param of params) {
      if (param.startsWith("q=")) q = Number(param.slice(2));
    }
    if (rawTag && rawTag !== "*" && Number.isFinite(q) && q > 0) entries.push({ tag: rawTag, q, index });
  });
  return entries.sort((a, b) => b.q - a.q || a.index - b.index).map((entry) => entry.tag);
}

/**
 * The Accept-Language matcher for the "/" redirect in next.config.ts. Next
 * anchors `has` values as ^...$, so this matches the whole header and names
 * the first supported language `lang`. Browsers list languages by preference,
 * so the leftmost supported tag wins (q-values are not compared).
 */
export function acceptLanguagePattern(): string {
  const codes = LOCALES.join("|");
  return `(?:[^,]*,\\s*)*?\\s*(?<lang>${codes})(?:[-_][^,;]*)?(?:;[^,]*)?(?:,.*)?`;
}

/** The same page in another language: "/en/boards/nano?x=1" -> "/fr/boards/nano?x=1". */
export function localizedPath(path: string, locale: Locale): string {
  const match = /^\/([^/?#]+)(.*)$/.exec(path);
  if (match && isLocale(match[1])) return `/${locale}${match[2]}`;
  return `/${locale}${path.startsWith("/") ? (path === "/" ? "" : path) : `/${path}`}`;
}
