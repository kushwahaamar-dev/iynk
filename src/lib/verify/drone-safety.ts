import { z } from "zod";
import type { RunInput } from "./runlog";

// The bench safety procedure as a pure function of the run (D14c), following
// the drone engine's rules in docs/FIGURES-DRONE.md §6 and §8. The recorder
// turns the figure's state reports into the effective bench events below, so
// the figure has already applied its build order, exploded view and busy
// rules; the replay re-applies every safety rule and only counts a test the
// learner ran during this run.

export type DroneTestId = "smoke" | "motors" | "calibrate";

export const DRONE_TESTS: readonly DroneTestId[] = ["smoke", "motors", "calibrate"];

/** Which bench tests a craft has (the Tiny Whoop has no smoke stopper, for one). */
export type DroneTestSet = Record<DroneTestId, boolean>;

const orient = z.union([z.literal(0), z.literal(1)]);
const partId = z.string().regex(/^[A-Z][A-Z0-9_-]{0,23}$/);
const testId = z.enum(["smoke", "motors", "calibrate"]);

export const benchEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("init"),
    placed: z.record(partId, orient),
    plugged: z.boolean(),
    fault: z.string().max(24).nullable(),
    smokeOk: z.boolean(),
    motorOk: z.boolean(),
    accOk: z.boolean(),
  }),
  /** `auto`: placed by "Build it for me", which keeps the figure's check flags. */
  z.object({ type: z.literal("add"), id: partId, orient, auto: z.boolean().optional() }),
  z.object({ type: z.literal("remove"), id: partId }),
  z.object({ type: z.literal("plug") }),
  z.object({ type: z.literal("unplug") }),
  z.object({ type: z.literal("test"), test: testId }),
  z.object({ type: z.literal("test-end"), test: testId }),
  /** "Build it for me" set the figure's flags without the learner running the tests. */
  z.object({ type: z.literal("assist"), tests: z.array(testId).min(1).max(3) }),
]);

export type BenchEvent = z.infer<typeof benchEventSchema>;

export type Violation = "live-work" | "props-early" | "props-on" | "inconsistent";

export type BenchState = {
  placed: Record<string, 0 | 1>;
  plugged: boolean;
  fault: string | null;
  /** The figure's own check flags (they gate the props rule). */
  ok: Record<DroneTestId, boolean>;
  /** Checks the learner ran in this run that still hold. */
  done: Record<DroneTestId, boolean>;
  running: DroneTestId | null;
  pops: number;
  reversedCalibrations: number;
  violations: Violation[];
};

const NONE = { smoke: false, motors: false, calibrate: false };

export function initialBench(init: Extract<BenchEvent, { type: "init" }>): BenchState {
  return {
    placed: { ...init.placed },
    plugged: init.plugged,
    fault: init.fault,
    ok: { smoke: init.smokeOk, motors: init.motorOk, calibrate: init.accOk },
    done: { ...NONE },
    running: null,
    pops: 0,
    reversedCalibrations: 0,
    violations: [],
  };
}

const GUARDS: Record<string, DroneTestId> = { XT60: "smoke", WIRES: "motors", FC: "calibrate" };

/** A new or turned XT60, a fresh wiring job or a moved FC voids its check. */
function voidCheck(state: BenchState, id: string, fresh: boolean, keepFlag: boolean) {
  const test = GUARDS[id];
  if (!test || (test === "motors" && !fresh)) return;
  state.done[test] = false;
  if (!keepFlag) state.ok[test] = false;
  if (id === "XT60") state.fault = null;
}

function plugIn(state: BenchState) {
  if (state.fault) state.violations.push("inconsistent");
  state.plugged = true;
  if (state.placed.XT60 === 1 && !state.ok.smoke) {
    state.fault = "XT60";
    state.pops++;
  }
}

/** Applies one bench event. Never mutates its input. */
export function benchStep(prev: BenchState, event: BenchEvent, tests: DroneTestSet): BenchState {
  const state: BenchState = {
    ...prev,
    placed: { ...prev.placed },
    ok: { ...prev.ok },
    done: { ...prev.done },
    violations: [...prev.violations],
  };
  const has = (id: string) => state.placed[id] !== undefined;

  if (state.running && event.type !== "test-end") state.violations.push("inconsistent");

  switch (event.type) {
    case "init":
      state.violations.push("inconsistent");
      break;
    case "add": {
      if (state.plugged && event.id !== "BATT") state.violations.push("live-work");
      const fresh = !has(event.id);
      if (!fresh && state.placed[event.id] === event.orient) break;
      if (fresh && event.id === "PROPS" && ((tests.smoke && !state.ok.smoke) || (tests.motors && !state.ok.motors))) {
        state.violations.push("props-early");
      }
      state.placed[event.id] = event.orient;
      voidCheck(state, event.id, fresh, event.auto === true);
      break;
    }
    case "remove":
      if (!has(event.id)) break;
      if (state.plugged) state.violations.push("live-work");
      delete state.placed[event.id];
      voidCheck(state, event.id, true, false);
      break;
    case "assist":
      for (const test of event.tests) state.ok[test] = true;
      break;
    case "plug":
      if (!state.plugged) plugIn(state);
      break;
    case "unplug":
      state.plugged = false;
      break;
    case "test":
      if (!tests[event.test] || state.fault) {
        state.violations.push("inconsistent");
        break;
      }
      if (event.test === "smoke") {
        if (!has("XT60") || !has("ESC")) state.violations.push("inconsistent");
        state.plugged = false;
      } else if (event.test === "motors") {
        if (has("PROPS")) state.violations.push("props-on");
        if (!has("WIRES") || !has("FC")) state.violations.push("inconsistent");
        if (!state.plugged) plugIn(state);
        if (state.fault) state.violations.push("inconsistent");
      } else if (!has("FC")) {
        state.violations.push("inconsistent");
      }
      state.running = event.test;
      break;
    case "test-end":
      if (state.running !== event.test) {
        state.violations.push("inconsistent");
        break;
      }
      state.running = null;
      if (event.test === "smoke") {
        // A reversed cap glows red: the stopper caught the short, nothing passes.
        if (state.placed.XT60 === 0) state.ok.smoke = state.done.smoke = true;
      } else if (event.test === "motors") {
        state.ok.motors = state.done.motors = true;
      } else {
        state.ok.calibrate = state.done.calibrate = true;
        if (state.placed.FC === 1) state.reversedCalibrations++;
      }
      break;
  }
  return state;
}

