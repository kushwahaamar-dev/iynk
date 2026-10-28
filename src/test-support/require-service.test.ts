import { afterEach, describe, expect, test, vi } from "vitest";
import { serviceMissing } from "./require-service";

afterEach(() => vi.restoreAllMocks());

describe("serviceMissing", () => {
  test("returns false when nothing is missing", () => {
    expect(serviceMissing("relay", null, { CI: "true" })).toBe(false);
  });

  test("skips with a warning outside CI", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(serviceMissing("relay", "no ws", {})).toBe(true);
    expect(warn).toHaveBeenCalledWith('service "relay" skipped: no ws');
  });

  test("throws under CI and names the service", () => {
    expect(() => serviceMissing("relay", "no ws", { CI: "true" })).toThrow(
      'required service "relay" is missing: no ws',
    );
  });

  test.each(["0", "false", ""])("treats CI=%j as unset", (ci) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(serviceMissing("relay", "no ws", { CI: ci })).toBe(true);
  });
});
