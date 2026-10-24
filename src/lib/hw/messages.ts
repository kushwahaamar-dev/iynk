// The "hw" UI strings. The panel mounts inside LabDock with LabDockProps only,
// so it loads its own namespace: one small chunk per locale, fetched the first
// time the Hardware tab renders in that language.

import type { Locale } from "@/i18n/config";
import type en from "@/i18n/messages/en/hw.json";

export type HwMessages = typeof en;

type Loader = () => Promise<{ default: HwMessages }>;

const LOADERS: Record<Locale, Loader> = {
  en: () => import("@/i18n/messages/en/hw.json"),
  es: () => import("@/i18n/messages/es/hw.json"),
  fr: () => import("@/i18n/messages/fr/hw.json"),
  de: () => import("@/i18n/messages/de/hw.json"),
  zh: () => import("@/i18n/messages/zh/hw.json"),
  hi: () => import("@/i18n/messages/hi/hw.json"),
};

const cache = new Map<Locale, Promise<HwMessages>>();

export function loadHwMessages(locale: Locale): Promise<HwMessages> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = LOADERS[locale]().then((m) => m.default);
    // A failed chunk load (offline) may be retried on the next render.
    pending.catch(() => cache.delete(locale));
    cache.set(locale, pending);
  }
  return pending;
}
