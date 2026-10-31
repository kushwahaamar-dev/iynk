import { describe, expect, it } from "vitest";
import { CAUSES, causeMeta } from "./causes.ts";
import { CORE_CAUSE_IDS } from "./cause-ids.ts";
import { isSymptomId, ROBOT_SYMPTOMS, SYMPTOM_IDS } from "./symptoms.ts";

const robotCauses = CAUSES.filter((c) => c.seat === "ROB");

describe("robot causes", () => {
  it("models eleven of the thirteen and leaves servo and stepper out", () => {
    expect(robotCauses).toHaveLength(13);
    expect(robotCauses.filter((c) => c.modelled)).toHaveLength(11);
    expect(causeMeta("servo-jitter-supply")?.modelled).toBe(false);
    expect(causeMeta("stepper-lost-steps")?.modelled).toBe(false);
  });

  it("names wheel-spins-no-motion for wheel-slip", () => {
    const meta = causeMeta("wheel-slip");
    expect(meta?.modelled).toBe(true);
    expect(meta?.symptomIds).toContain("wheel-spins-no-motion");
  });

  it("looks up robot hint texts in the robot namespace", () => {
    expect(robotCauses.every((c) => c.textNs === "robot")).toBe(true);
    expect(causeMeta("brownout")?.textNs).toBeUndefined();
  });

  it("keeps every robot symptom id kebab case and in the core list", () => {
    for (const id of ROBOT_SYMPTOMS) {
      expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(SYMPTOM_IDS).toContain(id);
    }
  });

  it("resolves every symptom and confusable id, and keeps confusable symmetric", () => {
    for (const cause of CAUSES) {
      for (const id of cause.symptomIds) expect(isSymptomId(id)).toBe(true);
      for (const other of cause.confusableWith) {
        expect(CORE_CAUSE_IDS).toContain(other);
        expect(causeMeta(other)?.confusableWith).toContain(cause.id);
      }
    }
  });
});
