// @vitest-environment node
import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256.ts";

describe("sha256 speed", () => {
  it("hashes 340 KB within the ceiling", () => {
    const bytes = new Uint8Array(340_000).fill(7);
    const start = performance.now();
    sha256Hex(bytes);
    const ms = performance.now() - start;
    console.info(`sha256 340 KB: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(100);
  });
});
