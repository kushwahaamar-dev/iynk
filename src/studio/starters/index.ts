export interface StarterEntry {
  board: string;
  load: () => Promise<unknown>;
}

/** One entry per board that ships a starter project; each board task adds its own. */
export const STARTERS: readonly StarterEntry[] = [];

export function starterFor(board: string): StarterEntry | undefined {
  return STARTERS.find((entry) => entry.board === board);
}
