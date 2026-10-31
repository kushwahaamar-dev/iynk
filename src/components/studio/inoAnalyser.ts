import type { InoAnalyser, INO_EXPORT_ERROR_CODES, INO_IMPORT_ERROR_CODES } from "@/export/ino";
import type { BoardId } from "@/lib/interp/profiles";
import { check } from "@/lib/interp/run";

type InoErrorCode = (typeof INO_IMPORT_ERROR_CODES)[number] | (typeof INO_EXPORT_ERROR_CODES)[number];

const ERROR_KEYS: Record<InoErrorCode, string> = {
  "too-many-files": "ino.tooMany",
  "too-big": "ino.tooBig",
  "not-text": "ino.notText",
  "no-entry": "ino.noEntry",
  "bad-path": "ino.badPath",
  empty: "ino.empty",
  "no-arduino-board": "ino.exportBlocked",
  "no-entry-source": "ino.exportBlocked",
};

/** Compiles the sketch with the interpreter's own checker. Nothing runs. */
export function analyserFor(): InoAnalyser {
  return (source, board) =>
    check({ board: board as BoardId, source }).map((d) => ({
      line: d.line,
      col: d.col,
      kind: d.kind === "syntax" || d.kind === "unsupported" ? d.kind : "compile",
      message: d.message,
      hint: d.hint,
    }));
}

/** The `studio` message key for an import or export error code. */
export function inoErrorKey(code: InoErrorCode): string {
  return ERROR_KEYS[code];
}
