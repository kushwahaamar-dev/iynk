import type { Descriptor } from "../../parts/descriptor.ts";
import type { Evidence } from "../../project/diagnosis.ts";
import { NS_PER_MS } from "../core/clock.ts";
import { evalTrigger, parseTrigger } from "./expr.ts";
import type { Quantities } from "./expr.ts";
import { modelsFor } from "./models.ts";
import type { CheckOutcome, Finding, NetView, PinInfo, Rule, RuleInput, RunFacts, SimTime } from "./types.ts";

type RunState = RunFacts["states"][number];
type Basis = Pick<Evidence, "tier" | "provenance" | "modelIds">;
type Make = Omit<Finding, "ruleId" | "causeId" | "symptomId" | "severity">;

const STEP_NS = 10 * NS_PER_MS;
const SUSTAIN_NS = 50 * NS_PER_MS;
/** Below this an LED gives no visible light. */
const DARK_AMPS = 1e-4;
/** A rail under this reads as collapsed to ground. */
const COLLAPSED_VOLTS = 0.1;
const CHECK_KINDS: readonly string[] = ["node-voltage", "supply-current"];

const milli = (amps: number): number => Number((amps * 1000).toPrecision(12));

const reading = (kind: Evidence["kind"], ref: string, at: SimTime, value: number, unit: string, b: Basis): Evidence => ({
  kind,
  ref,
  at: Math.round(at),
  value,
  unit,
  provenance: b.provenance,
  tier: b.tier,
  modelIds: [...b.modelIds],
});

const basisOf = (s: RunState): Basis => ({ tier: s.tier, provenance: s.provenance, modelIds: s.modelId === "" ? [] : [s.modelId] });

const pinsOfPart = (view: NetView, part: string): PinInfo[] =>
  (view.descriptor(part)?.pins ?? []).flatMap((p) => view.pin(part, p.id) ?? []);

const isLed = (view: NetView, part: string): boolean =>
  view.descriptor(part)?.behaviour.layers.some((l) => l.model.kind === "element" && l.model.element === "led") ?? false;

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

type Rating = NonNullable<Descriptor["ratings"][string]>;

/** The slot of a rating the model reads; a rating no model reads falls back to the printed figure. */
function slotOf(r: Rating): Record<string, unknown> | undefined {
  const slot = r.used_by_model === "none" ? (r.manufacturer ?? r.simulation) : r[r.used_by_model];
  return slot as Record<string, unknown> | undefined;
}

/** The lowest supply voltage the descriptor states for `pin`. */
function minSupplyVolts(d: Descriptor, pin: string): number | undefined {
  for (const r of Object.values(d.ratings)) {
    if (!r || r.measure !== "voltage" || !["recommended", "operating", "abs_min"].includes(r.role) || !r.scope?.pins?.includes(pin)) continue;
    const min = num(slotOf(r)?.min);
    if (min !== undefined) return min;
  }
  return undefined;
}

const ledLimitAmps = (d: Descriptor | undefined): number | undefined => {
  const r = d?.ratings.forward_current_continuous;
  return r === undefined ? undefined : num(slotOf(r)?.value);
};

function quantities(values: Record<string, number>, peaks: Record<string, number>): Quantities {
  return { value: (n) => values[n], peak: (n) => peaks[n], avg: () => undefined };
}

/** False only when the failure model is known, its trigger can be evaluated and it does not hold. */
function triggerRejects(causeId: string, q: Quantities): boolean {
  const model = modelsFor(causeId)[0];
  const trigger = model && parseTrigger(model.trigger);
  return trigger?.ok === true && evalTrigger(trigger.value, q) === false;
}

/** The first time a condition has held for the whole dwell, sampled every 10 ms. */
function sustainedSince(endNs: SimTime, holds: (at: SimTime) => boolean): SimTime | undefined {
  let since: SimTime | undefined;
  for (let at = 0; at < endNs; at += STEP_NS) {
    if (!holds(at)) {
      since = undefined;
      continue;
    }
    since ??= at;
    if (at + STEP_NS - since >= SUSTAIN_NS) return since;
  }
  return undefined;
}

