"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { FigureHandle, HostCommand } from "@/components/figure";
import type { DroneContent } from "@/content/schema";
import { isDesignPick } from "@/lib/drone/design";
import { buildComplete, testStatus } from "@/lib/dronelab/bench";
import { initialFly, reduceFly, type FlyAction, type FlyState } from "@/lib/dronelab/fly";
import { benchSummary, initialState, reduce, type DroneLabAction, type DroneLabState } from "@/lib/dronelab/store";
import { craftComplete, completeLab } from "@/lib/learn/lab-completion";
import { droneMoments } from "@/lib/sound/moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import type { LearnStore } from "@/local/learn-store";
import { emptyRecord, withItem } from "@/project/guided/record";
import { currentPick, type PickKey } from "@/studio/lab/craft-select";
import { pickOps } from "@/studio/lab/craft-ops";
import type { DocStore } from "@/studio/stores/doc";
import { createLabSession } from "./session";
import { sendToFigure } from "./figure-link";

type FigureSend = { kind: "send"; command: HostCommand };

const PICK_KEYS: readonly PickKey[] = ["batt", "motor", "prop"];

/** The drone `reduce` returns `{state, send}`; a lab session wants `[state, effects]`. */
export function craftStep(content: DroneContent) {
  return (state: DroneLabState, action: DroneLabAction): readonly [DroneLabState, readonly FigureSend[]] => {
    const step = reduce(content, state, action);
    return [step.state, step.send.map((command) => ({ kind: "send", command }))];
  };
}

/** `reduceFly` returns the state alone and raises no effect. */
export function flyStep(content: DroneContent) {
  return (state: FlyState, action: FlyAction): readonly [FlyState, readonly never[]] => [reduceFly(content, state, action), []];
}

function markItem(learn: LearnStore, projectId: string, item: string) {
  if (learn.get(projectId)?.items?.[item]) return;
  const at = new Date().toISOString();
  learn.update(projectId, (record) => withItem(record ?? emptyRecord(projectId, at), item, "gate", at), at);
}

function countItems(learn: LearnStore, projectId: string, prefix: string): number {
  return Object.keys(learn.get(projectId)?.items ?? {}).filter((item) => item.startsWith(prefix)).length;
}

export type CraftArgs = { doc: DocStore; content: DroneContent; learn: LearnStore };

export function useCraft({ doc, content, learn }: CraftArgs) {
  const projectId = doc.getState().state.id;
  const [sessions] = useState(() => {
    const pick = currentPick(doc.getState().state);
    const start = pick && isDesignPick(content.design, pick) ? pick : undefined;
    return {
      workshop: createLabSession(initialState(content, start), craftStep(content)),
      fly: createLabSession(initialFly(content), flyStep(content)),
    };
  });
  const { workshop, fly } = sessions;
  const workshopState = useSyncExternalStore(workshop.subscribe, workshop.getState, workshop.getState);
  const flyState = useSyncExternalStore(fly.subscribe, fly.getState, fly.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const onFigure = useFigureSound();

  useEffect(() => (figure ? workshop.connect((effect) => sendToFigure(figure, effect.command)) : undefined), [figure, workshop]);

  // the document holds the pick; the session follows it, so undo, redo and a buddy's edit move the figure too
  useEffect(() => {
    function follow() {
      const pick = currentPick(doc.getState().state);
      if (!pick) return;
      for (const key of PICK_KEYS) {
        if (pick[key] !== workshop.getState().pick[key]) workshop.dispatch({ type: "design/pick", key, value: pick[key] });
      }
    }
    follow();
    return doc.subscribe(follow);
  }, [doc, workshop]);

  const moments = useCallback((prev: DroneLabState, next: DroneLabState) => droneMoments(content, prev, next), [content]);
  useLabMoments(workshop, moments);

  // the fly page flies the bench the learner built here, from this same session
  const bench = benchSummary(workshopState);
  const benchKey = JSON.stringify(bench);
  useEffect(() => {
    fly.dispatch({ type: "bench/loaded", bench: JSON.parse(benchKey) });
  }, [benchKey, fly]);

  useEffect(() => {
    if (buildComplete(content, workshopState.figure)) markItem(learn, projectId, "build");
    for (const test of content.tests) {
      if (testStatus(test, workshopState.figure, workshopState.attempted[test.id] === true) === "passed") markItem(learn, projectId, `test:${test.id}`);
    }
    const built = learn.get(projectId)?.items?.build !== undefined;
    if (craftComplete({ built, testsPassed: countItems(learn, projectId, "test:"), tests: content.tests.length, courses: countItems(learn, projectId, "course:") })) {
      completeLab(learn, projectId, "craft", new Date().toISOString(), "T0");
    }
  }, [content, learn, projectId, workshopState.figure, workshopState.attempted]);

  const dispatchWorkshop = useCallback(
    (action: DroneLabAction) => {
      if (action.type !== "design/pick") {
        workshop.dispatch(action);
        return;
      }
      const ops = pickOps(doc.getState().state, action.key, action.value);
      if (ops.length === 0) return;
      const result = doc.commit(ops, { label: "craft.pick" });
      setRefusal(result.ok ? null : result.message);
    },
    [doc, workshop],
  );

  return {
    workshop: { state: workshopState, dispatch: dispatchWorkshop },
    fly: { state: flyState, dispatch: fly.dispatch },
    figure: { handle: figure, ref: setFigure, onEvent: onFigure },
    refusal,
  };
}
