// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildAssembly,
  buildChecks,
  buildLegacyFigure,
  buildParameters,
  buildQuizzes,
  buildSerialSample,
  buildStarter,
  buildWorld,
  projectUnit,
} from "./guide.ts";
import { loadBoard } from "./convert.testing.ts";
import type { LoadedBoard } from "./convert.testing.ts";
import { translator } from "./text.ts";
import type { ConvertLesson } from "./types.ts";

let uno: LoadedBoard;
let t: ReturnType<typeof translator>;
const lesson = (id: string): ConvertLesson => uno.item.data.lessons.find((l) => l.id === id)!;

beforeAll(async () => {
  uno = await loadBoard("uno-r3");
  t = translator(uno.texts);
});

describe("buildAssembly", () => {
  it("keeps the fields of a step and resolves its text", () => {
    const [step] = uno.item.data.assembly;
    const [built] = buildAssembly([step!], t);
    const { title, body, ...rest } = step!;
    expect(built).toMatchObject({ ...rest, title: { en: uno.texts.en[title] }, body: { en: uno.texts.en[body] } });
    expect(built).not.toHaveProperty("refusal");
  });

  it("resolves the refusal of a step that has one", () => {
    const step = uno.item.data.assembly.find((s) => s.refusal !== undefined)!;
    expect(buildAssembly([step], t)[0]!.refusal).toMatchObject({ en: uno.texts.en[step.refusal!] });
  });
});

describe("buildQuizzes", () => {
  it("turns the quiz of a lesson into a one-item list", () => {
    const quiz = lesson("button").quiz!;
    const [built] = buildQuizzes([quiz], t);
    expect(built!.id).toBe(quiz.id);
    expect(built).not.toHaveProperty("afterStep");
    expect(built!.questions).toHaveLength(quiz.questions.length);
    expect(built!.questions[0]).toMatchObject({ id: "q1", answer: 0, q: { en: "What does the 10 kΩ resistor do?" } });
    expect(built!.questions[0]!.options).toHaveLength(3);
  });

  it("keeps the step a quiz follows", () => {
    const quiz = { ...lesson("button").quiz!, afterStep: "unplug" };
    expect(buildQuizzes([quiz], t)[0]!.afterStep).toBe("unplug");
  });
});

describe("buildParameters", () => {
  it("writes a choice chip with its options and the figure binding", () => {
    const { parameters, bindings, lost } = buildParameters(lesson("button").params, t);
    expect(parameters.map((p) => [p.id, p.name, p.kind, p.value])).toEqual([
      ["par_logic", "logic", "choice", "hold"],
      ["par_color", "color", "choice", "red"],
    ]);
    expect(parameters[1]!.options!.map((o) => o.value)).toEqual(["red", "yellow", "green", "blue", "white"]);
    expect(bindings).toEqual([{ parameter: "par_color", part: "LED1", key: "color" }]);
    expect(lost).toEqual(["logic: option notes"]);
  });

  it("takes the value the figure reads for a chip that drives a part", () => {
    const { parameters } = buildParameters(lesson("blink").params, t);
    const resistor = parameters.find((p) => p.name === "resistor")!;
    expect(resistor.value).toBe(220);
    expect(resistor.options!.map((o) => o.value)).toEqual([220, 1000, 10000]);
  });

  it("writes a number chip with its range, step and the units the schema has", () => {
    const chips = lesson("knob").params;
    const { parameters, lost } = buildParameters(chips, t);
    const every = parameters.find((p) => p.name === "every")!;
    const chip = chips.find((c) => c.id === "every")!;
    expect(every).toMatchObject({ kind: "number", value: chip.default, min: (chip as { min: number }).min, step: (chip as { step: number }).step });
    expect(every.unit).toBeUndefined();
    expect(lost).toContain("every: unit ms");
  });

  it("writes keepApart with the id of the other parameter", () => {
    const label = "lessons.button.params.logic.label";
    const chips = [
      { id: "lo", kind: "number", label, default: 10, min: 0, max: 100, step: 1, keepApart: { param: "hi", op: "<", gap: 5 } },
      { id: "hi", kind: "number", label, default: 12, min: 0, max: 100, step: 1 },
    ] as const;
    const [lo, hi] = buildParameters(chips, t).parameters;
    expect(lo!.keepApart).toEqual({ param: "par_hi", op: "<", gap: 5 });
    expect([lo!.value, hi!.value]).toEqual([10, 15]);
  });

  it("writes a toggle chip as a boolean", () => {
    const chip = { id: "on", kind: "toggle", label: "lessons.button.params.logic.label", default: true, code: { on: "1", off: "0" } } as const;
    expect(buildParameters([chip], t).parameters[0]).toMatchObject({ kind: "toggle", value: true });
  });

  it("maps the units the schema knows and drops the rest", () => {
    expect([projectUnit("Hz"), projectUnit("%"), projectUnit("°C"), projectUnit("V"), projectUnit("ms"), projectUnit(undefined)]).toEqual([
      "Hz",
      "percent",
      "degC",
      "V",
      undefined,
      undefined,
    ]);
  });
});

