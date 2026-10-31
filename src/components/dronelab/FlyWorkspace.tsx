"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DroneContent } from "@/content/schema";
import { LabDock } from "@/components/dock/LabDock";
import type { FigureHandle } from "@/components/figure";
import { BuddyBoard } from "@/components/flight/BuddyBoard";
import type { ChallengeEntry } from "@/components/flight/DailyChallenge";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { createFlyStore } from "@/lib/dronelab/fly";
import { readBenchSummary } from "@/lib/dronelab/session";
import { useRoom, withRoom } from "@/lib/realtime";
import { FlyView } from "./FlyView";
import { contentT, type DroneLabMessages } from "./text";

type Props = {
  lang: Locale;
  content: DroneContent;
  text: Record<string, unknown>;
  messages: DroneLabMessages;
  flight: Messages["flight"];
  /** Every craft that flies, for the daily challenge. */
  pool: ChallengeEntry[];
  /** The untranslated chip, from the server page. */
  notice?: ReactNode;
};

export function FlyWorkspace({ lang, content, text, messages, flight, pool, notice }: Props) {
  const room = useRoom();
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const [store] = useState(() => createFlyStore(content));
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const id = content.id;
  const flightT = useMemo(() => createTranslator(lang, flight, "flight"), [lang, flight]);

  useEffect(() => {
    store.dispatch({ type: "bench/loaded", bench: readBenchSummary(id) });
  }, [id, store]);

  return (
    <FlyView
      lang={lang}
      content={content}
      text={ct}
      messages={messages}
      flightMessages={flight}
      state={state}
      dispatch={store.dispatch}
      pool={pool}
      backHref={withRoom(`/${lang}/drones/${id}`, room?.id)}
      board={(slot) => <BuddyBoard craftId={id} courseId={slot.courseId} courseLabel={slot.courseLabel} lang={lang} t={flightT} refreshKey={slot.refreshKey} />}
      onFigure={setFigure}
      toolbar={<LabDock lab="drone" itemId={id} store={store} figure={figure} />}
      notice={notice}
    />
  );
}
