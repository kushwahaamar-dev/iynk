import type { Descriptor } from "../../parts/descriptor.ts";
import type { Pin } from "../../parts/generated/types.ts";
import { RatingError, ratingValue } from "../models/kinds.ts";
import { type Bit, type LogicModel, type Out, evalLogic } from "../models/logic.ts";

type Family = NonNullable<Pin["logic_family"]>;

export type LogicDiagCode = "logic-no-row" | "logic-input-floating";

/** HYPOTHESIS: typical values for each family, not a datasheet. CMOS families use fractions of the part's supply. */
const TTL = { vil: 0.8, vih: 2.0 };
const CMOS_FRACTION = { vil: 0.3, vih: 0.7 };
const NOMINAL_VOLTS: Partial<Record<Family, number>> = { ttl: 5, "cmos-5v": 5, "lvcmos-3v3": 3.3, "lvcmos-1v8": 1.8 };
const DEFAULT_FAMILY: Family = "cmos-5v";

export interface LogicInput {
  pinId: string;
  netId: string;
  vil: number;
  vih: number;
}

export interface LogicOutput {
  pinId: string;
  netId: string;
}

export interface LogicDrive {
  pinId: string;
  vHighVolts: number;
  rOutOhms: number;
}

export interface LogicPart {
  instanceId: string;
  readonly inputs: readonly LogicInput[];
  readonly outputs: readonly LogicOutput[];
  /** Inputs whose pin is not a digital input; they never read a level. */
  readonly refused: readonly string[];
  model: LogicModel;
  bits: Record<string, Bit>;
  /** What the outputs were last driven to; null before the first evaluation. */
  applied: Record<string, Out> | null;
  pending: { outputs: Record<string, Out>; atNs: number } | null;
  floatingSeen: Set<string>;
  noRowSeen: boolean;
}

/** The part's supply: the first power input's voltage rating, else the family's nominal. */
export function supplyVolts(def: Descriptor, family: Family): number {
  const key = def.power?.inputs?.[0]?.voltage;
  if (key !== undefined) {
    try {
      return ratingValue(def, key);
    } catch (e) {
      if (!(e instanceof RatingError)) throw e;
    }
  }
  return NOMINAL_VOLTS[family] ?? NOMINAL_VOLTS[DEFAULT_FAMILY]!;
}

function thresholds(def: Descriptor, family: Family | undefined): { vil: number; vih: number } | null {
  const f = family ?? DEFAULT_FAMILY;
  if (f === "ttl") return TTL;
  if (f !== "cmos-5v" && f !== "lvcmos-3v3" && f !== "lvcmos-1v8") return null;
  const vdd = supplyVolts(def, f);
  return { vil: CMOS_FRACTION.vil * vdd, vih: CMOS_FRACTION.vih * vdd };
}

/** `nets` maps a pin id to the net it sits on; a pin missing from it is unconnected. */
export function createLogicPart(instanceId: string, def: Descriptor, model: LogicModel, nets: ReadonlyMap<string, string>): LogicPart {
  const pinOf = (id: string): Pin | undefined => def.pins.find((p) => p.id === id);
  const refused: string[] = [];
  const inputs = model.inputs.map((pinId): LogicInput => {
    const limits = thresholds(def, pinOf(pinId)?.logic_family);
    if (limits === null) refused.push(pinId);
    return { pinId, netId: nets.get(pinId) ?? "", vil: limits?.vil ?? NaN, vih: limits?.vih ?? NaN };
  });
  const outputs = model.outputs.flatMap((pinId): LogicOutput[] => {
    const netId = nets.get(pinId);
    return netId === undefined ? [] : [{ pinId, netId }];
  });
  return {
    instanceId,
    inputs,
    outputs,
    refused,
    model,
    bits: Object.fromEntries(model.inputs.map((pinId) => [pinId, 0 as Bit])),
    applied: null,
    pending: null,
    floatingSeen: new Set(),
    noRowSeen: false,
  };
}

/** How each connected output of the part is driven: to the part's supply, through the model's drive resistance. */
export function driveOf(def: Descriptor, p: LogicPart): LogicDrive[] {
  return p.outputs.map((o) => ({
    pinId: o.pinId,
    vHighVolts: supplyVolts(def, def.pins.find((pin) => pin.id === o.pinId)?.logic_family ?? DEFAULT_FAMILY),
    rOutOhms: p.model.driveOhms,
  }));
}

const same = (a: Record<string, Out>, b: Record<string, Out>): boolean => Object.keys(a).every((k) => a[k] === b[k]);

/**
 * Reads the input nets, evaluates the table and schedules the new outputs after the model's delay. A change that
 * arrives while an update is pending replaces it (inertial delay), and a return to the applied outputs cancels it.
 */
export function stepLogic(
  p: LogicPart,
  nowNs: number,
  readV: (netId: string) => number,
  drive: (netId: string, v: number | null, rOhm: number) => void,
  schedule: (atNs: number, fn: () => void) => void,
  diag: (code: LogicDiagCode, detail: string) => void,
): void {
  for (const input of p.inputs) {
    if (p.refused.includes(input.pinId)) continue;
    const volts = readV(input.netId);
    if (volts <= input.vil) p.bits[input.pinId] = 0;
    else if (volts >= input.vih) p.bits[input.pinId] = 1;
    else if (!p.floatingSeen.has(input.pinId)) {
      p.floatingSeen.add(input.pinId);
      diag("logic-input-floating", `${p.instanceId}.${input.pinId}`);
    }
  }
  const { outputs, matchedRow } = evalLogic(p.model, p.bits);
  if (matchedRow < 0 && !p.noRowSeen) {
    p.noRowSeen = true;
    diag("logic-no-row", p.instanceId);
  }
  if (p.applied !== null && same(outputs, p.applied)) {
    p.pending = null;
    return;
  }
  if (p.pending !== null && same(outputs, p.pending.outputs)) return;
  const pending = { outputs, atNs: nowNs + p.model.delayNs };
  p.pending = pending;
  schedule(pending.atNs, () => {
    if (p.pending !== pending) return;
    p.pending = null;
    p.applied = outputs;
    for (const o of p.outputs) {
      const out = outputs[o.pinId];
      drive(o.netId, out === "z" ? null : out, p.model.driveOhms);
    }
  });
}
