export interface StarterEntry {
  board: string;
  load: () => Promise<unknown>;
}

/** One entry per board that ships a starter project; each board task adds its own. */
export const STARTERS: readonly StarterEntry[] = [
  { board: "nano", load: () => import("./nano.project.json").then((m) => m.default) },
  { board: "uno-r4", load: () => import("./uno-r4.project.json").then((m) => m.default) },
];

export function starterFor(board: string): StarterEntry | undefined {
  return STARTERS.find((entry) => entry.board === board);
}
