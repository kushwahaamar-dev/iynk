// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bigProject } from "../project/testing/generators.ts";
import { writeIynk } from "./iynk.ts";

describe("writeIynk speed", () => {
  it("writes 500 parts in under 15 ms", () => {
    const doc = bigProject(500, 500, 3);
    writeIynk(doc);
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      writeIynk(doc);
      return performance.now() - start;
    });
    const ms = Math.min(...times);
    console.log(`writeIynk, 500 parts: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(15);
  });
});
