// @vitest-environment node
import { describe, expect, it } from "vitest";
import { searchParts } from "./search.ts";
import type { PartEntry } from "./search.ts";

const index: PartEntry[] = Array.from({ length: 200 }, (_, i) => ({
  ref: `core.part-${i}`,
  name: `Résistance ${i} generic module`,
  category: `category-${i % 9}`,
  keywords: ["alpha", "beta", `kw${i}`],
  model: "partly-modelled",
  widthMm: 5,
  heightMm: 5,
}));

describe("searchParts speed", () => {
  it("searches 200 entries inside 2 ms once the names are folded", () => {
    searchParts(index, "resis", "en");
    const start = performance.now();
    searchParts(index, "resistance 12", "en");
    expect(performance.now() - start).toBeLessThan(2);
  });
});
