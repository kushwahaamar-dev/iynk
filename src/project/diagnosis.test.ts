// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isCauseId } from "../sim/faults/cause-ids.ts";
import type { Diagnosis } from "./diagnosis.ts";
import { EXTENSION_CAUSE_ID } from "./diagnosis.ts";

describe("Diagnosis", () => {
  it("types the BRIEF 30 swapped-pins case", () => {
    const swapped: Diagnosis = {
      cause_id: "swapped-pins",
      symptom_id: "i2c-no-ack",
      evidence: [
        {
          kind: "pin-level",
          ref: "bme280.SCL",
          at: 1_000_000,
          value: "GPIO21",
          provenance: "computed",
          tier: "T1",
          modelIds: ["bus:i2c@1"],
        },
      ],
      hint_level: 0,
    };
    expect(isCauseId(swapped.cause_id)).toBe(true);
  });

  it("matches extension ids only in lower-case kebab form", () => {
    expect(EXTENSION_CAUSE_ID.test("x-my-sensor")).toBe(true);
    expect(EXTENSION_CAUSE_ID.test("x-")).toBe(false);
  });
});
