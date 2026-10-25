// @vitest-environment node
import { describe, expect, test } from "vitest";
import { quad5Fixture as content } from "./__fixtures__/quad5";
import {
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
});
