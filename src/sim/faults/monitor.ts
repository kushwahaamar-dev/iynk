import { runRules } from "./rules.ts";
import type { RuleRun } from "./rules.ts";
import type { CheckOutcome, CodeFacts, Finding, NetView, Rule, RunFacts } from "./types.ts";

export interface FaultMonitor {
  /** Runs every rule over the finished run. The same facts give the same findings. */
  onRunEnd(facts: RunFacts, view: NetView, code?: CodeFacts, checks?: CheckOutcome[]): Finding[];
  /** The skipped checks and rule errors of the latest `onRunEnd`. */
  last(): Pick<RuleRun, "skipped" | "errors"> | undefined;
}

export function createFaultMonitor(rules: readonly Rule[]): FaultMonitor {
  let latest: RuleRun | undefined;
  return {
    onRunEnd(facts, view, code, checks) {
      latest = runRules(rules, { view, code, run: facts, checks });
      return latest.findings;
    },
    last: () => latest && { skipped: latest.skipped, errors: latest.errors },
  };
}
