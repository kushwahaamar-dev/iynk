// @vitest-environment node
import { describe, expect, it } from "vitest";
import { StateHasher } from "./hash.ts";

describe("StateHasher speed", () => {
  it("hashes a 10 KB object in under a millisecond once warm", () => {
    const state = { cells: Array.from({ length: 600 }, (_, i) => ({ id: `c${i}`, v: i * 0.5, on: i % 2 === 0 })) };
    for (let i = 0; i < 20; i++) new StateHasher().obj(state).hex();
    const ms = Math.min(
      ...Array.from({ length: 5 }, () => {
        const t0 = performance.now();
        new StateHasher().obj(state).hex();
        return performance.now() - t0;
      }),
    );
    console.info(`StateHasher 10 KB object: ${ms.toFixed(3)} ms`);
    expect(ms).toBeLessThan(5);
  });
});
