import type { Evidence } from "../../project/diagnosis.ts";
import type { Finding, SimTime } from "./types.ts";

export interface ReadingLike {
  at: SimTime;
  quantity: "voltage" | "current" | "resistance";
  a: string;
  b?: string;
  value: number;
  unit: string;
  provenance: Evidence["provenance"];
  tier: Evidence["tier"];
  modelIds: string[];
}

const KIND_OF_QUANTITY = {
  voltage: "net-voltage",
  current: "branch-current",
  resistance: "state",
} as const;

export function evidenceFromReading(r: ReadingLike): Evidence {
  return {
    kind: KIND_OF_QUANTITY[r.quantity],
    ref: r.b === undefined ? r.a : `${r.a}:${r.b}`,
    at: Math.round(r.at),
    value: r.value,
    unit: r.unit,
    provenance: r.provenance,
    tier: r.tier,
    modelIds: [...r.modelIds],
  };
}

export function evidenceFromSerial(
  line: { at: SimTime; text: string },
  tier: Evidence["tier"],
): Evidence {
  return {
    kind: "serial-line",
    ref: "serial",
    at: Math.round(line.at),
    value: line.text,
    provenance: "computed",
    tier,
    modelIds: [],
  };
}

export function evidenceFromPin(p: {
  at: SimTime;
  ref: string;
  level: 0 | 1;
  tier: Evidence["tier"];
}): Evidence {
  return {
    kind: "pin-level",
    ref: p.ref,
    at: Math.round(p.at),
    value: p.level,
    provenance: "computed",
    tier: p.tier,
    modelIds: [],
  };
}

export function evidenceFromFinding(f: Finding): Evidence[] {
  return f.evidence.map((e) => ({ ...e, modelIds: [...e.modelIds] }));
}
