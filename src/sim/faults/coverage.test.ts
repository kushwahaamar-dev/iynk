// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CORE_CAUSE_IDS } from "./cause-ids.ts";
import { detectorStatus } from "./causes.ts";
import { allRules } from "./rules.ts";
import { SYMPTOM_IDS } from "./symptoms.ts";

const statuses = CORE_CAUSE_IDS.map((id) => [id, detectorStatus(id)] as const);
const count = (pick: (s: ReturnType<typeof detectorStatus>) => boolean): number => statuses.filter(([, s]) => pick(s)).length;

describe("detector coverage", () => {
  it("gives every cause id a status", () => {
    expect(statuses).toHaveLength(45);
  });

  it("splits the ids into 27 detected, 2 diagnostic and 16 not modelled yet", () => {
    expect(count((s) => s.status === "static" || s.status === "code" || s.status === "solved")).toBe(27);
    expect(count((s) => s.status === "diagnostic")).toBe(2);
    expect(count((s) => s.status === "not-modelled-yet")).toBe(16);
  });

  it("reports the cheapest layer first and lists every rule", () => {
    expect(detectorStatus("floating-input")).toEqual({ status: "static", rules: ["rule:floating-input@1"] });
    expect(detectorStatus("wrong-pin-in-code")).toEqual({ status: "code", rules: ["code:pin-mismatch@1"] });
    expect(detectorStatus("brownout")).toMatchObject({ status: "solved" });
    const wrongValue = detectorStatus("wrong-value");
    expect(wrongValue.status).toBe("static");
    expect(wrongValue).toMatchObject({ rules: expect.arrayContaining(["solve:value-band@1"]) });
  });

  it("names the source of a diagnostic and the phase of a missing model", () => {
    expect(detectorStatus("bus-device-not-modelled")).toEqual({ status: "diagnostic", source: "T-B8-01" });
    expect(detectorStatus("library-not-modelled")).toEqual({ status: "diagnostic", source: "T-B8-02" });
    expect(detectorStatus("prop-clash")).toMatchObject({ status: "not-modelled-yet", phase: "B18" });
    expect(detectorStatus("motor-stall")).toEqual({ status: "solved", rules: ["solve:motor-stall@1"] });
    expect(detectorStatus("driver-undersized")).toEqual({ status: "solved", rules: ["solve:driver-undersized@1"] });
    expect(detectorStatus("sensor-saturated")).toEqual({ status: "solved", rules: ["solve:sensor-saturated@1"] });
    expect(detectorStatus("ranger-beam-blocked")).toEqual({ status: "solved", rules: ["solve:ranger-beam-blocked@1"] });
  });

  it("keeps rules sound: unique ids, known causes and symptoms, a reason when switched off", () => {
    const rules = allRules();
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const rule of rules) {
      expect(rule.causeId.startsWith("x-") || (CORE_CAUSE_IDS as readonly string[]).includes(rule.causeId), rule.id).toBe(true);
      expect(rule.symptomId.startsWith("x-") || (SYMPTOM_IDS as readonly string[]).includes(rule.symptomId), rule.id).toBe(true);
      if (!rule.enabled) expect(rule.disabledReason, rule.id).toBeTruthy();
    }
  });

  it("prints a stable table", () => {
    const table = [...statuses]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([id, s]) => `${id} | ${s.status} | ${"rules" in s ? s.rules.join(", ") : "source" in s ? s.source : `${s.phase}: ${s.reason}`}`);
    const extension = [...new Set(allRules().filter((r) => r.causeId.startsWith("x-")).map((r) => r.causeId))].sort();
    console.log(`${table.join("\n")}\nextension: ${extension.join(", ")}`);
    expect(table).toHaveLength(45);
    expect(extension).toHaveLength(2);
  });
});
