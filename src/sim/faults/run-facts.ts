import type { Check } from "../../project/generated/types.ts";
import type { HonestKind, HonestState } from "../analog/states.ts";
import type { SimTime } from "../core/clock.ts";
import type { CheckOutcome, RunFacts } from "./types.ts";

/** One recorded quantity: the value holds from each sample until the next. */
export interface SignalSource {
  t: ArrayLike<number>;
  v: ArrayLike<number>;
  tier: RunFacts["states"][number]["tier"];
  provenance: RunFacts["states"][number]["provenance"] | "not-modelled";
}

/** What a finished run leaves behind: the honest states of the state tracker and the probe traces. */
export interface RunSource {
  endNs: SimTime;
  states: readonly HonestState[];
  voltage(net: string): SignalSource | undefined;
  current(part: string, pin: string): SignalSource | undefined;
  pinLevels?: RunFacts["pinLevels"];
  serial?: RunFacts["serial"];
  bus?: RunFacts["bus"];
  resets?: RunFacts["resets"];
}

const STATE_OF: Partial<Record<HonestKind, RunFacts["states"][number]["state"]>> = {
  "burn-out": "burnt",
  "over-current": "over-current",
  "brown-out": "brown-out",
  "floating-input": "floating-input",
};

/** Index of the last sample at or before `at`, or -1. */
function lastAtOrBefore(t: ArrayLike<number>, at: SimTime): number {
  let lo = 0;
  let hi = t.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (t[mid] <= at) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

const usable = (s: SignalSource | undefined): s is SignalSource & { provenance: "computed" | "approximation" | "mocked" } =>
  s !== undefined && s.provenance !== "not-modelled" && s.t.length > 0;

function stateFact(s: HonestState): RunFacts["states"][number] | undefined {
  const state = STATE_OF[s.kind];
  if (state === undefined || s.partId === undefined) return undefined;
  const numeric = s.evidence.find((e) => typeof e.value === "number");
  const basis = numeric ?? s.evidence[0];
  return {
    at: s.at,
    part: s.partId,
    ...(s.pin === undefined ? {} : { pin: s.pin }),
    ...(s.net === undefined ? {} : { net: s.net }),
    state,
    ...(numeric ? { quantity: numeric.kind, value: numeric.value as number } : {}),
    ...(numeric?.unit === undefined ? {} : { unit: numeric.unit }),
    modelId: basis?.modelIds.find((id) => id.startsWith("failure:")) ?? basis?.modelIds[0] ?? "",
    tier: basis?.tier ?? "T0",
    provenance: basis?.provenance ?? "approximation",
  };
}

/** The only place that names the fields of the state tracker and the probe tap. */
export function runFactsFrom(src: RunSource): RunFacts {
  return {
    endNs: src.endNs,
    states: src.states.flatMap((s) => stateFact(s) ?? []),
    node(net, atNs) {
      const s = src.voltage(net);
      if (!usable(s)) return undefined;
      const i = lastAtOrBefore(s.t, atNs);
      return i < 0 ? undefined : { v: s.v[i], tier: s.tier, provenance: s.provenance };
    },
    branch(part, pin, from, to) {
      const s = src.current(part, pin);
      if (!usable(s) || to < from) return undefined;
      const lead = lastAtOrBefore(s.t, from);
      if (lead < 0 && s.t[0] > to) return undefined;
      let peak = 0;
      let area = 0;
      for (let i = Math.max(lead, 0); i < s.t.length && s.t[i] <= to; i++) {
        const start = Math.max(s.t[i], from);
        const end = i + 1 < s.t.length ? Math.min(s.t[i + 1], to) : to;
        const amps = Math.abs(s.v[i]);
        peak = Math.max(peak, amps);
        area += amps * Math.max(0, end - start);
      }
      const avg = to === from ? Math.abs(s.v[Math.max(lead, 0)]) : area / (to - from);
      return { peakA: peak, avgA: avg, tier: s.tier, provenance: s.provenance };
    },
    pinLevels: src.pinLevels ?? {},
    serial: src.serial ?? [],
    bus: src.bus ?? [],
    resets: src.resets ?? [],
  };
}

const NET_CHECKS: readonly Check["kind"][] = ["node-voltage", "supply-current"];

/** `result` is the `CheckResult` of `evaluateCheck`; only its shape is used, so the portable build does not load the interpreter. */
export function checkOutcomes(results: { check: Check; result: { ok: boolean; detail?: string } }[]): CheckOutcome[] {
  return results.map(({ check, result }) => ({
    id: check.id,
    kind: check.kind,
    ok: result.ok,
    ...(result.detail === undefined ? {} : { detail: result.detail }),
    atMs: "atMs" in check ? check.atMs : 0,
    ...(NET_CHECKS.includes(check.kind) && "net" in check ? { net: check.net } : {}),
  }));
}
