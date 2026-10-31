import "server-only";

import type { TogetherMessages } from "@/components/realtime/messages";
import type { Locale } from "@/i18n/config";

const LOADERS: Record<Locale, () => Promise<{ default: TogetherMessages }>> = {
  en: () => import("@/i18n/messages/en/together.json"),
  es: () => import("@/i18n/messages/es/together.json"),
  fr: () => import("@/i18n/messages/fr/together.json"),
  de: () => import("@/i18n/messages/de/together.json"),
  zh: () => import("@/i18n/messages/zh/together.json"),
  hi: () => import("@/i18n/messages/hi/together.json"),
};

export async function getTogetherMessages(locale: Locale): Promise<TogetherMessages> {
  return (await LOADERS[locale]()).default;
}
