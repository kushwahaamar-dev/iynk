// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseStrict } from "./strict-json.ts";

describe("parseStrict speed", () => {
  it("parses 1.6 MB within the ceiling", () => {
    const text = JSON.stringify({ items: Array.from({ length: 20000 }, (_, i) => ({ id: `cmp_${i}`, at: [i, i / 7], name: "part" })) });
    const start = performance.now();
    const result = parseStrict(text);
    const ms = performance.now() - start;
    console.info(`parseStrict ${(text.length / 1e6).toFixed(1)} MB: ${ms.toFixed(1)} ms`);
    expect(result.ok).toBe(true);
    expect(ms).toBeLessThan(100);
  });
});
