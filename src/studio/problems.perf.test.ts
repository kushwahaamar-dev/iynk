// @vitest-environment node
import { describe, expect, it } from "vitest";
import { collectProblems } from "./problems.ts";

describe("collectProblems speed", () => {
  it("merges 200 items in under a millisecond", () => {
    const diagnostics = Array.from({ length: 200 }, (_, i) => ({ kind: "compile" as const, message: "m", line: 200 - i, col: 1 }));
    const run = { limit: null, frame: null };
    collectProblems({ diagnostics, run, flags: [] });
    const start = performance.now();
    collectProblems({ diagnostics, run, flags: [] });
    expect(performance.now() - start).toBeLessThan(1);
  });
});
