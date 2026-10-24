// The Board Lab keyboard map: one list drives both the handler and the "?" dialog.

export type ShortcutId =
  | "run"
  | "schematic"
  | "breadboard"
  | "board"
  | "exploded"
  | "seeThrough"
  | "turn"
  | "resetView"
  | "prevNext"
  | "jump"
  | "figure"
  | "escape"
  | "help";

export const SHORTCUTS: { id: ShortcutId; keys: string[] }[] = [
  { id: "run", keys: ["Space"] },
  { id: "board", keys: ["V"] },
  { id: "breadboard", keys: ["B"] },
  { id: "schematic", keys: ["C"] },
  { id: "exploded", keys: ["X"] },
  { id: "seeThrough", keys: ["T"] },
  { id: "turn", keys: ["Q", "E"] },
  { id: "resetView", keys: ["R"] },
  { id: "prevNext", keys: ["[", "]"] },
  { id: "jump", keys: ["1", "…", "0"] },
  { id: "figure", keys: ["G"] },
  { id: "escape", keys: ["Esc"] },
  { id: "help", keys: ["?"] },
];

export type ShortcutAction =
  | { kind: "run" }
  | { kind: "view"; view: "board" | "breadboard" | "schematic" }
  | { kind: "exploded" }
  | { kind: "seeThrough" }
  | { kind: "turn"; deg: number }
  | { kind: "resetView" }
  | { kind: "lesson"; delta: number }
  | { kind: "jump"; n: number }
  | { kind: "figure" }
  | { kind: "escape" }
  | { kind: "help" };

/** True when the key belongs to whatever has focus (the editor, a field, a button for Space). */
export function typingTarget(el: Element | null, key: string): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.closest(".cm-editor")) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (key === " " && (tag === "BUTTON" || tag === "A" || el.getAttribute("role") === "button" || el.getAttribute("role") === "tab")) return true;
  return false;
}

/** Map a key press to a lab action, or null when the key is not a shortcut here. */
export function shortcutFor(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): ShortcutAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  switch (e.key) {
    case " ":
      return { kind: "run" };
    case "v":
    case "V":
      return { kind: "view", view: "board" };
    case "b":
    case "B":
      return { kind: "view", view: "breadboard" };
    case "c":
    case "C":
      return { kind: "view", view: "schematic" };
    case "x":
    case "X":
      return { kind: "exploded" };
    case "t":
    case "T":
      return { kind: "seeThrough" };
    case "q":
    case "Q":
      return { kind: "turn", deg: -90 };
    case "e":
    case "E":
      return { kind: "turn", deg: 90 };
    case "r":
    case "R":
    case "Home":
      return { kind: "resetView" };
    case "[":
      return { kind: "lesson", delta: -1 };
    case "]":
      return { kind: "lesson", delta: 1 };
    case "g":
    case "G":
      return { kind: "figure" };
    case "Escape":
      return { kind: "escape" };
    case "?":
      return { kind: "help" };
    default:
      if (/^[0-9]$/.test(e.key)) return { kind: "jump", n: e.key === "0" ? 10 : Number(e.key) };
      return null;
  }
}