export type DroneSafetyReport = {
  pass: boolean;
  score: number;
  /** Per test the craft has: did the learner pass it in this run. */
  steps: Partial<Record<DroneTestId, boolean>>;
  violations: Violation[];
  pops: number;
  fault: string | null;
};

export function scoreOf(state: BenchState): number {
  return Math.max(0, 100 - 20 * state.pops - 10 * state.reversedCalibrations);
}

/** Replays a drone-safety run. Inputs that are not bench events make the run invalid. */
export function replayDroneSafety(inputs: readonly RunInput[], tests: DroneTestSet): DroneSafetyReport | null {
  const events: BenchEvent[] = [];
  let last = 0;
  for (const input of inputs) {
    const parsed = benchEventSchema.safeParse(input.action);
    if (!parsed.success || input.t < last) return null;
    last = input.t;
    events.push(parsed.data);
  }
  const [first, ...rest] = events;
  if (!first || first.type !== "init") return null;

  const state = rest.reduce((s, event) => benchStep(s, event, tests), initialBench(first));
  const steps: Partial<Record<DroneTestId, boolean>> = {};
  for (const test of DRONE_TESTS) if (tests[test]) steps[test] = state.done[test];
  const allDone = DRONE_TESTS.every((test) => !tests[test] || state.done[test]);
  const clean = state.violations.length === 0 && state.fault === null && state.running === null;
  return {
    pass: allDone && clean,
    score: scoreOf(state),
    steps,
    violations: [...new Set(state.violations)],
    pops: state.pops,
    fault: state.fault,
  };
}

/** What the figure reports in `state` that the recorder reads (FIGURES-DRONE §10.2). */
export type DroneReport = {
  placed: Record<string, 0 | 1>;
  plugged: boolean;
  fault: string | null;
  test: DroneTestId | null;
  smokeOk: boolean;
  motorOk: boolean;
  accOk: boolean;
};

const isTest = (value: unknown): value is DroneTestId => value === "smoke" || value === "motors" || value === "calibrate";

/** Reads a figure state report, or null when it is not a drone bench report. */
export function readDroneReport(raw: Record<string, unknown>): DroneReport | null {
  const placed = raw.placed;
  if (typeof placed !== "object" || placed === null || typeof raw.plugged !== "boolean") return null;
  const parts: Record<string, 0 | 1> = {};
  for (const [id, value] of Object.entries(placed as Record<string, unknown>)) {
    if ((value === 0 || value === 1) && /^[A-Z][A-Z0-9_-]{0,23}$/.test(id)) parts[id] = value;
  }
  return {
    placed: parts,
    plugged: raw.plugged,
    fault: typeof raw.fault === "string" ? raw.fault : null,
    test: isTest(raw.test) ? raw.test : null,
    smokeOk: raw.smokeOk === true,
    motorOk: raw.motorOk === true,
    accOk: raw.accOk === true,
  };
}

export function initEvent(report: DroneReport): BenchEvent {
  return {
    type: "init",
    placed: { ...report.placed },
    plugged: report.plugged,
    fault: report.fault,
    smokeOk: report.smokeOk,
    motorOk: report.motorOk,
    accOk: report.accOk,
  };
}

const FLAGS: Record<DroneTestId, "smokeOk" | "motorOk" | "accOk"> = { smoke: "smokeOk", motors: "motorOk", calibrate: "accOk" };

/**
 * The bench events between two consecutive reports, in the order the engine
 * applies them: a test ends, the battery comes out, parts come off, "Build it
 * for me" sets the flags, parts go on or turn round, the battery goes in, a
 * test starts.
 */
export function benchEventsBetween(prev: DroneReport, next: DroneReport): BenchEvent[] {
  const events: BenchEvent[] = [];
  const ended = prev.test && prev.test !== next.test ? prev.test : null;
  const starting = next.test && next.test !== prev.test ? next.test : null;
  if (ended) events.push({ type: "test-end", test: ended });
  // Tests plug and unplug by themselves; the replay does that part.
  if (prev.plugged && !next.plugged && starting !== "smoke") events.push({ type: "unplug" });
  for (const id of Object.keys(prev.placed).sort()) if (!(id in next.placed)) events.push({ type: "remove", id });
  const assisted = DRONE_TESTS.filter((test) => test !== ended && !prev[FLAGS[test]] && next[FLAGS[test]]);
  if (assisted.length) events.push({ type: "assist", tests: assisted });
  for (const id of Object.keys(next.placed).sort()) {
    if (prev.placed[id] === next.placed[id]) continue;
    const guard = GUARDS[id];
    events.push(guard && next[FLAGS[guard]] ? { type: "add", id, orient: next.placed[id], auto: true } : { type: "add", id, orient: next.placed[id] });
  }
  if (!prev.plugged && next.plugged && starting !== "motors") events.push({ type: "plug" });
  if (starting) events.push({ type: "test", test: starting });
  return events;
}
