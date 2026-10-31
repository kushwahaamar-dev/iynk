// @vitest-environment node
import { describe, expect, it } from "vitest";
import { viewOf } from "./circuit.fixture.ts";
import { allRules, defaultRules, runRules } from "./rules.ts";
import { STATIC_RULES } from "./static.ts";
import type { Finding, Rule } from "./types.ts";

const view = viewOf([{ id: "uno", ref: "uno-r3", wires: { P5V: "gnd", GND: "gnd" } }]);

const finding = (ruleId: string, severity: Finding["severity"], target: string): Finding => ({
  ruleId,
  causeId: "open-connection",
  symptomId: "part-dead",
  severity,
  targets: [{ kind: "part", id: target }],
  evidence: [],
  messageKey: "check.test",
  args: {},
});

const fake = (id: string, over: Partial<Rule> = {}, found: Finding[] = []): Rule => ({
  id,
  layer: "static",
  causeId: "open-connection",
  symptomId: "part-dead",
  needs: [],
  enabled: true,
  check: () => found,
  ...over,
});

describe("runRules", () => {
  it("reports a throwing rule and still runs the others", () => {
    const boom = fake("rule:boom@1", {
      check: () => {
        throw new Error("bad netlist");
      },
    });
    const ok = fake("rule:fine@1", {}, [finding("rule:fine@1", "error", "a")]);
    const result = runRules([boom, ok], { view });
    expect(result.errors).toEqual([{ ruleId: "rule:boom@1", message: "bad netlist" }]);
    expect(result.findings).toHaveLength(1);
  });

  it("rejects a rule id that does not match the pattern", () => {
    const result = runRules([fake("Rule:Bad"), fake("rule:no-major")], { view });
    expect(result.errors.map((e) => e.ruleId).sort()).toEqual(["Rule:Bad", "rule:no-major"]);
  });

  it("gives the same order whatever the order of the rules", () => {
    const rules = [
      fake("rule:b@1", {}, [finding("rule:b@1", "warning", "z"), finding("rule:b@1", "error", "y")]),
      fake("rule:a@1", {}, [finding("rule:a@1", "error", "x"), finding("rule:a@1", "note", "a")]),
      fake("rule:c@1", {}, [finding("rule:c@1", "error", "a")]),
    ];
    const order = (rs: Rule[]) => runRules(rs, { view }).findings.map((f) => `${f.severity}:${f.ruleId}:${f.targets[0]?.id}`);
    expect(order(rules)).toEqual([
      "error:rule:a@1:x",
      "error:rule:b@1:y",
      "error:rule:c@1:a",
      "warning:rule:b@1:z",
      "note:rule:a@1:a",
    ]);
    expect(order([...rules].reverse())).toEqual(order(rules));
  });

  it("sums the skips and skips rules that lack code, a run or are disabled", () => {
    const counting = fake("rule:count@1", {
      check: ({ skipped }) => {
        skipped.add("rule:count@1", "undescribed-part");
        skipped.add("rule:count@1", "undescribed-part");
        return [];
      },
    });
    const result = runRules(
      [counting, fake("rule:code@1", { needs: ["code"] }), fake("rule:run@1", { needs: ["run"] }), fake("rule:off@1", { enabled: false })],
      { view },
    );
    expect(result.skipped).toEqual({
      "rule:count@1": { "undescribed-part": 2 },
      "rule:code@1": { "no-code": 1 },
      "rule:run@1": { "no-run": 1 },
      "rule:off@1": { disabled: 1 },
    });
  });
});

describe("defaultRules", () => {
  it("holds every layer's rules with valid ids", () => {
    expect(defaultRules().map((r) => r.id)).toEqual(allRules().map((r) => r.id));
    expect(defaultRules().slice(0, STATIC_RULES.length)).toEqual([...STATIC_RULES]);
    expect(runRules(defaultRules(), { view }).errors).toEqual([]);
  });
});
