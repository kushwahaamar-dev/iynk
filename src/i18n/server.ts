import "server-only";

import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { NAMESPACES, type ContentLab, type Messages, type Namespace } from "./namespaces";
import { createTranslator, type Translate } from "./translate";

// Each JSON file becomes its own server chunk, loaded only for pages in that
// language. Nothing here reaches the client unless a page passes it down.

const loadNamespace = cache(async (locale: Locale, ns: Namespace): Promise<unknown> => {
  try {
    const mod = (await import(`./messages/${locale}/${ns}.json`)) as { default: unknown };
    return mod.default;
  } catch (error) {
    throw new Error(
      `iynk i18n: missing UI strings src/i18n/messages/${locale}/${ns}.json. ` +
        `Every namespace (${NAMESPACES.join(", ")}) needs a file in every language.`,
      { cause: error },
    );
  }
});

/** One namespace's strings in one language. */
export async function getMessages<N extends Namespace>(locale: Locale, ns: N): Promise<Messages[N]> {
  return (await loadNamespace(locale, ns)) as Messages[N];
}

/** Every namespace in one language, merged into one dictionary keyed by namespace. */
export async function getDictionary(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(NAMESPACES.map(async (ns) => [ns, await loadNamespace(locale, ns)] as const));
  return Object.fromEntries(entries) as Messages;
}

/** t() for one namespace: `const t = await getT(lang, "common"); t("notFound.title")`. */
export async function getT<N extends Namespace>(locale: Locale, ns: N): Promise<Translate<Messages[N]>> {
  const messages: Messages[N] = await getMessages(locale, ns);
  return createTranslator(locale, messages, `${locale}/${ns}`);
}

const loadContent = cache(async (locale: Locale, lab: ContentLab, id: string): Promise<unknown> => {
  try {
    const mod = (await import(`./content/${locale}/${lab}/${id}.json`)) as { default: unknown };
    return mod.default;
  } catch (error) {
    throw new Error(
      `iynk i18n: missing content text src/i18n/content/${locale}/${lab}/${id}.json. ` +
        `Every board, bench and drone needs its prose in every language.`,
      { cause: error },
    );
  }
});

/**
 * The prose of one board, robotics bench or drone in one language. The shape
 * is the item's own (see src/content/schema.ts), so the caller names it.
 */
export async function getContentText<T = Record<string, unknown>>(
  locale: Locale,
  lab: ContentLab,
  id: string,
): Promise<T> {
  return (await loadContent(locale, lab, id)) as T;
}

/** An item's prose and the language it is written in. */
export type ContentProse<T> = { text: T; lang: Locale };

/**
 * The item's prose in this language, or its English prose while that
 * translation is not written. The page shows a notice when `lang` differs
 * from its own. Throws only when the English file is missing too.
 */
export async function getContentProse<T = Record<string, unknown>>(
  locale: Locale,
  lab: ContentLab,
  id: string,
): Promise<ContentProse<T>> {
  try {
    return { text: await getContentText<T>(locale, lab, id), lang: locale };
  } catch (error) {
    if (locale === DEFAULT_LOCALE) throw error;
    return { text: await getContentText<T>(DEFAULT_LOCALE, lab, id), lang: DEFAULT_LOCALE };
  }
}
