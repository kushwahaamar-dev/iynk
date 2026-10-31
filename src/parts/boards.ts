/** The 12 Board Lab board ids, copied as plain strings: portable parts code cannot import `lib/interp`. */
export type BoardIdString =
  | "uno-r3"
  | "nano"
  | "uno-r4"
  | "esp32-devkitc"
  | "esp32-s3-devkitc-1"
  | "nodemcu"
  | "pico"
  | "nucleo-f401re"
  | "microbit-v2"
  | "pi4-pi5"
  | "basys3"
  | "de10-lite";

/** Board id to the ref of its component descriptor. `boards.test.ts` checks it against the interpreter profiles. */
export const BOARD_PART_IDS: Readonly<Record<BoardIdString, string>> = {
  "uno-r3": "core.uno-r3",
  nano: "core.nano",
  "uno-r4": "core.uno-r4",
  "esp32-devkitc": "core.esp32-devkitc",
  "esp32-s3-devkitc-1": "core.esp32-s3-devkitc-1",
  nodemcu: "core.nodemcu",
  pico: "core.pico",
  "nucleo-f401re": "core.nucleo-f401re",
  "microbit-v2": "core.microbit-v2",
  "pi4-pi5": "core.pi4-pi5",
  basys3: "core.basys3",
  "de10-lite": "core.de10-lite",
};

const PART_TO_BOARD = new Map<string, string>(Object.entries(BOARD_PART_IDS).map(([board, part]) => [part, board]));

export function boardPartId(board: string): string | undefined {
  return Object.hasOwn(BOARD_PART_IDS, board) ? BOARD_PART_IDS[board as BoardIdString] : undefined;
}

export function boardIdForPart(partId: string): string | undefined {
  return PART_TO_BOARD.get(partId);
}
