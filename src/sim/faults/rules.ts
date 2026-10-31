import { STATIC_RULES } from "./static.ts";
import type { Finding, Rule, RuleInput } from "./types.ts";

const RULE_ID = /^(rule|code|solve):[a-z0-9-]+@[0-9]+$/;
const SEVERITY = { error: 0, warning: 1, note: 2 } as const;

export interface RuleRun {
  findings: Finding[];
  /** Rule id, then the reason a check was skipped, then how many times. */
  skipped: Record<string, Record<string, number>>;
  errors: { ruleId: string; message: string }[];
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

const firstTarget = (f: Finding): string => f.targets[0]?.id ?? "";

/**
 * Runs each rule over one view. A rule that throws is reported in `errors` and the others still run. Findings come
 * back ordered by severity, rule id and first target, so the same circuit always gives the same list.
 */
export function runRules(rules: readonly Rule[], input: Omit<RuleInput, "skipped">): RuleRun {
  const skipped: RuleRun["skipped"] = {};
  const add = (ruleId: string, what: string): void => {
    const counts = (skipped[ruleId] ??= {});
    counts[what] = (counts[what] ?? 0) + 1;
  };
  const findings: Finding[] = [];
  const errors: RuleRun["errors"] = [];

  for (const rule of [...rules].sort((a, b) => byText(a.id, b.id))) {
    if (!RULE_ID.test(rule.id)) {
      errors.push({ ruleId: rule.id, message: "the rule id does not match <layer>:<name>@<major>" });
    } else if (!rule.enabled) {
      add(rule.id, "disabled");
    } else if (rule.needs.includes("code") && (input.code === undefined || input.code.language === "unsupported")) {
      add(rule.id, "no-code");
    } else if (rule.needs.includes("run") && input.run === undefined) {
      add(rule.id, "no-run");
    } else {
      try {
        findings.push(...rule.check({ ...input, skipped: { add } }));
      } catch (e) {
        errors.push({ ruleId: rule.id, message: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  findings.sort(
    (a, b) =>
      SEVERITY[a.severity] - SEVERITY[b.severity] || byText(a.ruleId, b.ruleId) || byText(firstTarget(a), firstTarget(b)),
  );
  return { findings, skipped, errors };
}

/** The rules that need only the netlist. The full list is assembled where every layer is known. */
export function defaultRules(): Rule[] {
  return [...STATIC_RULES];
}
