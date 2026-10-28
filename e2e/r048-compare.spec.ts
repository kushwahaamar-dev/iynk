import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// R-048: the run in Chromium and the run in WebKit end on the same hashes. The two JSON files are written by
// core.spec.ts; this project starts after both browsers have finished.

type Walk = Record<string, unknown>;

const read = (browser: string): Walk => JSON.parse(readFileSync(join("test-results", `r048-${browser}.json`), "utf8")) as Walk;

function firstDifference(a: Walk, b: Walk, path = ""): string | null {
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const left = a[key];
    const right = b[key];
    const here = `${path}/${key}`;
    if (typeof left === "object" && left !== null && typeof right === "object" && right !== null) {
      const inner = firstDifference(left as Walk, right as Walk, here);
      if (inner) return inner;
    } else if (left !== right) {
      return `${here}: chromium ${JSON.stringify(left)}, webkit ${JSON.stringify(right)}`;
    }
  }
  return null;
}

test("Chromium and WebKit give the same serial, pin-trace and project hashes", () => {
  const chromium = read("chromium");
  const webkit = read("webkit");
  expect(chromium.traceHash).toMatch(/^[0-9a-f]{16}$/);
  expect(firstDifference(chromium, webkit), "first difference").toBeNull();
});
