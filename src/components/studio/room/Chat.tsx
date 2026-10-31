"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { Button, cx, EmptyState, TextArea } from "@/components/ui";
import { clipGraphemes, countGraphemes, MAX_CHAT_GRAPHEMES, type ChatLine, type ChatSnapshot } from "@/collab/chat";
import { useLocale } from "@/i18n/client";
import { useChatStore, type StudioRoomsT } from "./RoomDock";

const EMPTY: ChatSnapshot = { lines: [], muted: false, retryAfterMs: null };
const NO_UPDATES = () => () => {};
const COUNTER_FROM = MAX_CHAT_GRAPHEMES - 80;

export function useChatSnapshot(): ChatSnapshot {
  const chat = useChatStore();
  return useSyncExternalStore(
    (fn) => chat?.subscribe(fn) ?? NO_UPDATES(),
    () => chat?.getSnapshot() ?? EMPTY,
    () => EMPTY,
  );
}

function Line({ line, t }: { line: ChatLine; t: StudioRoomsT }) {
  if (line.kind === "system") {
    return (
      <li className="text-center text-xs text-muted [overflow-wrap:anywhere]">
        {t("chat.system")}: {line.text}
      </li>
    );
  }
  return (
    <li className={cx("flex flex-col gap-1 rounded-xl px-3 py-2 text-sm", line.mine ? "bg-hover" : "bg-sunken")}>
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
        <span className="font-semibold">{line.mine ? t("members.you") : line.name || t("chat.someone")}</span>: {line.text}
      </p>
    </li>
  );
}

/** The room chat: text only, shown as text, with the limits the server enforces said in words. */
export function Chat({ t }: { t: StudioRoomsT }) {
  const id = useId();
  const chat = useChatStore();
  const lang = useLocale();
  const snapshot = useChatSnapshot();
  const { lines, muted, retryAfterMs } = snapshot;
  const [draft, setDraft] = useState("");
  const [expired, setExpired] = useState<ChatSnapshot | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chat?.setLang(lang);
  }, [chat, lang]);

  useEffect(() => {
    if (retryAfterMs === null) return;
    const timer = window.setTimeout(() => setExpired(snapshot), retryAfterMs);
    return () => window.clearTimeout(timer);
  }, [snapshot, retryAfterMs]);

  useEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  function send(event?: FormEvent) {
    event?.preventDefault();
    const result = chat?.send(draft);
    if (result?.ok) setDraft("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  const used = countGraphemes(draft);
  const waiting = retryAfterMs !== null && expired !== snapshot;
  const blocked = muted || waiting;
  const notice = muted ? t("chat.muted") : waiting ? t("chat.rateLimited") : undefined;

  return (
    <section aria-label={t("chat.title")} className="flex h-full min-h-0 flex-col gap-3">
      <div ref={list} role="log" aria-label={t("chat.title")} aria-live="polite" aria-relevant="additions" className="min-h-32 flex-1 overflow-y-auto">
        {lines.length === 0 ? (
          <EmptyState icon="chat" title={t("chat.empty")} className="py-4" />
        ) : (
          <ol className="flex flex-col gap-2">
            {lines.map((line) => (
              <Line key={line.id} line={line} t={t} />
            ))}
          </ol>
        )}
      </div>
      <form onSubmit={send} className="flex flex-col gap-2">
        <TextArea
          id={`${id}-draft`}
          label={t("chat.label")}
          hideLabel
          rows={2}
          value={draft}
          onChange={(event) => setDraft(clipGraphemes(event.target.value))}
          onKeyDown={onKeyDown}
          placeholder={t("chat.placeholder")}
          error={notice}
          disabled={muted}
          className="max-h-32"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted tabular-nums">{used >= COUNTER_FROM ? t("chat.counter", { count: used, max: MAX_CHAT_GRAPHEMES }) : null}</p>
          <Button type="submit" variant="primary" disabled={blocked || draft.trim() === ""}>
            {t("chat.send")}
          </Button>
        </div>
      </form>
    </section>
  );
}
