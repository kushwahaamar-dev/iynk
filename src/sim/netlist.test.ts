// @vitest-environment node
import { describe, expect, it } from "vitest";
import { builtinRegistry } from "../parts/builtin.ts";
import type { Descriptor } from "../parts/descriptor.ts";
import type { PartRegistry } from "../parts/registry.ts";
import { loadExample } from "../project/apply/fixtures.testing.ts";
import { stateHash } from "../project/hash.ts";
import { buildSimNetlist } from "./netlist.ts";

const withBreadboard = (): Pick<PartRegistry, "get"> => {
  const builtin = builtinRegistry();
  const led = builtin.get("core.led-5mm", "1.0.0")!;
  const breadboard: Descriptor = { ...led, id: "core.breadboard-half", identity: { ...led.identity, kind: "discrete", tags: ["surface"] } };
  return { get: (ref, version) => (ref === breadboard.id ? breadboard : builtin.get(ref, version)) };
};

describe("buildSimNetlist", () => {
  it("builds three nodes and three parts from the Blink example", () => {
    const doc = loadExample("uno-blink-d12");
    const { net, diagnostics } = buildSimNetlist(doc, builtinRegistry());
    expect(diagnostics).toEqual([]);
    expect(net.nets.map((n) => n.name)).toEqual(["D12", "GND", undefined]);
    expect(net.parts.map((p) => [p.id, p.kind])).toEqual([
      ["brd_uno", "board"],
      ["cmp_led1", "led"],
      ["cmp_res1", "resistor"],
    ]);
    expect(net.ground).toBe(net.nets[1].id);
    expect(net.docHash).toBe(stateHash(doc));
    expect(net.settings.seed).toBe(doc.simulation.seed);
    const led = net.parts[1];
    expect(led.params).toEqual({ color: "red" });
    expect(led.pins).toEqual({ A: net.nets[2].id, K: net.ground });
    expect(net.parts[0].pins.D12).toBe(net.nets[0].id);
    expect(net.parts[0].pins.D2).toBeNull();
  });

  it("omits the breadboard whether or not the registry knows it", () => {
    const doc = loadExample("uno-blink-d12");
    for (const reg of [builtinRegistry(), withBreadboard()]) {
      const { net, diagnostics } = buildSimNetlist(doc, reg);
      expect(net.parts.some((p) => p.id === "cmp_bb1")).toBe(false);
      expect(diagnostics).toEqual([]);
    }
  });

  it("marks a part the registry lacks as unknown", () => {
    const doc = loadExample("uno-blink-d12");
    const builtin = builtinRegistry();
    const { net, diagnostics } = buildSimNetlist(doc, { get: (ref, v) => (ref === "core.led-5mm" ? undefined : builtin.get(ref, v)) });
    expect(net.parts.find((p) => p.id === "cmp_led1")?.kind).toBe("other");
    expect(diagnostics).toMatchObject([{ id: "unknown-part", ref: { part: "cmp_led1" } }]);
  });

  it("reports a document with no ground net", () => {
    const doc = loadExample("uno-blink-d12");
    for (const n of doc.nets) if (n.class === "ground") n.class = "signal";
    const { net, diagnostics } = buildSimNetlist(doc, builtinRegistry());
    expect(diagnostics.map((d) => d.id)).toEqual(["no-ground"]);
    expect(net.ground).toBe("");
  });

  it("refuses more than 2,000 parts", () => {
    const doc = loadExample("uno-blink-d12");
    const resistor = doc.components.find((c) => c.id === "cmp_res1")!;
    for (let i = 0; i < 2000; i++) doc.components.push({ ...resistor, id: `cmp_x${i}` });
    const { net, diagnostics } = buildSimNetlist(doc, builtinRegistry());
    expect(net.parts).toEqual([]);
    expect(diagnostics).toMatchObject([{ id: "netlist-too-large", severity: "error" }]);
  });
});

describe("buildSimNetlist speed", () => {
  it("handles 500 parts and 1,000 wires quickly", () => {
    const doc = loadExample("uno-blink-d12");
    const resistor = doc.components.find((c) => c.id === "cmp_res1")!;
    for (let i = 0; i < 500; i++) doc.components.push({ ...resistor, id: `cmp_r${i}` });
    for (let i = 0; i < 1000; i++) {
      const part = `cmp_r${i % 500}`;
      doc.nets.push({ id: `net_w${i}`, connections: [{ c: part, p: i < 500 ? "P1" : "P2" }, { c: "brd_uno", p: `D${i % 12}` }] });
    }
    const reg = builtinRegistry();
    const start = performance.now();
    const { net } = buildSimNetlist(doc, reg);
    const ms = performance.now() - start;
    expect(net.parts.length).toBeGreaterThan(500);
    expect(ms).toBeLessThan(250);
  });
});
