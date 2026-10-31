import { solve } from "../sim/analog/solve.ts";
import { PWL_OPTIONS } from "../sim/analog/elements.ts";
import type { Element, SolveResult } from "../sim/analog/types.ts";
import type { DeviceContext } from "../sim/devices/register-map.ts";
import { loadDevice } from "../sim/devices/loader.ts";
import { evalLogic } from "../sim/models/logic.ts";
import type { Bit } from "../sim/models/logic.ts";
import { ratingValue, resolveLayers } from "../sim/models/kinds.ts";
import type { ModelEnv, ParamScalar, ResolvedLayer } from "../sim/models/kinds.ts";
import type { Descriptor } from "./descriptor.ts";

type Check = "layers-resolve" | "terminals-are-pins" | "ratings-have-slot" | "logic-rows" | "builtin-binds";

export interface GoldenFixture {
  id: string;
  kind: "golden-trace" | "conformance" | "datasheet-point";
  shape: "series2" | "npn-switch" | "none";
  description: string;
  circuit?: { supply_v: number; series_ohm: number; base_ohm?: number; params?: Record<string, ParamScalar> };
  expect?: {
    quantity: "i_a" | "v_part_v" | "v_collector_v" | "state";
    value: number | string;
    tol: { abs?: number; rel?: number };
  }[];
  checks?: Check[];
  /** For a register-map device: write `write`, then read `read` bytes and compare with `expect`. */
  bind?: { i2c?: { address: number; write: number[]; read: number; expect: number[] } };
  /** Where the expected values come from, so a reader can check them without running anything. */
  derivation: string;
}

export interface GoldenResult {
  ok: boolean;
  got: Record<string, number | string>;
  failures: string[];
}

const GROUND = 0;
const SUPPLY = 1;
const COLLECTOR = 2;
const BASE = 3;
const PART_ID = "part";

const I2C_CONTEXT: DeviceContext = {
  pin: (name) => (name === "CSB" ? "high" : "low"),
  supplyV: () => 3.3,
  nowNs: () => 0,
};

type ElementLayer = Extract<ResolvedLayer, { kind: "element" }>;

function need(layer: ElementLayer, name: string): number {
  const value = layer.params[name];
  if (typeof value !== "number") throw new Error(`the ${layer.element} layer has no number parameter ${name}`);
  return value;
}

function terminal(layer: ElementLayer, ...names: string[]): string {
  for (const name of names) {
    const pin = layer.terminals[name];
    if (pin !== undefined) return pin;
  }
  throw new Error(`the ${layer.element} layer has no ${names[0]} terminal`);
}

function partElements(layer: ElementLayer, shape: "series2" | "npn-switch", nodeOf: (pin: string) => number): Element[] {
  const hold = { id: PART_ID };
  switch (layer.element) {
    case "res":
      return [{ ...hold, kind: "R", a: nodeOf(terminal(layer, "a")), b: nodeOf(terminal(layer, "b")), ohms: need(layer, "ohms") }];
    case "led":
    case "diode":
      return [
        {
          ...hold,
          kind: "D",
          modelId: layer.element,
          a: nodeOf(terminal(layer, "anode")),
          b: nodeOf(terminal(layer, "cathode")),
          vf: need(layer, "vf"),
          rdOhms: need(layer, "rd"),
          maxAmps: need(layer, "imax"),
        },
      ];
    case "npn":
      if (shape !== "npn-switch") throw new Error("an npn layer needs the npn-switch shape");
      return [
        {
          ...hold,
          kind: "Q",
          polarity: "npn",
          modelId: "npn",
          c: nodeOf(terminal(layer, "c", "collector")),
          b: nodeOf(terminal(layer, "b", "base")),
          e: nodeOf(terminal(layer, "e", "emitter")),
          hfe: need(layer, "hfe"),
          hfr: need(layer, "hfr"),
          vbe: need(layer, "vbe"),
          vcesat: need(layer, "vcesat"),
        },
      ];
    default:
      throw new Error(`the golden harness cannot build a ${layer.element} element`);
  }
}

