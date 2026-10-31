// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  emptyRecord,
  withAnswer,
  withCompletion,
  withEdited,
  withHintLevel,
  withLastRun,
  withStep,
} from "./record.ts";

const NOW = "2026-10-31T10:00:00.000Z";
const LATER = "2026-10-31T11:00:00.000Z";

describe("learner record helpers", () => {
  it("return a new object and leave the input alone", () => {
    const r = emptyRecord("prj_uno-r3-blink", NOW, "uno-r3-blink");
    const copy = structuredClone(r);
    const next = [
      withStep(r, 0, "gate", NOW),
      withAnswer(r, "q1", "a", 2, true, 3),
      withLastRun(r, { at: NOW, tier: "T1", tests: { t: { c: true } } }),
      withHintLevel(r, 2),
      withEdited(r, NOW),
      withCompletion(r, { gates: { checks: true, edit: true, quiz: null, goal: null }, tier: "T1", sourceSha256: "x", hintsMax: 0, engineVersions: {}, legacy: false }, NOW),
    ];
    for (const n of next) expect(n).not.toBe(r);
    expect(r).toEqual(copy);
  });

  it("keeps the first stamp of a step", () => {
    const once = withStep(emptyRecord("p", NOW), 3, "gate", NOW);
    expect(withStep(once, 3, "manual", LATER).steps["3"]).toEqual({ doneAt: NOW, by: "gate" });
  });

  it("throws outside the bounds", () => {
    const r = emptyRecord("p", NOW);
    expect(() => withStep(r, 64, "gate", NOW)).toThrow(RangeError);
    expect(() => withStep(r, -1, "gate", NOW)).toThrow(RangeError);
    const full = Array.from({ length: 8 }, (_, i) => `q${i}`).reduce((acc, id) => withAnswer(acc, id, "a", 0, true, 1), r);
    expect(() => withAnswer(full, "q8", "a", 0, true, 1)).toThrow(RangeError);
    expect(withAnswer(full, "q0", "b", 0, true, 1).quiz.q0.correct).toBe(2);
  });

  it("counts only the first answer to a question", () => {
    const first = withAnswer(emptyRecord("p", NOW), "q", "a", 1, false, 2);
    const again = withAnswer(first, "q", "a", 2, true, 2);
    expect(again.quiz.q).toEqual({ answers: { a: 2 }, correct: 0, total: 2 });
  });

  it("stamps the completion and latches the edit", () => {
    const c = withCompletion(emptyRecord("p", NOW), { gates: { checks: true, edit: true, quiz: null, goal: null }, tier: "T2", sourceSha256: "x", hintsMax: 1, engineVersions: {}, legacy: false }, LATER);
    expect(c.completion?.at).toBe(LATER);
    const edited = withEdited(emptyRecord("p", NOW), NOW);
    expect(withEdited(edited, LATER)).toBe(edited);
    expect(edited.editedAt).toBe(NOW);
  });

  it("only raises the hint level", () => {
    const r = withHintLevel(emptyRecord("p", NOW), 3);
    expect(withHintLevel(r, 1)).toBe(r);
  });
});
