import { expect, test } from "vitest";
import { staggerDelay } from "./nav-stagger";

test("links arrive 60 ms apart and the delay stops at 360 ms", () => {
  expect(staggerDelay(0)).toBe(0);
  expect(staggerDelay(1)).toBe(60);
  expect(staggerDelay(5)).toBe(300);
  expect(staggerDelay(9)).toBe(360);
});

test("bad input clamps to the first link", () => {
  expect(staggerDelay(-3)).toBe(0);
  expect(staggerDelay(Number.NaN)).toBe(0);
  expect(staggerDelay(1.6)).toBe(120);
});

test("the step and cap can be changed", () => {
  expect(staggerDelay(2, 100, 150)).toBe(150);
});
