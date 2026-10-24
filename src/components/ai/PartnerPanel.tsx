"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { LabDockProps } from "@/components/dock/types";
import { Button, Callout, cx } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { benchFacts, describeBench } from "@/lib/ai/bench";
import { conversationFor, type SendEnv } from "@/lib/ai/conversation";
import { useAiT, type AiT } from "@/lib/ai/messages";
import { openDockTab, type ToolContext } from "@/lib/ai/run-tools";
import type { SessionLog } from "@/lib/ai/session-log";
import { suggestions } from "@/lib/ai/suggest";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { useRoom, useTogether } from "@/lib/realtime";
import { PartnerIcon } from "./icons";
import { MicButton, VoiceLine } from "./MicButton";
import { StoryCard } from "./StoryCard";
import { TurnView } from "./TurnView";
import { useBuildLog } from "./useBuildLog";
import { useVoice } from "./useVoice";

/** The AI lab partner (H4), one LabDock tab on every lab page. */
export function PartnerPanel(props: LabDockProps) {
  const locale = useLocale();
  const t = useAiT(locale);
  const { status, features } = useFeatures();
  const log = useBuildLog(props, t ? t("story.me") : "");

  if (!t) return <section aria-busy="true" className="h-full min-h-[24rem] animate-pulse rounded-ink bg-sunken" />;
  if (status === "ready" && features.ai) {
    return <PartnerChat {...props} t={t} locale={locale} log={log} voice={features.voice} image={features.image} />;
  }
  return (
    <Frame t={t}>
      <div className="flex flex-1 items-center p-4">
        {status === "loading" ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <span className="size-2 animate-ping rounded-full bg-mint" aria-hidden="true" />
            {t("status.loading")}
          </p>
        ) : status === "error" ? (
          <Callout tone="warn" title={t("status.unreachable")} className="w-full">
            <Button size="sm" className="mt-2" onClick={reloadFeatures}>
              {t("status.check")}
            </Button>
          </Callout>
        ) : (
          <Callout tone="note" title={t("status.unavailable")} className="w-full">
            {t("status.unavailableBody")}
          </Callout>
        )}
      </div>
    </Frame>
  );
}

function Frame({ t, actions, children }: { t: AiT; actions?: ReactNode; children: ReactNode }) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className="@container flex h-full min-h-[24rem] flex-col overflow-hidden rounded-ink border-2 border-line bg-paper text-ink"
    >
      <header className="flex items-center gap-2 border-b-2 border-line bg-surface px-3 py-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-line bg-mint text-on-color">
          <PartnerIcon name="spark" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="truncate font-head text-base font-extrabold leading-tight">
            {t("panel.title")}
          </h2>
          <p className="truncate font-ui text-[0.7rem] text-muted">{t("panel.byline")}</p>
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

type ChatProps = LabDockProps & { t: AiT; locale: Locale; log: SessionLog; voice: boolean; image: boolean };

