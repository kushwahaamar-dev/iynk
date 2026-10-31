// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "../i18n/config.ts";
import { messageAt } from "../i18n/translate.ts";
import type { Diagnostic } from "../lib/interp/errors.ts";
import type { Finding } from "../sim/faults/types.ts";
import { addResistor, projectWithBreadboard } from "./testing/breadboard-fixture.ts";
import { collectProblems, nextProblem, staticProblems, type Problem, type ProblemInput } from "./problems.ts";

const diag = (over: Partial<Diagnostic>): Diagnostic => ({ kind: "compile", message: "'x' was not declared", line: 3, col: 5, ...over });

const none: ProblemInput["run"] = { limit: null, frame: null };

const everything: ProblemInput = {
  diagnostics: [
    diag({ line: 9, message: "late" }),
    diag({ kind: "unsupported", line: 2, col: 1, code: "include.unknown", args: { name: "Foo.h" }, hint: "supported libraries: Servo.h" }),
    diag({ kind: "runtime", line: 1, message: "pin 40 does not exist" }),
  ],
  run: {
    limit: { which: "statements", text: "too many steps" },
    frame: { tNs: 0, pins: {}, parts: [{ part: "cmp_buzz", kind: "none" }, { part: "cmp_led", kind: "led" }] },
  },
  flags: [
    { rule: "short-circuit", net: "net_a", pins: [{ c: "cmp_1", p: "5V" }, { c: "cmp_1", p: "GND" }] },
    { rule: "output-contention", net: "net_b", pins: [{ c: "cmp_1", p: "D2" }, { c: "cmp_1", p: "D3" }] },
  ],
};

describe("collectProblems", () => {
  it("merges the three sources, errors first and then by line", () => {
    const list = collectProblems(everything);
    expect(list.map((p) => [p.severity, p.source, p.line])).toEqual([
      ["error", "code", 2],
      ["error", "code", 9],
      ["error", "run", undefined],
      ["error", "static", undefined],
      ["warning", "code", 1],
      ["warning", "static", undefined],
      ["note", "run", undefined],
    ]);
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it("keeps code and arguments for a named diagnostic and the English text for the rest", () => {
    const [include, plain] = collectProblems(everything);
    expect(include).toMatchObject({ titleKey: "problem.include.unknown", args: { name: "Foo.h" }, col: 1, hint: "supported libraries: Servo.h" });
    expect(include.fallbackText).toBeUndefined();
    expect(plain).toMatchObject({ titleKey: "problem.interp", fallbackText: "late" });
  });

  it("gives two unknown includes two problems", () => {
    const list = collectProblems({
      ...everything,
      diagnostics: [diag({ code: "include.unknown", args: { name: "A.h" }, line: 1 }), diag({ code: "include.unknown", args: { name: "B.h" }, line: 2 })],
      run: none,
      flags: [],
    });
    expect(list.map((p) => p.args.name)).toEqual(["A.h", "B.h"]);
  });

  it("drops the line of a diagnostic that has none", () => {
    expect(collectProblems({ diagnostics: [diag({ line: 0, col: 0 })], run: none, flags: [] })[0]).toMatchObject({ line: undefined, col: undefined });
  });

  it("is empty when nothing is wrong", () => {
    expect(collectProblems({ diagnostics: [], run: none, flags: [] })).toEqual([]);
  });
});

describe("staticProblems", () => {
  const { project } = projectWithBreadboard(() => addResistor());
  const board = project.boards[0]!.id;
  const ledFinding: Finding = {
    ruleId: "rule:led-series@1",
    causeId: "led-no-series-resistor",
    symptomId: "led-burnt",
    severity: "error",
    targets: [{ kind: "pin", id: board, pin: "D13" }, { kind: "part", id: "cmp_r1" }],
    evidence: [],
    messageKey: "check.found",
    args: { led: "cmp_r1" },
  };

  it("maps a finding to a problem with the diagnosis at hint level 3", () => {
    const { problems, dropped } = staticProblems(project, [ledFinding], { sealedUnrevealed: false });
    expect(dropped).toBe(0);
    expect(problems).toEqual([
      {
        id: `rule:led-series@1:${["cmp_r1", `${board}/D13`].sort().join(":")}`,
        severity: "error",
        source: "static",
        titleKey: "check.found",
        args: { led: "cmp_r1" },
        rule: "rule:led-series@1",
        targets: ledFinding.targets,
        diagnosis: { cause_id: "led-no-series-resistor", symptom_id: "led-burnt", evidence: [], hint_level: 3 },
      },
    ]);
  });

  it("marks a finding of a run with the run source", () => {
    expect(staticProblems(project, [ledFinding], { sealedUnrevealed: false, source: "run" }).problems[0]?.source).toBe("run");
  });

  it("returns nothing while a sealed item is unrevealed", () => {
    expect(staticProblems(project, [ledFinding], { sealedUnrevealed: true })).toEqual({ problems: [], dropped: 0 });
  });

  it("drops and counts a finding whose target is not in the document", () => {
    const stray: Finding = { ...ledFinding, targets: [{ kind: "part", id: "cmp_gone" }] };
    expect(staticProblems(project, [stray, ledFinding], { sealedUnrevealed: false })).toMatchObject({ dropped: 1, problems: [{ rule: "rule:led-series@1" }] });
  });
});

describe("nextProblem", () => {
  const list = collectProblems(everything);

  it("walks forward and wraps", () => {
    expect(nextProblem(list, list[0]!.id, 1)).toBe(list[1]);
    expect(nextProblem(list, list.at(-1)!.id, 1)).toBe(list[0]);
  });

  it("walks back and wraps", () => {
    expect(nextProblem(list, list[1]!.id, -1)).toBe(list[0]);
    expect(nextProblem(list, list[0]!.id, -1)).toBe(list.at(-1));
  });

  it("starts at the first or last problem when none is current", () => {
    expect(nextProblem(list, null, 1)).toBe(list[0]);
    expect(nextProblem(list, "gone", -1)).toBe(list.at(-1));
  });

  it("returns nothing for an empty list", () => {
    expect(nextProblem([], null, 1)).toBeNull();
  });
});

describe("problem texts", () => {
  const keys = new Set<string>(collectProblems(everything).map((p: Problem) => p.titleKey));
  for (const which of ["operations", "memory", "time"]) keys.add(`problem.limit.${which}`);
  keys.delete("problem.interp");

  it.each(LOCALES)("%s has a template for every key a problem can use", (locale) => {
    const messages: unknown = JSON.parse(readFileSync(join(process.cwd(), `src/i18n/messages/${locale}/studioCode.json`), "utf8"));
    for (const key of keys) expect(typeof messageAt(messages, key), `${locale} ${key}`).toBe("string");
  });
});
