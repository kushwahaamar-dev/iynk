import type { Instrument } from "../../project/generated/types.ts";
import type { ElementId, ElementR } from "../analog/types.ts";
import type { LiveAnalog, NetId } from "../analog/live.ts";
import { tierRank } from "../registry/tiers.ts";
import type { Provenance, ProbeTap, ProbeSpec, Reading } from "./tap.ts";

export type MeterMode = "dc-volts" | "dc-amps" | "resistance" | "continuity";

export interface MeterSettings {
  mode: MeterMode;
  loading: boolean;
  burdenOhms: number;
}

/** Where the two probes sit. `element` is the component an ammeter reads through. */
export interface MeterProbes {
  red: NetId | null;
  black: NetId | null;
  element: ElementId | null;
}

type MeterLive = Pick<LiveAnalog, "whatIf" | "nodeIndex">;
type Basis = Pick<Reading, "at" | "tier" | "modelIds">;

export const METER_MODES: readonly MeterMode[] = ["dc-volts", "dc-amps", "resistance", "continuity"];
export const DEFAULT_CONTINUITY_OHMS = 50;
export const MAX_BURDEN_OHMS = 1e6;
export const LOADING_OHMS = 10e6;
export const COND = {
  ideal: "instruments.meter.cond.ideal",
  powerOff: "instruments.meter.cond.powerOff",
  loaded: "instruments.meter.cond.loaded",
} as const;

const TEST_VOLTS = 0.01;
const OPEN_OHMS = 1e9;
const NOT_MODELLED_KEY = "fidelity.reading.notModelled";

export function meterSettings(spec: Pick<Instrument, "settings">): MeterSettings {
  const s = (spec.settings ?? {}) as Record<string, unknown>;
  const burden = typeof s.burdenOhms === "number" && Number.isFinite(s.burdenOhms) ? s.burdenOhms : 0;
  return {
    mode: METER_MODES.find((m) => m === s.mode) ?? "dc-volts",
    loading: s.loading === true,
    burdenOhms: Math.min(MAX_BURDEN_OHMS, Math.max(0, burden)),
  };
}

const notModelled = (basis: Basis | null, conditions?: string): Reading => ({
  value: null,
  at: basis?.at ?? 0,
  provenance: "not-modelled",
  tier: "T0",
  modelIds: basis?.modelIds ?? [],
  noteKey: NOT_MODELLED_KEY,
  ...(conditions ? { conditions } : {}),
});

/** The lowest tier and the weakest provenance of the readings a measurement is made from. */
function basisOf(readings: Reading[]): { basis: Basis; provenance: Provenance } | Reading {
  const missing = readings.find((r) => r.value === null);
  if (missing) return missing;
  const tier = readings.reduce((low, r) => (tierRank(r.tier) < tierRank(low) ? r.tier : low), readings[0].tier);
  const provenance = readings.some((r) => r.provenance === "approximation") ? "approximation" : "computed";
  return { basis: { at: readings[0].at, tier, modelIds: [...new Set(readings.flatMap((r) => r.modelIds))] }, provenance };
}

function sample(tap: ProbeTap, spec: Omit<ProbeSpec, "capacity" | "envelope">): Reading {
  const handle = tap.add({ ...spec, capacity: 1, envelope: false });
  const reading = handle.error ? notModelled(null) : tap.read(handle);
  tap.remove(handle);
  return reading;
}

const joinConditions = (...parts: (string | undefined)[]): string => parts.filter((p) => p).join(" ");

const scaled = (ohms: number): { value: number; unit: string } =>
  ohms >= 1e6 ? { value: ohms / 1e6, unit: "MΩ" } : ohms >= 1e3 ? { value: ohms / 1e3, unit: "kΩ" } : { value: ohms, unit: "Ω" };

