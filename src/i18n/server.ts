import "server-only";

import { cache } from "react";
import type { Locale } from "./config";
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
      `SimLab i18n: missing UI strings src/i18n/messages/${locale}/${ns}.json. ` +
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
  return createTranslator(locale, await getMessages(locale, ns), `${locale}/${ns}`);
}

const loadContent = cache(async (locale: Locale, lab: ContentLab, id: string): Promise<unknown> => {
  try {
    const mod = (await import(`./content/${locale}/${lab}/${id}.json`)) as { default: unknown };
    return mod.default;
  } catch (error) {
    throw new Error(
      `SimLab i18n: missing content text src/i18n/content/${locale}/${lab}/${id}.json. ` +
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
