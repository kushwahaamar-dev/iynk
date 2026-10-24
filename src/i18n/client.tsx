"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { CommonClientMessages } from "./namespaces";
import { createTranslator, type Translate } from "./translate";

type I18nValue = { locale: Locale; t: Translate<CommonClientMessages> };

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Set once by the root layout: the page's language and the few common strings
 * the shell's own client components render. Lab components get their
 * namespace strings as props from their server page instead.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: CommonClientMessages;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(locale, messages, `${locale}/common.client`) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("SimLab i18n: this component must render inside the [lang] layout's I18nProvider.");
  return value;
}

/** The language of the page this component is on. */
export function useLocale(): Locale {
  return useI18n().locale;
}

/** t() over common.json's "client" section. */
export function useCommonT(): Translate<CommonClientMessages> {
  return useI18n().t;
}

/**
 * t() over strings a server page passed down as props, in the page's
 * language: `const t = useT(props.messages)` with `messages` taken from
 * `getMessages(lang, "boardlab")`.
 */
export function useT<T extends object>(messages: T, scope?: string): Translate<T> {
  const locale = useLocale();
  return useMemo(() => createTranslator(locale, messages, scope ?? `${locale}/props`), [locale, messages, scope]);
}