/** With power off, rails are shorted and pin sources open; a 10 mV test source between the nodes keeps diodes and LEDs off. */
export function resistanceBetween(live: Pick<LiveAnalog, "whatIf" | "nodeIndex">, a: NetId, b: NetId, basis: Basis): { ohms: number | null; reading: Reading } {
  const na = live.nodeIndex(a);
  const nb = live.nodeIndex(b);
  const base = { at: basis.at, tier: basis.tier, modelIds: basis.modelIds, provenance: "approximation" as const, conditions: COND.powerOff };
  if (na === null || nb === null) return { ohms: null, reading: notModelled(basis) };
  if (na === nb) return { ohms: 0, reading: { ...base, value: 0, unit: "Ω" } };
  const probe = { id: "meter:test", kind: "V" as const, a: na, b: nb, volts: TEST_VOLTS, rSeriesOhms: 0 };
  const result = live.whatIf({ sources: "off", extra: [probe] });
  const amps = result.converged ? result.branch[probe.id]?.amps : undefined;
  if (amps === undefined) return { ohms: null, reading: notModelled(basis, "no result") };
  const ohms = TEST_VOLTS / Math.abs(amps);
  if (!Number.isFinite(ohms) || ohms > OPEN_OHMS) return { ohms: null, reading: { ...base, value: "open" } };
  return { ohms, reading: { ...base, ...scaled(ohms) } };
}

export function continuity(live: MeterLive, a: NetId, b: NetId, basis: Basis, thresholdOhms = DEFAULT_CONTINUITY_OHMS): Reading {
  const { ohms, reading } = resistanceBetween(live, a, b, basis);
  if (reading.value === null) return reading;
  return { ...reading, value: ohms !== null && ohms < thresholdOhms, unit: undefined };
}

function volts(spec: Instrument, tap: ProbeTap, live: MeterLive, s: MeterSettings, { red, black }: MeterProbes): Reading {
  if (red === null || black === null) return notModelled(null);
  const hi = sample(tap, { id: `${spec.id}:red`, kind: "voltage", target: red });
  const lo = sample(tap, { id: `${spec.id}:black`, kind: "voltage", target: black });
  const made = basisOf([hi, lo]);
  if ("value" in made) return made;
  const { basis, provenance } = made;
  const reading: Reading = { ...basis, provenance, unit: "V", value: (hi.value as number) - (lo.value as number), conditions: COND.ideal };
  if (s.loading) {
    const na = live.nodeIndex(red);
    const nb = live.nodeIndex(black);
    const result = na === null || nb === null || na === nb ? null : live.whatIf({ extra: [{ id: "meter:load", kind: "R", a: na, b: nb, ohms: LOADING_OHMS } satisfies ElementR] });
    if (result?.converged && na !== null && nb !== null) return { ...reading, value: result.v[na] - result.v[nb], conditions: COND.loaded };
    return na === nb ? reading : notModelled(basis, "no result");
  }
  const grounded = live.nodeIndex(black) === 0;
  return grounded && hi.band ? { ...reading, value: hi.value as number, band: hi.band, conditions: joinConditions(COND.ideal, hi.conditions) } : reading;
}

/** A series ammeter with a burden changes the loop, which only a resistor's own value can show; any other part reads ideal. */
function amps(spec: Instrument, tap: ProbeTap, live: MeterLive, s: MeterSettings, { red, element }: MeterProbes): Reading {
  if (red === null || element === null) return notModelled(null);
  const ideal = sample(tap, { id: `${spec.id}:amps`, kind: "current", target: `${red}|${element}` });
  if (ideal.value === null) return ideal;
  const asIdeal: Reading = { ...ideal, provenance: "approximation", conditions: COND.ideal };
  if (s.burdenOhms === 0) return asIdeal;
  const before = live.whatIf({});
  const own = before.branch[element];
  if (!before.converged || !own || own.amps === 0 || element in before.state) return asIdeal;
  const after = live.whatIf({ params: { [element]: { ohms: Math.abs(own.volts / own.amps) + s.burdenOhms } } });
  const through = after.converged ? after.branch[element]?.amps : undefined;
  return through === undefined ? asIdeal : { ...ideal, value: through };
}

/** One measurement, on demand: resistance and loading cost a `whatIf` solve, so call this when asked, never per tick. */
export function meterReading(spec: Instrument, tap: ProbeTap, live: MeterLive, settings: MeterSettings, probes: MeterProbes): Reading {
  if (settings.mode === "dc-volts") return volts(spec, tap, live, settings, probes);
  if (settings.mode === "dc-amps") return amps(spec, tap, live, settings, probes);
  const { red, black } = probes;
  if (red === null || black === null) return notModelled(null);
  const made = basisOf([
    sample(tap, { id: `${spec.id}:red`, kind: "voltage", target: red }),
    sample(tap, { id: `${spec.id}:black`, kind: "voltage", target: black }),
  ]);
  if ("value" in made) return made;
  return settings.mode === "resistance" ? resistanceBetween(live, red, black, made.basis).reading : continuity(live, red, black, made.basis);
}
