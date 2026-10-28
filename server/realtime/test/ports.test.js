import assert from "node:assert/strict";
import { test } from "node:test";
import { RESERVED_PORTS, randomTestPort } from "./helpers.js";

test("skips the reserved slot and uses the next draw", () => {
  const draws = [(3117 + 0.5) / 10_000, 0.25];
  assert.equal(randomTestPort(() => /** @type {number} */ (draws.shift())), 42_500);
});

test("real draws stay in range and never hit a reserved port", () => {
  for (let i = 0; i < 2_000; i += 1) {
    const port = randomTestPort();
    assert.ok(port >= 40_000 && port <= 49_999);
    assert.ok(!RESERVED_PORTS.has(port));
  }
});
