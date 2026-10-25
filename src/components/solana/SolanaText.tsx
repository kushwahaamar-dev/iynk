"use client";

import { createContext, use, useContext, useMemo, type ReactNode } from "react";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { loadSolanaMessages, solanaTranslator, type SolanaMessages, type SolanaT } from "@/lib/solana/messages";

const Text = createContext<SolanaT | null>(null);

/** Strings a server page loaded and passed down. */
export function SolanaTextProvider({ locale, messages, children }: { locale: Locale; messages: SolanaMessages; children: ReactNode }) {
  const t = useMemo(() => solanaTranslator(locale, messages), [locale, messages]);
  return <Text.Provider value={t}>{children}</Text.Provider>;
}

function Loaded({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const messages = use(loadSolanaMessages(locale));
  return (
    <SolanaTextProvider locale={locale} messages={messages}>
      {children}
    </SolanaTextProvider>
  );
}

/** For panels mounted outside our pages: loads the page language's strings (suspends once). */
export function SolanaText({ children }: { children: ReactNode }) {
  return useContext(Text) ? <>{children}</> : <Loaded>{children}</Loaded>;
}

export function useSolanaT(): SolanaT {
  const t = useContext(Text);
  if (!t) throw new Error("iynk solana: render inside <SolanaText> or <SolanaTextProvider>.");
  return t;
}
