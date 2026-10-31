// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildPack, buildPackYielding } from "./pack.ts";
import { packInput, scene } from "./pack.testing.ts";

const RUNS = 50;
const input = () => {
  const doc = scene(500, 1000);
  return packInput({ doc, selection: [doc.components[0]!.id] });
};

describe("pack speed", () => {
  it("builds the 500-part scene inside the ceiling", () => {
    const i = input();
    const times: number[] = [];
    for (let n = 0; n < RUNS; n++) {
      const start = performance.now();
      buildPack(i);
      times.push(performance.now() - start);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(RUNS * 0.95)]!;
    console.info(`pack 500 parts: p95 ${p95.toFixed(1)} ms`);
    expect(p95).toBeLessThan(process.env.PERF_STRICT === "1" ? 20 : 100);
  });

  it("never runs a stretch longer than 50 ms between yields", async () => {
    const i = input();
    let last = performance.now();
    let longest = 0;
    await buildPackYielding(i, async () => {
      const now = performance.now();
      longest = Math.max(longest, now - last);
      last = performance.now();
    });
    longest = Math.max(longest, performance.now() - last);
    console.info(`pack longest stretch: ${longest.toFixed(1)} ms`);
    expect(longest).toBeLessThan(50);
  });
});
