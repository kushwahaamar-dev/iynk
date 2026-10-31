// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { quad5Fixture as content } from "./__fixtures__/quad5";
import { calcPatch, figureInitial, initialState, quizScore, reduce } from "./workshop";

describe("workshop reducer", () => {
  test("a design pick sends the design and the calculator numbers; a bad pick changes nothing", () => {
    const s0 = initialState(content);
    const step = reduce(content, s0, { type: "design/pick", key: "batt", value: "4s1500" });
    expect(step.state.pick.batt).toBe("4s1500");
    expect(step.send).toEqual([
      { type: "set", state: { design: step.state.pick, calc: calcPatch(content, step.state.pick) } },
    ]);
    expect(reduce(content, s0, { type: "design/pick", key: "batt", value: "nope" }).state).toBe(s0);
  });

  test("the figure starts from the page's pick", () => {
    const s = initialState(content);
    expect(figureInitial(content, s)).toMatchObject({ design: s.pick, sheet: null, exploded: false, sel: null });
  });

  test("quiz: a right answer ends the question and scores on the first pick", () => {
    const quiz = content.quizzes[0];
    const question = quiz.questions[0];
    const s = reduce(content, initialState(content), {
      type: "quiz/answer",
      quiz: quiz.id,
      question: question.id,
      option: question.answer,
    }).state;
    expect(quizScore(content, s, quiz.id).score).toBe(1);
  });

  test("sync/hydrate takes a saved state and ignores another craft's", () => {
    const s = initialState(content);
    const host = reduce(content, s, { type: "sheet", sheet: "wiring" }).state;
    const step = reduce(content, s, { type: "sync/hydrate", state: JSON.parse(JSON.stringify(host)) });
    expect(step.state.sheet).toBe("wiring");
    expect(reduce(content, s, { type: "sync/hydrate", state: { ...s, id: "whoop" } })).toEqual({ state: s, send: [] });
  });
});

describe("layering", () => {
  test("workshop.ts does not import the store", () => {
    const source = readFileSync(new URL("./workshop.ts", import.meta.url), "utf8");
    expect(source).not.toContain('from "./store"');
  });
});
