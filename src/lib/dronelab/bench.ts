import type { DroneBuildStep, DroneContent, DroneTest, FigureState } from "@/content/schema";
import { progressKey } from "@/lib/progress/keys";
import { holds, readBench, type FlightReadiness } from "./figure";

// Build, test and arming logic over the figure's reported state. Everything here is a pure function of
// (content, reported state, what the learner did), so a replay or a server can check the same result (D14c).

export type StepStatus = "done" | "flipped" | "next" | "todo";

export function stepStatus(step: DroneBuildStep, state: FigureState): StepStatus {
  const bench = readBench(state);
  if (holds(state, step.done)) return "done";
  if (bench.placed[step.part] === 1) return "flipped";
  return bench.next === step.part ? "next" : "todo";
}

/** The build is complete when every step's `done` holds (every part on, the right way round). */
export function buildComplete(content: DroneContent, state: FigureState): boolean {
  return content.build.length > 0 && content.build.every((step) => holds(state, step.done));
}

/** Engine tests run through these `set {run}` values (docs/FIGURES-DRONE.md §10.1); craft tests are buttons. */
const ENGINE_RUNS = new Set(["smoke", "motors", "calibrate"]);

export type TestStatus = "passed" | "running" | "failed" | "idle";

/**
 * A test counts as passed only when the learner ran it and its condition holds afterwards. "Build it for me"
 * also sets the checks, but that is the figure doing it, not a test the learner ran. `ran` means the figure
 * reported the test running (engine tests) or its button was pressed (craft tests); a refused run never ran.
 */
export function testStatus(test: DroneTest, state: FigureState, ran: boolean): TestStatus {
  const bench = readBench(state);
  if (bench.test !== null && bench.test === test.button) return "running";
  if (!ran) return "idle";
  return holds(state, test.done) ? "passed" : "failed";
}

/** Engine tests report themselves running in `state.test`; a craft's own button tests do not. */
export function isEngineTest(test: DroneTest): boolean {
  return ENGINE_RUNS.has(test.button);
}

/** The host command that runs a test: `set {run}` for the engine's three, `press` for a craft's own button. */
export function testCommand(test: DroneTest): { type: "set"; state: { run: string } } | { type: "press"; id: string } {
  return ENGINE_RUNS.has(test.button) ? { type: "set", state: { run: test.button } } : { type: "press", id: test.button };
}

/** Every progress key the workshop and the fly page can fill, in the dashboard's order. */
export function droneProgressKeys(content: DroneContent): string[] {
  const id = content.id;
  return [
    ...(content.build.length > 0 ? [progressKey.droneBuild(id)] : []),
    ...content.tests.map((t) => progressKey.droneTest(id, t.id)),
    ...content.quizzes.map((q) => progressKey.droneQuiz(id, q.id)),
    ...content.courses.map((c) => progressKey.droneCourse(id, c.id)),
  ];
}

export type ArmRuleId = "built" | "capFault" | "smoke" | "motors" | "acc" | "fcArrow" | "props" | "throttle" | "mistakes";
export type ArmRule = { id: ArmRuleId; ok: boolean; level: "block" | "warn" | "rule"; code?: string };

/**
 * What happens on the range for a bench build (null = the factory build): blockers refuse to arm, warnings
 * arm but fly badly or flip on take-off, and the throttle rule applies to every craft.
 */
export function armingRules(bench: { built: boolean; flight: FlightReadiness | null } | null): ArmRule[] {
  const f = bench?.flight ?? null;
  const built = bench === null || bench.built;
  const known = new Set(["fc-reversed", "props-swapped", "cap-reversed"]);
  const others = (f?.mistakes ?? []).filter((m) => !known.has(m));
  return [
    { id: "built", ok: built, level: "block" },
    { id: "capFault", ok: !f?.capFault, level: "block" },
    { id: "smoke", ok: f === null || f.smokeTested, level: "block" },
    { id: "motors", ok: f === null || f.motorChecked, level: "block" },
    { id: "acc", ok: f === null || f.accCal, level: "block" },
    { id: "fcArrow", ok: !f?.fcReversed, level: "warn" },
    { id: "props", ok: !f?.propsSwapped, level: "warn" },
    ...others.map((code): ArmRule => ({ id: "mistakes", ok: false, level: "warn", code })),
    { id: "throttle", ok: true, level: "rule" },
  ];
}

export function canArm(rules: ArmRule[]): boolean {
  return rules.every((r) => r.level !== "block" || r.ok);
}
