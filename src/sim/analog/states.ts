import type { Evidence } from "../../project/diagnosis.ts";
import type { SimTime } from "../core/clock.ts";
import { NS_PER_MS } from "../core/clock.ts";
import { inRange, tierRank } from "../registry/tiers.ts";
import type { Registry, Tier } from "../registry/types.ts";
import type { BoardPower } from "./rails.ts";
import type { DeviceState, Element, ElementId, SolveResult } from "./types.ts";

export type HonestKind = "burn-out" | "over-current" | "brown-out" | "floating-input" | "no-convergence" | "not-modelled";

export interface HonestEvidence extends Evidence {
  noteKey?: string;
}

export interface HonestState {
  kind: HonestKind;
  at: SimTime;
  partId?: string;
  net?: string;
  pin?: string;
  deviceState?: DeviceState;
  /** A closed cause id; the diagnosis is built from it later. */
  causeHint?: string;
  evidence: HonestEvidence[];
  messageKey: string;
  messageArgs: Record<string, string | number>;
}

/** One solved component and the elements it was solved from. */
export interface Solved {
  result: SolveResult;
  elements: readonly Element[];
}

export interface StateTracker {
  step(solved: readonly Solved[], at: SimTime): HonestState[];
  /** Ids of the parts that are latched burnt. */
  burnt(): ReadonlySet<string>;
  repair(partId: string): void;
  snapshot(): unknown;
  restore(s: unknown): void;
}

export const FAILURE_IDS = [
  "failure:led-overcurrent@1",
  "failure:diode-overcurrent@1",
  "failure:npn-overheat@1",
  "failure:tmp36-overvoltage@1",
  "failure:pot-track-overpower@1",
  "failure:pin-overcurrent@1",
] as const;

const [LED_FAILURE, DIODE_FAILURE, NPN_FAILURE, TMP36_FAILURE, POT_FAILURE, PIN_FAILURE] = FAILURE_IDS;

const TMP36_MODEL = "model:tmp36.rule@1";
const POT_MODEL = "model:pot.linear@1";
const SOURCE_MODEL = "model:source.thevenin@1";
const BROWNOUT_RULE = "rule:brownout-threshold@1";

const LED_BURN_FACTOR = 2.5;
const NPN_ICMAX_FACTOR = 1.5;
const AMBIENT_C = 25;
const TMP36_REVERSED_VOLTS = -0.5;
const TMP36_REVERSED_NS = 3000 * NS_PER_MS;
const POT_OVERPOWER_NS = 2000 * NS_PER_MS;
const NOTE_OUTSIDE_RANGE = "fidelity.reading.outsideRange";

/** 117.65 with 2 digits gives 120. */
export function roundSig(x: number, digits: number): number {
  if (!Number.isInteger(digits) || digits < 1) throw new RangeError(`roundSig needs at least 1 digit, got ${digits}`);
  return x === 0 || !Number.isFinite(x) ? x : Number(x.toPrecision(digits));
}

/** `LED1:R` and `LED1` both belong to part LED1. */
export const partOf = (elementId: ElementId): string => elementId.split(":")[0];

function lowestTier(reg: Registry, ids: readonly string[]): Tier {
  const tiers = ids.flatMap((id) => reg.get(id)?.tier ?? []);
  return tiers.length === 0 ? "T0" : tiers.reduce((low, t) => (tierRank(t) < tierRank(low) ? t : low));
}

export interface EvidenceInput {
  kind: Evidence["kind"];
  ref: string;
  at: SimTime;
  value: number | string;
  unit?: string;
  /** The quantity name in the model entry's `operatingRange`, when the value is a number it can be checked against. */
  quantity?: string;
  modelId: string;
  failureId: string;
}

/** Computed unless the value lies outside the range the model was checked over (T-B8-03 `inRange`). */
export function evidenceOf(reg: Registry, e: EvidenceInput): HonestEvidence {
  const entry = reg.get(e.modelId);
  const outside = entry && e.quantity !== undefined && typeof e.value === "number" ? inRange(entry, e.quantity, e.value) === false : false;
  const modelIds = [e.modelId, e.failureId].filter((id) => reg.get(id));
  const out: HonestEvidence = {
    kind: e.kind,
    ref: e.ref,
    at: e.at,
    value: e.value,
    provenance: outside ? "approximation" : "computed",
    tier: lowestTier(reg, modelIds),
    modelIds,
  };
  if (e.unit !== undefined) out.unit = e.unit;
  if (outside) out.noteKey = NOTE_OUTSIDE_RANGE;
  return out;
}

const pinName = (elementId: ElementId): string => elementId.slice(elementId.lastIndexOf(":") + 1);

