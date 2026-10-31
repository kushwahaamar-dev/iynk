export interface StarterEntry {
  board: string;
  load: () => Promise<unknown>;
}

/** One entry per board that ships a starter project; each board task adds its own. */
export const STARTERS: readonly StarterEntry[] = [
  { board: "nano", load: () => import("./nano.project.json").then((m) => m.default) },
  { board: "uno-r4", load: () => import("./uno-r4.project.json").then((m) => m.default) },
  { board: "esp32-devkitc", load: () => import("./esp32-devkitc.project.json").then((m) => m.default) },
  { board: "esp32-s3-devkitc-1", load: () => import("./esp32-s3-devkitc-1.project.json").then((m) => m.default) },
  { board: "nodemcu", load: () => import("./nodemcu.project.json").then((m) => m.default) },
  { board: "pico", load: () => import("./pico.project.json").then((m) => m.default) },
  { board: "microbit-v2", load: () => import("./microbit-v2.project.json").then((m) => m.default) },
  { board: "nucleo-f401re", load: () => import("./nucleo-f401re.project.json").then((m) => m.default) },
  { board: "pi4-pi5", load: () => import("./pi4-pi5.project.json").then((m) => m.default) },
  { board: "basys3", load: () => import("./basys3.project.json").then((m) => m.default) },
  { board: "de10-lite", load: () => import("./de10-lite.project.json").then((m) => m.default) },
];

export function starterFor(board: string): StarterEntry | undefined {
  return STARTERS.find((entry) => entry.board === board);
}
