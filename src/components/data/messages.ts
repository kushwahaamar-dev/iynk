import type { Locale } from "@/i18n/config";
import type en from "./messages/en.json";

/** The strings Leaderboard and LiveCounter render; English defines the keys. */
export type DataMessages = typeof en;

const loaders: Record<Locale, () => Promise<{ default: unknown }>> = {
  en: () => import("./messages/en.json"),
  es: () => import("./messages/es.json"),
  fr: () => import("./messages/fr.json"),
  de: () => import("./messages/de.json"),
  zh: () => import("./messages/zh.json"),
  hi: () => import("./messages/hi.json"),
};

/**
 * One language's data strings, loaded on the server page that mounts the
 * components and passed down as props (the core's pattern for lab strings):
 * `const m = await getDataMessages(lang); <LiveCounter messages={m.live} />`.
 */
export async function getDataMessages(locale: Locale): Promise<DataMessages> {
  return (await loaders[locale]()).default as DataMessages;
}
