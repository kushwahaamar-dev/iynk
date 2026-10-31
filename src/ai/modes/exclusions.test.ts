// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Project } from "../../project/generated/types.ts";
import { excludeFromDiagnostics, excludeFromProject, omittedLine } from "./exclusions.ts";
import type { ExclusionCtx } from "./exclusions.ts";

const MARKERS = ["SECRET-ANSWER-1", "SECRET-WHY-1", "HIDDEN-REGEX-1", "CAUSE-X-1", "HINT-3-TEXT"];

function deepFreeze<T>(x: T): T {
  if (typeof x === "object" && x !== null && !Object.isFrozen(x)) {
    Object.freeze(x);
    for (const v of Object.values(x)) deepFreeze(v);
  }
  return x;
}

const question = (id: string, n: number) => ({ id, q: `Question ${id}`, options: ["a", "b"], answer: n, why: `SECRET-WHY-${n}` });

const project = deepFreeze({
  tests: [
    {
      id: "t1",
      name: "Blink",
      checks: [
        { id: "c1", kind: "serial-contains", label: "visible", visibility: "visible" },
        { id: "c2", kind: "serial-matches", label: "HIDDEN-REGEX-1", visibility: "hidden" },
        { id: "c3", kind: "serial-matches", label: "other", visibility: "hidden" },
      ],
    },
  ],
  guide: {
    kind: "lesson",
    title: "Lesson",
    hints: ["hint one", "hint two", "HINT-3-TEXT"],
    quizzes: [{ id: "z1", questions: [{ ...question("q1", 1), why: "SECRET-ANSWER-1" }, question("q2", 0)] }],
  },
  simulation: {
    faults: [
      { id: "f1", cause_id: "CAUSE-X-1", symptom_ids: [] },
      { id: "f2", cause_id: "CAUSE-X-1", symptom_ids: [] },
    ],
  },
} as unknown as Project);

const redact = (p: Project): Project => ({
  ...p,
  simulation: { ...p.simulation, faults: p.simulation.faults.map((f) => ({ ...f, cause_id: "(hidden)" })) },
});

const ctx = (extra: Partial<ExclusionCtx> = {}): ExclusionCtx => ({
  mode: "socratic",
  ladderLevel: 1,
  answeredQuizzes: new Set(),
  hint: { redact },
  showHiddenCount: true,
  ...extra,
});

describe("excludeFromProject", () => {
  it("drops all four kinds in socratic at level 1", () => {
    const { state, omitted } = excludeFromProject(project, ctx());
    const text = JSON.stringify(state);
    for (const marker of MARKERS) expect(text).not.toContain(marker);
    expect(text).toContain("hint one");
    expect(text).toContain("Question q1");
    expect(omitted).toEqual({ hiddenChecks: 2, quizAnswers: 2, hints: 2, faultCauses: 2 });
  });

  it("keeps hints and answered quiz answers in direct, still dropping hidden checks and causes", () => {
    const { state, omitted } = excludeFromProject(project, ctx({ mode: "direct", ladderLevel: 0, answeredQuizzes: new Set(["q1"]) }));
    const text = JSON.stringify(state);
    expect(text).toContain("HINT-3-TEXT");
    expect(text).toContain("SECRET-ANSWER-1");
    expect(text).not.toContain("SECRET-WHY-0");
    expect(text).not.toContain("HIDDEN-REGEX-1");
    expect(text).not.toContain("CAUSE-X-1");
    expect(omitted).toMatchObject({ hiddenChecks: 2, quizAnswers: 1, hints: 0 });
  });

  it("keeps three hints at level 3 and the answers stay out in socratic", () => {
    const { state } = excludeFromProject(project, ctx({ ladderLevel: 3, answeredQuizzes: new Set(["q1", "q2"]) }));
    expect(state.guide?.hints).toHaveLength(3);
    expect(JSON.stringify(state)).not.toContain("SECRET-WHY-1");
  });

  it("shares untouched branches and returns the input when nothing applies", () => {
    const { state } = excludeFromProject(project, ctx());
    expect(state.tests[0]!.checks[0]).toBe(project.tests[0]!.checks[0]);
    const bare = deepFreeze({ tests: [], simulation: { faults: [] } } as unknown as Project);
    expect(excludeFromProject(bare, ctx({ hint: { redact: (p) => p } })).state).toBe(bare);
  });
});

describe("excludeFromDiagnostics", () => {
  const rows = [{ symptom: "s", causeId: "CAUSE-X-1", evidence: [1] }];

  it("withholds the cause below level 3 and the evidence below level 2", () => {
    expect(excludeFromDiagnostics(rows, ctx({ ladderLevel: 1 }))).toEqual([{ symptom: "s" }]);
    expect(excludeFromDiagnostics(rows, ctx({ ladderLevel: 2 }))).toEqual([{ symptom: "s", evidence: [1] }]);
    expect(excludeFromDiagnostics(rows, ctx({ ladderLevel: 3 }))[0]).toBe(rows[0]);
  });
});

describe("omittedLine", () => {
  const o = { hiddenChecks: 2, quizAnswers: 0, hints: 0, faultCauses: 0 };

  it("names the count, and stays empty when off or zero", () => {
    expect(omittedLine(o, true)).toBe("2 hidden checks exist");
    expect(omittedLine({ ...o, hiddenChecks: 1 }, true)).toBe("1 hidden check exists");
    expect(omittedLine(o, false)).toBe("");
    expect(omittedLine({ ...o, hiddenChecks: 0 }, true)).toBe("");
  });
});
