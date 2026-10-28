import type { Diagnostic, ErrorKind } from "../lib/interp/errors.ts";
import type { StaticFlag } from "./rules/connect.ts";
import type { RunView } from "./stores/run.ts";

export type ProblemSeverity = "error" | "warning" | "note";

export type Problem = {
  id: string;
  severity: ProblemSeverity;
  source: "code" | "run" | "static";
  /** A key of the `studioCode` namespace. `problem.interp` has no template: show `fallbackText`. */
  titleKey: string;
  args: Record<string, string | number>;
  /** English text from the interpreter, for a message it gave no code. */
  fallbackText?: string;
  line?: number;
  col?: number;
  file?: string;
  hint?: string;
};

export type ProblemInput = {
  diagnostics: readonly Diagnostic[];
  run: Pick<RunView, "limit" | "frame">;
  flags: readonly StaticFlag[];
};

const KIND_SEVERITY: Record<ErrorKind, ProblemSeverity> = {
  syntax: "error",
  compile: "error",
  unsupported: "error",
  limit: "error",
  runtime: "warning",
};

const NO_LINE = Number.MAX_SAFE_INTEGER;

const SEVERITY_ORDER: Record<ProblemSeverity, number> = { error: 0, warning: 1, note: 2 };

const fromDiagnostic = (d: Diagnostic, index: number): Problem => ({
  id: `code:${index}`,
  severity: KIND_SEVERITY[d.kind],
  source: "code",
  titleKey: d.code ? `problem.${d.code}` : "problem.interp",
  args: d.args ?? {},
  fallbackText: d.code ? undefined : d.message,
  line: d.line > 0 ? d.line : undefined,
  col: d.line > 0 ? d.col : undefined,
  hint: d.hint,
});

function fromRun({ limit, frame }: ProblemInput["run"]): Problem[] {
  const problems: Problem[] = [];
  if (limit) {
    problems.push({ id: "run:limit", severity: "error", source: "run", titleKey: `problem.limit.${limit.which}`, args: {} });
  }
  for (const entry of frame?.parts ?? []) {
    if (entry.kind === "none") {
      problems.push({ id: `run:no-model:${entry.part}`, severity: "note", source: "run", titleKey: "problem.run.noModel", args: { part: entry.part } });
    }
  }
  return problems;
}

const fromFlag = (flag: StaticFlag): Problem => ({
  id: `static:${flag.rule}:${flag.net}`,
  severity: flag.rule === "short-circuit" ? "error" : "warning",
  source: "static",
  titleKey: `problem.static.${flag.rule}`,
  args: { net: flag.net, count: flag.pins.length },
});

/** Everything wrong with the open project in one list: errors first, then by line, lines before lineless entries. */
export function collectProblems({ diagnostics, run, flags }: ProblemInput): Problem[] {
  const all = [...diagnostics.map(fromDiagnostic), ...fromRun(run), ...flags.map(fromFlag)];
  return all.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      (a.line ?? NO_LINE) - (b.line ?? NO_LINE) ||
      (a.col ?? 0) - (b.col ?? 0),
  );
}

/** The problem after (`dir` 1) or before (`dir` -1) the one with id `current`, wrapping at both ends. */
export function nextProblem(list: readonly Problem[], current: string | null, dir: 1 | -1): Problem | null {
  if (list.length === 0) return null;
  const at = list.findIndex((p) => p.id === current);
  if (at === -1) return dir === 1 ? list[0]! : list[list.length - 1]!;
  return list[(at + dir + list.length) % list.length]!;
}
