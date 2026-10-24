"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { IconButton } from "@/components/ui/IconButton";
import type { BoardLabStore, SerialLine } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

export const BAUDS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400] as const;
const MIN_H = 92;
const DEFAULT_H = 180;
const MAX_H = 520;
const HEIGHT_KEY = "simlab:boardlab:serial-height";

/** What a UART shows when the two ends disagree on the baud rate: deterministic junk of the same length. */
export function garble(text: string, ratio: number): string {
  const junk = "�ÿ¿ýøðÜàã±·¤þ~ÒÌ";
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    const h = (code * 31 + i * 17 + Math.round(ratio * 100)) % 97;
    out += h % 5 === 0 ? text[i] : junk[h % junk.length];
  }
  return out;
}

// The monitor height is a per-viewer convenience: localStorage when it works, memory when it does not.
let memHeight = DEFAULT_H;
const heightListeners = new Set<() => void>();

function readHeight(): number {
  try {
    const raw = window.localStorage.getItem(HEIGHT_KEY);
    const v = Number(raw);
    return raw !== null && Number.isFinite(v) && v >= MIN_H ? Math.min(MAX_H, v) : memHeight;
  } catch {
    return memHeight;
  }
}

function saveHeight(h: number): void {
  memHeight = h;
  try {
    window.localStorage.setItem(HEIGHT_KEY, String(Math.round(h)));
  } catch {
    // Private mode or blocked storage: the height lasts until the page closes.
  }
  for (const l of heightListeners) l();
}

function subscribeHeight(listener: () => void): () => void {
  heightListeners.add(listener);
  return () => heightListeners.delete(listener);
}

const KIND_CLASS: Record<SerialLine["kind"], string> = {
  sys: "text-muted",
  out: "text-ink",
  in: "text-cobalt-m",
  err: "text-bad font-medium",
  note: "text-warn",
};

export function SerialMonitor({ store, onStop }: { store: BoardLabStore; onStop: () => void }) {
  const { t } = useText();
  const id = useId();
  const status = useLab(store, (s) => s.run.status);
  const serial = useLab(store, (s) => s.serial);
  const height = useSyncExternalStore(subscribeHeight, readHeight, () => DEFAULT_H);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [serial.lines]);

  const resize = (h: number) => saveHeight(Math.min(MAX_H, Math.max(MIN_H, h)));

  const onGripKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowUp: 16, ArrowDown: -16, PageUp: 64, PageDown: -64 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    resize(height + step);
  };
  const onGripDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { y: e.clientY, h: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onGripMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current) resize(drag.current.h + (drag.current.y - e.clientY));
  };
  const onGripUp = () => {
    drag.current = null;
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    store.dispatch({ type: "serial/send", text: draft });
    setDraft("");
  };

  const mismatch = serial.sketchBaud > 0 && serial.sketchBaud !== serial.baud;
  const statusText = t(`serial.status.${status}`);
  const dot =
    status === "running"
      ? "bg-mint-m shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-mint)_45%,transparent)]"
      : status === "stopped"
        ? "bg-mono-400"
        : "bg-mustard-m animate-pulse motion-reduce:animate-none";

  const lineText = (line: SerialLine): string => {
    if (line.kind === "sys" || (line.kind === "err" && /^(refused|error)\./.test(line.text))) {
      return t(`serial.${line.text}` as Parameters<typeof t>[0], line.params);
    }
    if (line.kind === "out" && mismatch) return garble(line.text, serial.sketchBaud / serial.baud);
    if (line.kind === "in") return `> ${line.text}`;
    return line.text;
  };

  return (
    <section aria-labelledby={`${id}-title`} className="ink-card overflow-hidden p-0" data-testid="serial-monitor">
      <button
        type="button"
        className="block h-3 w-full cursor-ns-resize touch-none bg-sunken focus-visible:outline-2 focus-visible:outline-cobalt-m"
        aria-label={t("serial.resize")}
        title={t("serial.resize")}
        onKeyDown={onGripKey}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onDoubleClick={() => resize(DEFAULT_H)}
      >
        <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-mono-400" />
      </button>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-rule px-3 py-2">
        <span aria-hidden="true" className={cx("inline-block size-2.5 rounded-full", dot)} />
        <h3 id={`${id}-title`} className="text-base font-semibold">
          {t("serial.title")}
        </h3>
        <span role="status" className="text-sm text-muted" data-testid="serial-status">
          {statusText}
        </span>
        <div className="ms-auto flex items-center gap-2">
          <label className="sr-only" htmlFor={`${id}-baud`}>
            {t("serial.baud")}
          </label>
          <select
            id={`${id}-baud`}
            className="ink-field h-11 py-0 text-sm"
            value={serial.baud}
            onChange={(e) => store.dispatch({ type: "serial/baud", baud: Number(e.target.value) })}
          >
            {BAUDS.map((b) => (
              <option key={b} value={b}>
                {t("serial.baudValue", { baud: b })}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" className="min-h-11" onClick={() => store.dispatch({ type: "serial/clear" })}>
            {t("serial.clear")}
          </Button>
          {status !== "stopped" && <IconButton icon="close" label={t("serial.close")} title={t("serial.close")} onClick={onStop} />}
        </div>
      </div>
      {mismatch && (
        <p className="border-b border-rule bg-warn-bg px-3 py-2 text-sm" role="note">
          {t("serial.mismatch", { sketch: serial.sketchBaud, monitor: serial.baud })}
        </p>
      )}
      <ol
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={t("serial.lines")}
        className="overflow-y-auto bg-code-bg px-3 py-2 font-mono text-[13px] leading-5"
        style={{ height }}
        data-testid="serial-lines"
      >
        {serial.lines.length === 0 ? (
          <li className="text-muted">{t("serial.empty")}</li>
        ) : (
          serial.lines.map((line) => (
            <li key={line.id} className={cx("whitespace-pre-wrap break-words", KIND_CLASS[line.kind])} data-kind={line.kind}>
              {line.t !== null && line.kind !== "sys" ? (
                <span className="me-2 text-muted tabular select-none" aria-hidden="true">
                  {(line.t / 1000).toFixed(3)}
                </span>
              ) : null}
              {lineText(line)}
            </li>
          ))
        )}
      </ol>
      <form onSubmit={send} className="flex gap-2 border-t border-rule p-2">
        <label className="sr-only" htmlFor={`${id}-input`}>
          {t("serial.input")}
        </label>
        <input
          id={`${id}-input`}
          className="ink-field h-11 min-w-0 flex-1 font-mono text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("serial.inputPlaceholder")}
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" size="md" disabled={!draft}>
          {t("serial.send")}
        </Button>
      </form>
    </section>
  );
}
