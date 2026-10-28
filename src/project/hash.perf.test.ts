// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { utf8Length } from "../core/canonical.ts";
import type { Project } from "./generated/types.ts";
import { stateHash } from "./hash.ts";
import { toCanonicalText } from "./normalize.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");

describe("stateHash speed", () => {
  it("hashes the monitor and 500 parts with 1,000 nets within budget", () => {
    const doc = JSON.parse(readFileSync(join(dir, "lesson-uno-r3-button.project.json"), "utf8")) as Project;
    for (let i = 0; i < 500; i++) {
      doc.components.push({ id: `cmp_r${i}`, definition: { ref: "core.resistor", version: "1.0.0" }, refdes: `R${i}`, params: { ohms: 220 } });
    }
    for (let i = 0; i < 1000; i++) {
      doc.nets.push({ id: `net_r${i}`, connections: [{ c: `cmp_r${i % 500}`, p: "1" }, { c: `cmp_r${(i + 1) % 500}`, p: "2" }] });
    }
    stateHash(doc);
    const times: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      stateHash(doc);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const median = times[10];
    console.log(`stateHash, 500 parts and 1,000 nets (${utf8Length(toCanonicalText(doc))} bytes): median ${median.toFixed(1)} ms`);
    expect(median).toBeLessThan(100);
  });
});
