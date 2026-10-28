// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Project } from "./generated/types.ts";
import { SAMPLE_BLINK_D12_ID, sampleBlinkD12 } from "./samples.ts";
import { validateValue } from "./validate.ts";

const copy = readFileSync(join(process.cwd(), "src/project/samples/uno-blink-d12.project.json"));
const original = readFileSync(
  join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/uno-blink-d12.project.json"),
);

describe("sampleBlinkD12", () => {
  it("is a byte-for-byte copy of the schema example", () => {
    expect(copy.equals(original)).toBe(true);
  });

  it("validates", () => {
    const report = validateValue(sampleBlinkD12());
    expect(report.errors).toEqual(0);
    expect(report.ok).toBe(true);
  });

  it("is the Blink on D12 circuit", () => {
    const doc = sampleBlinkD12() as Project;
    expect(doc.id).toBe(SAMPLE_BLINK_D12_ID);
    expect(doc.nets.some((n) => n.class === "ground")).toBe(true);
    expect(doc.components.filter((c) => c.id === "cmp_led1")).toHaveLength(1);
    const source = doc.sources[0]?.content ?? "";
    expect(source).toContain("const int LED_PIN = 12;");
    expect(source).toContain("digitalWrite(LED_PIN, HIGH)");
  });

  it("returns a fresh object each call", () => {
    expect(sampleBlinkD12()).not.toBe(sampleBlinkD12());
  });
});
