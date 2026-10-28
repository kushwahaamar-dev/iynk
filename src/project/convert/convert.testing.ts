import { extractBoardCircuits, extractBoardHeaders, extractPartLegs } from "../../../scripts/figure-extract.mjs";
import { listItems, loadItem, loadTexts } from "../../../scripts/convert-io.mjs";
import { builtinRegistry } from "../../parts/builtin.ts";
import { interfaceOf } from "../../parts/pins.ts";
import type { InterfaceParam } from "../generated/types.ts";
import { PART_REFS } from "./interfaces.ts";
import type { ConvertContext } from "./lesson.ts";
import type { CatalogueItem, FigureCircuit, FigureHeader, Texts } from "./types.ts";

export type BoardItem = CatalogueItem & { lab: "board" };

export const AT = "2026-10-28T12:00:00.000Z";

const registry = builtinRegistry();
const legsOf = new Map<string, string[]>();

const params: Record<string, InterfaceParam[]> = {};
const descriptors = new Set<string>();
for (const summary of registry.list()) descriptors.add(summary.ref);
for (const [figurePart, { ref }] of Object.entries(PART_REFS)) {
  const descriptor = registry.latest(ref);
  if (descriptor) params[figurePart] = interfaceOf(descriptor).params ?? [];
}

export const boardIds = (): string[] =>
  listItems()
    .filter((i: { lab: string }) => i.lab === "board")
    .map((i: { id: string }) => i.id);

export interface LoadedBoard {
  item: BoardItem;
  texts: Texts;
  circuits: Record<string, FigureCircuit>;
  ctx: ConvertContext;
}

/** Everything a board's tour and lessons are converted from, read from the repository files. */
export async function loadBoard(id: string): Promise<LoadedBoard> {
  const item = loadItem("board", id) as BoardItem;
  const texts = loadTexts("board", id) as Texts;
  const circuits = (await extractBoardCircuits(id)) as Record<string, FigureCircuit>;
  const headers = (await extractBoardHeaders(id)) as FigureHeader[];
  for (const circuit of Object.values(circuits)) {
    for (const { part } of circuit.parts) {
      if (!legsOf.has(part)) legsOf.set(part, (await extractPartLegs(`figures/parts/${part}.js`)) as string[]);
    }
  }
  const ctx: ConvertContext = {
    at: AT,
    version: "0.1.0",
    headers,
    legs: Object.fromEntries(legsOf),
    params,
    descriptors,
  };
  return { item, texts, circuits, ctx };
}
