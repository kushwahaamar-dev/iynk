// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Component as Descriptor } from "./generated/types.ts";
import { checkPinRules, groupOfPin, interfaceOf, shortedPins } from "./pins.ts";
import type { InterfaceSnapshot } from "./pins.ts";

const SCHEMAS = "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const descriptors = new Map<string, Descriptor>(
  readdirSync(`${SCHEMAS}/components`)
    .filter((f) => f.endsWith(".component.json"))
    .map((f) => read(`${SCHEMAS}/components/${f}`) as Descriptor)
    .map((d) => [d.id, d]),
);

const pinned = (project: string): Map<string, InterfaceSnapshot> =>
  new Map(
    (read(`${SCHEMAS}/${project}.project.json`).dependencies.components as { ref: string; interface: InterfaceSnapshot }[]).map(
      (c) => [c.ref, c.interface],
    ),
  );

/** Picks the keys the pinned example carries, so the comparison is on what the example states. */
function subset<T extends object>(from: T, like: T): Partial<T> {
  return Object.fromEntries(Object.keys(like).map((k) => [k, from[k as keyof T]])) as Partial<T>;
}

function base(overrides: Partial<Descriptor> = {}): Descriptor {
  return structuredClone({ ...descriptors.get("core.led-5mm")!, ...overrides }) as Descriptor;
}

describe("interfaceOf", () => {
  const lesson = pinned("lesson-uno-r3-button");
  const monitor = pinned("env-monitor-esp32");

  it.each([
    ["core.led-5mm", lesson],
    ["core.resistor", lesson],
    ["core.resistor", monitor],
    ["core.ssd1306", monitor],
    ["core.bme280-module", monitor],
  ])("matches the pinned interface of %s", (ref, project) => {
    const made = interfaceOf(descriptors.get(ref)!);
    const example = project.get(ref)!;
    expect(made.role).toBe(example.role);
    expect(made.pins.map((p, i) => subset(p, example.pins[i]))).toEqual(example.pins);
    expect(made.groups).toEqual(example.groups);
    expect(made.params).toEqual(example.params);
  });

  it("keeps polarity and position, which the descriptor states and the older examples omit", () => {
    expect(interfaceOf(descriptors.get("core.led-5mm")!).pins).toEqual([
      { id: "A", designator: "A", type: "passive", class: "passive", polarity: "anode", position: { x: 0, y: 0 } },
      { id: "K", designator: "K", type: "passive", class: "passive", polarity: "cathode", position: { x: 2.54, y: 0 } },
    ]);
  });

  it("copies groups only when the descriptor has them", () => {
    expect(interfaceOf(descriptors.get("core.led-5mm")!)).not.toHaveProperty("groups");
    expect(interfaceOf(descriptors.get("core.esp32-devkitc")!).groups).toEqual(monitor.get("core.esp32-devkitc")!.groups);
  });

  it("gives every example a role from the table", () => {
    const roles = Object.fromEntries([...descriptors].map(([id, d]) => [id, interfaceOf(d).role]));
    expect(roles).toEqual({
      "core.bme280-module": "part",
      "core.dc-gear-motor": "part",
      "core.esp32-devkitc": "board",
      "core.gy521-mpu6050": "part",
      "core.l298n-module": "part",
      "core.led-5mm": "part",
      "core.resistor": "part",
      "core.ssd1306": "part",
      "core.supply-bench-dc": "part",
    });
  });

  it("marks a part tagged surface as a surface", () => {
    const d = base();
    d.identity.tags = ["surface"];
    expect(interfaceOf(d).role).toBe("surface");
  });

  it("gives an empty snapshot for a part with no parameters or groups", () => {
    const d = base();
    delete d.parameters;
    expect(interfaceOf(d).params).toEqual([]);
  });
});

describe("checkPinRules", () => {
  it("accepts every example", () => {
    for (const d of descriptors.values()) expect(checkPinRules(d)).toEqual([]);
  });

  it("refuses more than 1,024 pins", () => {
    const d = base();
    d.pins = Array.from({ length: 1025 }, (_, i) => ({ ...d.pins[0], id: `P${i}` })) as Descriptor["pins"];
    expect(checkPinRules(d).map((x) => x.code)).toEqual(["P-PIN-COUNT"]);
  });

  it("refuses more than 256 groups and more than 256 pins in a group", () => {
    const d = base();
    d.pins = Array.from({ length: 300 }, (_, i) => ({ ...d.pins[0], id: `P${i}` })) as Descriptor["pins"];
    const ids = d.pins.map((p) => p.id);
    d.groups = [{ id: "big", kind: "strip", pins: ids as unknown as [string, string] }];
    expect(checkPinRules(d).map((x) => x.code)).toEqual(["P-PIN-GROUP-SIZE"]);
    d.groups = Array.from({ length: 257 }, (_, i) => ({ id: `g${i}`, kind: "strip" as const, pins: [ids[0], ids[1]] as [string, string] }));
    expect(checkPinRules(d).map((x) => x.code)).toEqual(["P-PIN-GROUPS"]);
  });

  it("refuses a bad pin id", () => {
    const d = base();
    d.pins[0].id = "1bad";
    expect(checkPinRules(d)).toMatchObject([{ code: "P-PIN-ID", path: "/pins/0/id", severity: "error" }]);
  });

  it("refuses a group that lists a missing pin", () => {
    const d = base();
    d.groups = [{ id: "g", kind: "strip", pins: ["A", "Z"] }];
    expect(checkPinRules(d)).toMatchObject([{ code: "P-PIN-GROUP-PIN", path: "/groups/0/pins/1" }]);
  });

  it("refuses a pin in two internal-short groups but allows it in a strip as well", () => {
    const d = base();
    d.groups = [
      { id: "g1", kind: "internal-short", pins: ["A", "K"] },
      { id: "g2", kind: "internal-short", pins: ["A", "K"] },
    ];
    expect(checkPinRules(d).map((x) => x.code)).toEqual(["P-PIN-SHORT-TWICE", "P-PIN-SHORT-TWICE"]);
    d.groups[1].kind = "strip";
    expect(checkPinRules(d)).toEqual([]);
  });

  it("returns at most 20 findings", () => {
    const d = base();
    d.pins = Array.from({ length: 30 }, (_, i) => ({ ...d.pins[0], id: `${i}x` })) as Descriptor["pins"];
    expect(checkPinRules(d)).toHaveLength(20);
  });
});

describe("groupOfPin and shortedPins", () => {
  const esp = descriptors.get("core.esp32-devkitc")!;

  it("finds the group and the pins it shorts", () => {
    expect(groupOfPin(esp, "J3_1")?.id).toBe("g_GND");
    expect(shortedPins(esp, "J3_1")).toEqual(["GND", "J3_7"]);
  });

  it("answers nothing for a pin in no group", () => {
    expect(groupOfPin(esp, "EN")).toBeUndefined();
    expect(shortedPins(esp, "EN")).toEqual([]);
  });

  it("joins every group the pin is in without repeats", () => {
    const d = base();
    d.groups = [
      { id: "g1", kind: "internal-short", pins: ["A", "K"] },
      { id: "g2", kind: "strip", pins: ["A", "K"] },
    ];
    expect(shortedPins(d, "A")).toEqual(["K"]);
  });
});
