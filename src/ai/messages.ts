"use client";

// The partner's namespaces on the client. The panel gets no strings as props from a page, so each language's
// file is a lazy chunk, loaded once and shared.

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";

export type AiMessages = typeof import("@/i18n/messages/en/ai.json");
export type AiT = Translate<AiMessages>;
type InsightMessages = typeof import("@/i18n/messages/en/aiInsight.json");
type EffectMessages = typeof import("@/i18n/messages/en/aiEffects.json");

function namespace<M extends object>(name: string, loaders: Record<Locale, () => Promise<{ default: M }>>) {
  const ready = new Map<Locale, Translate<M>>();
  const loading = new Set<Locale>();
  const listeners = new Set<() => void>();

  function load(locale: Locale) {
    if (ready.has(locale) || loading.has(locale)) return;
    loading.add(locale);
    loaders[locale]()
      .then((module) => {
        ready.set(locale, createTranslator(locale, module.default, `${locale}/${name}`));
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

  /** t() for this namespace, or null while the language's strings load. */
  return function useT(locale: Locale): Translate<M> | null {
    const t = useSyncExternalStore(
      subscribe,
      () => ready.get(locale) ?? null,
      () => null,
    );
    useEffect(() => load(locale), [locale]);
    return t;
  };
}

export const useAiT = namespace<AiMessages>("ai", {
  en: () => import("@/i18n/messages/en/ai.json"),
  es: () => import("@/i18n/messages/es/ai.json"),
  fr: () => import("@/i18n/messages/fr/ai.json"),
  de: () => import("@/i18n/messages/de/ai.json"),
  zh: () => import("@/i18n/messages/zh/ai.json"),
  hi: () => import("@/i18n/messages/hi/ai.json"),
});

export const useInsightT = namespace<InsightMessages>("aiInsight", {
  en: () => import("@/i18n/messages/en/aiInsight.json"),
  es: () => import("@/i18n/messages/es/aiInsight.json"),
  fr: () => import("@/i18n/messages/fr/aiInsight.json"),
  de: () => import("@/i18n/messages/de/aiInsight.json"),
  zh: () => import("@/i18n/messages/zh/aiInsight.json"),
  hi: () => import("@/i18n/messages/hi/aiInsight.json"),
});

export const useEffectsT = namespace<EffectMessages>("aiEffects", {
  en: () => import("@/i18n/messages/en/aiEffects.json"),
  es: () => import("@/i18n/messages/es/aiEffects.json"),
  fr: () => import("@/i18n/messages/fr/aiEffects.json"),
  de: () => import("@/i18n/messages/de/aiEffects.json"),
  zh: () => import("@/i18n/messages/zh/aiEffects.json"),
  hi: () => import("@/i18n/messages/hi/aiEffects.json"),
});
