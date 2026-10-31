import type { Op, Project } from "../../project/generated/types.ts";
import type { ApplyOutcome, Author } from "../../project/session.ts";
import type { CheckPort, ProjectPort, RuleFinding } from "./ports.ts";
import { emptyDiff, hashDiff, summariseDiff } from "./diffsummary.ts";
import type { DryRunReport, ProposeOpsArgs, StageReject, Tier } from "./types.ts";

const MAX_RUN_SIM_MS = 5000;
const RUN_WALL_MS = 2000;

/** The only door to `src/project/apply`; the wiring passes `applyBatch` with a clock. */
export interface ApplyPort {
  applyBatch(state: Project, ops: Op[], author: Author): ApplyOutcome;
}

export interface DryRunDeps {
  project: Pick<ProjectPort, "snapshot">;
  checks: CheckPort;
  apply: ApplyPort;
  descriptors: { tier(defRef: string): Tier };
  sha256(text: string): string;
  visibleTests(state: Project): string[];
}

type TestResult = Awaited<ReturnType<CheckPort["tests"]>>[number];

interface Baseline {
  key: string;
  rules: Promise<RuleFinding[]>;
  tests: Map<string, Promise<TestResult[]>>;
}

const baselines = new WeakMap<CheckPort, Baseline>();

/** Results for the state before the proposal, kept for as long as the revision stays the same. */
function baselineFor(checks: CheckPort, state: Project, revision: number): Baseline {
  const key = `${state.id}@${revision}`;
  const kept = baselines.get(checks);
  if (kept?.key === key) return kept;
  const fresh: Baseline = { key, rules: checks.rules(state), tests: new Map() };
  baselines.set(checks, fresh);
  return fresh;
}

const ruleKey = (finding: RuleFinding): string => finding.ruleId + "|" + [...finding.targets].sort().join(",");

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Applies the ops one at a time to find which one a batch reject came from. */
function locateReject(
  state: Project,
  steps: ProposeOpsArgs["steps"],
  apply: ApplyPort,
  author: Author,
): Pick<StageReject, "stepId" | "opIndex"> {
  let working = state;
  let opIndex = 0;
  for (const step of steps) {
    for (const op of step.ops) {
      const outcome = apply.applyBatch(working, [op], author);
      if (!outcome.ok) return { stepId: step.id, opIndex };
      working = outcome.state;
      opIndex++;
    }
  }
  return {};
}

function rejected(revision: number, reject: StageReject, deps: DryRunDeps): DryRunReport {
  const diff = emptyDiff();
  return {
    atRevision: revision,
    ok: false,
    rejects: [reject],
    diff,
    diffHash: hashDiff(diff, deps.sha256),
    failing: false,
    tiers: [],
  };
}

/**
 * P6 and P7: applies the steps as one batch to a copy of the state, then annotates the result with the checks.
 * The live document is never touched; `snapshot` only reads.
 */
export async function dryRun(
  args: ProposeOpsArgs,
  deps: DryRunDeps,
  opts: { stepIds?: string[] } = {},
): Promise<DryRunReport> {
  const { state, revision } = deps.project.snapshot();
  const picked = opts.stepIds === undefined ? args.steps : args.steps.filter((step) => opts.stepIds?.includes(step.id));
  const ops = picked.flatMap((step) => step.ops);
  const author: Author = {
    actor: state.actors[0].id,
    kind: "ai",
    proposal: "dry-run",
  };

  const outcome = deps.apply.applyBatch(state, ops, author);
  if (!outcome.ok) {
    const { code, message } = outcome.reject;
    return rejected(
      revision,
      {
        stage: "P6",
        ...locateReject(state, picked, deps.apply, author),
        code,
        message,
      },
      deps,
    );
  }

  const after = outcome.state;
  const diff = summariseDiff(state, after, outcome.inverse);
  const report: DryRunReport = {
    atRevision: revision,
    ok: true,
    rejects: [],
    diff,
    diffHash: hashDiff(diff, deps.sha256),
    failing: false,
    tiers: diff.parts.added.flatMap((part) =>
      part.definition === undefined
        ? []
        : [
            {
              componentId: part.id,
              tier: deps.descriptors.tier(part.definition),
            },
          ],
    ),
  };

  const baseline = baselineFor(deps.checks, state, revision);
  const rules = await Promise.all([baseline.rules, deps.checks.rules(after)]).catch(() => undefined);
  if (rules) {
    const [before, now] = rules;
    const known = new Set(before.map(ruleKey));
    const kept = new Set(now.map(ruleKey));
    report.rules = {
      added: now.filter((finding) => !known.has(ruleKey(finding))),
      resolved: before.filter((finding) => !kept.has(ruleKey(finding))),
    };
  }

  if (diff.sources.length > 0) {
    report.compile = await deps.checks
      .compile(
        after,
        diff.sources.map((source) => source.id),
      )
      .catch((error: unknown) => ({ skipped: messageOf(error) }));
  }

  const expected = args.expects?.tests ?? [];
  const ids = [...new Set([...expected, ...deps.visibleTests(after)])];
  if (ids.length > 0) {
    const visible = new Set(deps.visibleTests(after));
    let was = baseline.tests.get(ids.join("\n"));
    if (!was) {
      was = deps.checks.tests(state, ids);
      baseline.tests.set(ids.join("\n"), was);
    }
    const [before, now] = await Promise.all([was, deps.checks.tests(after, ids)]).catch(
      () => [[], []] as TestResult[][],
    );
    report.tests = ids.map((id) => ({
      id,
      visible: visible.has(id),
      before: before.find((result) => result.id === id)?.result ?? "not-run",
      after: now.find((result) => result.id === id)?.result ?? "not-run",
    }));
  }

  if (expected.length > 0 || args.kind === "scaffold") {
    const runMs = Math.max(0, ...after.tests.filter((test) => expected.includes(test.id)).map((test) => test.runMs));
    const simMs = Math.min(runMs > 0 ? runMs : MAX_RUN_SIM_MS, MAX_RUN_SIM_MS);
    report.run = await deps.checks.run(after, { simMs, wallMs: RUN_WALL_MS }).catch(() => undefined);
  }

  report.failing =
    (report.compile !== undefined && "ok" in report.compile && !report.compile.ok) ||
    (report.rules?.added.some((finding) => finding.severity === "error") ?? false) ||
    (report.tests?.some((test) => test.before === "pass" && test.after === "fail") ?? false);
  return report;
}
