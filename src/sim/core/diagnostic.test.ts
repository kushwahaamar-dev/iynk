// @vitest-environment node
import { describe, expect, it } from "vitest";
import { simDiag } from "./diagnostic.ts";

describe("simDiag", () => {
  it("fills text_key from the id", () => {
    expect(simDiag("no-convergence", "error", { net: "n1" }, { node: 3 })).toEqual({
      id: "no-convergence",
      severity: "error",
      ref: { net: "n1" },
      text_key: "diag.no-convergence",
      args: { node: 3 },
    });
  });

  it("leaves args out when there are none", () => {
    expect("args" in simDiag("floating-node", "warning", {})).toBe(false);
  });

  it("throws on an id that is not kebab-case or is too long", () => {
    expect(() => simDiag("NoConvergence", "error", {})).toThrow(RangeError);
    expect(() => simDiag("a_b", "error", {})).toThrow(RangeError);
    expect(() => simDiag("-a", "error", {})).toThrow(RangeError);
    expect(() => simDiag("", "error", {})).toThrow(RangeError);
    expect(() => simDiag("a".repeat(65), "error", {})).toThrow(RangeError);
    expect(simDiag("a".repeat(64), "note", {}).id).toHaveLength(64);
  });
});
