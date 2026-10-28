// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import type { Rng } from "../core/prng.ts";
import type { ComponentDependency, Project } from "./generated/types.ts";
import { netlist, netlistText, nodeOfPin, pinSets } from "./netlist.ts";

const examples = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/", import.meta.url);
const lesson = (): Project =>
  JSON.parse(readFileSync(new URL("lesson-uno-r3-button.project.json", examples), "utf8")) as Project;

const ref = (name: string) => ({ ref: name, version: "1.0.0" });
const part = (name: string, pins: string[], groups: ComponentDependency["interface"]["groups"] = []): ComponentDependency => ({
  ref: name,
  version: "1.0.0",
  origin: "builtin",
  interface: { role: "part", pins: pins.map((id) => ({ id, type: "passive" })), groups, params: [] },
});

function small(): Project {
  const doc = lesson();
  doc.boards = [];
  doc.components = [
    { id: "cmp_a", definition: ref("t.two"), refdes: "A1" },
    { id: "cmp_b", definition: ref("t.two"), refdes: "A2" },
    { id: "cmp_s", definition: ref("t.short"), refdes: "S1" },
  ];
  doc.dependencies.components = [part("t.two", ["P1", "P2"]), part("t.short", ["P1", "P2"], [{ id: "g", kind: "internal-short", pins: ["P1", "P2"] }])];
  doc.nets = [
    { id: "net_x", name: "X", connections: [{ c: "cmp_a", p: "P1" }, { c: "cmp_s", p: "P1" }] },
    { id: "net_y", name: "Y", connections: [{ c: "cmp_b", p: "P1" }, { c: "cmp_s", p: "P2" }] },
  ];
  return doc;
}

describe("netlist of the lesson example", () => {
  const nl = netlist(lesson());

  it("has the five nodes of PDM 11.4", () => {
    expect(nl.nodes.map((n) => n.nets.join("+")).sort()).toEqual(["net_5v", "net_d13", "net_d2", "net_gnd", "net_led1a_res2p2"]);
    expect(nl.diagnostics).toEqual([]);
  });

  it("joins the push button P2 to the 5V node through its group", () => {
    const node = nodeOfPin(nl, "cmp_btn1", "P2");
    expect(node?.nets).toEqual(["net_5v"]);
    expect(node?.pins).toContainEqual({ c: "brd_uno", p: "ICSP_2" });
  });

  it("lists the pins of a node by component then pin", () => {
    const node = nodeOfPin(nl, "brd_uno", "D13")!;
    expect(node.id).toBe("n:brd_uno/D13");
    expect(node.pins.slice(0, 2)).toEqual([{ c: "brd_uno", p: "D13" }, { c: "brd_uno", p: "ICSP_3" }]);
    expect(pinSets(nl)).toHaveLength(5);
  });

  it("finds no node for a pin no net reaches", () => {
    expect(nodeOfPin(nl, "brd_uno", "D7")).toBeUndefined();
  });
});

describe("views are not read", () => {
  it("runs on a document whose views throw", () => {
    const doc = lesson();
    const poisoned = new Proxy(doc, {
      get(target, key, receiver) {
        if (key === "views") throw new Error("views were read");
        return Reflect.get(target, key, receiver);
      },
    });
    expect(netlist(poisoned).nodes).toHaveLength(5);
  });

  function scramble(doc: Project, r: Rng): void {
    for (const view of doc.views as unknown as Record<string, unknown>[]) {
      const placements = (view["placements"] ?? []) as { x_mm: number; y_mm: number }[];
      for (const p of placements) {
        p.x_mm = Math.round(r.float() * 500);
        p.y_mm = Math.round(r.float() * 500);
      }
      placements.sort(() => r.float() - 0.5);
      const wires = (view["wires"] ?? []) as unknown[];
      view["wires"] = wires.filter(() => r.float() < 0.5);
    }
    doc.views.push({ ...doc.views[0]!, id: `vw_${r.next().toString(36)}` });
  }

  it("gives byte-identical text for 1,000 documents with random views", () => {
    const expected = netlistText(netlist(lesson()));
    const r = rng(7, "netlist-views");
    for (let i = 0; i < 1000; i++) {
      const doc = lesson();
      scramble(doc, r);
      expect(netlistText(netlist(doc))).toBe(expected);
    }
  });
});

describe("diagnostics", () => {
  it("warns about two nets joined through a group, and names both", () => {
    const nl = netlist(small());
    expect(nl.nodes).toHaveLength(1);
    expect(nl.nodes[0]!.nets).toEqual(["net_x", "net_y"]);
    expect(nl.nodes[0]!.names).toEqual(["X", "Y"]);
    expect(nl.diagnostics.map((d) => d.code)).toEqual(["NL-JOINED-NETS"]);
    expect(nl.diagnostics[0]!.message).toContain("net_x");
    expect(nl.diagnostics[0]!.message).toContain("net_y");
  });

  it("warns about a net with one pin", () => {
    const doc = small();
    doc.nets.push({ id: "net_z", connections: [{ c: "cmp_a", p: "P2" }] });
    const nl = netlist(doc);
    expect(nl.diagnostics.find((d) => d.code === "NL-SINGLE-PIN")?.path).toBe("/nets/2");
    expect(nodeOfPin(nl, "cmp_a", "P2")?.nets).toEqual(["net_z"]);
  });

  it("warns about an instance with no dependency entry and keeps its pins", () => {
    const doc = small();
    doc.components.push({ id: "cmp_q", definition: ref("t.missing"), refdes: "Q1" });
    doc.nets[0]!.connections.push({ c: "cmp_q", p: "P1" });
    const nl = netlist(doc);
    expect(nl.diagnostics.find((d) => d.code === "NL-UNKNOWN-DEF")?.path).toBe("/components/3");
    expect(nodeOfPin(nl, "cmp_q", "P1")).toBeDefined();
  });

  it("does not use surface strips to join pins", () => {
    const doc = small();
    doc.dependencies.components[0]!.interface.groups = [{ id: "s", kind: "strip", pins: ["P1", "P2"] }];
    doc.nets = [{ id: "net_x", connections: [{ c: "cmp_a", p: "P1" }, { c: "cmp_b", p: "P1" }] }];
    expect(nodeOfPin(netlist(doc), "cmp_a", "P2")).toBeUndefined();
  });
});

describe("order and speed", () => {
  it("does not depend on the order of nets or connections", () => {
    const doc = lesson();
    const flipped = lesson();
    flipped.nets.reverse();
    for (const net of flipped.nets) net.connections.reverse();
    expect(netlistText(netlist(flipped))).toBe(netlistText(netlist(doc)));
  });

  it("handles 500 parts and 1,000 nets well inside the ceiling", () => {
    const doc = small();
    doc.components = Array.from({ length: 500 }, (_, i) => ({ id: `cmp_p${i}`, definition: ref("t.two"), refdes: `R${i}` }));
    doc.nets = Array.from({ length: 1000 }, (_, i) => ({
      id: `net_${i}`,
      connections: [{ c: `cmp_p${i % 500}`, p: i < 500 ? "P1" : "P2" }, { c: `cmp_p${(i + 1) % 500}`, p: i < 500 ? "P2" : "P1" }],
    }));
    let ms = Infinity;
    let nodes = 0;
    for (let run = 0; run < 5; run++) {
      const t0 = performance.now();
      nodes = netlist(doc).nodes.length;
      ms = Math.min(ms, performance.now() - t0);
    }
    console.log(`netlist of 500 parts and 1,000 nets: best of 5 ${ms.toFixed(2)} ms, ${nodes} nodes`);
    expect(ms).toBeLessThan(50);
  });
});