/** Half the highest rail the netlist names: above it a net counts as driven high. */
const highVolts = (view: NetView): number | undefined => {
  const rails = view.nets().flatMap((n) => view.nominalVolts(n) ?? []);
  return rails.length === 0 ? undefined : Math.max(...rails) / 2;
};

function make(
  def: Pick<Rule, "id" | "causeId" | "symptomId">,
  check: (input: RuleInput & { run: RunFacts }, finding: (f: Make) => Finding) => Finding[],
): Rule {
  const finding = (f: Make): Finding => ({ ruleId: def.id, causeId: def.causeId, symptomId: def.symptomId, severity: "error", ...f });
  return {
    ...def,
    layer: "solved",
    needs: ["descriptors", "run"],
    enabled: true,
    check: (input) => (input.run ? check({ ...input, run: input.run }, finding) : []),
  };
}

/** The first state of each part (and pin) that passes `pick`, so a latched burn or a repeated reset is one finding. */
function firstStates(run: RunFacts, pick: (s: RunState) => boolean): RunState[] {
  const seen = new Set<string>();
  return [...run.states]
    .sort((a, b) => a.at - b.at)
    .filter((s) => pick(s) && !seen.has(`${s.part}/${s.pin ?? ""}`) && seen.add(`${s.part}/${s.pin ?? ""}`));
}

const ledOvercurrent = make(
  { id: "solve:led-overcurrent@1", causeId: "led-no-series-resistor", symptomId: "led-burnt" },
  ({ view, run, skipped }, finding) =>
    firstStates(run, (s) => (s.state === "burnt" || s.state === "over-current") && isLed(view, s.part)).flatMap((s) => {
      if (s.value === undefined || s.tier === "T0") {
        skipped.add("solve:led-overcurrent@1", "no-computed-value");
        return [];
      }
      const imax = ledLimitAmps(view.descriptor(s.part));
      if (imax !== undefined && triggerRejects("led-no-series-resistor", quantities({ "rating.imaxAmps": imax }, { i: s.value }))) return [];
      const ma = milli(s.value);
      return finding({
        targets: [{ kind: "part", id: s.part }],
        evidence: [reading("branch-current", `${s.part}:A`, s.at, ma, "mA", basisOf(s))],
        messageKey: "check.led-overcurrent",
        args: { part: s.part, ma },
      });
    }),
);

const pinOvercurrent = make(
  { id: "solve:pin-overcurrent@1", causeId: "pin-overcurrent", symptomId: "pin-overloaded" },
  ({ view, run, skipped }, finding) =>
    firstStates(run, (s) => s.state === "over-current" && s.pin !== undefined && view.isBoard(s.part)).flatMap((s) => {
      if (s.value === undefined || s.tier === "T0") {
        skipped.add("solve:pin-overcurrent@1", "no-computed-value");
        return [];
      }
      const pin = s.pin ?? "";
      const ma = milli(s.value);
      return finding({
        targets: [{ kind: "pin", id: s.part, pin }],
        evidence: [reading("branch-current", `${s.part}:${pin}`, s.at, ma, "mA", basisOf(s))],
        messageKey: "check.pin-overcurrent",
        args: { part: s.part, pin, ma },
      });
    }),
);

const brownout = make(
  { id: "solve:brownout@1", causeId: "brownout", symptomId: "mcu-resets" },
  ({ run, skipped }, finding) =>
    firstStates(run, (s) => s.state === "brown-out").flatMap((s) => {
      const read = s.net === undefined ? undefined : run.node(s.net, s.at);
      if (s.net === undefined || read === undefined || read.tier === "T0") {
        skipped.add("solve:brownout@1", "no-computed-value");
        return [];
      }
      const volts = Number(read.v.toPrecision(12));
      return finding({
        targets: [{ kind: "net", id: s.net }, { kind: "part", id: s.part }],
        evidence: [reading("net-voltage", s.net, s.at, volts, "V", { ...read, modelIds: basisOf(s).modelIds })],
        messageKey: "check.brownout",
        args: { part: s.part, net: s.net, v: volts },
      });
    }),
);

