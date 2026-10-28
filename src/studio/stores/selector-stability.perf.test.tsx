// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Op } from "../../project/generated/types.ts";
import { seededRandom, steppingClock, USER } from "../../project/session.testing.ts";
import { createSession } from "../../project/session.ts";
import { miniProject } from "../engine/testing/mini-scene.ts";
import { createDocStore } from "./doc.ts";

const PARTS = 500;
const RUNS = 100;

function session() {
  const state = miniProject(PARTS, 0);
  for (const c of state.components) c.definition = state.boards[0]!.definition;
  return createSession({ state, clock: steppingClock(), rnd: seededRandom() });
}

const rename = (i: number): Op => ({ k: "component.set", id: "cmp_7", set: { label: `R${i}` } });
const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

function time(run: (i: number) => unknown): number[] {
  return Array.from({ length: RUNS }, (_, i) => {
    const start = performance.now();
    run(i);
    return performance.now() - start;
  });
}

describe("DocStore overhead", () => {
  it("adds under 0.2 ms to a session apply at 500 parts", () => {
    const bare = session();
    const doc = createDocStore(session());
    time((i) => bare.apply(rename(i), USER));
    time((i) => doc.commit([rename(i)], { label: "Rename", author: USER }));
    const direct = median(time((i) => bare.apply(rename(i + RUNS), USER)));
    const wrapped = median(time((i) => doc.commit([rename(i + RUNS)], { label: "Rename", author: USER })));
    console.log(`apply ${direct.toFixed(3)} ms, commit ${wrapped.toFixed(3)} ms`);
    expect(wrapped - direct).toBeLessThan(0.2);
  });
});
