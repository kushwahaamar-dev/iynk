import type { Diagnostic } from "../../lib/interp/errors.ts";
import type { Op, Project, Source } from "../../project/generated/types.ts";

/** One text change in UTF-16 code units, the shape of a `source.edit` op. */
export type TextEdit = { pos: number; del: number; ins: string };

export type CodeLanguage = "arduino-cpp" | "python" | "verilog";

export type Marker = { line: number; col: number; message: string; severity: "error" | "warning" };

export function editToOp(sourceId: string, baseSeq: number, e: TextEdit): Op {
  return { k: "source.edit", id: sourceId, baseSeq, pos: e.pos, del: e.del, ins: e.ins };
}

export function wholeFileOp(sourceId: string, baseSeq: number, oldLen: number, text: string): Op {
  return editToOp(sourceId, baseSeq, { pos: 0, del: oldLen, ins: text });
}

export function firstFirmwareSource(state: Pick<Project, "sources">): Source | null {
  return state.sources.find((source) => source.role === "firmware") ?? null;
}

/** The highlighter a source gets; every other language shows as plain text. */
export function languageOf(source: Pick<Source, "language">): CodeLanguage | null {
  switch (source.language) {
    case "arduino-cpp":
      return "arduino-cpp";
    case "micropython":
    case "python":
      return "python";
    case "verilog":
      return "verilog";
    default:
      return null;
  }
}

/**
 * Folds `next`, made on the text `prev` produced, into `prev` when its range touches the text `prev` inserted, so a
 * run of keystrokes or backspaces becomes one edit. Returns null when the two are apart and must stay two edits.
 */
export function mergeEdits(prev: TextEdit, next: TextEdit): TextEdit | null {
  const prevEnd = prev.pos + prev.ins.length;
  const nextEnd = next.pos + next.del;
  if (next.pos > prevEnd || nextEnd < prev.pos) return null;
  const keepBefore = Math.min(Math.max(next.pos - prev.pos, 0), prev.ins.length);
  const keepFrom = Math.min(Math.max(nextEnd - prev.pos, 0), prev.ins.length);
  return {
    pos: Math.min(prev.pos, next.pos),
    del: prev.del + Math.max(prev.pos - next.pos, 0) + Math.max(nextEnd - prevEnd, 0),
    ins: prev.ins.slice(0, keepBefore) + next.ins + prev.ins.slice(keepFrom),
  };
}

/** Diagnostics that point at a line, as editor markers. Syntax, compile and runtime errors are errors; the rest warn. */
export function markersOf(diagnostics: readonly Diagnostic[]): Marker[] {
  return diagnostics
    .filter((d) => d.line > 0)
    .map((d) => ({
      line: d.line,
      col: d.col,
      message: d.hint ? `${d.message} ${d.hint}` : d.message,
      severity: d.kind === "unsupported" || d.kind === "limit" ? "warning" : "error",
    }));
}
