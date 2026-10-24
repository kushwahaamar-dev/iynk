import "server-only";

import type { DroneContent } from "@/content/schema";
import { DRONE_IDS, DRONES, isDroneId, type DroneId } from "@/content/ids";
import { loadDrone } from "@/content/index.generated";
import type { Locale } from "@/i18n/config";
import { getContentText } from "@/i18n/server";
import { calc } from "@/lib/drone/calc";
import { designInput } from "@/lib/drone/design";
import { droneProgressKeys } from "@/lib/dronelab/bench";

export type Craft = { content: DroneContent; text: Record<string, unknown> };

/** A craft's data module and its prose in one language, or null while either is still being written. */
export async function loadCraft(lang: Locale, id: string): Promise<Craft | null> {
  if (!isDroneId(id)) return null;
  const content = await loadDrone(id);
  if (!content) return null;
  try {
    const text = await getContentText<Record<string, unknown>>(lang, "drones", id);
    return { content, text };
  } catch {
    return null;
  }
}

export type CraftCard = {
  id: DroneId;
  fig: number;
  palette: (typeof DRONES)[DroneId]["palette"];
  tags: string[];
  firmware: (typeof DRONES)[DroneId]["firmware"];
  motors: number;
  craft: {
    title: string;
    sub: string;
    hint: string;
    class: DroneContent["class"];
    sizeMm: number;
    auw: number;
    tw: number;
    flyMin: number;
    hoverMin: number;
    wing: boolean;
    keys: string[];
  } | null;
};

function textOf(text: Record<string, unknown>, key: string): string {
  const v = text[key];
  return typeof v === "string" ? v : "";
}

/** The 13 crafts in figure order, with the default design's numbers where the craft exists. */
export async function loadCards(lang: Locale): Promise<CraftCard[]> {
  const ids = [...DRONE_IDS].sort((a, b) => DRONES[a].fig - DRONES[b].fig);
  return Promise.all(
    ids.map(async (id): Promise<CraftCard> => {
      const meta = DRONES[id];
      const loaded = await loadCraft(lang, id);
      const base = { id, fig: meta.fig, palette: meta.palette, tags: meta.tags, firmware: meta.firmware, motors: meta.motors };
      if (!loaded) return { ...base, craft: null };
      const { content, text } = loaded;
      const r = calc(designInput(content.design, content.design.default));
      return {
        ...base,
        craft: {
          title: textOf(text, "title"),
          sub: textOf(text, "sub"),
          hint: textOf(text, "hint"),
          class: content.class,
          sizeMm: content.frame.sizeMm,
          auw: r.auw,
          tw: r.tw,
          flyMin: r.flyMin,
          hoverMin: r.hoverMin,
          wing: content.design.model.flight.kind === "wing",
          keys: droneProgressKeys(content),
        },
      };
    }),
  );
}
