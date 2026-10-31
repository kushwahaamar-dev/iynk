import { describe, expect, it } from "vitest";
import type { Guide } from "@/project/generated/types";
import type { StepState } from "@/project/guided/engine";
import { assemblySteps, commandFor } from "./assembly";

const guide = {
  kind: "tour",
  title: "Tour",
  assembly: [
    { id: "a", kind: "build", action: { type: "press", id: "strip" }, done: { stripped: true }, major: false, title: { en: "Strip", es: "Quitar" }, body: "Take it off", refusal: { en: "Not yet" } },
    { id: "b", kind: "break", action: null, done: {}, fault: "short", major: false, title: "Break", body: "Short it" },
    { id: "c", kind: "test", action: null, done: {}, major: false, title: "Measure", body: "Check the rail" },
  ],
} as unknown as Guide;

const states: StepState[] = [
  { index: 0, state: "current", by: null },
  { index: 1, state: "notStarted", by: null },
];

describe("assemblySteps", () => {
  it("gives one row per step with its state and language", () => {
    const steps = assemblySteps(guide, states, "es");
    expect(steps.map((s) => [s.title, s.kind, s.state])).toEqual([
      ["Quitar", "build", "current"],
      ["Break", "break", "notStarted"],
      ["Measure", "test", "notStarted"],
    ]);
  });

  it("falls back to English and carries the refusal", () => {
    const [first] = assemblySteps(guide, states, "fr");
    expect(first.title).toBe("Strip");
    expect(first.refusal).toBe("Not yet");
  });

  it("tells figure-checked, fault and manual steps apart", () => {
    const steps = assemblySteps(guide, states, "en");
    expect(steps.map((s) => [s.needsLens, s.manual, s.fault])).toEqual([
      [true, false, null],
      [false, false, "short"],
      [false, true, null],
    ]);
  });
});

describe("commandFor", () => {
  const [build, brk] = assemblySteps(guide, states, "en");

  it("sends a build step's action", () => {
    expect(commandFor(build)).toEqual({ send: { type: "press", id: "strip" } });
    expect(commandFor({ ...build, command: { type: "act", name: "go" } })).toEqual({ send: { type: "act", name: "go" } });
    expect(commandFor({ ...build, command: { type: "set", state: { a: 1 } } })).toEqual({ send: { type: "set", state: { a: 1 } } });
  });

  it("sends nothing when the learner does the step", () => {
    expect(commandFor({ ...build, command: null })).toBeNull();
    expect(commandFor(brk)).toBeNull();
  });
});
