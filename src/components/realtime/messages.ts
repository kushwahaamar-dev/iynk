"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/client";
import { createTranslator, type Translate } from "@/i18n/translate";

// The together namespace for client components that mount without a server
// page to pass strings down (the Together tab inside LabDock). One chunk per
// language, loaded on first use.

export type TogetherMessages = typeof import("@/i18n/messages/en/together.json");
export type TogetherT = Translate<TogetherMessages>;

const LOADERS: Record<Locale, () => Promise<{ default: TogetherMessages }>> = {
  en: () => import("@/i18n/messages/en/together.json"),
  es: () => import("@/i18n/messages/es/together.json"),
  fr: () => import("@/i18n/messages/fr/together.json"),
  de: () => import("@/i18n/messages/de/together.json"),
  zh: () => import("@/i18n/messages/zh/together.json"),
  hi: () => import("@/i18n/messages/hi/together.json"),
};

const loaded = new Map<Locale, TogetherT>();

export function togetherT(locale: Locale, messages: TogetherMessages): TogetherT {
  return createTranslator(locale, messages, `${locale}/together`);
}

const Given = createContext<TogetherT | null>(null);

/** For pages that load the namespace on the server (the lobby): no client fetch needed. */
export function TogetherStrings({ locale, messages, children }: { locale: Locale; messages: TogetherMessages; children: ReactNode }) {
  const t = useMemo(() => togetherT(locale, messages), [locale, messages]);
  return createElement(Given.Provider, { value: t }, children);
}

/** t() for the together namespace, or null while this language's strings load. */
export function useTogetherT(): TogetherT | null {
  const given = useContext(Given);
  const locale = useLocale();
  const [, setVersion] = useState(0);
  const ready = given ?? loaded.get(locale) ?? null;

  useEffect(() => {
    if (given || loaded.has(locale)) return;
    let live = true;
    void LOADERS[locale]().then((mod) => {
      loaded.set(locale, togetherT(locale, mod.default));
      if (live) setVersion((v) => v + 1);
    });
    return () => {
      live = false;
    };
  }, [given, locale]);

  return ready;
}
