import type { DesignPick, DroneContent } from "@/content/schema";
import type { LabStore } from "@/components/dock/types";
import { calc } from "@/lib/drone/calc";
import { designInput, isDesignPick } from "@/lib/drone/design";
import type { DailyChallenge } from "@/lib/flight/challenge";
import type { BreakId } from "@/lib/flight/crash";
import { fromCalc } from "@/lib/flight/from-calc";
import type { CalcOutputs, CraftFaults } from "@/lib/flight/types";
import { armingRules, canArm, type ArmRule } from "./bench";
import type { BenchSummary } from "./store";

// The fly page's own store (D14b): which build flies (the learner's bench build or the factory build), which
// course, what the learner broke on purpose (Break it) and whether today's challenge is on. The flight itself lives
// in the range's session (src/lib/flight).

export type FlySource = "bench" | "factory";

export type FlyState = {
  id: string;
  bench: BenchSummary | null;
  source: FlySource;
  course: string | null;
  /** Break it: a fault forced on (true) or taken out (false) over what the build has. */
  breaks: Partial<Record<BreakId, boolean>>;
  /** Today's challenge, while the learner flies it (the factory build on the challenge's pack). */
  challenge: DailyChallenge | null;
};

export type FlyAction =
  | { type: "bench/loaded"; bench: BenchSummary | null }
  | { type: "source"; source: FlySource }
  | { type: "course"; id: string }
  | { type: "break"; id: BreakId; on: boolean }
  | { type: "break/reset" }
  | { type: "challenge"; challenge: DailyChallenge | null }
  // a room hands every lab store the host's snapshot; each pilot keeps their own build, breaks and challenge
  | { type: "sync/hydrate"; state: unknown };

export function initialFly(content: DroneContent): FlyState {
  return { id: content.id, bench: null, source: "factory", course: content.courses[0]?.id ?? null, breaks: {}, challenge: null };
}

/** The rule each Break it switch breaks, and how badly: only the accelerometer refuses to arm, the rest flip. */
const BREAK_RULES: Partial<Record<BreakId, { rule: ArmRule["id"]; level: ArmRule["level"] }>> = {
  fcReversed: { rule: "fcArrow", level: "warn" },
  propsSwapped: { rule: "props", level: "warn" },
  motorDirUnchecked: { rule: "motors", level: "warn" },
  accUncalibrated: { rule: "acc", level: "block" },
};

/** The bench test each rule stands for: a craft without that test has no such rule. */
const RULE_TESTS: Partial<Record<ArmRule["id"], string>> = { smoke: "smoke", motors: "motors", acc: "calibrate" };

/**
 * The rules for the build that flies (the factory build passes them all), in this craft's words: the capacitor
 * rule names its own power lead and goes when it has none, a rule for a test the craft doesn't have goes, and a
 * Break it switch shows on its rule, so the list says what Arm will say.
 */
export function flyRules(content: DroneContent, s: FlyState): ArmRule[] {
  const lead = content.parts.find((p) => p.id === "XT60")?.short;
  const tests = new Set(content.tests.map((t) => t.button));
  const rules = armingRules(s.source === "bench" && s.bench ? { built: s.bench.built, flight: s.bench.flight } : null)
    .filter((r) => (r.id === "capFault" ? lead !== undefined : !RULE_TESTS[r.id] || tests.has(RULE_TESTS[r.id]!)))
    .map((r) => (r.id === "capFault" ? { ...r, part: lead } : r));
  for (const [id, on] of Object.entries(s.breaks) as Array<[BreakId, boolean]>) {
    const hit = BREAK_RULES[id];
    if (!hit) continue;
    const at = rules.findIndex((r) => r.id === hit.rule);
    const rule: ArmRule = on ? { id: hit.rule, ok: false, level: hit.level, broken: true } : { id: hit.rule, ok: true, level: hit.level };
    if (at >= 0) rules[at] = rule;
    else if (on) rules.splice(rules.length - 1, 0, rule);
  }
  return rules;
}

