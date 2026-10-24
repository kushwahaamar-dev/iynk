import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";

// The "solana" UI namespace (H3). Pages load it on the server and pass it
// down; dock panels and the tip button load it on the client, one chunk per
// language, the same way the core's namespaces load.

export type SolanaMessages = typeof import("@/i18n/messages/en/solana.json");
export type SolanaT = Translate<SolanaMessages>;

const loaders: Record<Locale, () => Promise<{ default: SolanaMessages }>> = {
  en: () => import("@/i18n/messages/en/solana.json"),
  es: () => import("@/i18n/messages/es/solana.json"),
  fr: () => import("@/i18n/messages/fr/solana.json"),
  de: () => import("@/i18n/messages/de/solana.json"),
  zh: () => import("@/i18n/messages/zh/solana.json"),
  hi: () => import("@/i18n/messages/hi/solana.json"),
};

const cache = new Map<Locale, Promise<SolanaMessages>>();

export function loadSolanaMessages(locale: Locale): Promise<SolanaMessages> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = loaders[locale]().then((mod) => mod.default);
    cache.set(locale, pending);
  }
  return pending;
}

export function solanaTranslator(locale: Locale, messages: SolanaMessages): SolanaT {
  return createTranslator(locale, messages, `${locale}/solana`);
}
