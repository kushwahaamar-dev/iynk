// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project } from "@/project/generated/types";
import { activeFaultIds, faultOffers, type FaultLookup } from "./lesson-faults";

const lookup: FaultLookup = (_board, failureId) =>
  failureId === "led-reversed-unknown"
    ? null
    : { faultId: `flt_${failureId}`, causeId: "led-reversed", symptomId: "led-dark", title: { en: `Title ${failureId}`, de: `Titel ${failureId}` } };

describe("faultOffers", () => {
  it("lists the lesson's own faults before the board's others", () => {
    const offers = faultOffers("prj_uno-r3-blink", "uno-r3", lookup, "en");
    expect(offers.own.map((o) => o.failureId)).toEqual(["led-no-resistor", "led-backwards"]);
    expect(offers.more.length).toBeGreaterThan(0);
    expect(offers.more.some((o) => o.failureId === "led-backwards")).toBe(false);
  });

  it("puts everything under more for a lesson with no own faults", () => {
    const offers = faultOffers("prj_uno-r3-button", "uno-r3", lookup, "en");
    expect(offers.own).toEqual([]);
    expect(offers.more.length).toBeGreaterThan(0);
  });

  it("lists a failure without a B10 fault as unmapped and keeps it out of both lists", () => {
    const offers = faultOffers("prj_uno-r3-blink", "uno-r3", (b, id) => (id === "led-backwards" ? null : lookup(b, id)), "en");
    expect(offers.unmapped.map((u) => u.failureId)).toEqual(["led-backwards"]);
    expect(offers.own.map((o) => o.failureId)).toEqual(["led-no-resistor"]);
  });

  it("resolves the title for the locale and falls back to English", () => {
    expect(faultOffers("prj_uno-r3-blink", "uno-r3", lookup, "de").own[0].title).toBe("Titel led-no-resistor");
    expect(faultOffers("prj_uno-r3-blink", "uno-r3", lookup, "fr").own[0].title).toBe("Title led-no-resistor");
  });
});

describe("activeFaultIds", () => {
  it("returns the enabled faults only", () => {
    const project = { simulation: { faults: [{ id: "flt_a", enabled: true }, { id: "flt_b", enabled: false }] } } as Project;
    expect(activeFaultIds(project)).toEqual(["flt_a"]);
  });
});
