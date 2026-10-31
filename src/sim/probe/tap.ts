import type { SimTime } from "../core/clock.ts";
import { StateHasher } from "../core/hash.ts";
import { type Engine, type EventSink, RANK, type SimEvent } from "../engine.ts";
import type { LiveAnalog } from "../analog/live.ts";
import { partOf } from "../analog/states.ts";
import { type Tol, type ToleranceMode, band, hasTolerance, seededParams, toleranceStreams } from "../analog/tolerance.ts";
import type { DeviceState, SolveResult } from "../analog/types.ts";
import type { Registry, Tier } from "../registry/types.ts";
import { provenanceFor } from "./provenance.ts";
import { createRing, type Ring } from "./ring.ts";

export type Provenance = "computed" | "approximation" | "mocked" | "not-modelled";

export interface Reading {
  value: number | string | boolean | null;
  unit?: string;
  at: SimTime;
  provenance: Provenance;
  tier: Tier;
  modelIds: string[];
  band?: [number, number];
  conditions?: string;
  noteKey?: string;
}

export interface ProbeSpec {
  id: string;
  kind: "voltage" | "current" | "power" | "pin" | "bus" | "serial" | "variable" | "event" | "body" | "state";
  /** A net for `voltage`, a board pin element for `pin`, `<net>|<element>` for `current` and `power`. */
  target: string;
  sampleNs?: number;
  capacity: number;
  envelope: boolean;
}

export interface ProbeHandle {
  id: string;
  error?: "unknown-target" | "too-many-probes";
}

export interface TraceChunk {
  id: string;
  from: SimTime;
  to: SimTime;
  t: Float64Array;
  v: Float64Array;
  min?: Float64Array;
  max?: Float64Array;
  dropped: number;
  /** The value holds between events; there is no waveform to draw between points. */
  staircase: boolean;
}

export interface ProbeTap {
  add(p: ProbeSpec): ProbeHandle;
  read(h: ProbeHandle): Reading;
  stream(h: ProbeHandle, from: SimTime): TraceChunk;
  remove(h: ProbeHandle): void;
}

export interface ProbeTapDeps {
  analog: Pick<LiveAnalog, "netVolts" | "pinVolts" | "componentResult" | "nodeIndex" | "whatIf">;
  registry: Registry;
  modelOf(partId: string): string[];
  /** Read when a reading is asked for, so a mode change shows at once. */
  tolerance?: () => ToleranceSetup;
}

export interface ToleranceSetup {
  mode: ToleranceMode;
  seed: number;
  /** Every part that could carry a tolerance, by element id. */
  parts: Record<string, Tol>;
}

export const MAX_PROBES = 64;
export const PROBE_ENGINE_ID = "engine:probe-tap";
const SOLVER_ID = "engine:mna-dc-pwl@1.0.0";
const NET_SEPARATOR = "|";
const NO_RESULT = "no result";
const BAND_KEY = { corners: "instruments.band.corners", "monte-carlo": "instruments.band.monteCarlo" } as const;
const NO_TOLERANCE_KEY = "instruments.band.noTolerance";

interface Source {
  value: number | null;
  unit: string;
  modelIds: string[];
  states: Record<string, DeviceState>;
  quantities: Record<string, number>;
}

interface Spread {
  result: SolveResult;
  mode: ToleranceMode;
  seed: number;
  value?: number;
  band?: [number, number];
  conditions: string;
}

interface Probe {
  spec: ProbeSpec;
  ring: Ring;
  nextSample: SimTime | null;
  last: number | null;
  spread?: Spread;
}

const hasSource = (kind: ProbeSpec["kind"]): boolean => kind === "voltage" || kind === "current" || kind === "power" || kind === "pin";

class Tap implements ProbeTap, Engine {
  readonly id = PROBE_ENGINE_ID;
  readonly rank = RANK.probe;
  private readonly probes = new Map<string, Probe>();
  private horizon: SimTime = 0;

  private readonly d: ProbeTapDeps;

  constructor(d: ProbeTapDeps) {
    this.d = d;
  }

  add(p: ProbeSpec): ProbeHandle {
    if (this.probes.size >= MAX_PROBES) return { id: p.id, error: "too-many-probes" };
    const paired = p.kind === "current" || p.kind === "power";
    if (this.probes.has(p.id) || p.target === "" || (paired && !p.target.includes(NET_SEPARATOR))) return { id: p.id, error: "unknown-target" };
    this.probes.set(p.id, { spec: p, ring: createRing(p.capacity, p.envelope), nextSample: p.sampleNs === undefined ? null : this.horizon + p.sampleNs, last: null });
    return { id: p.id };
  }

  read(h: ProbeHandle): Reading {
    const probe = this.probes.get(h.id);
    if (!probe) return this.notModelled([], "unknown probe");
    const source = this.source(probe.spec);
    if (!source) return this.notModelled([], hasSource(probe.spec.kind) ? NO_RESULT : "no source");
    if (source.value === null) return this.notModelled(source.modelIds, NO_RESULT);
    const { provenance, tier, noteKey } = provenanceFor(source.modelIds, source, this.d.registry);
    if (provenance === "not-modelled") return { value: null, at: this.horizon, provenance, tier, modelIds: source.modelIds, noteKey };
    const reading: Reading = { value: source.value, unit: source.unit, at: this.horizon, provenance, tier, modelIds: source.modelIds, ...(noteKey ? { noteKey } : {}) };
    const spread = this.spreadOf(probe);
    if (!spread) return reading;
    return { ...reading, value: spread.value ?? reading.value, ...(spread.band ? { band: spread.band } : {}), conditions: spread.conditions };
  }

