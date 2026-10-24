import "server-only";
import { BOARDS, BOARD_IDS, DRONES, DRONE_IDS, ROBOTICS, ROBOTICS_IDS, isBoardId, isDroneId, isRoboticsId } from "@/content/ids";
import { loadBoard, loadDrone, loadRobotics } from "@/content/index.generated";
import type { BoardContent, DroneContent, Lab, RoboticsContent } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { ContentLab } from "@/i18n/namespaces";
import { getContentText } from "@/i18n/server";

/** SimLab's catalogue as the tools see it: ids and tags from src/content/ids.ts, prose from src/i18n/content. */

export const LABS = ["board", "robotics", "drone"] as const satisfies readonly Lab[];

/** URL segment (D2) and content folder (D5) of each lab. */
const LAB_DIR = { board: "boards", robotics: "robotics", drone: "drones" } as const satisfies Record<Lab, ContentLab>;

export type Entry = {
  lab: Lab;
  id: string;
  tags: readonly string[];
  /** Other words the item answers to: languages, firmware, the controller, modules and parts. */
  facets: readonly string[];
};

/** Boards, then robotics benches, then drones, each in figure order (ids.ts lists them that way). */
export const ENTRIES: readonly Entry[] = [
  ...BOARD_IDS.map((id): Entry => ({ lab: "board", id, tags: BOARDS[id].tags, facets: BOARDS[id].languages })),
  ...ROBOTICS_IDS.map((id): Entry => {
    const m = ROBOTICS[id];
    const board = m.board ? [m.board, ...(m.boardVariant ? [m.boardVariant] : [])] : [];
    return { lab: "robotics", id, tags: m.tags, facets: [...board, ...m.modules, ...m.parts] };
  }),
  ...DRONE_IDS.map((id): Entry => ({ lab: "drone", id, tags: DRONES[id].tags, facets: [DRONES[id].firmware] })),
];

export const findEntry = (lab: Lab, id: string): Entry | undefined => ENTRIES.find((e) => e.lab === lab && e.id === id);

export type ItemContent = BoardContent | RoboticsContent | DroneContent;

/** The item's data module, or null while it is not written yet (src/content/index.generated.ts). */
export async function loadContent(lab: Lab, id: string): Promise<ItemContent | null> {
  if (lab === "board") return isBoardId(id) ? loadBoard(id) : null;
  if (lab === "robotics") return isRoboticsId(id) ? loadRobotics(id) : null;
  return isDroneId(id) ? loadDrone(id) : null;
}

/** The item's prose in one language, or null when that file does not exist yet. */
async function proseIn(locale: Locale, lab: Lab, id: string): Promise<unknown> {
  try {
    return await getContentText(locale, LAB_DIR[lab], id);
  } catch {
    return null;
  }
}

/** Resolves text keys (dot paths, docs/ARCHITECTURE.md §5) in the asked language, then in English. */
export type Prose = (key: string | undefined) => string | null;

export async function proseOf(locale: Locale, lab: Lab, id: string): Promise<Prose> {
  const [own, en] = await Promise.all([proseIn(locale, lab, id), locale === "en" ? null : proseIn("en", lab, id)]);
  return (key) => (key ? (textAt(own, key) ?? textAt(en, key) ?? null) : null);
}

function textAt(tree: unknown, path: string): string | undefined {
  let node = tree;
  for (const part of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export const itemUrl = (siteUrl: string, locale: Locale, lab: Lab, id: string): string =>
  `${siteUrl}/${locale}/${LAB_DIR[lab]}/${id}`;
