// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import type { Rng } from "../core/prng.ts";
import type { Diagnostic } from "../core/result.ts";
import { loadExample } from "./apply/fixtures.testing.ts";
import type { ExampleName } from "./apply/fixtures.testing.ts";
import type { Net, Project, View } from "./generated/types.ts";
import { RULES, changedEntities, checkAll, checkBatch } from "./semantic.ts";
import { entityIndex } from "./semantic.entity.ts";
import { withHoles } from "./semantic.testing.ts";

const BASES: ExampleName[] = ["lesson-uno-r3-button", "uno-blink-d12", "robot-line-follower", "env-monitor-esp32", "drone-quad"];
const BATCH_CODES = new Set(RULES.filter((r) => r.batch).map((r) => r.id));

const pick = <T>(r: Rng, items: readonly T[]): T => items[r.next() % items.length]!;
const replaceAt = <T>(items: readonly T[], at: number, change: (item: T) => T): T[] => items.map((item, i) => (i === at ? change(item) : item));
const index = (r: Rng, items: readonly unknown[]): number => r.next() % items.length;

/** One entity changed, every other entity the same object as before: what `apply` returns. */
type Mutation = (doc: Project, r: Rng) => Project | null;

function inView(doc: Project, r: Rng, pickList: (v: View) => readonly unknown[], change: (v: View, i: number) => View): Project | null {
  const views = doc.views.map((v, i) => [v, i] as const).filter(([v]) => pickList(v).length > 0);
  if (views.length === 0) return null;
  const [view, vi] = pick(r, views);
  const i = index(r, pickList(view));
  return { ...doc, views: replaceAt(doc.views, vi, () => change(view, i)) };
}

const MUTATIONS: Record<string, Mutation> = {
  label: (d, r) => ({ ...d, components: replaceAt(d.components, index(r, d.components), (c) => ({ ...c, label: "moved" })) }),
  refdes: (d, r) =>
    d.components.length < 2 ? null : { ...d, components: replaceAt(d.components, 1 + index(r, d.components.slice(1)), (c) => ({ ...c, refdes: d.components[0]!.refdes })) },
  definition: (d, r) => ({ ...d, components: replaceAt(d.components, index(r, d.components), (c) => ({ ...c, definition: { ...c.definition, version: "9.9.9" } })) }),
  dependency: (d, r) => {
    const at = index(r, d.dependencies.components);
    const dep = d.dependencies.components[at]!;
    const pins = dep.interface.pins.slice(1);
    const components = replaceAt(d.dependencies.components, at, () => ({ ...dep, interface: { ...dep.interface, pins } }));
    return { ...d, dependencies: { ...d.dependencies, components } };
  },
  pinTwice: (d, r) => {
    if (d.nets.length < 2) return null;
    const at = index(r, d.nets);
    const other = d.nets[(at + 1) % d.nets.length]!;
    return { ...d, nets: replaceAt(d.nets, at, (n): Net => ({ ...n, connections: [...n.connections, other.connections[0]!] })) };
  },
  badPin: (d, r) =>
    ({ ...d, nets: replaceAt(d.nets, index(r, d.nets), (n): Net => ({ ...n, connections: [{ ...n.connections[0]!, p: "NOPE" }, ...n.connections.slice(1)] })) }),
  netName: (d, r) => {
    const named = d.nets.filter((n) => n.name !== undefined);
    return named.length < 2 ? null : { ...d, nets: replaceAt(d.nets, d.nets.indexOf(named[1]!), (n) => ({ ...n, name: named[0]!.name })) };
  },
  netId: (d, r) => ({ ...d, nets: replaceAt(d.nets, index(r, d.nets), (n) => ({ ...n, id: d.components[0]!.id as never })) }),
  wireNet: (d, r) =>
    inView(d, r, (v) => v.wires, (v, i) => ({ ...v, wires: replaceAt(v.wires, i, (w) => ({ ...w, net: r.next() % 2 ? "net_ghost" : d.nets[0]!.id })) })),
  wireEnd: (d, r) =>
    inView(d, r, (v) => v.wires, (v, i) => ({ ...v, wires: replaceAt(v.wires, i, (w) => ({ ...w, from: { kind: "pin", c: "brd_uno", p: "D3" } })) })),
  placement: (d, r) =>
    inView(d, r, (v) => v.placements, (v, i) => ({ ...v, placements: replaceAt(v.placements, i, (p) => ({ ...p, c: "cmp_ghost" })) })),
  legs: (d, r) =>
    inView(d, r, (v) => v.placements.filter((p) => p.legs), (v) => {
      const at = v.placements.findIndex((p) => p.legs);
      return { ...v, placements: replaceAt(v.placements, at, (p) => ({ ...p, legs: { ...p.legs, ...Object.fromEntries(Object.keys(p.legs!).map((leg) => [leg, r.next() % 2 ? "z99" : "e8"])) } })) };
    }),
  group: (d, r) =>
    inView(d, r, (v) => v.placements, (v) => ({ ...v, groups: [{ id: "grp_a", members: [v.placements[0]!.c, "cmp_ghost"] }] })),
  sourcePath: (d, r) => ({ ...d, sources: replaceAt(d.sources, index(r, d.sources), (s) => ({ ...s, path: r.next() % 2 ? "nul" : "../x" })) }),
  firmware: (d) => {
    const at = d.boards.findIndex((b) => b.firmware);
    return at < 0 ? null : { ...d, boards: replaceAt(d.boards, at, (b) => ({ ...b, firmware: { ...b.firmware!, entry: "src_ghost" } })) };
  },
  input: (d, r) => {
    const inputs = d.simulation.world.inputs;
    if (inputs.length === 0) return null;
    return { ...d, simulation: { ...d.simulation, world: { ...d.simulation.world, inputs: replaceAt(inputs, index(r, inputs), (i) => ({ ...i, component: "cmp_ghost" })) } } };
  },
  check: (d) => {
    const at = d.tests.findIndex((t) => t.checks.some((c) => "pin" in c));
    if (at < 0) return null;
    const checks = d.tests[at]!.checks.map((c) => ("pin" in c ? { ...c, pin: "D99" } : c)) as Project["tests"][number]["checks"];
    return { ...d, tests: replaceAt(d.tests, at, (t) => ({ ...t, checks })) };
  },
  frame: (d, r) =>
    d.mechanical === undefined ? null : { ...d, mechanical: { ...d.mechanical, frames: replaceAt(d.mechanical.frames, index(r, d.mechanical.frames), (f) => ({ ...f, parent: "frm_ghost" })) } },
  actor: (d) => ({ ...d, access: { ...d.access, owners: ["usr_nobody"] } }),
};

