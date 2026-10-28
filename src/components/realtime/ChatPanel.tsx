"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Button, Chip, cx, EmptyState, TextArea } from "@/components/ui";
import { htmlLang, type Locale } from "@/i18n/config";
import { useFeatures } from "@/lib/features";
import { MAX_CHAT_LENGTH, type ChatMsg, type Peer, type RoomApi, type SystemEvent } from "@/lib/realtime";
import type { TogetherT } from "./messages";
import { PeerAvatar } from "./PeerAvatar";
import { VoiceButton } from "./VoiceButton";

function systemLine(t: TogetherT, event: SystemEvent): string {
  switch (event.event) {
    case "baton":
      return t("chat.system.baton", { by: event.byName || t("chat.someone"), name: event.name || t("chat.someone") });
    case "baton-request":
      return t("chat.system.batonRequest", { name: event.name || t("chat.someone") });
    default:
      return t(`chat.system.${event.event}`, { name: event.name || t("chat.someone") });
  }
}

function Message({
  msg,
  sender,
  mine,
  locale,
  t,
  translating,
  time,
}: {
  msg: ChatMsg;
  sender: Peer | undefined;
  mine: boolean;
  locale: Locale;
  t: TogetherT;
  translating: boolean;
  time: string;
}) {
  const [original, setOriginal] = useState(false);
  const translation = msg.lang !== locale ? msg.translations[locale] : undefined;
  const shown = translation !== undefined && !original ? translation : msg.text;
  const name = sender?.name ?? msg.name ?? t("chat.someone");

  return (
    <li className={cx("flex gap-2", mine && "flex-row-reverse")}>
      <PeerAvatar name={name} color={sender?.color ?? "var(--rule)"} size="sm" className="mt-0.5" />
      <div className={cx("flex min-w-0 max-w-[85%] flex-col gap-0.5", mine && "items-end")}>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-semibold text-ink">{name}</span>
          <time dateTime={new Date(msg.ts).toISOString()}>{time}</time>
          {msg.kind === "voice" || msg.kind === "ai" ? (
            <Chip tone={msg.kind === "voice" ? "neutral" : "info"}>{t(`chat.kind.${msg.kind}`)}</Chip>
          ) : null}
        </p>
        <p
          lang={htmlLang(translation !== undefined && !original ? locale : msg.lang)}
          className={cx(
            "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
            mine ? "bg-hover" : "bg-sunken",
            msg.pending && "opacity-70",
          )}
        >
          {shown}
        </p>
        {msg.pending ? <p className="text-xs text-muted">{t("chat.sending")}</p> : null}
        {msg.lang !== locale ? (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
            {translation !== undefined ? (
              <>
                <span>{t("chat.translatedFrom", { lang: t(`languages.${msg.lang}`) })}</span>
                <Button size="sm" variant="ghost" onClick={() => setOriginal((v) => !v)} className="-my-2 px-2 py-1 text-xs underline underline-offset-2">
                  {original ? t("chat.showTranslation") : t("chat.showOriginal")}
                </Button>
              </>
            ) : msg.untranslated?.includes(locale) ? (
              <span>{t("chat.translateFailed")}</span>
            ) : translating ? (
              <span>{t("chat.translating")}</span>
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** The room chat: every line in the reader's language, the original a tap away; voice too. */
export function ChatPanel({ room, t, locale }: { room: RoomApi; t: TogetherT; locale: Locale }) {
  const id = useId();
  const { features, status } = useFeatures();
  const [draft, setDraft] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const everyone = useMemo(() => new Map([room.you, ...room.peers].map((peer) => [peer.id, peer])), [room.you, room.peers]);
  const clock = useMemo(() => new Intl.DateTimeFormat(htmlLang(locale), { hour: "numeric", minute: "2-digit" }), [locale]);
  const count = room.messages.length;

  // Stay at the newest line unless the reader scrolled up to read.
  useEffect(() => {
    const el = list.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [count]);

  // The reader is at the bottom while the end marker is in view.
  useEffect(() => {
    const marker = end.current;
    if (!marker) return;
    const observer = new IntersectionObserver(([entry]) => (pinned.current = entry.isIntersecting), { root: list.current, rootMargin: "0px 0px 48px 0px" });
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    room.chat(text);
    setDraft("");
    pinned.current = true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const translateReady = status === "ready" && features.ai;
  const voiceReady = status === "ready" && features.voice;
  // What isn't set up, said once: not one line above the chat and another under it.
  const offNote =
    status !== "ready" ? null : !features.ai && !features.voice ? t("chat.offBoth") : !features.ai ? t("chat.translateOff") : !features.voice ? t("chat.voice.off") : null;

  return (
    <section aria-labelledby={`${id}-title`} className="flex min-h-0 flex-col gap-2">
      <h3 id={`${id}-title`} className="font-head text-base font-bold">
        {t("chat.title")}
      </h3>
      {offNote ? <p className="text-xs text-muted">{offNote}</p> : null}
      <div
        ref={list}
        role="log"
        aria-labelledby={`${id}-title`}
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className="flex max-h-80 min-h-32 flex-col gap-3 overflow-y-auto rounded-xl border border-rule p-3"
      >
        {count === 0 ? (
          <EmptyState icon="chat" title={t("chat.empty")} className="m-auto py-4" />
        ) : (
          <ol className="flex flex-col gap-3">
            {room.messages.map((msg) =>
              msg.kind === "system" && msg.system ? (
                <li key={msg.id} className="text-center text-xs text-muted">
                  {systemLine(t, msg.system)}
                </li>
              ) : (
                <Message
                  key={msg.id}
                  msg={msg}
                  sender={everyone.get(msg.from)}
                  mine={msg.from === room.you.id}
                  locale={locale}
                  t={t}
                  translating={translateReady}
                  time={clock.format(msg.ts)}
                />
              ),
            )}
          </ol>
        )}
        <div ref={end} aria-hidden="true" className="-mt-3 h-px shrink-0" />
      </div>
      <form onSubmit={send} className="flex items-end gap-2">
        {voiceReady ? <VoiceButton t={t} lang={locale} enabled onText={(text, lang) => room.chat(text, "voice", { lang })} /> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <TextArea
            id={`${id}-draft`}
            label={t("chat.label")}
            hideLabel
            value={draft}
            onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHAT_LENGTH))}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_CHAT_LENGTH}
            placeholder={t("chat.placeholder")}
            className="max-h-32"
          />
          {draft.length > MAX_CHAT_LENGTH - 80 ? (
            <p className="text-right text-xs text-muted tabular-nums">{t("chat.count", { count: draft.length, max: MAX_CHAT_LENGTH })}</p>
          ) : null}
        </div>
        <Button type="submit" variant="primary" disabled={!draft.trim()}>
          {t("chat.send")}
        </Button>
      </form>
    </section>
  );
}