export function reduceFly(content: DroneContent, s: FlyState, action: FlyAction): FlyState {
  switch (action.type) {
    case "bench/loaded": {
      const bench = action.bench && isDesignPick(content.design, action.bench.pick) ? action.bench : null;
      // A bench build that would fly is the one the learner meant; otherwise the factory build flies.
      // (the challenge flies the factory build whatever the bench holds)
      const ok = bench !== null && !s.challenge && canArm(armingRules({ built: bench.built, flight: bench.flight }));
      return { ...s, bench, source: ok ? "bench" : "factory" };
    }
    case "source":
      if (action.source === "bench" && !s.bench) return s;
      // the challenge flies the factory build: picking another build ends it
      return { ...s, source: action.source, challenge: action.source === "bench" ? null : s.challenge };
    case "course":
      if (!content.courses.some((c) => c.id === action.id)) return s;
      return { ...s, course: action.id, challenge: s.challenge && s.challenge.course !== action.id ? null : s.challenge };
    case "break":
      return { ...s, breaks: { ...s.breaks, [action.id]: action.on } };
    case "break/reset":
      return Object.keys(s.breaks).length ? { ...s, breaks: {} } : s;
    case "challenge": {
      const c = action.challenge;
      if (!c) return s.challenge ? { ...s, challenge: null } : s;
      const fits = c.craft === content.id && content.courses.some((x) => x.id === c.course) && c.batt in content.design.batts;
      return fits ? { ...s, challenge: c, course: c.course, source: "factory" } : s;
    }
    default:
      return s;
  }
}

/** Whether anything is broken on purpose (a challenge lap with a break doesn't go on the day's board). */
export function anyBreak(s: FlyState): boolean {
  return Object.values(s.breaks).some(Boolean);
}

export function createFlyStore(content: DroneContent): LabStore<FlyState, FlyAction> {
  let state = initialFly(content);
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const next = reduceFly(content, state, action);
      if (next === state) return;
      state = next;
      for (const l of listeners) l();
    },
  };
}

/** The design that flies: the bench's pick for a bench flight, the craft's default otherwise. */
export function flyPick(content: DroneContent, s: Pick<FlyState, "source" | "bench" | "challenge">): DesignPick {
  if (s.challenge) return { ...content.design.default, batt: s.challenge.batt };
  return s.source === "bench" && s.bench ? s.bench.pick : content.design.default;
}

/** What the range needs from the calculator for a pick; Break it can push the motors past their rating. */
export function flightCalc(content: DroneContent, pick: DesignPick, overKv?: boolean): CalcOutputs {
  const input = designInput(content.design, pick);
  const out = fromCalc(calc(input), input.battery);
  return overKv === undefined ? out : { ...out, overKv };
}

const FAULT_KEYS = [
  "fcReversed",
  "propsSwapped",
  "motorDirUnchecked",
  "accUncalibrated",
  "servosReversed",
  "tailHeavy",
  "propBackwards",
] as const;

/**
 * The bench mistakes that change how the craft flies (none for the factory build), with the saved CLI
 * settings on top: a fault the content's CLI effects name, `boardYaw` 180, which turns the FC's
 * orientation round (a backwards FC with align_board_yaw = 180 flies right; a forward one then flips), and
 * `tailReverse`, a tail servo reversed in the mixer, which cancels or causes a backwards servo the same way.
 */
export function flightFaults(content: DroneContent, s: Pick<FlyState, "source" | "bench" | "breaks">): CraftFaults | undefined {
  const own = benchFaults(content, s);
  const breaks = Object.entries(s.breaks).filter(([id]) => id !== "overKv") as Array<[keyof CraftFaults, boolean]>;
  if (!own && !breaks.length) return undefined;
  const faults: CraftFaults = { ...own };
  for (const [id, on] of breaks) faults[id] = on;
  return faults;
}

function benchFaults(content: DroneContent, s: Pick<FlyState, "source" | "bench">): CraftFaults | undefined {
  if (s.source !== "bench" || !s.bench?.flight) return undefined;
  const f = s.bench.flight;
  const cli = s.bench.cli;
  const battery = content.design.batts[s.bench.pick.batt];
  const faults: CraftFaults = {
    fcReversed: f.fcReversed,
    propsSwapped: f.propsSwapped,
    motorDirUnchecked: !f.motorChecked,
    accUncalibrated: !f.accCal,
    servosReversed: f.mistakes.includes("servo-reversed"),
    tailHeavy: battery?.cg === "tail",
    propBackwards: f.mistakes.includes("prop-backwards"),
  };
  for (const key of FAULT_KEYS) if (typeof cli[key] === "boolean") faults[key] = cli[key] as boolean;
  if (cli.boardYaw === 180) faults.fcReversed = !faults.fcReversed;
  if (cli.tailReverse === true) faults.servosReversed = !faults.servosReversed;
  return faults;
}

/** Numeric flight settings the bench's saved CLI changed (angleLimit, acroRate, climbRate ...). */
export function craftPatch<C extends object>(craft: C, s: Pick<FlyState, "source" | "bench">): C {
  if (s.source !== "bench" || !s.bench) return craft;
  const patch: Record<string, number> = {};
  for (const [key, value] of Object.entries(s.bench.cli)) {
    if (typeof value === "number" && typeof (craft as Record<string, unknown>)[key] === "number") patch[key] = value;
  }
  return Object.keys(patch).length ? { ...craft, ...patch } : craft;
}
