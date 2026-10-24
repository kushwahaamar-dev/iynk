import "server-only";
import { AVAILABLE } from "@/content/index.generated";
import { BOARDS, BOARD_IDS, DRONES, DRONE_IDS, ROBOTICS, ROBOTICS_IDS } from "@/content/ids";
import type { LabKind } from "@/components/dock/types";

/**
 * The items the planner and the matcher may suggest. Only items with a data
 * module in src/content count once any exist (the generated index); before
 * that, every D3 id does, so the AI routes work while content is written.
 */

export const LABS = ["board", "robotics", "drone"] as const satisfies readonly LabKind[];

export type CatalogItem = { lab: LabKind; id: string; tags: string[] };

const META: Record<LabKind, Record<string, { tags: string[] }>> = { board: BOARDS, robotics: ROBOTICS, drone: DRONES };

export function catalog(): CatalogItem[] {
  const available = AVAILABLE.board.length + AVAILABLE.robotics.length + AVAILABLE.drone.length > 0;
  const ids: Record<LabKind, readonly string[]> = available
    ? AVAILABLE
    : { board: BOARD_IDS, robotics: ROBOTICS_IDS, drone: DRONE_IDS };
  return (Object.keys(ids) as LabKind[]).flatMap((lab) =>
    ids[lab].map((id) => ({ lab, id, tags: META[lab][id]?.tags ?? [] })),
  );
}

export const itemKey = (item: { lab: LabKind; id: string }) => `${item.lab}:${item.id}`;

/** One line per item for a prompt: `drone:quad5 (freestyle, 5-inch)`. */
export function catalogLines(items: CatalogItem[]): string {
  return items.map((item) => `${itemKey(item)}${item.tags.length ? ` (${item.tags.join(", ")})` : ""}`).join("\n");
}

export function parseItemKey(key: string): { lab: LabKind; id: string } {
  const [lab, ...rest] = key.split(":");
  return { lab: lab as LabKind, id: rest.join(":") };
}
