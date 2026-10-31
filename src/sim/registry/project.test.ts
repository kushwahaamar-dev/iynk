import { describe, expect, it } from "vitest";
import blink from "../../project/samples/uno-blink-d12.project.json" with { type: "json" };
import type { Project } from "../../project/generated/types.ts";
import { loadRegistry } from "./entries.ts";
import { projectFidelity } from "./project.ts";

const doc = blink as unknown as Project;
const reg = loadRegistry();

describe("projectFidelity", () => {
  it("[SA-17] gives the Uno blink project execution T1 and circuit T1", () => {
    const result = projectFidelity(doc, reg, (id) => (id === "core.led-5mm" ? ["model:led.pwl@1"] : []));
    expect(result.layers.map((l) => [l.layer, l.tier])).toEqual([["execution", "T1"], ["circuit", "T1"]]);
    expect(result.summary).toBe("T1");
  });

  it("lists a model with no entry as unmodelled without lowering the summary", () => {
    const result = projectFidelity(doc, reg, (id) => (id === "core.resistor" ? ["model:ghost@1"] : []));
    expect(result.layers.find((l) => l.layer === "circuit")?.unmodelled).toEqual(["model:ghost@1"]);
    expect(result.summary).toBe("T1");
  });
});
