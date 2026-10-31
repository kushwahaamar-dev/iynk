// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BANNED_WORDS, digestOf, validateDescriptor, versionCompare } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";

const dir = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/", import.meta.url);
const load = (name: string): Descriptor => JSON.parse(readFileSync(new URL(`${name}.component.json`, dir), "utf8"));

// The mutations of schemas/tools/negative.mjs. Each one breaks a valid example and must be refused.
// Loose view: the cases poke fields the generated types would refuse.
type Loose = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const mutations: [name: string, example: string, mutate: (d: Loose) => void][] = [
  ['no license', 'led-5mm', (d) => { delete d.provenance.license; }],
  ['old British spelling of license', 'led-5mm', (d) => { d.provenance.licence = d.provenance.license; delete d.provenance.license; }],
  ['refdes prefix in lower case', 'led-5mm', (d) => { d.identity.refdes_prefix = 'r'; }],
  ['1025 pins', 'led-5mm', (d) => { d.pins = Array.from({ length: 1025 }, (_, i) => ({ ...d.pins[0], id: 'P' + i })); }],
  ['257 groups', 'led-5mm', (d) => { d.groups = Array.from({ length: 257 }, (_, i) => ({ id: 'G' + i, kind: 'strip', pins: ['A', 'K'] })); }],
  ['empty mechanics block', 'led-5mm', (d) => { d.mechanics = {}; }],
  ['motor with neither kv nor ke', 'dc-gear-motor', (d) => { delete d.mechanics.motor.ke_vs_per_rad; }],
  ['motor with a prefixed field name', 'dc-gear-motor', (d) => { d.mechanics.motor.r_mohm = 6000; }],
  ['negative resistance', 'dc-gear-motor', (d) => { d.mechanics.motor.r_ohm = -1; }],
  ['propeller without ct0', 'dc-gear-motor', (d) => { d.mechanics = { prop: { diameter_mm: 127, pitch_mm: 100, cp0: 0.1 } }; }],
  ['battery efficiency above 1 in gear', 'dc-gear-motor', (d) => { d.mechanics.motor.gear.efficiency = 1.2; }],
  ['no fidelity status', 'led-5mm', (d) => { delete d.simulation.status; }],
  ['no fallback renderer', 'led-5mm', (d) => { delete d.visual.fallback; }],
  ['manufacturer slot without a source', 'l298n-module', (d) => { delete d.ratings.vs_abs_max.manufacturer.source; }],
  ['simulation slot without a rationale', 'led-5mm', (d) => { delete d.ratings.forward_current_continuous.simulation.rationale; }],
  ['simulation slot without a confidence', 'led-5mm', (d) => { delete d.ratings.forward_current_continuous.simulation.confidence; }],
  ['measured slot without a method', 'led-5mm', (d) => { d.ratings.forward_current_continuous.measured = { unit: 'A', value: 0.021, source: { src: 'factsheet' }, samples: 3, date: '2026-10-27' }; }],
  ['used_by_model names an empty slot', 'led-5mm', (d) => { d.ratings.forward_current_continuous.used_by_model = 'manufacturer'; }],
  ['rating with no slot at all', 'led-5mm', (d) => { d.ratings.empty = { measure: 'current', role: 'abs_max', used_by_model: 'none' }; }],
  ['prefixed unit (mA)', 'led-5mm', (d) => { d.ratings.forward_current_continuous.simulation.unit = 'mA'; }],
  ['value together with min', 'led-5mm', (d) => { d.ratings.forward_current_continuous.simulation.min = 0.01; }],
  ['non-generic part with no datasheet', 'mpu6050-gy521', (d) => { d.identity.generic = false; d.sources = d.sources.filter((s: Loose) => !['datasheet', 'schematic', 'product-page', 'reseller-guide'].includes(s.kind)); }],
  ['modelled part with no tests', 'led-5mm', (d) => { d.simulation.tests = []; }],
  ['not-modelled-yet with a tier', 'led-5mm', (d) => { d.simulation.status = 'not-modelled-yet'; }],
  ['T3 with no reference test', 'led-5mm', (d) => { d.simulation.tier = 'T3'; d.simulation.tests = d.simulation.tests.filter((t: Loose) => t.kind === 'golden-trace' && false).concat([{ id: 'x', kind: 'property', file: 'a.json' }]); }],
  ['unknown pin type', 'led-5mm', (d) => { d.pins[0].type = 'wiggly'; }],
  ['unknown solver element', 'led-5mm', (d) => { d.behaviour.layers[0].model.element = 'flux-capacitor'; }],
  ['literal model param without rationale', 'l298n-module', (d) => { delete d.behaviour.layers[0].model.params.enable_threshold.rationale; }],
  ['model param with both from_rating and value', 'led-5mm', (d) => { d.behaviour.layers[0].model.params.rd.value = 0.5; }],
  ['enum parameter without values', 'led-5mm', (d) => { delete d.parameters[0].values; }],
  ['number parameter without range', 'led-5mm', (d) => { d.parameters.push({ id: 'r', kind: 'setting', type: 'number', default: 1 }); }],
  ['failure mode without a derivation', 'led-5mm', (d) => { delete d.failure_modes[0].derivation; }],
  ['failure mode without implemented_as', 'led-5mm', (d) => { delete d.failure_modes[0].implemented_as; }],
  ['extension without limits', 'led-5mm', (d) => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: [] } }); }],
  ['extension with a network permission', 'led-5mm', (d) => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: ['net.fetch'], limits: { memory_bytes: 1048576, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['extension with a path that climbs out', 'led-5mm', (d) => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: '../model.js', sha256: 'a'.repeat(64), permissions: [], limits: { memory_bytes: 1048576, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['extension memory above the cap', 'led-5mm', (d) => { d.behaviour.layers.push({ id: 'x', domain: 'digital', model: { kind: 'extension', abi: 'iynk.model/1', entry: 'model.js', sha256: 'a'.repeat(64), permissions: [], limits: { memory_bytes: 1073741824, ops_per_step: 100000, step_wall_ms: 10 } } }); }],
  ['imported part with an executable figure page', 'led-5mm', (d) => { d.provenance.origin = 'imported-pack'; }],
  ['imported part with an html asset', 'led-5mm', (d) => { d.provenance.origin = 'imported-pack'; delete d.visual.breadboard; d.visual.assets = [{ path: 'art/a.html', media_type: 'text/html', sha256: 'b'.repeat(64), license: 'MIT' }]; }],
  ['bad version', 'led-5mm', (d) => { d.version = '1.0'; }],
  ['bad component id', 'led-5mm', (d) => { d.id = 'LED'; }],
  ['unknown top-level field', 'led-5mm', (d) => { d.colour = 'red'; }],
  ['logic rule without required params', 'l298n-module', (d) => { d.compatibility.rules[0].params = {}; }],
  ['pin positioned with a string', 'led-5mm', (d) => { d.pins[0].position.x = '0'; }]
];

describe("validateDescriptor", () => {
  const names = readdirSync(dir).map((f) => f.replace(".component.json", ""));

  it("reads the nine example descriptors", () => {
    expect(names).toHaveLength(9);
  });

  it.each(names)("accepts %s", (name) => {
    expect(validateDescriptor(load(name))).toEqual({ ok: true, diagnostics: [] });
  });

  it.each(mutations)("refuses: %s", (_name, example, mutate) => {
    const d = load(example);
    mutate(d);
    const check = validateDescriptor(d);
    expect(check.ok).toBe(false);
    expect(check.diagnostics.length).toBeGreaterThan(0);
    expect(check.diagnostics.every((x) => x.code === "P-SCHEMA" || /^P-S-\d\d$/.test(x.code))).toBe(true);
  });

  it("points at /visual when the fallback is missing", () => {
    const d = load("led-5mm") as Loose;
    delete d.visual.fallback;
    const check = validateDescriptor(d);
    expect(check.diagnostics.some((x) => x.code === "P-SCHEMA" && x.path === "/visual")).toBe(true);
  });

  it("keeps at most 20 diagnostics", () => {
    const d = load("led-5mm") as Loose;
    d.pins = Array.from({ length: 30 }, () => ({ id: 1 }));
    expect(validateDescriptor(d).diagnostics).toHaveLength(20);
  });

  it("refuses a core part from a person's own files", () => {
    const check = validateDescriptor(load("led-5mm"), { origin: "local-user" });
    expect(check.ok).toBe(false);
    expect(check.diagnostics.map((x) => x.code)).toContain("P-S-15");
  });

  it("accepts a local part with the local origin", () => {
    const d = load("led-5mm") as Loose;
    d.id = "local.my-led";
    d.provenance.origin = "local-user";
    delete d.visual.breadboard;
    d.visual.assets = [{ path: "art/led.svg", media_type: "image/svg+xml", sha256: "b".repeat(64), license: "CC0-1.0" }];
    d.failure_modes.forEach((f: Loose) => { f.cause_id = `x-${f.cause_id}`; f.symptom_ids = f.symptom_ids.map((s: string) => `x-${s}`); });
    d.injectable_faults.forEach((f: Loose) => { f.cause_id = `x-${f.cause_id}`; f.symptom_ids = f.symptom_ids.map((s: string) => `x-${s}`); });
    expect(validateDescriptor(d, { origin: "local-user" })).toEqual({ ok: true, diagnostics: [] });
  });

  it("refuses a file that claims an origin it was not loaded as", () => {
    const d = load("led-5mm");
    expect(validateDescriptor(d, { origin: "imported-pack" }).ok).toBe(false);
  });

  it("refuses an oversize file by the size given or measured", () => {
    expect(validateDescriptor(load("led-5mm"), { bytes: 262_145 }).diagnostics[0]?.code).toBe("P-SIZE");
    const d = load("led-5mm") as Loose;
    d.x_pad = "a".repeat(262_144);
    expect(validateDescriptor(d).diagnostics[0]?.code).toBe("P-SIZE");
    expect(validateDescriptor(load("led-5mm"), { bytes: 262_144 }).ok).toBe(true);
  });

  it("refuses a part made by a newer iynk", () => {
    const d = load("led-5mm") as Loose;
    d.schema = "iynk.component/2";
    const check = validateDescriptor(d);
    expect(check.diagnostics.map((x) => x.code)).toEqual(["P-NEWER"]);
    expect(check.diagnostics[0]?.message).toContain("newer iynk");
  });

  it("refuses values that are not plain JSON", () => {
    expect(validateDescriptor(undefined).ok).toBe(false);
    expect(validateDescriptor({ a: Number.NaN }).diagnostics[0]?.code).toBe("P-SCHEMA");
  });

  it("allows unknown x_ keys", () => {
    const d = load("led-5mm") as Loose;
    d.x_note = { anything: 1 };
    expect(validateDescriptor(d).ok).toBe(true);
  });

  it("refuses a banned word in the copy, in any case", () => {
    expect(BANNED_WORDS.some((word) => word.test("validated"))).toBe(true);
    const d = load("led-5mm") as Loose;
    d.simulation.what_it_models[0].en = "Fully Validated against a bench";
    const check = validateDescriptor(d);
    expect(check.diagnostics.map((x) => x.code)).toEqual(["P-COPY"]);
    expect(check.diagnostics[0]?.path).toBe("/simulation/what_it_models/0/en");
    d.simulation.what_it_models[0].en = "A validated model";
    d.simulation.not_modelled[0].en = "Nothing";
    expect(validateDescriptor(d).diagnostics.map((x) => x.code)).toEqual(["P-COPY"]);
  });
});

describe("digestOf", () => {
  it("does not depend on key order", () => {
    const a = load("led-5mm") as Loose;
    const b = Object.fromEntries(Object.entries(a).reverse()) as Descriptor;
    expect(digestOf(b)).toBe(digestOf(a));
    expect(digestOf(a)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("changes with the content", () => {
    const a = load("led-5mm") as Loose;
    const b = load("led-5mm") as Loose;
    b.identity.model = "other";
    expect(digestOf(b)).not.toBe(digestOf(a));
  });
});

describe("versionCompare", () => {
  it("orders numerically", () => {
    expect(versionCompare("1.10.0", "1.2.0")).toBeGreaterThan(0);
    expect(versionCompare("1.2.0", "1.10.0")).toBeLessThan(0);
    expect(versionCompare("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(versionCompare("1.0.1", "1.0.1")).toBe(0);
  });
});
