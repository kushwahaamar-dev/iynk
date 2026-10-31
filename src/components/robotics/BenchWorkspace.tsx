"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LabDock } from "@/components/dock/LabDock";
import type { FigureEvent, FigureHandle } from "@/components/figure";
import { useSaved } from "@/lib/progress/hooks";
import { markDone, recordQuiz } from "@/lib/progress/progress";
import { progressKey } from "@/lib/progress/keys";
import { interpRunner, type TaskRunResult } from "@/lib/robotics/runner";
import { createBenchStore, type BenchEffect, type BenchSetup, type BenchState, type BenchStore } from "@/lib/robotics/store";
import { activeFaults } from "@/lib/robotics/steps";
import { benchMoments } from "@/lib/sound/bench-moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import { BenchView } from "./BenchView";
import { useBenchState, type BenchMessages } from "./messages";

type Props = {
  setup: BenchSetup;
  messages: BenchMessages;
  /** The untranslated-prose chip, rendered on the server; it sits in the workspace bar. */
  notice?: ReactNode;
  /** Links to the neighbouring benches, rendered on the server; they close the page. */
  walk?: ReactNode;
};

// The bridge carries only string and number data on `act` (src/components/figure/protocol.ts).
function actData(data: Record<string, unknown>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(data)) if (typeof value === "string" || typeof value === "number") out[key] = value;
  return out;
}

function useEffects(store: BenchStore, figure: FigureHandle | null, setup: BenchSetup) {
  useEffect(() => {
    const run = (effect: BenchEffect) => {
      switch (effect.kind) {
        case "send": {
          const c = effect.command;
          if (!figure) return;
          if (c.type === "set") figure.send("set", { state: c.state });
          else if (c.type === "press") figure.send("press", c.choice === undefined ? { id: c.id } : { id: c.id, choice: c.choice });
          else if (c.type === "act") figure.send("act", c.data === undefined ? { name: c.name } : { name: c.name, data: actData(c.data) });
          else figure.send("flash", c.ms === undefined ? { text: c.text } : { text: c.text, ms: c.ms });
          return;
        }
        case "done":
          markDone(effect.key);
          return;
        case "quiz":
          recordQuiz(effect.key, effect.score, effect.total);
          return;
        case "run": {
          const task = setup.bench.tasks.find((x) => x.id === effect.task);
          if (!task) return;
          const request = {
            board: task.board,
            language: task.language,
            source: effect.source,
            world: task.world,
            runMs: task.runMs,
          };
          interpRunner(request, task.checks)
            .catch((error: unknown): TaskRunResult => ({ status: "error", line: 0, message: error instanceof Error ? error.message : String(error), serial: [] }))
            .then((result) => store.dispatch({ type: "task/result", task: task.id, result }));
          return;
        }
      }
    };
    return store.connect({ run });
  }, [store, figure, setup]);
}

export function BenchWorkspace({ setup, messages, notice, walk }: Props) {
  const { bench } = setup;
  const [store] = useState(() => createBenchStore(setup));
  const state = useBenchState(store);
  const saved = useSaved();
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const figureSound = useFigureSound();

  useEffects(store, figure, setup);
  const moments = useCallback((prev: BenchState, next: BenchState) => benchMoments(bench, prev, next), [bench]);
  useLabMoments(store, moments);

  const figureState = state.figure.state;
  const active = useMemo(() => activeFaults(bench.faults, figureState), [bench.faults, figureState]);
  const savedDone = useCallback((key: string) => saved.done[key] === true, [saved.done]);
  const best = useCallback((quizId: string) => saved.quiz[progressKey.roboticsQuiz(bench.id, quizId)], [saved.quiz, bench.id]);

  const onFigure = useCallback(
    (event: FigureEvent) => {
      figureSound(event);
      switch (event.type) {
        case "ready":
          store.dispatch({ type: "figure/ready" });
          if (event.state) store.dispatch({ type: "figure/state", state: event.state });
          return;
        case "state":
          store.dispatch({ type: "figure/state", state: event.state });
          return;
        case "flash":
          store.dispatch({ type: "figure/flash", text: event.text });
          return;
        default:
          return;
      }
    },
    [store, figureSound],
  );

  return (
    <BenchView
      setup={setup}
      messages={messages}
      state={state}
      dispatch={store.dispatch}
      active={active}
      figure={figure}
      onHandle={setFigure}
      onFigure={onFigure}
      savedDone={savedDone}
      best={best}
      toolbar={<LabDock lab="robotics" itemId={bench.id} store={store} figure={figure} />}
      notice={notice}
      walk={walk}
    />
  );
}
