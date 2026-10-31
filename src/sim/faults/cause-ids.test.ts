// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CORE_CAUSE_IDS, isCauseId, isCoreCauseId } from "./cause-ids.ts";

describe("CORE_CAUSE_IDS", () => {
  it("holds the 45 ids of SIMULATION 13.4", () => {
    expect(CORE_CAUSE_IDS).toHaveLength(45);
    expect(new Set(CORE_CAUSE_IDS).size).toBe(45);
  });

  it("is kebab-case with no layer or seat prefix", () => {
    for (const id of CORE_CAUSE_IDS) {
      expect(id).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/);
      expect(id).not.toMatch(/^(electrical|mech|robot|drone|flight|sim)-/);
    }
  });
});

describe("isCauseId", () => {
  it("accepts core and extension ids", () => {
    expect(isCauseId("led-reversed")).toBe(true);
    expect(isCauseId("x-my-sensor")).toBe(true);
    expect(isCauseId("x-led-reversed")).toBe(true);
  });

  it("rejects everything else", () => {
    for (const id of ["led_reversed", "x-", "x-Foo", "", "unknown-cause", "x-1a"]) {
      expect(isCauseId(id)).toBe(false);
    }
  });

  it("tells core ids from extension ids", () => {
    expect(isCoreCauseId("swapped-pins")).toBe(true);
    expect(isCoreCauseId("x-led-reversed")).toBe(false);
  });
});
