import type { Project, Text } from "../../project/generated/types.ts";
import { BOARD_FAULTS, LESSON_FAULTS } from "../../../content/projects/boards/faults.ts";

export interface FaultOffer {
  failureId: string;
  faultId: string;
  causeId: string;
  symptomId: string;
  title: string;
}

export interface FaultOffers {
  own: FaultOffer[];
  more: FaultOffer[];
  unmapped: { failureId: string; title: string }[];
}

export type FaultLookup = (
  board: string,
  failureId: string,
) => { faultId: string; causeId: string; symptomId: string; title: Text } | null;

const FALLBACK_LOCALE = "en";

function textIn(text: Text, locale: string): string {
  if (typeof text === "string") return text;
  return text[locale as keyof typeof text] ?? text[FALLBACK_LOCALE] ?? "";
}

/** The lesson's own faults first, then the board's others; a failure B10 does not model is listed apart, without a Break button. */
export function faultOffers(templateId: string, board: string, lookup: FaultLookup, locale: string): FaultOffers {
  const own = new Set(LESSON_FAULTS[templateId]?.own ?? []);
  const offers: FaultOffers = { own: [], more: [], unmapped: [] };
  const ordered = [...(BOARD_FAULTS[board] ?? [])].sort((a, b) => Number(own.has(b)) - Number(own.has(a)));
  for (const failureId of ordered) {
    const found = lookup(board, failureId);
    const title = found ? textIn(found.title, locale) : failureId;
    if (!found) {
      offers.unmapped.push({ failureId, title });
      continue;
    }
    const { faultId, causeId, symptomId } = found;
    (own.has(failureId) ? offers.own : offers.more).push({ failureId, faultId, causeId, symptomId, title });
  }
  return offers;
}

/** Ids of the faults switched on. `GuideInput.activeFaults` takes them, so the checks gate stays shut while one is on. */
export function activeFaultIds(project: Project): string[] {
  return project.simulation.faults.filter((fault) => fault.enabled).map((fault) => fault.id);
}
