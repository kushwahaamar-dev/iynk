import type { DryRunReport, ProposeOpsArgs, Tier } from "../proposals/types.ts";

const MAX_OPS = 120;
const MAX_MODEL_TEXT = 600;
const TIER_ORDER: Exclude<Tier, "none">[] = ["T0", "T1", "T2", "T3"];

export type ScaffoldProblemCode = "not_additive" | "rules_error" | "compile_error" | "no_new_parts" | "too_big";

export interface ScaffoldProblem {
  code: ScaffoldProblemCode;
  message: string;
  targets?: string[];
}

export interface ScaffoldCheck {
  ok: boolean;
  problems: ScaffoldProblem[];
  tier: Tier;
  notSimulated: string[];
}

export function checkScaffold(
  args: ProposeOpsArgs,
  stepRisk: Record<string, 0 | 1 | 2>,
  report: DryRunReport,
): ScaffoldCheck {
  const problems: ScaffoldProblem[] = [];

  const risky = args.steps.filter((step) => stepRisk[step.id] === 2).map((step) => step.id);
  if (risky.length > 0) {
    problems.push({ code: "not_additive", message: "A scaffold may only add. Remove the steps that delete or change.", targets: risky });
  }

  if (report.diff.parts.added.length === 0) {
    problems.push({ code: "no_new_parts", message: "The scaffold adds no part. Add the parts the circuit needs." });
  }

  const opCount = args.steps.reduce((sum, step) => sum + step.ops.length, 0);
  if (opCount > MAX_OPS) {
    problems.push({ code: "too_big", message: `The scaffold has ${opCount} ops; the limit is ${MAX_OPS}.` });
  }

  for (const finding of report.rules?.added ?? []) {
    if (finding.severity === "error") {
      problems.push({ code: "rules_error", message: `Rule ${finding.ruleId} fails.`, targets: finding.targets });
    }
  }

  if (report.compile && "ok" in report.compile && !report.compile.ok) {
    problems.push({ code: "compile_error", message: "The sketch does not compile." });
  }

  const notSimulated = report.tiers.filter((t) => t.tier === "none").map((t) => t.componentId);
  const ranks = report.tiers.flatMap((t) => (t.tier === "none" ? [] : [TIER_ORDER.indexOf(t.tier)]));
  const tier = ranks.length === 0 ? "none" : TIER_ORDER[Math.min(...ranks)];

  return { ok: problems.length === 0, problems, tier, notSimulated };
}

export function problemsForModel(c: ScaffoldCheck): string {
  const lines = c.problems.map((p) => {
    const targets = p.targets && p.targets.length > 0 ? ` (${p.targets.join(", ")})` : "";
    return `${p.code}: ${p.message}${targets}`;
  });
  return lines.join("\n").slice(0, MAX_MODEL_TEXT);
}