function PartnerChat({ lab, itemId, store, figure, t, locale, log, voice, image }: ChatProps) {
  const conversation = conversationFor(lab, itemId);
  const { turns, busy } = useSyncExternalStore(conversation.subscribe, conversation.snapshot, conversation.snapshot);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const facts = useMemo(() => benchFacts(lab, itemId, state), [lab, itemId, state]);
  const room = useRoom();
  const together = useTogether();
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"chat" | "story">("chat");
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const pinned = useRef(true);

  // The latest figure and room, read when a tool runs (a reply can outlive a render).
  const live = useRef({ figure, room });
  useEffect(() => {
    live.current = { figure, room };
  });

  const env = (): SendEnv => ({
    lab,
    itemId,
    locale,
    store,
    log,
    me: log.self || t("story.me"),
    bench: () => describeBench(lab, itemId, store.getState()),
    peers: () => (live.current.room?.peers ?? []).map(({ id, name, lang, done }) => ({ id, name, lang, done })),
    tools: (): ToolContext => {
      const current = live.current.room;
      return {
        lab,
        store,
        figure: live.current.figure,
        openTab: openDockTab,
        room: current
          ? {
              peers: current.peers.map(({ id, name, done }) => ({ id, name, done })),
              ask: (peer, question) => current.chat(`@${peer.name} ${question}`, "ai"),
            }
          : null,
      };
    },
  });

  const send = (text: string, via: Parameters<typeof conversation.send>[1]) => void conversation.send(text, via, env());

  const { state: mic, start, stop, toggle } = useVoice(locale, (text) => send(text, "voice"));

  // Follow the reply while the reader is at the bottom; leave them be when they scroll up.
  useEffect(() => {
    const el = transcript.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [turns]);

  // Screen readers hear a finished reply once, not every streamed token.
  const lastTurn = turns.at(-1);
  const announce =
    lastTurn?.role === "assistant" && lastTurn.status === "done" && lastTurn.text
      ? `${t("panel.partner")}: ${lastTurn.text.slice(0, 280)}`
      : "";

  const submit = () => {
    if (busy || !draft.trim()) return;
    send(draft, "text");
    setDraft("");
  };

  const onPanelKey = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const typing = target.closest("textarea, input, select, [contenteditable='true']");
    if (event.key === "Escape" && busy) {
      conversation.stop();
      event.preventDefault();
    } else if (!typing && voice && (event.key === "m" || event.key === "M") && !event.metaKey && !event.ctrlKey && !event.altKey) {
      toggle();
      event.preventDefault();
    }
  };

  const decide = (turnId: string, toolId: string, accept: boolean) => conversation.decide(turnId, toolId, accept, env());

  const invite = () => {
    if (together && !together.room) together.start();
    openDockTab("together");
  };

  const lastUser = turns.findLast((turn) => turn.role === "user");
  const afterHint = !busy && lastUser?.via === "hint";
  const ideas = busy ? [] : suggestions(lab, facts, turns.length ? 2 : 3);

  const actions = (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={view === "story"}
        onClick={() => setView(view === "story" ? "chat" : "story")}
      >
        <PartnerIcon name={view === "story" ? "chat" : "book"} size={16} />
        <span className="@max-sm:sr-only">{view === "story" ? t("panel.chat") : t("story.title")}</span>
      </Button>
      {view === "chat" && turns.length ? (
        <Button variant="ghost" size="sm" onClick={() => conversation.clear()} disabled={busy}>
          <PartnerIcon name="refresh" size={16} />
          <span className="@max-sm:sr-only">{t("panel.newChat")}</span>
        </Button>
      ) : null}
    </div>
  );

  return (
    <Frame t={t} actions={actions}>
      <div onKeyDown={onPanelKey} className="flex min-h-0 flex-1 flex-col">
        {view === "story" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <StoryCard lab={lab} itemId={itemId} log={log} t={t} locale={locale} image={image} />
          </div>
        ) : (
          <>
            <div
              ref={transcript}
              tabIndex={0}
              aria-label={t("panel.transcript")}
              onScroll={(event) => {
                const el = event.currentTarget;
                pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
              }}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3"
            >
              {turns.length === 0 ? (
                <p className="rounded-ink border-2 border-dashed border-rule bg-surface p-3 text-sm leading-relaxed">
                  {t("panel.intro")}
                </p>
              ) : (
                turns.map((turn, index) => (
                  <TurnView
                    key={turn.id}
                    turn={turn}
                    first={index === 0 || turns[index - 1].role !== "assistant"}
                    t={t}
                    busy={busy}
                    onRetry={() => void conversation.retry(env())}
                    onDecide={(toolId, accept) => decide(turn.id, toolId, accept)}
                    onFlash={(partId, note) => {
                      const handle = live.current.figure;
                      handle?.send("set", { state: lab === "drone" ? { sel: partId } : { select: partId } });
                      handle?.send("flash", { text: note || partId, ms: 4000 });
                    }}
                    onInvite={invite}
                  />
                ))
              )}
            </div>

            <div className="space-y-2 border-t-2 border-line bg-surface p-3">
              {ideas.length || !busy ? (
                <div
                  role="group"
                  aria-label={t("panel.suggestions")}
                  className={cx(
                    "flex items-center gap-1.5",
                    turns.length ? "-mx-3 overflow-x-auto px-3 pb-1 [scrollbar-width:thin]" : "flex-wrap",
                  )}
                >
                  {ideas.map((idea) => {
                    const text = "params" in idea ? t(`suggest.${idea.key}`, idea.params) : t(`suggest.${idea.key}`);
                    return (
                      <button
                        key={idea.key}
                        type="button"
                        onClick={() => send(text, "suggestion")}
                        className={cx(
                          "rounded-full border-2 border-line bg-paper px-2.5 py-1 text-start text-xs font-bold shadow-ink-sm hover:-translate-y-px hover:shadow-ink active:translate-y-0 active:shadow-none [@media(pointer:coarse)]:min-h-11",
                          turns.length ? "shrink-0 whitespace-nowrap" : "max-w-full",
                        )}
                      >
                        {text}
                      </button>
                    );
                  })}
                  <span className={cx("flex shrink-0 items-center gap-1.5", turns.length ? "order-first" : "ms-auto")}>
                    {afterHint ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => send(t("hint.askAnother"), "hint")}>
                          {t("hint.another")}
                        </Button>
                        <Button size="sm" variant="ink" onClick={() => send(t("hint.askShow"), "show")}>
                          {t("hint.show")}
                        </Button>
                      </>
                    ) : busy ? null : (
                      <>
                        <span className="font-ui text-xs text-muted">{t("hint.label")}</span>
                        <Button size="sm" variant="ghost" onClick={() => send(t("hint.askHint"), "hint")}>
                          <PartnerIcon name="spark" size={14} />
                          {t("hint.hint")}
                        </Button>
                      </>
                    )}
                  </span>
                </div>
              ) : null}

              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                <label className="sr-only" htmlFor={`${lab}-${itemId}-ask`}>
                  {t("panel.inputLabel")}
                </label>
                <textarea
                  id={`${lab}-${itemId}-ask`}
                  ref={input}
                  rows={1}
                  value={draft}
                  maxLength={2000}
                  placeholder={t("panel.placeholder")}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  className="field-sizing-content max-h-32 min-h-11 min-w-0 flex-1 resize-none rounded-ink-sm border-2 border-line bg-paper px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobalt"
                />
                <MicButton t={t} voice={voice} phase={mic.phase} start={start} stop={stop} toggle={toggle} />
                {busy ? (
                  <Button type="button" variant="danger" onClick={() => conversation.stop()} aria-label={t("panel.stop")} className="size-11 px-0">
                    <PartnerIcon name="stop" />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" disabled={!draft.trim()} aria-label={t("panel.send")} className="size-11 px-0">
                    <PartnerIcon name="send" />
                  </Button>
                )}
              </form>
              <VoiceLine t={t} phase={mic.phase} problem={mic.problem} />
            </div>
          </>
        )}
        <p role="status" className="sr-only">
          {busy && lastTurn?.role === "assistant" && !lastTurn.text ? t("panel.thinking") : announce}
        </p>
      </div>
    </Frame>
  );
}