describe("buildStarter", () => {
  const english = (key: string) => uno.texts.en[key]!;

  it("keeps the slots, resolves the comments and lists what each choice writes", () => {
    const l = lesson("button");
    const starter = buildStarter(l.code, l.params, "src_sketch", english);
    expect(starter.source).toBe("src_sketch");
    expect(starter.template).toContain("{{p:logic}}");
    expect(starter.template).toContain("// the reading from the last loop");
    expect(starter.splices!.logic).toEqual({ hold: "  digitalWrite(LED, now);", toggle: expect.stringContaining("lit = !lit;") });
    expect(Object.keys(starter.splices!.color!)).toEqual(["red", "yellow", "green", "blue", "white"]);
  });

  it("lists a toggle by true and false and leaves a number chip out", () => {
    const code = { source: "x={{p:t}} y={{p:n}}", libraries: [] };
    const chips = [
      { id: "t", kind: "toggle", label: "k", default: false, code: { on: "ON", off: "OFF" } },
      { id: "n", kind: "number", label: "k", default: 1, min: 0, max: 2, step: 1 },
    ] as const;
    expect(buildStarter(code, chips, "src_a", english)).toEqual({ source: "src_a", template: code.source, splices: { t: { true: "ON", false: "OFF" } } });
  });

  it("has no splices for a lesson without chips", () => {
    const starter = buildStarter({ source: "void loop() {}", libraries: [] }, [], "src_a", english);
    expect(starter).toEqual({ source: "src_a", template: "void loop() {}" });
  });
});

describe("buildChecks", () => {
  it("gives each check an id and visibility and the label as text, and nothing else changes", () => {
    const l = lesson("button");
    const checks = buildChecks(l.checks, t);
    expect(checks.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(checks[0]).toMatchObject({ kind: "responds", visibility: "visible", pin: "D13", withinMs: 60, label: { en: "D13 goes HIGH within 60 ms of the first press" } });
    expect(checks[3]).toMatchObject({ kind: "code", must: ["digitalRead(BUTTON)"], mustNot: [] });
  });
});

describe("buildWorld", () => {
  it("points an input at its component and its pins at the board", () => {
    const { world, lost } = buildWorld(lesson("button").world, t, {
      component: (part) => `cmp_${part.toLowerCase()}`,
      pin: (name) => ({ c: "brd_main", p: name }),
    });
    expect(world.inputs).toHaveLength(1);
    expect(world.inputs[0]).toMatchObject({ id: "button", component: "cmp_btn1", pins: [{ c: "brd_main", p: "D2" }], label: { en: "Button on D2" } });
    expect(world.script).toEqual(lesson("button").world.script);
    expect(lost).toEqual([]);
  });

  it("leaves out a pin that does not resolve and a unit the schema lacks", () => {
    const l = lesson("distance");
    const { world, lost } = buildWorld(l.world, t, { component: () => "brd_main", pin: () => null });
    expect(world.inputs.every((i) => i.pins === undefined)).toBe(true);
    expect(lost.some((x) => x.includes("unit cm"))).toBe(true);
  });
});

describe("buildSerialSample and buildLegacyFigure", () => {
  it("renames sample to lines", () => {
    expect(buildSerialSample({ baud: 9600, sample: ["a", "b"] })).toEqual({ baud: 9600, lines: ["a", "b"] });
  });

  it("keeps the page and sheets of the figure and adds the circuit and variant when there are some", () => {
    const { figure } = uno.item.data;
    expect(buildLegacyFigure(figure, "button")).toEqual({ page: figure.page, circuit: "button", sheets: figure.sheets });
    expect(buildLegacyFigure(figure, null, "wifi")).toEqual({ page: figure.page, variant: "wifi", sheets: figure.sheets });
  });
});
