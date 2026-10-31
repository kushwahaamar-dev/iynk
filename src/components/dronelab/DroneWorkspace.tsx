"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DroneContent } from "@/content/schema";
import { LabDock } from "@/components/dock/LabDock";
import type { FigureHandle, HostCommand } from "@/components/figure";
import type { Locale } from "@/i18n/config";
import { isDesignPick } from "@/lib/drone/design";
import { buildComplete, testStatus } from "@/lib/dronelab/bench";
import { readBenchSummary, writeBenchSummary } from "@/lib/dronelab/session";
import { benchSummary, createDroneLabStore, type DroneLabState } from "@/lib/dronelab/store";
import { progressKey } from "@/lib/progress/keys";
import { markDone } from "@/lib/progress/progress";
import { useRoom, withRoom } from "@/lib/realtime";
import { droneMoments } from "@/lib/sound/moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import { CraftView } from "./CraftView";
import { contentT, type DroneLabMessages } from "./text";

/** Host -> figure: the store's commands go out only through FigureFrame's handle (D14b). */
function sendTo(figure: FigureHandle, command: HostCommand) {
  if (command.type === "set") figure.send("set", { state: command.state });
  else if (command.type === "press")
    figure.send("press", { id: command.id, ...(command.choice ? { choice: command.choice } : {}) });
}

type Props = {
  lang: Locale;
  content: DroneContent;
  text: Record<string, unknown>;
  messages: DroneLabMessages;
  /** The untranslated chip, from the server page. */
  notice?: ReactNode;
};

export function DroneWorkspace({ lang, content, text, messages, notice }: Props) {
  const room = useRoom();
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createDroneLabStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const id = content.id;
  const dispatch = store.dispatch;
  useEffect(() => (figure ? store.connect((command) => sendTo(figure, command)) : undefined), [figure, store]);
  const moments = useCallback((prev: DroneLabState, next: DroneLabState) => droneMoments(content, prev, next), [content]);
  useLabMoments(store, moments);
  const figureSound = useFigureSound();

  // The design picked earlier in this tab, restored after hydration so server and client render the same.
  useEffect(() => {
    const saved = readBenchSummary(id);
    if (!saved || !isDesignPick(content.design, saved.pick)) return;
    for (const key of ["batt", "motor", "prop"] as const) {
      if (saved.pick[key] !== store.getState().pick[key]) dispatch({ type: "design/pick", key, value: saved.pick[key] });
    }
  }, [id, content.design, store, dispatch]);

  useEffect(() => {
    writeBenchSummary(id, benchSummary(state));
  }, [id, state]);

  // Progress (D7): the build once every step holds, a test once the learner ran it and it passed.
  useEffect(() => {
    if (buildComplete(content, state.figure)) markDone(progressKey.droneBuild(id));
    for (const test of content.tests) {
      if (testStatus(test, state.figure, state.attempted[test.id] === true) === "passed")
        markDone(progressKey.droneTest(id, test.id));
    }
  }, [content, id, state.figure, state.attempted]);

  return (
    <CraftView
      lang={lang}
      content={content}
      text={ct}
      messages={messages}
      state={state}
      dispatch={dispatch}
      figure={figure}
      figureRef={setFigure}
      onFigure={figureSound}
      flyHref={withRoom(`/${lang}/drones/${id}/fly`, room?.id)}
      toolbar={<LabDock lab="drone" itemId={id} store={store} figure={figure} />}
      notice={notice}
    />
  );
}