interface TrackerData {
  last: SimTime | null;
  latched: ElementId[];
  over: ElementId[];
  reversedNs: [ElementId, number][];
  hotNs: [ElementId, number][];
}

class Tracker implements StateTracker {
  private readonly latched = new Set<ElementId>();
  private readonly over = new Set<ElementId>();
  private readonly reversedNs = new Map<ElementId, number>();
  private readonly hotNs = new Map<ElementId, number>();
  private last: SimTime | null = null;

  private readonly reg: Registry;

  constructor(reg: Registry) {
    this.reg = reg;
  }

  step(solved: readonly Solved[], at: SimTime): HonestState[] {
    const dt = this.last === null ? 0 : Math.max(0, at - this.last);
    this.last = at;
    const out: HonestState[] = [];
    for (const { result, elements } of solved) {
      for (const el of elements) {
        const b = result.branch[el.id];
        if (b) this.rule(el, b, dt, at, out);
      }
    }
    return out;
  }

  burnt(): ReadonlySet<string> {
    return new Set([...this.latched].map(partOf));
  }

  repair(partId: string): void {
    for (const id of [...this.latched]) if (partOf(id) === partId) this.latched.delete(id);
    for (const map of [this.reversedNs, this.hotNs]) for (const id of [...map.keys()]) if (partOf(id) === partId) map.delete(id);
  }

  snapshot(): TrackerData {
    return { last: this.last, latched: [...this.latched], over: [...this.over], reversedNs: [...this.reversedNs], hotNs: [...this.hotNs] };
  }

  restore(s: unknown): void {
    const data = s as TrackerData;
    this.last = data.last;
    this.latched.clear();
    data.latched.forEach((id) => this.latched.add(id));
    this.over.clear();
    data.over.forEach((id) => this.over.add(id));
    this.reversedNs.clear();
    data.reversedNs.forEach(([id, ns]) => this.reversedNs.set(id, ns));
    this.hotNs.clear();
    data.hotNs.forEach(([id, ns]) => this.hotNs.set(id, ns));
  }

  private rule(el: Element, b: { amps: number; volts: number; watts: number }, dt: number, at: SimTime, out: HonestState[]): void {
    if (el.kind === "PIN" || el.kind === "PWM") {
      this.pin(el, b.amps, at, out);
      return;
    }
    if (this.latched.has(el.id)) return;
    const name = partOf(el.id);
    const current = (modelId: string, failureId: string, amps: number): HonestEvidence =>
      evidenceOf(this.reg, { kind: "branch-current", ref: el.id, at, value: Math.abs(amps), unit: "A", quantity: "current_A", modelId, failureId });

    switch (el.kind) {
      case "D": {
        const led = el.modelId.startsWith("model:led.");
        if (!(led ? b.amps > el.maxAmps * LED_BURN_FACTOR : b.amps > el.maxAmps)) return;
        out.push(
          this.burn(el.id, at, current(el.modelId, led ? LED_FAILURE : DIODE_FAILURE, b.amps), led ? "fidelity.states.led" : "fidelity.states.diode", {
            name,
            n: roundSig(b.amps * 1000, 2),
            ...(led ? { imax: roundSig(el.maxAmps * 1000, 3) } : {}),
          }),
        );
        return;
      }
      case "Q": {
        const r = el.rating;
        if (!r?.icmaxAmps || !r.tjmaxC || !r.thetaCPerW) return;
        const junctionC = AMBIENT_C + r.thetaCPerW * b.watts;
        if (junctionC <= r.tjmaxC && b.amps <= r.icmaxAmps * NPN_ICMAX_FACTOR) return;
        out.push(this.burn(el.id, at, current(el.modelId, NPN_FAILURE, b.amps), "fidelity.states.npn", { name }));
        return;
      }
      case "TS": {
        const reversedNs = b.volts < TMP36_REVERSED_VOLTS ? (this.reversedNs.get(el.id) ?? 0) + dt : 0;
        this.reversedNs.set(el.id, reversedNs);
        const abs = el.rating?.vabsVolts;
        if (!(reversedNs > TMP36_REVERSED_NS || (abs !== undefined && b.volts > abs))) return;
        const ev = evidenceOf(this.reg, { kind: "net-voltage", ref: el.id, at, value: b.volts, unit: "V", quantity: "voltage_V", modelId: TMP36_MODEL, failureId: TMP36_FAILURE });
        out.push(this.burn(el.id, at, ev, "fidelity.states.tmp36", { name }));
        return;
      }
      case "POT": {
        const pmax = el.rating?.pmaxWatts;
        const hotNs = pmax !== undefined && b.watts > pmax ? (this.hotNs.get(el.id) ?? 0) + dt : 0;
        this.hotNs.set(el.id, hotNs);
        if (hotNs <= POT_OVERPOWER_NS) return;
        const ev = evidenceOf(this.reg, { kind: "state", ref: el.id, at, value: b.watts, unit: "W", quantity: "power_W", modelId: POT_MODEL, failureId: POT_FAILURE });
        out.push(this.burn(el.id, at, ev, "fidelity.states.pot", { name, w: roundSig(b.watts, 2) }));
        return;
      }
      default:
        return;
    }
  }

