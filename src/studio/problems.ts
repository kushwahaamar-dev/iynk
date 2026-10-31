import type { RobotProblem } from "../core/robot-report.ts";
import type { Diagnostic, ErrorKind } from "../lib/interp/errors.ts";
import type { Project } from "../project/generated/types.ts";
import type { Diagnosis } from "../project/diagnosis.ts";
import { netlist } from "../project/netlist.ts";
import type { Finding, ProblemTarget } from "../sim/faults/types.ts";
import type { StaticFlag } from "./rules/connect.ts";
import type { RunView } from "./stores/run.ts";

export type ProblemSeverity = "error" | "warning" | "note";

export type Problem = {
  id: string;
  severity: ProblemSeverity;
  source: "code" | "run" | "static" | "robot";
  /** A key of the `studioCode` namespace; for a robot problem, of the `robot` namespace. `problem.interp` has no template: show `fallbackText`. */
  titleKey: string;
  args: Record<string, string | number>;
  /** English text from the interpreter, for a message it gave no code. */
  fallbackText?: string;
  line?: number;
  col?: number;
  file?: string;
  hint?: string;
  /** Set by a fault rule. `titleKey` is then a key of the `faults` namespace. */
  rule?: string;
  targets?: ProblemTarget[];
  diagnosis?: Diagnosis;
  /** Where a robot problem is in the document, such as `domains.robotics.data.bodies.bdy_chassis`. */
  path?: string;
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

/** Ordinary projects open the hint ladder at level 3 (STUDIO_EDITOR 10.1). */
const STATIC_HINT_LEVEL = 3;

export type StaticProblems = {
  problems: Problem[];
  /** Findings dropped because a target is not in the document. */
  dropped: number;
};

function targetIds(doc: Project) {
  const nl = netlist(doc);
  const parts = new Set([...doc.boards, ...doc.components].map((c) => c.id));
  const nets = new Set([...nl.nodes.map((n) => n.id), ...doc.nets.map((n) => n.id)]);
  return (t: ProblemTarget): boolean => {
    if (t.kind === "part" || t.kind === "pin") return parts.has(t.id);
    if (t.kind === "net") return nets.has(t.id);
    return true;
  };
}

/**
 * Maps the findings of a static check or of a run to Problems. A sealed item that is not revealed gets none, because
 * the rules would give away its cause.
 */
export function staticProblems(
  doc: Project,
  findings: readonly Finding[],
  opts: { sealedUnrevealed: boolean; source?: "static" | "run" },
): StaticProblems {
  if (opts.sealedUnrevealed) return { problems: [], dropped: 0 };
  const known = targetIds(doc);
  const problems: Problem[] = [];
  let dropped = 0;
  for (const f of findings) {
    if (!f.targets.every(known)) {
      dropped++;
      continue;
    }
    problems.push({
      id: [f.ruleId, ...f.targets.map((t) => (t.pin === undefined ? t.id : `${t.id}/${t.pin}`)).sort()].join(":"),
      severity: f.severity,
      source: opts.source ?? "static",
      titleKey: f.messageKey,
      args: f.args,
      rule: f.ruleId,
      targets: f.targets,
      diagnosis: { cause_id: f.causeId, symptom_id: f.symptomId, evidence: f.evidence, hint_level: STATIC_HINT_LEVEL },
    });
  }
  return { problems, dropped };
}

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

/** The robot's problems in the list: ahead of the others of the same severity. */
export function withRobotProblems(base: Problem[], robot: RobotProblem[]): Problem[] {
  const fromRobot = robot.map((p): Problem => ({ id: `robot:${p.code}:${p.path}`, severity: p.severity, source: "robot", titleKey: p.messageKey, args: p.args, path: p.path }));
  return [...fromRobot, ...base].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