const railCollapse = make(
  { id: "solve:rail-collapse@1", causeId: "supply-shorted-to-ground", symptomId: "supply-collapses" },
  ({ view, run, skipped }, finding) =>
    firstStates(run, (s) => s.state === "sag").flatMap((s) => {
      const pin = pinsOfPart(view, s.part).find((p) => p.cls === "power" && p.net !== null);
      const read = pin?.net == null ? undefined : run.node(pin.net, s.at);
      if (!pin?.net || read === undefined || read.tier === "T0") {
        skipped.add("solve:rail-collapse@1", "no-computed-value");
        return [];
      }
      if (read.v >= COLLAPSED_VOLTS) return [];
      const volts = Number(read.v.toPrecision(12));
      const evidence = [reading("net-voltage", pin.net, s.at, volts, "V", { ...read, modelIds: basisOf(s).modelIds })];
      if (s.value !== undefined && s.unit === "A" && s.tier !== "T0") evidence.unshift(reading("branch-current", `${s.part}:${pin.pin}`, s.at, milli(s.value), "mA", basisOf(s)));
      return finding({
        targets: [{ kind: "net", id: pin.net }, { kind: "pin", id: s.part, pin: pin.pin }],
        evidence,
        messageKey: "check.rail-collapse",
        args: { net: pin.net, part: s.part, v: volts },
      });
    }),
);

const partUndervolt = make(
  { id: "solve:part-undervolt@1", causeId: "part-not-powered", symptomId: "part-dead" },
  ({ view, run, skipped }, finding) => {
    const out: Finding[] = [];
    for (const part of view.parts()) {
      if (view.isBoard(part)) continue;
      const d = view.descriptor(part);
      if (!d) {
        skipped.add("solve:part-undervolt@1", "undescribed-part");
        continue;
      }
      for (const p of pinsOfPart(view, part)) {
        const min = p.cls === "power" && p.type === "power_in" && p.net !== null ? minSupplyVolts(d, p.pin) : undefined;
        if (min === undefined || p.net === null) continue;
        const net = p.net;
        const since = sustainedSince(run.endNs, (at) => (run.node(net, at)?.v ?? Infinity) < min);
        const read = since === undefined ? undefined : run.node(net, since);
        if (since === undefined || read === undefined) continue;
        if (read.tier === "T0") {
          skipped.add("solve:part-undervolt@1", "no-computed-value");
          continue;
        }
        const volts = Number(read.v.toPrecision(12));
        out.push(
          finding({
            targets: [{ kind: "pin", id: part, pin: p.pin }, { kind: "net", id: net }],
            evidence: [reading("net-voltage", net, since, volts, "V", { ...read, modelIds: [] })],
            messageKey: "check.part-undervolt",
            args: { part, pin: p.pin, net, v: volts, min },
          }),
        );
      }
    }
    return out;
  },
);

/** Failing `node-voltage` and `supply-current` checks, each with the number the solver computed at the check's time. */
function failedChecks(input: RuleInput & { run: RunFacts }, view: NetView, finding: (f: Make) => Finding, id: string): Finding[] {
  const failed = (input.checks ?? []).filter((c: CheckOutcome) => !c.ok && CHECK_KINDS.includes(c.kind));
  return failed.flatMap((c) => {
    const at = c.atMs * NS_PER_MS;
    if (c.net === undefined) {
      input.skipped.add(id, "no-net");
      return [];
    }
    const net = c.net;
    if (c.kind === "node-voltage") {
      const read = input.run.node(net, at);
      if (read === undefined || read.tier === "T0") {
        input.skipped.add(id, "no-computed-value");
        return [];
      }
      const volts = Number(read.v.toPrecision(12));
      return finding({
        targets: [{ kind: "net", id: net }],
        evidence: [reading("net-voltage", net, at, volts, "V", { ...read, modelIds: [] })],
        messageKey: "check.value-band",
        args: { check: c.id, net, v: volts },
      });
    }
    for (const p of view.pinsOn(net).filter((q) => q.type === "power_out" || (q.type === "power_io" && view.isBoard(q.part)))) {
      const read = input.run.branch(p.part, p.pin, at, at + STEP_NS);
      if (read === undefined || read.tier === "T0") continue;
      const ma = milli(read.avgA);
      return finding({
        targets: [{ kind: "net", id: net }],
        evidence: [reading("branch-current", `${p.part}:${p.pin}`, at, ma, "mA", { ...read, modelIds: [] })],
        messageKey: "check.value-band",
        args: { check: c.id, net, ma },
      });
    }
    input.skipped.add(id, "no-computed-value");
    return [];
  });
}

