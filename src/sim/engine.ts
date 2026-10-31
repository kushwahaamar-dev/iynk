import type { ClockRate, SimTime } from "./core/clock.ts";
import type { SimDiagnostic } from "./core/diagnostic.ts";

export type { SimDiagnostic, SolveDiagnostic } from "./core/diagnostic.ts";

/** SIMULATION 8.1. Not the `Language` of `src/lib/interp/profiles.ts`. */
export type Language = "arduino-cpp" | "c-cpp" | "micropython" | "python" | "verilog";

/** The 'hex' arm of SIMULATION 8.1 arrives with B9; `entry` is the path of the file that goes to the engine. */
export type ProgramImage = {
  kind: "source";
  language: Language;
  files: { path: string; text: string }[];
  entry: string;
};

export interface LoadResult {
  ok: boolean;
  diagnostics: SimDiagnostic[];
  models: string[];
}

export type StepUnit = "ns" | "event" | "cycle" | "line" | "statement";

export interface WorkLimits {
  statements: number;
  events: number;
  outputBytes: number;
}

/** SIMULATION A.2 `RunOptions`; renamed because `src/lib/interp/run.ts` exports a different `RunOptions`. */
export interface SimRunOptions {
  seed: number;
  speed: number;
  limits: WorkLimits;
  tier: "T1" | "T3";
  endNs?: SimTime;
}

export interface InputEntry {
  at: SimTime;
  seq: number;
  kind: "pin" | "analog" | "serial" | "param" | "fault" | "control";
  target: string;
  value: unknown;
}

/** Stamped with `now` and the next `seq` by `Orchestrator.inject`. */
export interface HostInput {
  kind: InputEntry["kind"];
  target: string;
  value: unknown;
}

export interface EngineSnapshot {
  engine: string;
  engineVersion: string;
  schema: number;
  data: unknown | Uint8Array;
}

export interface SimNetlist {
  version: 1;
  docHash: string;
  nets: { id: string; name?: string }[];
  ground: string;
  parts: SimPart[];
  settings: SimSettings;
}

export interface SimPart {
  id: string;
  descriptor: string;
  params: Record<string, number | string | boolean>;
  pins: Record<string, string | null>;
  kind: PartKind;
}

export type PartKind = "board" | "led" | "resistor" | "button" | "buzzer" | "pot" | "display" | "other";

export interface SimSettings {
  seed: number;
  toleranceMode: "nominal";
  analog: { mode: "dc-event"; stepNs: number };
  speed: number;
}

export type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SimEvent {
  at: SimTime;
  phase: Phase;
  rank: number;
  seq: number;
  src: string;
  kind: string;
  payload: unknown;
}

/** Tie-break inside a phase (SIMULATION 5.5). The table is part of the replay record version. */
export const RANK = {
  digital: 10,
  analog: 20,
  mcu: 30,
  ros: 35,
  bus: 40,
  mech: 50,
  flight: 60,
  env: 70,
  faults: 80,
  probe: 90,
} as const;

/** Total order `(at, phase, rank, seq)`. Two distinct events never share a key, so equal keys mean a bug. */
export function compareEvents(a: SimEvent, b: SimEvent): number {
  const d = a.at - b.at || a.phase - b.phase || a.rank - b.rank || a.seq - b.seq;
  if (d === 0 && a !== b) throw new Error(`events ${a.src}/${a.kind} and ${b.src}/${b.kind} share the key (${a.at}, ${a.phase}, ${a.rank}, ${a.seq})`);
  return d;
}

export interface SliceBudget {
  shouldYield(): boolean;
  work: WorkLimits;
}

export interface SliceResult {
  reason: "target" | "budget" | "halted" | "done" | "unsupported";
  now: SimTime;
}

/** How an engine emits an event; the orchestrator assigns `seq`. */
export interface EventSink {
  emit(e: Omit<SimEvent, "seq">): void;
}

/** Payload of a `kind: 'pin'` event that an MCU engine emits at P2 for a pin write. */
export interface PinEventPayload {
  pin: string;
  level: 0 | 1 | "Z";
  duty?: number;
  hz?: number;
}

export interface Engine {
  readonly id: string;
  readonly rank: number;
  /** null when the engine has nothing scheduled. */
  nextDue(): SimTime | null;
  advanceTo(horizon: SimTime, budget: SliceBudget): { reached: SimTime; stoppedEarly: boolean };
  onEvent(e: SimEvent): void;
  /** SIMULATION 6.9: the engine builds a `StateHasher` inside and returns `hex()`. */
  stateHash(): string;
  attach(sink: EventSink): void;
  snapshot?(): EngineSnapshot;
  restore?(s: EngineSnapshot): void;
}

export interface PinPort {
  read(pin: number): { mode: string; level: 0 | 1; duty?: number; hz?: number };
  drive(pin: number, level: 0 | 1 | null): void;
  driveVolts(pin: number, volts: number | null): void;
}

export interface McuEngine extends Engine {
  readonly board: string;
  readonly language: Language;
  readonly tier: "T1" | "T3";
  load(image: ProgramImage): LoadResult;
  reset(reason: "power" | "button" | "brownout" | "watchdog" | "code"): void;
  readonly pins: PinPort;
  serialWrite(text: string, at: SimTime): void;
  readonly costModel: { kind: "per-statement"; opNs: number } | { kind: "cycle"; rate: ClockRate };
}

export interface DigitalLayer {
  load(net: SimNetlist): SimDiagnostic[];
  onPin(pin: string, level: 0 | 1 | "Z", duty: number | undefined, at: SimTime): void;
  partStates(): PartState[];
  stateHash(): string;
}

export type PartState =
  | { part: string; kind: "led"; lit: boolean; brightness: number; provenance: "approximation"; tier: "T0" }
  | { part: string; kind: "buzzer"; on: boolean; hz: number; provenance: "approximation"; tier: "T0" }
  | { part: string; kind: "button"; pressed: boolean }
  | { part: string; kind: "not-modelled"; reason: string };

export interface AnalogHook {
  read(net: string): { modelled: false; reason: "not modelled yet" };
}
