import { CHECK_BUDGET_MS, LIMIT_MESSAGE, runChecks, type CheckJob, type CheckOutcome } from "@/lib/interp";
import type { Project } from "@/project/generated/types";
import type { CheckVerdict, LessonRun, Tier, TestRun } from "@/project/guided/record";
import { PIN_KINDS, verdictsById } from "./checkJob";
import { lessonJobFor } from "./lessonJob";

export type { CheckVerdict, LessonRun, TestRun };

export interface RunDeps {
  run(job: CheckJob, onProgress?: (fraction: number) => void): { result: Promise<CheckOutcome>; cancel(): void };
  now(): string;
  tierOf(project: Project): Tier;
}

/** Runs the job in this thread after a yield, the same function the check worker calls. */
export const inlineRun: RunDeps["run"] = (job, onProgress) => {
  let cancelled = false;
  const result = new Promise<CheckOutcome>((resolve) => {
    setTimeout(() => {
      if (!cancelled) resolve(runChecks(job, { budgetMs: CHECK_BUDGET_MS, onProgress: onProgress && ((done, total) => onProgress(done / total)) }));
    }, 0);
  });
  return { result, cancel: () => void (cancelled = true) };
};

/** The project with the pin-reading checks of one test left out, which is all a Verilog board can run. Undefined when none is left. */
function withoutPinChecks(project: Project, testId: string): Project | undefined {
  const test = project.tests.find((t) => t.id === testId);
  const [first, ...rest] = test?.checks.filter((c) => !PIN_KINDS.includes(c.kind)) ?? [];
  if (!test || !first) return undefined;
  return { ...project, tests: project.tests.map((t) => (t === test ? { ...t, checks: [first, ...rest] } : t)) };
}

/**
 * Runs every test of a lesson project in order, one job each. A hidden check is evaluated like a visible one.
 * Cancelling resolves with the tests finished so far, and then `passedAll` is false.
 */
export function runLessonTests(
  project: Project,
  deps: RunDeps,
  opts: { source?: string; onProgress?: (fraction: number) => void } = {},
): { result: Promise<LessonRun>; cancel(): void } {
  let cancelled = false;
  let stopCurrent: (() => void) | undefined;
  let wake: () => void = () => {};
  const cancelSignal = new Promise<"cancelled">((resolve) => {
    wake = () => resolve("cancelled");
  });

  async function runTest(index: number): Promise<TestRun | "cancelled"> {
    const test = project.tests[index]!;
    const jobOpts = { testId: test.id, source: opts.source };
    let used = project;
    let job = lessonJobFor(used, jobOpts);
    if ("error" in job && job.error === "unsupported-language") {
      const pruned = withoutPinChecks(project, test.id);
      if (pruned) {
        used = pruned;
        job = lessonJobFor(used, jobOpts);
      }
    }
    const verdict = (c: (typeof test.checks)[number], ok: boolean, detail?: string): CheckVerdict => ({
      testId: test.id,
      checkId: c.id,
      kind: c.kind,
      visibility: c.visibility ?? "visible",
      ok,
      ...(detail === undefined ? {} : { detail }),
    });
    if ("error" in job) {
      return { testId: test.id, verdicts: test.checks.map((c) => verdict(c, false, job.error)), error: { line: 0, message: job.error }, ms: 0, limit: false };
    }

    const started = performance.now();
    const handle = deps.run(job, (f) => opts.onProgress?.((index + f) / project.tests.length));
    stopCurrent = handle.cancel;
    const outcome = await Promise.race([handle.result, cancelSignal]);
    if (outcome === "cancelled") return "cancelled";
    const ms = Math.round(performance.now() - started);
    if (outcome.trace.error?.message === LIMIT_MESSAGE) return { testId: test.id, verdicts: [], error: null, ms, limit: true };

    const ran = verdictsById(used.tests.find((t) => t.id === test.id)?.checks ?? [], outcome.results);
    const verdicts = test.checks.map((c) => {
      const r = ran.get(c.id);
      return r ? verdict(c, r.ok, r.detail) : verdict(c, false, "unsupported-language");
    });
    return { testId: test.id, verdicts, error: outcome.trace.error, ms, limit: false };
  }

  const result = (async (): Promise<LessonRun> => {
    const tests: TestRun[] = [];
    for (let i = 0; i < project.tests.length && !cancelled; i++) {
      const run = await runTest(i);
      if (run === "cancelled") break;
      tests.push(run);
    }
    opts.onProgress?.(1);
    const passedAll = !cancelled && tests.length > 0 && tests.every((t) => !t.error && !t.limit && t.verdicts.every((v) => v.ok));
    return { tests, passedAll, tier: deps.tierOf(project), at: deps.now() };
  })();

  return {
    result,
    cancel() {
      cancelled = true;
      stopCurrent?.();
      wake();
    },
  };
}
