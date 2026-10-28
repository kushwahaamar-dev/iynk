// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { semanticChecks } from "./semantic.ts";
import type { Descriptor } from "./descriptor.ts";

const load = (name: string): Descriptor =>
  JSON.parse(
    readFileSync(
      new URL(`../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/${name}.component.json`, import.meta.url),
      "utf8",
    ),
  );

// Loose view for the mutations: the cases poke fields the generated types would refuse.
type Loose = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const cases: [rule: string, example: string, mutate: (d: Loose) => void][] = [
  ["S-01", "led-5mm", (d) => { d.groups = [{ id: "g", kind: "strip", pins: ["A", "Z"] }]; }],
  ["S-01", "led-5mm", (d) => { d.pins.push({ ...d.pins[0] }); }],
  ["S-02", "led-5mm", (d) => { d.identity.primary_source = "nope"; }],
  ["S-03", "led-5mm", (d) => { d.ratings.forward_current_continuous.scope = { pins: ["Z"] }; }],
  ["S-04", "led-5mm", (d) => { d.behaviour.layers[0].model.params.rd.from_rating = "nope"; }],
  ["S-05", "led-5mm", (d) => { d.behaviour.layers[0].model.params.rd.pick = "max"; }],
  ["S-06", "led-5mm", (d) => { d.behaviour.layers[0].model.params.rd.unit = "V"; }],
  ["S-07", "led-5mm", (d) => { delete d.behaviour.layers[0].model.params.vf.by_parameter.map[d.parameters[0].values[0]]; }],
  ["S-08", "led-5mm", (d) => { d.behaviour.layers[0].reads = ["nothing"]; }],
  ["S-09", "led-5mm", (d) => { d.failure_modes[0].when[0].target = "nothing"; }],
  ["S-10", "led-5mm", (d) => { d.simulation.solver_requires = []; }],
  ["S-11", "esp32-devkitc", (d) => { d.pins[0].position = { x: -1, y: 0 }; }],
  ["S-13", "led-5mm", (d) => { d.behaviour.layers.push({ id: "x", domain: "digital", model: { kind: "extension", permissions: ["world.read:nothing"] } }); }],
  ["S-14", "led-5mm", (d) => { d.visual.breadboard.legs = ["Z"]; }],
  ["S-17", "led-5mm", (d) => { d.provenance.origin = "local-user"; }],
];

describe("semanticChecks", () => {
  it("finds nothing in the nine examples", () => {
    for (const name of [
      "bme280-module", "dc-gear-motor", "esp32-devkitc", "l298n-module", "led-5mm",
      "mpu6050-gy521", "resistor", "ssd1306", "supply-bench-dc",
    ]) {
      expect(semanticChecks(load(name)), name).toEqual([]);
    }
  });

  it.each(cases)("%s is reported for a broken part and not for the original", (rule, example, mutate) => {
    const code = `P-${rule}`;
    expect(semanticChecks(load(example)).some((x) => x.code === code)).toBe(false);
    const d = load(example);
    mutate(d);
    const hits = semanticChecks(d).filter((x) => x.code === code);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.path.startsWith("/")).toBe(true);
  });

  it("names the group that lost a pin", () => {
    const d = load("led-5mm") as Loose;
    d.groups = [{ id: "bad-group", kind: "strip", pins: ["A", "Z"] }];
    const hit = semanticChecks(d).find((x) => x.code === "P-S-01");
    expect(hit?.message).toContain("bad-group");
    expect(hit?.path).toBe("/groups/0/pins/1");
  });
});
