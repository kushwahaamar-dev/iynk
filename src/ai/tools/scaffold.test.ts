// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { DryRunReport, ProposeOpsArgs } from "../proposals/types.ts";
import { checkScaffold, problemsForModel } from "./scaffold.ts";

const args: ProposeOpsArgs = {
  title: "Blink two LEDs",
  kind: "scaffold",
  rationale: "starter",
  steps: [{ id: "s1", label: "Parts", ops: [] }],
};

const part = { id: "led1", label: "Secret label" };

function report(over: Partial<DryRunReport> = {}): DryRunReport {
  return {
    atRevision: 1,
    ok: true,
    rejects: [],
    diff: {
      parts: { added: [part], removed: [], changed: [] },
      nets: [],
      wires: { added: 0, removed: 0 },
      sources: [],
      tests: { added: [], removed: [], changed: [] },
      faults: { added: [], removed: [], changed: [] },
      params: [],
      cascade: { components: 0, wires: 0, pins: 0, sources: 0 },
    },
    diffHash: "h",
    failing: false,
    tiers: [{ componentId: "led1", tier: "T1" }],
    ...over,
  };
}

describe("checkScaffold", () => {
  it("passes a clean scaffold with its tier", () => {
    expect(checkScaffold(args, { s1: 1 }, report())).toEqual({ ok: true, problems: [], tier: "T1", notSimulated: [] });
  });

  it("takes the lowest tier and lists parts that are only drawn", () => {
    const r = report({ tiers: [{ componentId: "a", tier: "T3" }, { componentId: "b", tier: "T2" }, { componentId: "c", tier: "none" }] });
    const c = checkScaffold(args, { s1: 0 }, r);
    expect(c.tier).toBe("T2");
    expect(c.notSimulated).toEqual(["c"]);
  });

  it("fails on an error finding and ignores warnings", () => {
    const r = report({
      rules: {
        added: [
          { ruleId: "led-series", severity: "error", targets: ["led1"], text: "Secret label" },
          { ruleId: "other", severity: "warning", targets: ["x"], text: "w" },
        ],
        resolved: [],
      },
    });
    const c = checkScaffold(args, { s1: 1 }, r);
    expect(c.problems).toEqual([expect.objectContaining({ code: "rules_error", targets: ["led1"] })]);
  });

  it("fails on removal, empty diff and a broken sketch", () => {
    const r = report({
      diff: { ...report().diff, parts: { added: [], removed: [], changed: [] } },
      compile: { ok: false, messages: ["x"] },
    });
    const codes = checkScaffold(args, { s1: 2 }, r).problems.map((p) => p.code);
    expect(codes).toEqual(["not_additive", "no_new_parts", "compile_error"]);
  });
});

describe("problemsForModel", () => {
  it("caps the length and leaves out document labels", () => {
    const r = report({
      rules: {
        added: Array.from({ length: 60 }, (_, i) => ({ ruleId: `r${i}`, severity: "error" as const, targets: [`id${i}`], text: "Secret label" })),
        resolved: [],
      },
    });
    const text = problemsForModel(checkScaffold(args, { s1: 1 }, r));
    expect(text.length).toBeLessThanOrEqual(600);
    expect(text).not.toContain("Secret label");
  });
});
