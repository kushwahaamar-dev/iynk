import { registerCommand } from "../commands.ts";
import type { DocStore } from "../stores/doc.ts";

export type HistoryDeps = {
  doc: DocStore;
  focus: () => "canvas" | "code" | "other";
};

/** Undo and redo for the canvas scope. In the code editor the keys belong to CodeMirror's own history. */
export function registerHistoryCommands({ doc, focus }: HistoryDeps): () => void {
  const offs = [
    registerCommand({
      id: "undo",
      labelKey: "studio.cmd.undo",
      keys: ["Mod+Z"],
      scope: "global",
      enabled: () => focus() !== "code" && doc.getState().canUndo,
      run: () => void doc.undo(),
    }),
    registerCommand({
      id: "redo",
      labelKey: "studio.cmd.redo",
      keys: ["Mod+Shift+Z", "Ctrl+Y"],
      scope: "global",
      enabled: () => focus() !== "code" && doc.getState().canRedo,
      run: () => void doc.redo(),
    }),
  ];
  return () => offs.forEach((off) => off());
}
