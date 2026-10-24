"use client";

// The "ai" namespace on the client. LabDock panels take only LabDockProps, so
// they cannot get their strings as props from the page the way lab
// components do: each language's file is a lazy chunk, loaded once and shared.

import { useEffect, useSyncExternalStore } from "react";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";

export type AiMessages = typeof import("@/i18n/messages/en/ai.json");
export type AiT = Translate<AiMessages>;

const loaders: Record<Locale, () => Promise<{ default: AiMessages }>> = {
  en: () => import("@/i18n/messages/en/ai.json"),
  es: () => import("@/i18n/messages/es/ai.json"),
  fr: () => import("@/i18n/messages/fr/ai.json"),
  de: () => import("@/i18n/messages/de/ai.json"),
  zh: () => import("@/i18n/messages/zh/ai.json"),
  hi: () => import("@/i18n/messages/hi/ai.json"),
};

const ready = new Map<Locale, AiT>();
const loading = new Set<Locale>();
const listeners = new Set<() => void>();

function load(locale: Locale) {
  if (ready.has(locale) || loading.has(locale)) return;
  loading.add(locale);
  loaders[locale]()
    .then((module) => {
      ready.set(locale, createTranslator(locale, module.default, `${locale}/ai`));
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

/** t() for the "ai" namespace, or null while this language's strings load. */
export function useAiT(locale: Locale): AiT | null {
  const t = useSyncExternalStore(
    subscribe,
    () => ready.get(locale) ?? null,
    () => null,
  );
  useEffect(() => load(locale), [locale]);
  return t;
}