function circuitFor(def: Descriptor, f: GoldenFixture, env: ModelEnv): { result: SolveResult; collector: number } {
  const circuit = f.circuit;
  if (circuit === undefined || f.shape === "none") throw new Error("the fixture has no circuit");
  const { layers } = resolveLayers(def, circuit.params ?? {}, env);
  const resolved = layers.find((l): l is ElementLayer => l.kind === "element");
  if (resolved === undefined) throw new Error(`${def.id} has no layer that resolves to an element`);
  // A placed value (a resistor's ohms) replaces the layer default of the same name.
  const placed = Object.entries(circuit.params ?? {}).filter(([name]) => name in resolved.params);
  const layer: ElementLayer = { ...resolved, params: { ...resolved.params, ...Object.fromEntries(placed) } };

  const shape = f.shape;
  const nodeByPin = new Map<string, number>();
  if (shape === "npn-switch") {
    nodeByPin.set(terminal(layer, "c", "collector"), COLLECTOR);
    nodeByPin.set(terminal(layer, "b", "base"), BASE);
    nodeByPin.set(terminal(layer, "e", "emitter"), GROUND);
  } else {
    const [high, low] = Object.values(layer.terminals);
    nodeByPin.set(high, COLLECTOR);
    nodeByPin.set(low, GROUND);
  }
  const nodeOf = (pin: string): number => nodeByPin.get(pin) ?? GROUND;

  const elements: Element[] = [
    { id: "supply", kind: "V", a: SUPPLY, b: GROUND, volts: circuit.supply_v, rSeriesOhms: 0 },
    { id: "series", kind: "R", a: SUPPLY, b: COLLECTOR, ohms: circuit.series_ohm },
    ...partElements(layer, shape, nodeOf),
  ];
  if (shape === "npn-switch") {
    elements.push({ id: "base", kind: "R", a: SUPPLY, b: BASE, ohms: circuit.base_ohm ?? 0 });
  }
  const nodes = shape === "npn-switch" ? 4 : 3;
  return { result: solve({ nodes, ground: GROUND, elements }, PWL_OPTIONS), collector: COLLECTOR };
}

function quantity(name: NonNullable<GoldenFixture["expect"]>[number]["quantity"], r: SolveResult, collector: number): number | string {
  switch (name) {
    case "i_a":
      return r.branch[PART_ID]?.amps ?? Number.NaN;
    case "v_part_v":
      return r.branch[PART_ID]?.volts ?? Number.NaN;
    case "v_collector_v":
      return r.v[collector] ?? Number.NaN;
    case "state":
      return r.state[PART_ID] ?? "missing";
  }
}

function withinTolerance(got: number, want: number, tol: { abs?: number; rel?: number }): boolean {
  const diff = Math.abs(got - want);
  return diff <= (tol.abs ?? 0) || diff <= (tol.rel ?? 0) * Math.abs(want);
}

function runCircuit(def: Descriptor, f: GoldenFixture, env: ModelEnv, out: GoldenResult): void {
  const { result, collector } = circuitFor(def, f, env);
  if (!result.converged) out.failures.push(`${f.id}: the solver did not converge`);
  for (const e of f.expect ?? []) {
    const got = quantity(e.quantity, result, collector);
    out.got[e.quantity] = got;
    const hit = typeof e.value === "number" && typeof got === "number" ? withinTolerance(got, e.value, e.tol) : got === e.value;
    if (!hit) out.failures.push(`${f.id}: ${e.quantity} is ${String(got)}, want ${String(e.value)}`);
  }
}

function checkLayersResolve(def: Descriptor, env: ModelEnv): string[] {
  return resolveLayers(def, {}, env)
    .layers.filter((l) => l.kind === "none" && l.reason !== "declared")
    .map((l) => `layer ${l.layerId} does not resolve: ${l.kind === "none" ? l.detail : ""}`);
}

function checkTerminals(def: Descriptor): string[] {
  const pins = new Set(def.pins.map((p) => p.id));
  const out: string[] = [];
  for (const layer of def.behaviour.layers) {
    if (layer.model.kind !== "element") continue;
    for (const [name, pin] of Object.entries(layer.model.terminals)) {
      if (pin !== undefined && !pins.has(pin)) out.push(`layer ${layer.id} terminal ${name} names ${pin}, which is not a pin`);
    }
  }
  return out;
}

