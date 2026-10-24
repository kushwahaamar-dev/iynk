"use client";

// The "search" namespace on the client. LabDock panels take only LabDockProps,
// so their strings can't come as props from the page: each language's file is
// a lazy chunk, loaded once and shared by every panel (as src/lib/ai does).

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";

export type SearchMessages = typeof import("@/i18n/messages/en/search.json");
export type SearchT = Translate<SearchMessages>;

const loaders: Record<Locale, () => Promise<{ default: SearchMessages }>> = {
  en: () => import("@/i18n/messages/en/search.json"),
  es: () => import("@/i18n/messages/es/search.json"),
  fr: () => import("@/i18n/messages/fr/search.json"),
  de: () => import("@/i18n/messages/de/search.json"),
  zh: () => import("@/i18n/messages/zh/search.json"),
  hi: () => import("@/i18n/messages/hi/search.json"),
};

const ready = new Map<Locale, SearchT>();
const loading = new Set<Locale>();
const listeners = new Set<() => void>();

function load(locale: Locale) {
  if (ready.has(locale) || loading.has(locale)) return;
  loading.add(locale);
  loaders[locale]()
    .then((module) => {
      ready.set(locale, createTranslator(locale, module.default, `${locale}/search`));
      for (const listener of listeners) listener();
    })
    // A failed chunk load leaves the panel on its loading state; the next mount retries.
    .catch(() => undefined)
    .finally(() => loading.delete(locale));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** t() for the "search" namespace, or null while this language's strings load. */
export function useSearchT(locale: Locale): SearchT | null {
  const t = useSyncExternalStore(
    subscribe,
    () => ready.get(locale) ?? null,
    () => null,
  );
  useEffect(() => load(locale), [locale]);
  return t;
}
