import { describe, expect, it } from "vitest";
import { loadRegistry, RegistryError } from "./entries.ts";
import { allowedTier, CHECKED_ON_REAL_BOARD, findBanned, inRange } from "./tiers.ts";
import type { FidelityEntry } from "./types.ts";

const seed = (id: string): FidelityEntry => {
  const entry = loadRegistry().get(id);
  if (!entry) throw new Error(id);
  return structuredClone(entry);
};

describe("fidelity registry", () => {
  it("loads the four seed entries", () => {
    expect(loadRegistry().all().map((e) => e.id)).toEqual(["engine:mna-dc-pwl@1.0.0", "model:led.pwl@1", "runtime:arduino-subset@1", "flight-game@1"]);
  });

  it("[SA-17] refuses T2 without an oracle or analytic record", () => {
    const entry = { ...seed("model:led.pwl@1"), tier: "T2" };
    expect(() => loadRegistry([entry])).toThrow(RegistryError);
    expect(allowedTier(seed("runtime:arduino-subset@1"))).toBe("T3");
    expect(allowedTier({ ...seed("model:led.pwl@1"), validation: [] })).toBe("T0");
  });

  it("names bad ids, banned words, unknown supersedes and missing label keys", () => {
    const led = seed("model:led.pwl@1");
    const raw = [{ ...led, id: "Bad Id", title: "Validated LED", supersedes: "nothing@1" }];
    expect(() => loadRegistry(raw)).toThrow(/Bad Id[\s\S]*banned word "validated"[\s\S]*supersedes/);
    expect(() => loadRegistry([led], { knownKeys: new Set(["fidelity.tier.T1"]) })).toThrow(/fidelity\.summary/);
    expect(() => loadRegistry([led])).not.toThrow();
  });

  it("T1 needs unsupported text, T3 needs a runtime, a bench record is a mark and not a tier", () => {
    expect(allowedTier({ ...seed("model:led.pwl@1"), unsupported: [] })).toBe("T0");
    const part = seed("flight-game@1");
    part.validation.push({ ...part.validation[0], id: "diff", kind: "differential", status: "pass" });
    expect(allowedTier(part)).toBe("T2");
    const bench = { ...part.validation[0], id: "bench", kind: "bench" as const, status: "pass" as const };
    const withBench = { ...part, validation: [bench], errorMetrics: [{ name: "x", value: 1, unit: "V", condition: "c" }] };
    expect(CHECKED_ON_REAL_BOARD(withBench)).toBe(true);
    expect(allowedTier({ ...withBench, performance: [] })).toBe("T0");
  });

  it("finds banned words only as words", () => {
    expect(findBanned("Validated against ngspice")).toEqual(["validated"]);
    expect(findBanned("Within 2 percent of ngspice on 20 circuits")).toEqual([]);
  });

  it("reports whether a value is inside the range the entry covers", () => {
    const led = seed("model:led.pwl@1");
    expect(inRange(led, "current_A", 0.01)).toBe(true);
    expect(inRange(led, "current_A", 0.5)).toBe(false);
    expect(inRange(led, "temperature", 20)).toBeNull();
  });
});
