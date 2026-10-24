import "server-only";

import type { LabKind } from "@/components/dock/types";
import type { TogetherMessages } from "@/components/realtime/messages";
import { AVAILABLE } from "@/content/index.generated";
import type { Locale } from "@/i18n/config";
import { getContentProse } from "@/i18n/server";

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

export type LobbyItem = { lab: LabKind; id: string; title: string };

const CONTENT_LAB = { board: "boards", robotics: "robotics", drone: "drones" } as const;

/** Every lab item that has content and a title (English while untranslated), in catalogue order. */
export async function getLobbyItems(locale: Locale): Promise<LobbyItem[]> {
  const labs = Object.keys(CONTENT_LAB) as LabKind[];
  const lists = await Promise.all(
    labs.map(async (lab) => {
      const ids: readonly string[] = AVAILABLE[lab];
      const items = await Promise.all(
        ids.map(async (id) => {
          try {
            const { text } = await getContentProse<{ title?: unknown }>(locale, CONTENT_LAB[lab], id);
            return typeof text.title === "string" && text.title ? { lab, id, title: text.title } : null;
          } catch {
            // Not even its English prose is written yet: leave it out rather than show an id.
            return null;
          }
        }),
      );
      return items.filter((item): item is LobbyItem => item !== null);
    }),
  );
  return lists.flat();
}
