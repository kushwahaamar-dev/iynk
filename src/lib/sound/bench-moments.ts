import type { FailureMode, FigureState, RoboticsContent } from "@/content/schema";
import { progressKey } from "@/lib/progress/keys";
import { allPass } from "@/lib/robotics/runner";
import { activeFaults } from "@/lib/robotics/steps";
import type { BenchState } from "@/lib/robotics/session";
import type { Moment } from "./moments";

/** A robotics bench's moments (see moments.ts): steps done, task runs and results, faults appearing, steps refused. */
export function benchMoments(bench: RoboticsContent, prev: BenchState, next: BenchState): Moment[] {
  const out: Moment[] = [];
  for (const step of bench.steps) {
    if (next.steps[step.id]?.done && !prev.steps[step.id]?.done) out.push({ kind: "step", key: progressKey.roboticsStep(bench.id, step.id) });
  }
  for (const [id, task] of Object.entries(next.tasks)) {
    const before = prev.tasks[id];
    const key = progressKey.roboticsTask(bench.id, id);
    if (task.running && !before?.running) out.push({ kind: "attempt", key });
    if (task.result && task.result !== before?.result) out.push({ kind: allPass(task.result) ? "pass" : "fail", key });
  }
  if (next.figure.state !== prev.figure.state) out.push(...newFaults(bench.faults, prev.figure.state, next.figure.state));
  if (next.notice !== prev.notice && next.notice?.notice.kind === "out-of-order") out.push({ kind: "refused" });
  return out;
}

function newFaults(faults: readonly FailureMode[], before: FigureState, after: FigureState): Moment[] {
  const was = new Set(activeFaults(faults, before).map((f) => f.id));
  return activeFaults(faults, after)
    .filter((f) => !was.has(f.id))
    .map((f) => ({ kind: "fault", code: f.id }));
}
