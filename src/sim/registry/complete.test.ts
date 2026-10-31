// @vitest-environment node
import { describe, expect, it } from "vitest";
import { modelIdsOf } from "../analog/live.ts";
import bme280 from "../devices/data/bme280.device.json" with { type: "json" };
import mpu6050 from "../devices/data/mpu6050.device.json" with { type: "json" };
import { allEntries, loadRegistry } from "./entries.ts";
import { tierRank } from "./tiers.ts";
import type { Tier } from "./types.ts";

interface PartFile {
  id: string;
  simulation: { tier: Tier };
  behaviour: { layers: { model: { kind: string; ref?: string } }[] };
}

const files = import.meta.glob<PartFile>("../../parts/data/*.component.json", { eager: true, import: "default" });
const reg = loadRegistry(allEntries());
const deviceRegistryId: Record<string, string> = Object.fromEntries([bme280, mpu6050].map((d) => [d.id, d.registry]));
const PARAMETER_TYPES = ["datasheet", "fit", "measurement", "assumption", "numerical"];

const builtinRefs = (part: PartFile): string[] =>
  part.behaviour.layers.flatMap((l) => (l.model.kind === "builtin" && l.model.ref ? [deviceRegistryId[l.model.ref] ?? l.model.ref] : []));

/** A part with no solver element and no builtin model has its own `part:` row. */
function entryIdsOf(part: PartFile): string[] {
  const ids = [...modelIdsOf(part.id), ...builtinRefs(part)];
  if (ids.length > 0) return ids;
  const handWritten = `part:${part.id.replace(/^core\./, "")}@1`;
  return [reg.get(handWritten) ? handWritten : `part:${part.id}@1`];
}

describe("registry completeness", () => {
  it("finds the part files", () => {
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(9);
  });

  for (const [path, part] of Object.entries(files)) {
    it(`gives ${path} an entry for every model, at a tier its evidence supports`, () => {
      const ids = entryIdsOf(part);
      const missing = ids.filter((id) => !reg.get(id));
      expect(missing, `${path} has no registry entry for ${missing.join(", ")}`).toEqual([]);
      const lowest = ids.map((id) => reg.get(id)!.tier).reduce((low, tier) => (tierRank(tier) < tierRank(low) ? tier : low));
      expect(tierRank(part.simulation.tier), `${path} says ${part.simulation.tier}, the registry computes ${lowest}`).toBeLessThanOrEqual(tierRank(lowest));
    });
  }

  it("has an entry for every device descriptor", () => {
    for (const d of [bme280, mpu6050]) expect(reg.get(d.registry), d.registry).toBeDefined();
  });

  it("has the engine, bus, library, board power and runtime entries of B9", () => {
    for (const id of ["engine:avr@1.0.0", "engine:mna-newton@1.0.0", "bus:i2c@1", "bus:spi@1", "bus:uart@1", "library:adafruit-bme280@1", "board-power:esp32-devkitc@1", "runtime:dmath@1"]) {
      expect(reg.get(id), id).toBeDefined();
    }
    expect(reg.byKind("sensor").length).toBeGreaterThan(0);
  });

  it("never says validated, and tags every assumption in the summary", () => {
    for (const e of reg.all()) {
      expect(JSON.stringify(e), e.id).not.toMatch(/(?<![\w-])validated(?![\w-])/i);
      for (const p of e.parameterSources) expect(PARAMETER_TYPES, `${e.id} ${p.param}`).toContain(p.type);
      if (e.parameterSources.some((p) => p.type === "assumption")) expect(e.labels.summary, e.id).toContain("assumed");
    }
  });

  it("prints the count per tier", () => {
    const counts = Object.fromEntries(["T0", "T1", "T2", "T3"].map((t) => [t, reg.all().filter((e) => e.tier === t).length]));
    console.log("registry entries per tier", counts);
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(reg.all().length);
  });
});
