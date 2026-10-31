import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/studioWire.json";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { miniProject } from "@/studio/engine/testing/mini-scene";
import { createDocStore } from "@/studio/stores/doc";
import { createSessionStore } from "@/studio/stores/session";
import { Outline } from "./Outline";

const PARTS = 500;
const RUNS = 20;
const BUDGET_MS = 50;

const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

describe("Outline", () => {
  it(`renders ${PARTS} parts in under ${BUDGET_MS} ms`, () => {
    const project = miniProject(PARTS, 30);
    const doc = createDocStore(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
    const session = createSessionStore(project.views[0]!.id);
    const times = Array.from({ length: RUNS }, () => {
      const start = performance.now();
      render(<Outline doc={doc} session={session} messages={messages} lang="en" />);
      const took = performance.now() - start;
      cleanup();
      return took;
    });
    const m = median(times);
    console.log(`outline render ${m.toFixed(1)} ms at ${PARTS} parts`);
    expect(m).toBeLessThan(BUDGET_MS);
  });
});
