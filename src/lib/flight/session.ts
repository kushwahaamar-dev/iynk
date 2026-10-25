import { LIMITS } from "./battery";
import { advance, createSim, dispatch, drainEvents, frameOf, type SimState } from "./sim";
import type { CalcOutputs, Course, CraftFaults, FlightAction, FlightCraft, FlightEvent, FlightFrame } from "./types";

/** What the page shows around the range; changes a few times a second at most. */
export interface FlightSnapshot {
  mode: string;
  armed: boolean;
  crashed: boolean;
  airborne: boolean;
  windOn: boolean;
  pendingDesign: boolean;
  perCell: number;
  low: boolean;
  amps: number;
  mah: number;
  alt: number;
  speed: number; // km/h
  throttle: number; // 0..1 motor output
  stick: number; // 0..1 throttle stick, where a manual throttle was left
  gate: number;
  gates: number;
  checkpoint: number;
  checkpoints: number;
  bestLap: number | null;
  bestRun: number | null;
  laps: number;
  crashes: number;
  splits: number[];
}

/** What a session started from: replaying its log from here gives the same flight. */
export interface FlightOrigin {
  craft: FlightCraft;
  course: Course;
  calc: CalcOutputs;
  opts: { mode?: string; faults?: CraftFaults; windOn?: boolean };
}

export interface FlightSession {
  getState(): FlightSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(action: FlightAction): void;
  /** Runs the physics for `seconds` of wall time; returns what happened. */
  tick(seconds: number): FlightEvent[];
  frame(): FlightFrame;
  /** Every action with the physics step it landed on: replay it to verify a run. */
  log(): ReadonlyArray<{ step: number; action: FlightAction }>;
  origin: FlightOrigin;
  sim: SimState;
}

const round = (v: number, k: number) => Math.round(v * k) / k;

function snapshotOf(s: SimState): FlightSnapshot {
  const chem = s.calc.chemistry ?? "lipo";
  return {
    mode: s.mode.id,
    armed: s.armed,
    crashed: s.crashed,
    airborne: s.airborne,
    windOn: s.windOn,
    pendingDesign: s.pending !== null,
    perCell: round(s.battery.volt / s.calc.cells, 100),
    low: s.battery.volt / s.calc.cells < LIMITS[chem].low,
    amps: round(s.battery.amps, 10),
    mah: Math.round(s.battery.used),
    alt: round(s.p[2], 10),
    speed: Math.round(Math.hypot(s.v[0], s.v[1], s.v[2]) * 3.6),
    throttle: round(s.u, 100),
    stick: round(s.sticks.throttle, 100),
    gate: s.gate,
    gates: s.course.gates.length,
    checkpoint: s.checkpoint,
    checkpoints: s.course.checkpoints.length,
    bestLap: s.bestLap,
    bestRun: s.bestRun,
    laps: s.laps,
    crashes: s.crashes,
    splits: s.splits.slice(),
  };
}

const same = (a: FlightSnapshot, b: FlightSnapshot) =>
  (Object.keys(a) as Array<keyof FlightSnapshot>).every((k) =>
    Array.isArray(a[k]) ? JSON.stringify(a[k]) === JSON.stringify(b[k]) : a[k] === b[k],
  );

/**
 * A flight as a small store: dispatch(action) is the only way in, so rooms,
 * replays and an AI partner can drive it the same way the keyboard does.
 */
export function createSession(
  craft: FlightCraft,
  course: Course,
  calc: CalcOutputs,
  opts: { mode?: string; faults?: CraftFaults; windOn?: boolean } = {},
): FlightSession {
  const sim = createSim(craft, course, calc, opts);
  const listeners = new Set<() => void>();
  const actions: Array<{ step: number; action: FlightAction }> = [];
  let snap = snapshotOf(sim);
  let carry = 0;
  let lastPublish = 0;
  const publish = () => {
    const next = snapshotOf(sim);
    if (same(next, snap)) return;
    snap = next;
    listeners.forEach((l) => l());
  };
  return {
    sim,
    origin: { craft, course, calc, opts: { ...opts } },
    getState: () => snap,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch(action) {
      const last = actions[actions.length - 1];
      if (action.type === "sticks" && last && last.step === sim.step && last.action.type === "sticks") last.action = action;
      else actions.push({ step: sim.step, action });
      dispatch(sim, action);
      if (action.type !== "sticks") publish();
    },
    tick(seconds) {
      const r = advance(sim, seconds, carry);
      carry = r.carry;
      const events = drainEvents(sim);
      // the snapshot is for the page around the range: ten updates a second, or at once when something happened
      if (events.length || sim.step - lastPublish >= 10) {
        lastPublish = sim.step;
        publish();
      }
      return events;
    },
    frame: () => frameOf(sim),
    log: () => actions,
  };
}
