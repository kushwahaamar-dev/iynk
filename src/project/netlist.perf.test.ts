// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Project } from "./generated/types.ts";
import { netlist } from "./netlist.ts";

const examples = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/", import.meta.url);
const ref = (name: string) => ({ ref: name, version: "1.0.0" });

describe("netlist speed", () => {
  it("handles 500 parts and 1,000 nets well inside the ceiling", () => {
    const doc = JSON.parse(readFileSync(new URL("lesson-uno-r3-button.project.json", examples), "utf8")) as Project;
    doc.boards = [];
    doc.dependencies.components = [
      { ref: "t.two", version: "1.0.0", origin: "builtin", interface: { role: "part", pins: ["P1", "P2"].map((id) => ({ id, type: "passive" })), groups: [], params: [] } },
    ];
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
