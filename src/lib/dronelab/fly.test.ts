// @vitest-environment node
import { describe, expect, test } from "vitest";
import { quad5Fixture as content } from "./__fixtures__/quad5";
import type { DailyChallenge } from "@/lib/flight/challenge";
import {
  anyBreak,
  craftPatch,
  flightCalc,
  flightFaults,
  flyPick,
  flyRules,
  initialFly,
  reduceFly,
} from "./fly";
import type { BenchSummary } from "./store";

const ready: BenchSummary = {
  pick: { batt: "4s1500", motor: "2306-2450", prop: "5x4.3x3" },
  built: true,
  flight: {
    ready: true,
    fcReversed: false,
    propsSwapped: false,
    motorChecked: true,
    accCal: true,
    capFault: false,
    smokeTested: true,
    mistakes: [],
  },
  cli: {},
};

describe("fly page store", () => {
  test("without a bench build the factory build flies the default design", () => {
    const s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench: null });
    expect(s.source).toBe("factory");
    expect(flyPick(content, s)).toEqual(content.design.default);
    expect(flyRules(s).every((r) => r.ok)).toBe(true);
    expect(flightFaults(content, s)).toBeUndefined();
  });

  test("a bench build that passes its checks flies with its own design", () => {
    const s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench: ready });
    expect(s.source).toBe("bench");
    expect(flyPick(content, s)).toEqual(ready.pick);
    expect(flightCalc(content, flyPick(content, s)).cells).toBe(4);
  });

  test("a bench build that may not arm falls back to the factory build, and stays selectable", () => {
    const bench = { ...ready, flight: { ...ready.flight!, ready: false, smokeTested: false } };
    let s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench });
    expect(s.source).toBe("factory");
    s = reduceFly(content, s, { type: "source", source: "bench" });
    expect(flyRules(s).find((r) => r.id === "smoke")).toMatchObject({ ok: false, level: "block" });
  });

  test("bench mistakes and saved CLI settings reach the flight", () => {
    const bench = { ...ready, flight: { ...ready.flight!, fcReversed: true }, cli: { boardYaw: 180, angleLimit: 60 } };
    const s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench });
    expect(flightFaults(content, s)?.fcReversed).toBe(false);
    expect(craftPatch({ angleLimit: 38, drag: 0.045 }, s)).toEqual({ angleLimit: 60, drag: 0.045 });
  });

  test("the course picks only a course the craft has", () => {
    const s = initialFly(content);
    expect(s.course).toBe(content.courses[0].id);
    expect(reduceFly(content, s, { type: "course", id: "nope" })).toBe(s);
    expect(reduceFly(content, s, { type: "course", id: content.courses[0].id }).course).toBe(content.courses[0].id);
  });

  test("Break it forces a fault on, and taking it out fixes the bench build's own", () => {
    let s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench: { ...ready, flight: { ...ready.flight!, propsSwapped: true } } });
    expect(flightFaults(content, s)?.propsSwapped).toBe(true);
    s = reduceFly(content, s, { type: "break", id: "fcReversed", on: true });
    s = reduceFly(content, s, { type: "break", id: "propsSwapped", on: false });
    expect(flightFaults(content, s)).toMatchObject({ fcReversed: true, propsSwapped: false });
    expect(anyBreak(s)).toBe(true);
    // the factory build has no faults of its own: a break is all there is
    const factory = reduceFly(content, s, { type: "source", source: "factory" });
    expect(flightFaults(content, factory)).toEqual({ fcReversed: true, propsSwapped: false });
    const fixed = reduceFly(content, factory, { type: "break/reset" });
    expect(flightFaults(content, fixed)).toBeUndefined();
    expect(anyBreak(fixed)).toBe(false);
  });

  test("motors over their rating are a break on the calculator's output", () => {
    const s = reduceFly(content, initialFly(content), { type: "break", id: "overKv", on: true });
    expect(flightFaults(content, s)).toBeUndefined();
    expect(flightCalc(content, flyPick(content, s), s.breaks.overKv).overKv).toBe(true);
    expect(flightCalc(content, flyPick(content, s)).overKv).toBe(false);
  });

  test("the daily challenge flies its course on the factory build with its pack, and ends on another build", () => {
    const day: DailyChallenge = { date: "2026-10-24", craft: content.id, course: "gates", batt: "6s1800", wind: true, board: "daily-20261024" };
    let s = reduceFly(content, initialFly(content), { type: "bench/loaded", bench: ready });
    s = reduceFly(content, s, { type: "challenge", challenge: day });
    expect(s).toMatchObject({ challenge: day, course: "gates", source: "factory" });
    expect(flyPick(content, s)).toEqual({ ...content.design.default, batt: "6s1800" });
    expect(reduceFly(content, s, { type: "source", source: "bench" }).challenge).toBeNull();
    expect(reduceFly(content, s, { type: "challenge", challenge: null }).challenge).toBeNull();
    // a bench build found after the link opened doesn't take over the challenge
    expect(reduceFly(content, reduceFly(content, initialFly(content), { type: "challenge", challenge: day }), { type: "bench/loaded", bench: ready }).source).toBe("factory");
    // a challenge for another craft, course or pack is not this page's
    const before = initialFly(content);
    expect(reduceFly(content, before, { type: "challenge", challenge: { ...day, craft: "wing" } })).toBe(before);
    expect(reduceFly(content, before, { type: "challenge", challenge: { ...day, batt: "9s" } })).toBe(before);
  });

  test("a room's snapshot leaves each pilot's own flight alone, and an unknown action changes nothing", () => {
    const s = reduceFly(content, initialFly(content), { type: "break", id: "fcReversed", on: true });
    const host = { ...initialFly(content), course: "elsewhere" };
    expect(reduceFly(content, s, { type: "sync/hydrate", state: host })).toBe(s);
    expect(reduceFly(content, s, { type: "design/pick" } as unknown as Parameters<typeof reduceFly>[2])).toBe(s);
  });
});