/** Windows where an LED carries no usable current while `lit` holds for its nets. */
function darkLeds(
  view: NetView,
  run: RunFacts,
  lit: (anodeVolts: number, cathodeVolts: number, high: number) => boolean,
  skipped: RuleInput["skipped"],
  id: string,
): { part: string; since: SimTime; amps: number; basis: Basis; anode: string; cathode: string }[] {
  const high = highVolts(view);
  if (high === undefined) {
    skipped.add(id, "no-nominal-voltage");
    return [];
  }
  const out: ReturnType<typeof darkLeds> = [];
  for (const part of view.parts().filter((p) => isLed(view, p))) {
    const anode = view.pin(part, "A")?.net;
    const cathode = view.pin(part, "K")?.net;
    if (!anode || !cathode) continue;
    const holds = (at: SimTime): boolean => {
      const a = run.node(anode, at);
      const k = run.node(cathode, at);
      const i = run.branch(part, "A", at, at + STEP_NS);
      return a !== undefined && k !== undefined && i !== undefined && i.peakA < DARK_AMPS && lit(a.v, k.v, high);
    };
    const since = sustainedSince(run.endNs, holds);
    const i = since === undefined ? undefined : run.branch(part, "A", since, since + STEP_NS);
    if (since === undefined || i === undefined) continue;
    if (i.tier === "T0") {
      skipped.add(id, "no-computed-value");
      continue;
    }
    out.push({ part, since, amps: i.peakA, basis: { ...i, modelIds: [] }, anode, cathode });
  }
  return out;
}

const valueBand = make(
  { id: "solve:value-band@1", causeId: "wrong-value", symptomId: "led-dim" },
  (input, finding) => [
    ...failedChecks(input, input.view, finding, "solve:value-band@1"),
    ...darkLeds(input.view, input.run, (a, _k, high) => a > high, input.skipped, "solve:value-band@1").map((d) =>
      finding({
        targets: [{ kind: "part", id: d.part }],
        evidence: [reading("branch-current", `${d.part}:A`, d.since, milli(d.amps), "mA", d.basis)],
        messageKey: "check.value-band",
        args: { part: d.part, ma: milli(d.amps) },
      }),
    ),
  ],
);

const ledReverse = make(
  { id: "solve:led-reverse@1", causeId: "led-reversed", symptomId: "led-dark" },
  ({ view, run, skipped }, finding) =>
    darkLeds(view, run, (a, k, high) => k > high && a < high, skipped, "solve:led-reverse@1").flatMap((d) => {
      const read = run.node(d.cathode, d.since);
      if (read === undefined) return [];
      return finding({
        targets: [{ kind: "part", id: d.part }],
        evidence: [
          reading("net-voltage", d.cathode, d.since, Number(read.v.toPrecision(12)), "V", { ...read, modelIds: [] }),
          reading("branch-current", `${d.part}:A`, d.since, milli(d.amps), "mA", d.basis),
        ],
        messageKey: "check.led-reverse",
        args: { part: d.part, net: d.cathode },
      });
    }),
);

export const SOLVED_RULES: readonly Rule[] = [ledOvercurrent, pinOvercurrent, brownout, railCollapse, partUndervolt, valueBand, ledReverse];
