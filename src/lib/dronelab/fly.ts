import type { DesignPick, DroneContent } from "@/content/schema";
import type { LabStore } from "@/components/dock/types";
import { calc } from "@/lib/drone/calc";
import { designInput, isDesignPick } from "@/lib/drone/design";
import { fromCalc } from "@/lib/flight/from-calc";
import type { CalcOutputs, CraftFaults } from "@/lib/flight/types";
import { armingRules, canArm, type ArmRule } from "./bench";
import type { BenchSummary } from "./store";

// The fly page's own store (D14b): which build flies (the learner's bench build or the factory build) and
// which course. The flight itself lives in the range's session (src/lib/flight).

export type FlySource = "bench" | "factory";

export type FlyState = {
  id: string;
  bench: BenchSummary | null;
  source: FlySource;
  course: string | null;
};

export type FlyAction =
  { type: "bench/loaded"; bench: BenchSummary | null } | { type: "source"; source: FlySource } | { type: "course"; id: string };

export function initialFly(content: DroneContent): FlyState {
  return { id: content.id, bench: null, source: "factory", course: content.courses[0]?.id ?? null };
}

/** The rules for the build that flies: the factory build passes them all. */
export function flyRules(s: FlyState): ArmRule[] {
  return armingRules(s.source === "bench" && s.bench ? { built: s.bench.built, flight: s.bench.flight } : null);
}

export function reduceFly(content: DroneContent, s: FlyState, action: FlyAction): FlyState {
  switch (action.type) {
    case "bench/loaded": {
      const bench = action.bench && isDesignPick(content.design, action.bench.pick) ? action.bench : null;
      // A bench build that would fly is the one the learner meant; otherwise the factory build flies.
      const ok = bench !== null && canArm(armingRules({ built: bench.built, flight: bench.flight }));
      return { ...s, bench, source: ok ? "bench" : "factory" };
    }
    case "source":
      if (action.source === "bench" && !s.bench) return s;
      return { ...s, source: action.source };
    case "course":
      return content.courses.some((c) => c.id === action.id) ? { ...s, course: action.id } : s;
  }
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
export function flyPick(content: DroneContent, s: FlyState): DesignPick {
  return s.source === "bench" && s.bench ? s.bench.pick : content.design.default;
}

/** What the range needs from the calculator for a pick. */
export function flightCalc(content: DroneContent, pick: DesignPick): CalcOutputs {
  const input = designInput(content.design, pick);
  return fromCalc(calc(input), input.battery);
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
 * settings on top: a fault the content's CLI effects name, and `boardYaw` 180, which turns the FC's
 * orientation round (a backwards FC with align_board_yaw = 180 flies right; a forward one then flips).
 */
export function flightFaults(content: DroneContent, s: FlyState): CraftFaults | undefined {
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
  return faults;
}

/** Numeric flight settings the bench's saved CLI changed (angleLimit, acroRate, climbRate ...). */
export function craftPatch<C extends object>(craft: C, s: FlyState): C {
  if (s.source !== "bench" || !s.bench) return craft;
  const patch: Record<string, number> = {};
  for (const [key, value] of Object.entries(s.bench.cli)) {
    if (typeof value === "number" && typeof (craft as Record<string, unknown>)[key] === "number") patch[key] = value;
  }
  return Object.keys(patch).length ? { ...craft, ...patch } : craft;
}
