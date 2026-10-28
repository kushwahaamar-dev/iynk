// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { PinEdge } from "../orchestrator.ts";
import { pinTraceHash } from "./trace.ts";

describe("pinTraceHash speed", () => {
  it("hashes 20,000 edges in under 20 ms", () => {
    const many: PinEdge[] = Array.from({ length: 20_000 }, (_, i) => ({ at: i * 1000, net: "D13", level: (i % 2) as 0 | 1 }));
    pinTraceHash(many);
    const times = Array.from({ length: 5 }, () => {
      const started = performance.now();
      pinTraceHash(many);
      return performance.now() - started;
    });
    expect(Math.min(...times)).toBeLessThan(20);
  });
});
