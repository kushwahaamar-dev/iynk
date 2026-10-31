// @vitest-environment node
import { describe, expect, it } from "vitest";
import { builtinRegistry } from "../parts/builtin.ts";
import { loadExample } from "../project/apply/fixtures.testing.ts";
import { buildSimNetlist } from "./netlist.ts";

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
