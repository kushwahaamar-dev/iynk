import { expect, test } from "vitest";
import { parseSecret } from "./format";

test("accepts 8 to 512 visible characters", () => {
  expect(parseSecret("a".repeat(8))).toEqual({ ok: true, value: "a".repeat(8) });
  expect(parseSecret("a".repeat(512)).ok).toBe(true);
});

test("rejects 7 and 513 characters", () => {
  expect(parseSecret("a".repeat(7))).toEqual({ ok: false, reason: "empty" });
  expect(parseSecret("a".repeat(513))).toEqual({ ok: false, reason: "too_long" });
});

test("rejects a space inside and non-ASCII letters", () => {
  expect(parseSecret("Bearer abcdefgh")).toEqual({ ok: false, reason: "bad_chars" });
  expect(parseSecret("abcdefgé12")).toEqual({ ok: false, reason: "bad_chars" });
});

test("trims surrounding whitespace before checking", () => {
  expect(parseSecret("  abcdefgh\n")).toEqual({ ok: true, value: "abcdefgh" });
  expect(parseSecret("   abc   ")).toEqual({ ok: false, reason: "empty" });
});