/** The deepest entity a diagnostic's pointer passes through. */
function anchorOf(doc: Project, entities: ReadonlyMap<object, string>, path: string): object | undefined {
  let node: unknown = doc;
  let anchor: object | undefined;
  for (const raw of path.split("/").slice(1)) {
    node = (node as Record<string, unknown> | undefined)?.[raw.replace(/~1/g, "/").replace(/~0/g, "~")];
    if (typeof node === "object" && node !== null && entities.has(node)) anchor = node;
  }
  return anchor;
}

const order = (items: Diagnostic[]) => items.map((d) => JSON.stringify(d)).sort();

describe("checkBatch against checkAll", () => {
  it("equals checkAll restricted to the changed entities on 100 seeded mutations", () => {
    const names = Object.keys(MUTATIONS);
    let reported = 0;
    for (let seed = 0; seed < 100; seed++) {
      const r = rng(seed, "semantic.differential");
      const base = pick(r, BASES);
      const prev = withHoles(loadExample(base));
      let name = pick(r, names);
      let next = MUTATIONS[name]!(prev, r);
      while (next === null) {
        name = pick(r, names);
        next = MUTATIONS[name]!(prev, r);
      }
      const changed = changedEntities(next, prev);
      const entities = entityIndex(next);
      const expected = checkAll(next).filter((d) => BATCH_CODES.has(d.code) && changed.has(anchorOf(next, entities, d.path) ?? prev));
      const actual = checkBatch(next, prev);
      expect(order(actual), `seed ${seed}: ${base} ${name}`).toEqual(order(expected));
      reported += actual.length > 0 ? 1 : 0;
    }
    expect(reported).toBeGreaterThan(60);
  });

  it("finds nothing when nothing changed, and nothing about unchanged entities", () => {
    const doc = loadExample("lesson-uno-r3-button");
    expect(checkBatch(doc, doc)).toEqual([]);
    const next: Project = { ...doc, components: doc.components.map((c, i) => (i === 3 ? { ...c, refdes: doc.components[2]!.refdes } : c)) };
    expect(checkBatch(next, doc).map((d) => d.path)).toEqual(["/components/3/refdes"]);
  });

  it("reports a pin that is in two nets once, on the net that changed", () => {
    const prev = loadExample("lesson-uno-r3-button");
    const next: Project = {
      ...prev,
      nets: prev.nets.map((n) => (n.id === "net_d13" ? { ...n, connections: [...n.connections, { c: "cmp_btn1", p: "P1" }] } : n)),
    };
    expect(checkBatch(next, prev)).toEqual([expect.objectContaining({ code: "V3-PIN-TWICE", path: "/nets/1/connections/2" })]);
    expect(checkAll(next).filter((d) => d.code === "V3-PIN-TWICE")).toHaveLength(2);
  });

  it("checks the instances of a dependency whose interface changed", () => {
    const prev = loadExample("lesson-uno-r3-button");
    const resistor = prev.dependencies.components.find((c) => c.ref === "core.resistor")!;
    const next: Project = {
      ...prev,
      dependencies: {
        ...prev.dependencies,
        components: prev.dependencies.components.map((c) => (c === resistor ? { ...c, interface: { ...c.interface, pins: c.interface.pins.slice(1) } } : c)),
      },
    };
    const codes = checkBatch(next, prev).map((d) => d.code);
    expect(codes).toContain("V3-PIN");
    expect(codes).toContain("V3-LEG");
  });
});