function checkRatings(def: Descriptor): string[] {
  const out: string[] = [];
  for (const [key, rating] of Object.entries(def.ratings)) {
    if (rating === undefined) continue;
    const slot = rating.used_by_model;
    if (slot === "none") continue;
    if (rating[slot] === undefined) out.push(`rating ${key} is used by the ${slot} slot, which it does not have`);
    else {
      try {
        ratingValue(def, key);
      } catch (e) {
        out.push(e instanceof Error ? e.message : String(e));
      }
    }
  }
  return out;
}

function checkLogicRows(def: Descriptor, env: ModelEnv): string[] {
  const out: string[] = [];
  for (const layer of resolveLayers(def, {}, env).layers) {
    if (layer.kind !== "logic") continue;
    layer.model.rows.forEach((row, index) => {
      const inputs: Record<string, Bit> = {};
      for (const name of layer.model.inputs) inputs[name] = row.when[name] === 1 ? 1 : 0;
      const { outputs, matchedRow } = evalLogic(layer.model, inputs);
      if (matchedRow === -1) return out.push(`layer ${layer.layerId} row ${index} matches no row`);
      for (const [name, want] of Object.entries(row.then)) {
        const shadowed = layer.model.warnings.some((w) => w.shadowedRows.includes(index));
        if (!shadowed && outputs[name] !== want) out.push(`layer ${layer.layerId} row ${index}: ${name} is ${String(outputs[name])}, want ${String(want)}`);
      }
    });
  }
  return out;
}

function checkBuiltinBinds(def: Descriptor, f: GoldenFixture, env: ModelEnv): string[] {
  const builtins = resolveLayers(def, {}, env).layers.filter((l): l is Extract<ResolvedLayer, { kind: "builtin" }> => l.kind === "builtin");
  if (builtins.length === 0) return [`${def.id} has no builtin layer that resolves`];
  const out: string[] = [];
  for (const layer of builtins) {
    const made = layer.impl.make(layer.params);
    if (layer.impl.bind !== "i2c-device") continue;
    const bus = f.bind?.i2c;
    if (bus === undefined) continue;
    const loaded = (made as (ctx: DeviceContext) => ReturnType<typeof loadDevice>)(I2C_CONTEXT);
    if (!loaded.ok) {
      out.push(`${layer.ref}: ${loaded.error}`);
      continue;
    }
    const device = loaded.device;
    device.start(bus.address, false);
    for (const byte of bus.write) device.write(byte);
    device.start(bus.address, true);
    const got = Array.from({ length: bus.read }, (_, i) => device.read(i === bus.read - 1));
    device.stop();
    if (got.join(",") !== bus.expect.join(",")) out.push(`${layer.ref}: read [${got.join(", ")}], want [${bus.expect.join(", ")}]`);
  }
  return out;
}

function runChecks(def: Descriptor, f: GoldenFixture, env: ModelEnv, out: GoldenResult): void {
  for (const check of f.checks ?? []) {
    switch (check) {
      case "layers-resolve":
        out.failures.push(...checkLayersResolve(def, env));
        break;
      case "terminals-are-pins":
        out.failures.push(...checkTerminals(def));
        break;
      case "ratings-have-slot":
        out.failures.push(...checkRatings(def));
        break;
      case "logic-rows":
        out.failures.push(...checkLogicRows(def, env));
        break;
      case "builtin-binds":
        out.failures.push(...checkBuiltinBinds(def, f, env));
        break;
    }
  }
}

/** Runs one fixture against a descriptor. A circuit fixture solves the circuit; a conformance fixture runs its named checks. */
export function runFixture(def: Descriptor, f: GoldenFixture, env: ModelEnv): GoldenResult {
  const out: GoldenResult = { ok: true, got: {}, failures: [] };
  try {
    if (f.shape === "none") runChecks(def, f, env, out);
    else runCircuit(def, f, env, out);
  } catch (e) {
    out.failures.push(`${f.id}: ${e instanceof Error ? e.message : String(e)}`);
  }
  out.ok = out.failures.length === 0;
  return out;
}
