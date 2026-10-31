import { describe, expect, it } from "vitest";
import { stateHash } from "../../project/hash.ts";
import { validateValue } from "../../project/validate.ts";
import { makePerfProject, PERF_DEFAULT, PERF_VIEW } from "./scene-fixture.ts";

describe("makePerfProject", () => {
  const project = makePerfProject(PERF_DEFAULT);

  it("has 500 parts placed and 1,000 wires drawn", () => {
    const view = project.views.find((v) => v.id === PERF_VIEW)!;
    expect(project.components).toHaveLength(500);
    expect(view.placements).toHaveLength(500);
    expect(view.wires).toHaveLength(1000);
  });

  it("passes the schema, semantic and hygiene checks with nothing to report", () => {
    const report = validateValue(project);
    expect(report.diagnostics).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("is the same project for the same seed and another for a different one", () => {
    expect(stateHash(makePerfProject(PERF_DEFAULT))).toBe(stateHash(project));
    expect(stateHash(makePerfProject({ ...PERF_DEFAULT, seed: 2 }))).not.toBe(stateHash(project));
  });

  it("leaves some nets split so there are air wires to draw", () => {
    const wired = new Set(project.views.find((v) => v.id === PERF_VIEW)!.wires.map((w) => w.net));
    const pinsOf = (net: string) => project.nets.find((n) => n.id === net)!.connections.length;
    const wiresOf = (net: string) => project.views.find((v) => v.id === PERF_VIEW)!.wires.filter((w) => w.net === net).length;
    expect([...wired].some((net) => wiresOf(net) < pinsOf(net) - 1)).toBe(true);
  });

  it("scales down for a small project", () => {
    const small = makePerfProject({ parts: 10, wires: 6, seed: 3 });
    expect(validateValue(small).ok).toBe(true);
    expect(small.views.find((v) => v.id === PERF_VIEW)!.wires).toHaveLength(6);
  });

  it("refuses more wires than the pins allow", () => {
    expect(() => makePerfProject({ parts: 5, wires: 100, seed: 1 })).toThrow(RangeError);
  });
});
