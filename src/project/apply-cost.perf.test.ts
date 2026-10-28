// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import { bigProject, generateOp } from "./testing/generators.ts";
import { ownerOf, session } from "./testing/harness.ts";

const OPS = 300;
const ROUNDS = 3;
/** A ceiling that a loaded machine stays under. The decision figure, 1 ms, comes from `npm run measure:apply`. */
const P95_CEILING_MS = 10;

const percentile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;

/** Times `OPS` accepted ops on a fresh session and returns the sorted times in ms. */
function round(seed: number): number[] {
  const start = bigProject(500, 1000, 1);
  const live = session(start, 1, 1);
  const author = ownerOf(start);
  const r = rng(seed, "cost");
  const times: number[] = [];
  while (times.length < OPS) {
    const op = generateOp(live.state, r);
    if (!op) continue;
    const from = performance.now();
    const outcome = live.apply(op, author);
    const took = performance.now() - from;
    if (outcome.ok) times.push(took);
  }
  return times.sort((a, b) => a - b);
}

describe("apply cost at 500 parts and 1,000 wires", () => {
  it(`keeps p95 per op under ${P95_CEILING_MS} ms in the best of ${ROUNDS} rounds of ${OPS} generated ops`, () => {
    const start = bigProject(500, 1000, 1);
    expect(start.components).toHaveLength(500);
    expect(start.views[0]!.wires).toHaveLength(1000);

    // The best round, because other work on the machine only ever makes a round slower.
    const rounds = Array.from({ length: ROUNDS }, (_, i) => round(i + 1));
    const p95s = rounds.map((times) => percentile(times, 95));
    const best = rounds[p95s.indexOf(Math.min(...p95s))]!;
    console.info(
      `apply at 500 parts, 1000 wires: p50 ${percentile(best, 50).toFixed(2)} ms, p95 ${percentile(best, 95).toFixed(2)} ms (best of ${ROUNDS} rounds of ${OPS} ops)`,
    );
    expect(percentile(best, 95)).toBeLessThan(P95_CEILING_MS);
  });
});