  stream(h: ProbeHandle, from: SimTime): TraceChunk {
    const probe = this.probes.get(h.id);
    if (!probe) return { id: h.id, from, to: from, t: new Float64Array(0), v: new Float64Array(0), dropped: 0, staircase: true };
    return { ...probe.ring.slice(from, this.horizon, Math.max(1, probe.ring.length)), id: h.id, staircase: true };
  }

  remove(h: ProbeHandle): void {
    this.probes.delete(h.id);
  }

  nextDue(): SimTime | null {
    let due: SimTime | null = null;
    for (const p of this.probes.values()) if (p.nextSample !== null && (due === null || p.nextSample < due)) due = p.nextSample;
    return due;
  }

  /** The solver holds its values between events, so what it shows now is what held at every sample time up to `horizon`. */
  advanceTo(horizon: SimTime): { reached: SimTime; stoppedEarly: boolean } {
    for (const p of this.probes.values()) {
      const value = this.source(p.spec)?.value ?? null;
      if (p.spec.sampleNs === undefined) {
        if (value !== null && value !== p.last) p.ring.push(this.horizon, value);
      } else if (p.nextSample !== null) {
        for (; p.nextSample <= horizon; p.nextSample += p.spec.sampleNs) if (value !== null) p.ring.push(p.nextSample, value);
      }
      p.last = value;
    }
    this.horizon = Math.max(this.horizon, horizon);
    return { reached: horizon, stoppedEarly: false };
  }

  onEvent(_e: SimEvent): void {}

  attach(_sink: EventSink): void {}

  /** Observers never change state, so every tap hashes alike. */
  stateHash(): string {
    return new StateHasher().hex();
  }

  /** Computed when asked and kept until the component re-solves, the mode or the seed changes. */
  private spreadOf(probe: Probe): Spread | null {
    const setup = this.d.tolerance?.();
    const { kind, target } = probe.spec;
    if (!setup || setup.mode === "nominal" || kind === "pin" || !hasSource(kind)) return null;
    const [net, element] = target.split(NET_SEPARATOR);
    const result = this.d.analog.componentResult(net);
    if (!result?.converged) return null;
    const cached = probe.spread;
    if (cached && cached.result === result && cached.mode === setup.mode && cached.seed === setup.seed) return cached;
    const inside = Object.entries(setup.parts).filter(([id]) => id in result.branch);
    const parts = Object.fromEntries(inside.filter(([, t]) => hasTolerance(t)));
    const pick = this.picker(kind, net, element);
    const seeded = setup.mode === "seeded";
    const drawn = seeded ? this.d.analog.whatIf({ params: seededParams(parts, setup.seed, toleranceStreams(setup.seed)) }) : null;
    const spread = band(this.d.analog, pick, parts, setup.seed, seeded);
    const notes = [spread ? `${BAND_KEY[spread.method]}:${spread.draws}` : null, inside.length > Object.keys(parts).length ? NO_TOLERANCE_KEY : null];
    const next: Spread = {
      result,
      mode: setup.mode,
      seed: setup.seed,
      ...(drawn?.converged ? { value: pick(drawn) } : {}),
      ...(spread ? { band: spread.band } : {}),
      conditions: notes.filter((n) => n !== null).join(" "),
    };
    probe.spread = next;
    return next;
  }

  private picker(kind: ProbeSpec["kind"], net: string, element: string): (r: SolveResult) => number {
    if (kind === "voltage") {
      const node = this.d.analog.nodeIndex(net) ?? 0;
      return (r) => r.v[node];
    }
    return (r) => r.branch[element]?.[kind === "current" ? "amps" : "watts"] ?? 0;
  }

  private notModelled(modelIds: string[], conditions: string): Reading {
    return { value: null, at: this.horizon, provenance: "not-modelled", tier: "T0", modelIds, conditions, noteKey: "fidelity.reading.notModelled" };
  }

  private source(spec: ProbeSpec): Source | null {
    const { analog, modelOf } = this.d;
    switch (spec.kind) {
      case "voltage": {
        const value = analog.netVolts(spec.target);
        return { value, unit: "V", modelIds: [SOLVER_ID], states: {}, quantities: value === null ? {} : { voltage_V: value } };
      }
      case "pin": {
        const value = analog.pinVolts(spec.target);
        return { value, unit: "V", modelIds: modelOf(partOf(spec.target)), states: {}, quantities: value === null ? {} : { voltage_V: value } };
      }
      case "current":
      case "power": {
        const [net, element] = spec.target.split(NET_SEPARATOR);
        const result = analog.componentResult(net);
        const branch = result?.converged ? result.branch[element] : undefined;
        const modelIds = modelOf(partOf(element));
        if (!result || !branch) return { value: null, unit: "", modelIds, states: {}, quantities: {} };
        const states = result.state[element] ? { [element]: result.state[element] } : {};
        const quantities = { current_A: Math.abs(branch.amps), voltage_V: Math.abs(branch.volts) };
        return spec.kind === "current" ? { value: branch.amps, unit: "A", modelIds, states, quantities } : { value: branch.watts, unit: "W", modelIds, states, quantities };
      }
      default:
        return null;
    }
  }
}

export function createProbeTap(deps: ProbeTapDeps): ProbeTap & Engine {
  return new Tap(deps);
}
