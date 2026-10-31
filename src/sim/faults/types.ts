import type { SimTime } from "../core/clock.ts";
import type { Descriptor } from "../../parts/descriptor.ts";
import type { Evidence } from "../../project/diagnosis.ts";
import type { RobotFacts } from "../mech/facts.ts";
import type { Instrument, Op, Pose } from "../../project/generated/types.ts";

export type { SimTime };

/** A member of CAUSE_IDS, or an extension id that starts with `x-`. */
export type CauseId = string;
/** A symptom id, or an extension id that starts with `x-`. */
export type SymptomId = string;

export interface PinRef {
  part: string;
  pin: string;
}

/** What the solver does for a fault (SIMULATION 13.2). */
export type FaultOp =
  | { kind: "open"; pin: PinRef }
  | { kind: "short"; a: PinRef; b: PinRef; ohms: number }
  | { kind: "swap"; a: PinRef; b: PinRef }
  | { kind: "value"; part: string; param: string; factor: number }
  | { kind: "polarity"; part: string }
  | { kind: "cold-joint"; pin: PinRef; onFraction: number; periodNs: number }
  | { kind: "stuck"; part: string; level: number; pin?: string }
  | { kind: "degrade"; part: string; param: string; perHour: number }
  | { kind: "code-pin"; file: string; line: number; from: number; to: number }
  | {
      kind: "param";
      target: string;
      path: string;
      factor?: number;
      value?: number | string;
    }
  | { kind: "mount"; mount: string; pose: Pose }
  | {
      kind: "sensor";
      sensor: string;
      mode: "dropout" | "stuck" | "bias" | "noise";
      magnitude?: number;
      atNs: SimTime;
      durationNs?: SimTime;
    }
  | { kind: "swap-phase"; motor: string };

export interface FaultState {
  id: string;
  op: FaultOp;
  appliedAt: SimTime;
  causeId: CauseId;
}

export type FaultErrorCode =
  | "unknown-target"
  | "ambiguous-target"
  | "needs-choice"
  | "missing-param"
  | "bad-param"
  | "no-such-line";

export interface FaultError {
  code: FaultErrorCode;
  faultId: string;
  message: string;
}

export type RuleLayer = "static" | "code" | "solved";

/** STUDIO_EDITOR 10.1. */
export interface ProblemTarget {
  kind: "part" | "pin" | "net" | "wire" | "hole" | "file";
  id: string;
  pin?: string;
  line?: number;
  col?: number;
}

type FindingArgs = Record<string, string | number>;

export interface Finding {
  ruleId: string;
  causeId: CauseId;
  symptomId: SymptomId;
  severity: "error" | "warning" | "note";
  targets: ProblemTarget[];
  evidence: Evidence[];
  /** A bare key in the `faults` namespace. */
  messageKey: string;
  args: FindingArgs;
  fixes?: Array<{
    kind: "code" | "wiring" | "value";
    messageKey: string;
    args: FindingArgs;
    ops?: Op[];
  }>;
}

export interface PinInfo {
  part: string;
  pin: string;
  net: string | null;
  type?: string;
  cls?: string;
  polarity?: string;
}

export interface NetView {
  readonly groundNet: string;
  nets(): string[];
  parts(): string[];
  pinsOn(net: string): PinInfo[];
  pin(part: string, pin: string): PinInfo | undefined;
  descriptor(part: string): Descriptor | undefined;
  isBoard(part: string): boolean;
  /** `identity.category` of the part's descriptor. */
  category(part: string): string | undefined;
  netClass(net: string): "power" | "ground" | "signal" | "unknown";
  /** From `power.outputs` of the source part on the net. */
  nominalVolts(net: string): number | undefined;
  /** True when the two parts are joined by wires and internal-short groups only. */
  wireOnly(a: string, b: string): boolean;
  resistorsOn(net: string): PinInfo[];
  /** A setting of the placed part, or the default its descriptor gives. */
  param(part: string, id: string): number | string | boolean | undefined;
}

export interface CodeFact<T> {
  value: T;
  file: string;
  line: number;
  /** Where the number literal behind the value sits in `file`, as a UTF-16 offset and a length. */
  span?: { pos: number; len: number };
}

export interface CodeFacts {
  language: "arduino-cpp" | "unsupported";
  pinModes: CodeFact<{
    pin: string;
    mode: "INPUT" | "OUTPUT" | "INPUT_PULLUP";
  }>[];
  pinWrites: CodeFact<{
    pin: string;
    fn: "digitalWrite" | "analogWrite" | "tone";
  }>[];
  pinReads: CodeFact<{ pin: string; fn: "digitalRead" | "analogRead" }>[];
  wireBegin?: CodeFact<{ sda: string; scl: string }>;
  wireClock?: CodeFact<{ hz: number }>;
  i2cAddresses: CodeFact<{ addr: number }>[];
  serialBegin?: CodeFact<{ baud: number }>;
  /** Calls whose pin argument is not a literal. */
  unresolved: number;
}

export interface RunFacts {
  endNs: SimTime;
  states: {
    at: SimTime;
    part: string;
    pin?: string;
    net?: string;
    state:
      | "burnt"
      | "over-current"
      | "brown-out"
      | "floating-input"
      | "reverse-biased"
      | "sag";
    quantity?: string;
    value?: number;
    unit?: string;
    modelId: string;
    tier: Evidence["tier"];
    provenance: Evidence["provenance"];
  }[];
  node(
    net: string,
    atNs: SimTime,
  ):
    | { v: number; tier: Evidence["tier"]; provenance: Evidence["provenance"] }
    | undefined;
  branch(
    part: string,
    pin: string,
    from: SimTime,
    to: SimTime,
  ):
    | {
        peakA: number;
        avgA: number;
        tier: Evidence["tier"];
        provenance: Evidence["provenance"];
      }
    | undefined;
  pinLevels: Record<string, { at: SimTime; level: 0 | 1 }[]>;
  serial: { at: SimTime; text: string }[];
  bus: {
    at: SimTime;
    bus: string;
    kind: "ack" | "nack" | "stuck-low";
    addr?: number;
  }[];
  resets: SimTime[];
  robot?: RobotFacts;
}

export interface CheckOutcome {
  id: string;
  kind: string;
  ok: boolean;
  detail?: string;
  atMs: number;
  /** The net a `node-voltage` or `supply-current` check reads. */
  net?: string;
}

export interface RuleInput {
  view: NetView;
  code?: CodeFacts;
  run?: RunFacts;
  checks?: CheckOutcome[];
  instruments?: Instrument[];
  skipped: { add(ruleId: string, what: string): void };
}

export interface Rule {
  /** `<layer>:<name>@<major>`. */
  id: string;
  layer: RuleLayer;
  causeId: CauseId;
  symptomId: SymptomId;
  needs: Array<"descriptors" | "code" | "run">;
  enabled: boolean;
  disabledReason?: string;
  check(input: RuleInput): Finding[];
}

export interface HintLevel {
  text: string;
  focus?: { components?: string[]; nets?: string[] };
  probe?: {
    a: string;
    b: string;
    expect?: { min: number; max: number; unit: "V" | "A" | "ohm" };
  };
}

/** EDUCATION 7.1. */
export interface HintLadder {
  levels: [HintLevel, HintLevel, HintLevel];
}
