// @vitest-environment node
import { describe, expect, it } from "vitest";
import { diag, fail, ok } from "./result.ts";
import type { Result } from "./result.ts";

describe("Result", () => {
  it("ok and fail narrow on the ok flag", () => {
    const good: Result<number> = ok(3);
    const bad: Result<number> = fail({ code: "nope", message: "no" });
    if (good.ok) expect(good.value).toBe(3);
    else throw new Error("expected ok");
    if (!bad.ok) expect(bad.error.code).toBe("nope");
    else throw new Error("expected fail");
  });

  it("does not expose the other side before narrowing", () => {
    const r: Result<number> = ok(1);
    // @ts-expect-error value exists only on the ok branch
    void r.value;
    // @ts-expect-error error exists only on the failed branch
    void r.error;
    expect(r.ok).toBe(true);
  });

  it("ok has no error type and fail has no value type", () => {
    const a: Result<number, never> = ok(1);
    const b: Result<never, string> = fail("x");
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
  });
});

describe("diag", () => {
  it("builds a diagnostic and omits an absent hint", () => {
    expect(diag("V4-SIZE", "error", "/nets", "too big")).toEqual({
      code: "V4-SIZE",
      severity: "error",
      path: "/nets",
      message: "too big",
    });
    expect("hint" in diag("A", "warning", "", "m")).toBe(false);
  });

  it("keeps a hint", () => {
    expect(diag("A", "warning", "", "m", "try this").hint).toBe("try this");
  });
});
