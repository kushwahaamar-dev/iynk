import { describe, expect, it } from "vitest";
import { BUDGETS, PackTooLarge, chooseProfile, estimateTokens } from "./budget.ts";

describe("estimateTokens", () => {
  it("grows with the text and with the correction", () => {
    expect(estimateTokens("", 1)).toBe(0);
    let last = 0;
    for (const n of [1, 10, 100, 1000]) {
      const t = estimateTokens("a".repeat(n), 1);
      expect(t).toBeGreaterThanOrEqual(last);
      last = t;
    }
    expect(estimateTokens("a".repeat(350), 1)).toBe(115);
    expect(estimateTokens("a".repeat(350), 2)).toBe(230);
  });

  it("counts bytes, so non-ASCII text is wider", () => {
    expect(estimateTokens("é".repeat(100), 1)).toBeGreaterThan(estimateTokens("e".repeat(100), 1));
  });
});

describe("chooseProfile", () => {
  it("is compact for a model of 16k or less whatever was asked", () => {
    expect(chooseProfile({ contextTokens: 16_000 }, "extended")).toBe("compact");
    expect(chooseProfile({ contextTokens: 8_000 })).toBe("compact");
  });

  it("defaults to standard and gives extended only to a large model", () => {
    expect(chooseProfile({ contextTokens: 32_000 })).toBe("standard");
    expect(chooseProfile({ contextTokens: 32_000 }, "extended")).toBe("standard");
    expect(chooseProfile({ contextTokens: 200_000 }, "extended")).toBe("extended");
    expect(chooseProfile({ contextTokens: 200_000 }, "compact")).toBe("compact");
  });

  it("has the three budgets", () => {
    expect(BUDGETS).toEqual({ compact: 8_000, standard: 24_000, extended: 64_000 });
  });
});

describe("PackTooLarge", () => {
  it("carries the numbers", () => {
    const error = new PackTooLarge(9000, 8000);
    expect(error).toBeInstanceOf(Error);
    expect(error.tokensEst).toBe(9000);
  });
});
