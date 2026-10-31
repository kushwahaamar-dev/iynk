export type LossSeverity = "info" | "warning" | "error";

/** One thing that did not survive an import or export, or that the person should know before saving. */
export interface LossItem {
  code: string;
  severity: LossSeverity;
  path?: string;
  message: string;
}

export const LOSS = {
  boardGuess: "ino.board-guess",
  unsupported: "ino.unsupported-construct",
  unsupportedInclude: "ino.unsupported-include",
  merged: "ino.multi-file-merged",
  tooBig: "ino.size-limit",
  notText: "ino.not-text",
  noWiring: "ino.no-wiring",
  libraries: "ino.library-unpinned",
  params: "ino.params-rendered",
  otherLanguage: "ino.non-arduino-source",
  banner: "ino.tier-banner",
} as const;

const MAX_CODE_CHARS = 64;
const MAX_CODES = 64;

/** The distinct codes of a loss list, in the form `ExportRecord.loss` stores them. */
export function lossCodes(items: readonly LossItem[]): string[] {
  const codes = new Set(items.map((item) => item.code.slice(0, MAX_CODE_CHARS)));
  return [...codes].slice(0, MAX_CODES);
}
