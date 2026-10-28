"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, TextInput, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { formatStamp, type RunStore, type SerialEntry } from "@/studio/stores/run";
import { useStoreSelector } from "@/studio/stores/select";
import type { SimLink } from "./wiring/simLink";

export interface SerialPaneProps {
  run: RunStore;
  link: SimLink;
  messages: Messages["studioRun"];
  lang: Locale;
}

/** A screen reader hears at most one summary per this many milliseconds, however fast the code prints. */
export const ANNOUNCE_MS = 2000;

const KIND_CLASS: Record<SerialEntry["kind"], string> = {
  out: "text-console-ink",
  in: "text-console-accent",
  sys: "text-console-muted",
};

const Row = memo(function Row({ entry }: { entry: SerialEntry }) {
  return (
    <div className={cx("whitespace-pre-wrap break-words", KIND_CLASS[entry.kind])} data-kind={entry.kind}>
      <span className="me-2 select-none text-console-muted tabular-nums">{formatStamp(entry.tNs)}</span>
      {entry.kind === "in" ? `> ${entry.text}` : entry.text}
    </div>
  );
});

function useAnnouncement(lastId: number, say: (count: number) => string): string {
  const [text, setText] = useState("");
  const told = useRef(0);

  useEffect(() => {
    if (lastId < told.current) told.current = 0;
    if (lastId === told.current) return;
    const timer = setTimeout(() => {
      setText(say(lastId - told.current));
      told.current = lastId;
    }, ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [lastId, say]);

  return text;
}

export function SerialPane({ run, link, messages, lang }: SerialPaneProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioRun`), [lang, messages]);
  const serial = useStoreSelector(run, (s) => s.serial);
  const dropped = useStoreSelector(run, (s) => s.serialDropped);
  const running = useStoreSelector(run, (s) => s.phase === "running");
  const [draft, setDraft] = useState("");
  const [copyNote, setCopyNote] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledHeight = useRef(0);

  const lastId = serial.length > 0 ? serial[serial.length - 1]!.id : 0;
  const say = useCallback((count: number) => t("serial.newLines", { count }), [t]);
  const announcement = useAnnouncement(lastId, say);

  // New lines pull the view down unless the reader had scrolled up to look at older ones.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= scrolledHeight.current - 24) el.scrollTop = el.scrollHeight;
    scrolledHeight.current = el.scrollHeight;
  }, [serial]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    link.sendSerial(`${draft}\n`);
    setDraft("");
  };

  const copy = async () => {
    const text = serial.map((e) => `${formatStamp(e.tNs)} ${e.kind === "in" ? "> " : ""}${e.text}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote(t("serial.copied"));
    } catch {
      setCopyNote(t("serial.copyFailed"));
    }
  };

  return (
    <section aria-label={t("serial.title")} className="flex min-h-0 flex-col gap-2" data-testid="serial-pane">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("serial.title")}</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={serial.length === 0} onClick={() => void copy()}>
            {t("serial.copy")}
          </Button>
          <Button size="sm" variant="ghost" disabled={serial.length === 0 && dropped === 0} onClick={() => run.clearSerial()}>
            {t("serial.clear")}
          </Button>
        </div>
      </div>
      <div
        ref={listRef}
        role="log"
        aria-live="off"
        aria-label={t("serial.lines")}
        tabIndex={0}
        className="min-h-16 flex-1 overflow-y-auto rounded-xl border border-rule bg-console px-3 py-2 font-mono text-sm leading-5"
        data-testid="serial-lines"
      >
        {dropped > 0 ? <p className="font-sans text-console-muted">{t("serial.dropped", { count: dropped })}</p> : null}
        {serial.length === 0 && dropped === 0 ? (
          <p className="font-sans text-console-muted">{t("serial.empty")}</p>
        ) : (
          serial.map((entry) => <Row key={entry.id} entry={entry} />)
        )}
      </div>
      <form onSubmit={send} className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <TextInput
          label={t("serial.input")}
          hideLabel
          className="font-mono tabular-nums"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("serial.placeholder")}
          autoComplete="off"
          spellCheck={false}
          disabled={!running}
        />
        <Button type="submit" size="md" disabled={!running || !draft}>
          {t("serial.send")}
        </Button>
      </form>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {copyNote}
      </p>
    </section>
  );
}
