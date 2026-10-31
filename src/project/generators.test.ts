// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { rng } from "../core/prng.ts";
import { stateHash } from "./hash.ts";
import { checkAll } from "./semantic.ts";
import { OP_FAMILIES, bigProject, generateOp, generateSession, startProject } from "./testing/generators.ts";
import type { OpFamily } from "./testing/generators.ts";
import { hashOf } from "./testing/harness.ts";
import { validateValue } from "./validate.ts";

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);

describe("generateSession", () => {
  it("gives the same session for the same seed", () => {
    const a = generateSession(7, 200);
    const b = generateSession(7, 200);
    expect(b.ops).toEqual(a.ops);
    expect(hashOf(b.live)).toBe(hashOf(a.live));
    expect(b.live.state.history.ops).toEqual(a.live.state.history.ops);
  });

  it("gives a different session for another seed", () => {
    expect(hashOf(generateSession(8, 200).live)).not.toBe(hashOf(generateSession(7, 200).live));
  });

  it("has the session accept at least 70 percent of 4,000 proposed ops", () => {
    const accepted = SEEDS.reduce((sum, seed) => sum + generateSession(seed, 200).ops.length, 0);
    expect(accepted / 4000).toBeGreaterThanOrEqual(0.7);
  });

  it("ends every session in a document that passes every V3 rule", () => {
    for (const seed of SEEDS) {
      const { live } = generateSession(seed, 200);
      expect(checkAll(live.state).filter((d) => d.severity === "error"), `seed ${seed}`).toEqual([]);
    }
  });

  it("does not use Math.random", () => {
    const random = vi.spyOn(Math, "random");
    generateSession(3, 100);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });
});

describe("generateOp", () => {
  const state = generateSession(5, 150).live.state;
  const KINDS: Record<OpFamily, string[]> = {
    "component.add": ["component.add"],
    "component.remove": ["component.remove"],
    "net.connect": ["net.connect", "net.create"],
    "net.disconnect": ["net.disconnect"],
    "net.merge": ["net.merge"],
    "net.split": ["net.split"],
    "view.place": ["view.place"],
    "wire.add": ["wire.add"],
    "wire.remove": ["wire.remove"],
    "net.rename": ["net.rename"],
    "source.edit": ["source.edit"],
    "fault.set": ["fault.set"],
    "component.set": ["component.set"],
    "test.set": ["test.set"],
  };

  it.each(OP_FAMILIES)("draws only %s when the mix names it alone", (family) => {
    const r = rng(1, "mix");
    for (let i = 0; i < 20; i++) {
      const op = generateOp(state, r, { [family]: 1 });
      expect(op, family).not.toBeNull();
      expect(KINDS[family]).toContain(op!.k);
    }
  });

  it("returns null when the mix has no weight", () => {
    expect(generateOp(state, rng(1, "mix"), {})).toBeNull();
  });

  it("returns null for a family with nothing to act on", () => {
    expect(generateOp(startProject(1), rng(1, "mix"), { "wire.remove": 1 })).toBeNull();
  });
});

describe("bigProject", () => {
  it("builds a valid document with the asked sizes", () => {
    const project = bigProject(60, 100, 1);
    const report = validateValue(project);
    expect(report.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(project.components).toHaveLength(60);
    expect(project.nets).toHaveLength(60);
    expect(project.views).toHaveLength(1);
    expect(project.views[0]!.kind).toBe("breadboard");
    expect(project.views[0]!.wires).toHaveLength(100);
    expect(project.views[0]!.placements).toHaveLength(60);
  });

  it("is the same document for the same seed and another for a new one", () => {
    expect(stateHash(bigProject(30, 40, 2))).toBe(stateHash(bigProject(30, 40, 2)));
    expect(stateHash(bigProject(30, 40, 3))).not.toBe(stateHash(bigProject(30, 40, 2)));
  });
});
