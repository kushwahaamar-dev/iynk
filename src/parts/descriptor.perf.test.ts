// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateDescriptor } from "./descriptor.ts";
import type { Descriptor } from "./descriptor.ts";

const dir = new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/components/", import.meta.url);

describe("validateDescriptor speed", () => {
  it("reads the 37 KB L298N inside the time budget", () => {
    const d: Descriptor = JSON.parse(readFileSync(new URL("l298n-module.component.json", dir), "utf8"));
    validateDescriptor(d);
    const start = performance.now();
    validateDescriptor(d);
    expect(performance.now() - start).toBeLessThan(50);
  });
});