  private burn(id: ElementId, at: SimTime, evidence: HonestEvidence, messageKey: string, messageArgs: Record<string, string | number>): HonestState {
    this.latched.add(id);
    return { kind: "burn-out", at, partId: partOf(id), deviceState: "burnt", evidence: [evidence], messageKey, messageArgs };
  }

  /** Raised on the way above the limit and cleared on the way back. */
  private pin(el: Extract<Element, { kind: "PIN" | "PWM" }>, amps: number, at: SimTime, out: HonestState[]): void {
    const limit = el.maxAmps;
    if (limit === undefined) return;
    const high = Math.abs(amps) > limit;
    if (!high) {
      this.over.delete(el.id);
      return;
    }
    if (this.over.has(el.id)) return;
    this.over.add(el.id);
    const pin = pinName(el.id);
    out.push({
      kind: "over-current",
      at,
      partId: el.id.split(":")[1],
      pin,
      causeHint: "pin-overcurrent",
      evidence: [evidenceOf(this.reg, { kind: "branch-current", ref: el.id, at, value: Math.abs(amps), unit: "A", quantity: "current_A", modelId: SOURCE_MODEL, failureId: PIN_FAILURE })],
      messageKey: "fidelity.states.pin",
      messageArgs: { pin, n: roundSig(Math.abs(amps) * 1000, 2), max: roundSig(limit * 1000, 3) },
    });
  }
}

export function createStateTracker(reg: Registry): StateTracker {
  return new Tracker(reg);
}

export function brownOutState(reg: Registry, power: BoardPower, rail: { net: string; volts: number }, at: SimTime): HonestState {
  return {
    kind: "brown-out",
    at,
    partId: power.boardId,
    net: rail.net,
    causeHint: "brownout",
    evidence: [evidenceOf(reg, { kind: "net-voltage", ref: rail.net, at, value: rail.volts, unit: "V", quantity: "voltage_V", modelId: BROWNOUT_RULE, failureId: BROWNOUT_RULE })],
    messageKey: "fidelity.states.brownout",
    messageArgs: { v: roundSig(rail.volts, 2), min: power.vccMinVolts ?? 0 },
  };
}

/** A board that states no minimum: said once, with no number and no reset. */
export function brownOutUnknownState(boardPartId: string, at: SimTime): HonestState {
  return { kind: "not-modelled", at, partId: boardPartId, evidence: [], messageKey: "fidelity.states.brownoutUnknown", messageArgs: {} };
}

export function notModelledState(partId: string, reason: string, at: SimTime): HonestState {
  return { kind: "not-modelled", at, partId, evidence: [], messageKey: "fidelity.notice.part", messageArgs: { part: partId, reason } };
}

export function floatingInputState(reg: Registry, boardPartId: string, pin: string, net: string, at: SimTime): HonestState {
  return {
    kind: "floating-input",
    at,
    partId: boardPartId,
    net,
    pin,
    causeHint: "floating-input",
    evidence: [{ kind: "pin-level", ref: `${boardPartId}:${pin}`, at, value: "Z", provenance: "computed", tier: lowestTier(reg, [SOURCE_MODEL]), modelIds: [SOURCE_MODEL] }],
    messageKey: "fidelity.states.floating",
    messageArgs: { pin },
  };
}

export function noConvergenceState(reg: Registry, result: SolveResult, net: string | undefined, at: SimTime): HonestState {
  const volts = result.v[result.residual.worstNode] ?? 0;
  const label = net ?? String(result.residual.worstNode);
  return {
    kind: "no-convergence",
    at,
    ...(net === undefined ? {} : { net }),
    evidence: [
      {
        kind: "net-voltage",
        ref: label,
        at,
        value: volts,
        unit: "V",
        provenance: "computed",
        tier: lowestTier(reg, [SOURCE_MODEL]),
        modelIds: [SOURCE_MODEL],
      },
    ],
    messageKey: "fidelity.states.noconv",
    messageArgs: { net: label, v: roundSig(volts, 3), iterations: result.iterations },
  };
}
