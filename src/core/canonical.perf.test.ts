// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canonicalize } from "./canonical.ts";

describe("canonicalize speed", () => {
  it("canonicalises a 340 KB document within the ceiling", () => {
    const doc = { parts: Array.from({ length: 4000 }, (_, i) => ({ id: `cmp_${i}`, at: [i, -i / 3], tags: ["a", "b"] })) };
    const start = performance.now();
    const size = canonicalize(doc).length;
    const ms = performance.now() - start;
    console.info(`canonicalize ${(size / 1000).toFixed(0)} KB: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(100);
  });
});
