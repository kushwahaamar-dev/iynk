"use client";

import { useMemo, type ReactNode } from "react";
import { CraftView } from "@/components/dronelab/CraftView";
import type { ChallengeEntry } from "@/components/flight/DailyChallenge";
import { contentT, type DroneLabMessages } from "@/components/dronelab/text";
import type { DroneContent } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import type { LearnStore } from "@/local/learn-store";
import type { DocStore } from "@/studio/stores/doc";
import { FlyPanel } from "./FlyPanel";
import { useCraft } from "./useCraft";

type Props = {
  doc: DocStore;
  learn: LearnStore;
  content: DroneContent;
  /** The craft's prose in the page's language (src/i18n/content/<lang>/drones/<id>.json). */
  text: Record<string, unknown>;
  messages: DroneLabMessages;
  flightMessages: Messages["flight"];
  /** Every craft that flies, for the daily challenge. */
  pool: ChallengeEntry[];
  lang: Locale;
  view: "workshop" | "fly";
  /** Above the panel, in the status strip. */
  notice?: ReactNode;
};

export function CraftPanel({ doc, learn, content, text, messages, flightMessages, pool, lang, view, notice }: Props) {
  const { workshop, fly, figure, refusal } = useCraft({ doc, content, learn });
  const ct = useMemo(() => contentT(lang, content.id, text), [lang, content.id, text]);
  const projectId = doc.getState().state.id;
  const note = (
    <>
      {notice}
      {refusal ? (
        <p role="status" className="text-sm text-bad">
          {refusal}
        </p>
      ) : null}
    </>
  );

  if (view === "fly") {
    return (
      <FlyPanel
        lang={lang}
        content={content}
        text={ct}
        messages={messages}
        flightMessages={flightMessages}
        state={fly.state}
        dispatch={fly.dispatch}
        pool={pool}
        backHref={`#/${projectId}`}
        notice={note}
      />
    );
  }
  return (
    <CraftView
      lang={lang}
      content={content}
      text={ct}
      messages={messages}
      state={workshop.state}
      dispatch={workshop.dispatch}
      figure={figure.handle}
      figureRef={figure.ref}
      onFigure={figure.onEvent}
      flyHref={`#/${projectId}/fly`}
      notice={note}
    />
  );
}
