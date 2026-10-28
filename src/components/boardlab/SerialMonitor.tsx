"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Select, TextInput } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import type { BoardLabStore, SerialLine } from "@/lib/boardlab/store";
import { useText } from "./text";
import { useLab } from "./useLab";

export const BAUDS = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400] as const;
const MIN_H = 92;
const DEFAULT_H = 180;
const MAX_H = 520;
const HEIGHT_KEY = "iynk:boardlab:serial-height";

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
  sys: "text-console-muted",
  out: "text-console-ink",
  in: "text-console-accent",
  err: "text-console-err font-medium",
  note: "text-console-warn",
};

const consoleFont = "font-mono text-sm";

export function SerialMonitor({ store, onStop }: { store: BoardLabStore; onStop: () => void }) {
  const { t } = useText();
  const id = useId();
  const status = useLab(store, (s) => s.run.status);
  const serial = useLab(store, (s) => s.serial);
  const height = useSyncExternalStore(subscribeHeight, readHeight, () => DEFAULT_H);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; h: number } | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [serial.lines]);

  const resize = (h: number) => saveHeight(Math.min(MAX_H, Math.max(MIN_H, h)));

  // The grip sits under the log: down makes it taller.
  const onGripKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = { ArrowDown: 16, ArrowUp: -16, PageDown: 64, PageUp: -64 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    resize(height + step);
  };
  const onGripDown = (e: PointerEvent<HTMLButtonElement>) => {
    drag.current = { y: e.clientY, h: height };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onGripMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (drag.current) resize(drag.current.h + (e.clientY - drag.current.y));
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
  const dot = status === "running" ? "bg-good" : status === "stopped" ? "bg-muted" : "bg-warn animate-pulse motion-reduce:animate-none";

  const lineText = (line: SerialLine): string => {
    if (line.kind === "sys" || (line.kind === "err" && /^(refused\.|error\.|lostPower$)/.test(line.text))) {
      return t(`serial.${line.text}` as Parameters<typeof t>[0], line.params);
    }
    if (line.kind === "out" && mismatch) return garble(line.text, serial.sketchBaud / serial.baud);
    if (line.kind === "in") return `> ${line.text}`;
    return line.text;
  };

  return (
    // From lg the monitor fills its tab in the rail; on a phone the log has a height you can drag.
    <section aria-labelledby={`${id}-title`} className="flex min-h-0 flex-col gap-2 lg:h-full" data-testid="serial-monitor">
      <h3 id={`${id}-title`} className="sr-only">
        {t("serial.title")}
      </h3>
      <div className="flex shrink-0 items-start gap-2">
        <span aria-hidden="true" className={cx("mt-2 inline-block size-2 shrink-0 rounded-full", dot)} />
        <p className="min-w-0 flex-1 py-1 text-sm leading-snug">
          <span role="status" className="font-semibold" data-testid="serial-status">
            {statusText}
          </span>
          {status === "stopped" && serial.lines.length === 0 ? <span className="text-muted"> · {t("serial.notRunning")}</span> : null}
        </p>
        <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => store.dispatch({ type: "serial/clear" })}>
          {t("serial.clear")}
        </Button>
        {status !== "stopped" && <IconButton icon="close" size="sm" label={t("serial.close")} onClick={onStop} />}
      </div>
      {mismatch && (
        <p className="shrink-0 rounded-lg bg-warn-bg px-3 py-2 text-sm" role="note">
          {t("serial.mismatch", { sketch: serial.sketchBaud, monitor: serial.baud })}
        </p>
      )}
      {/* role="log" replaces a list's role, so the lines are plain rows (as in the robotics serial panel). It
          scrolls, so it takes focus for keyboard scrolling. */}
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label={t("serial.lines")}
        tabIndex={0}
        className={cx("h-(--serial-h) overflow-y-auto rounded-xl border border-rule bg-console px-3 py-2 leading-5 lg:h-auto lg:min-h-16 lg:flex-1", consoleFont)}
        style={{ "--serial-h": `${height}px` } as CSSProperties}
        data-testid="serial-lines"
      >
        {serial.lines.length === 0 ? (
          <p className="font-sans text-console-muted">{t("serial.empty")}</p>
        ) : (
          serial.lines.map((line) => (
            <div key={line.id} className={cx("whitespace-pre-wrap break-words", KIND_CLASS[line.kind])} data-kind={line.kind}>
              {line.t !== null && line.kind !== "sys" ? (
                <span className="me-2 text-console-muted tabular select-none" aria-hidden="true">
                  {(line.t / 1000).toFixed(3)}
                </span>
              ) : null}
              {lineText(line)}
            </div>
          ))
        )}
      </div>
      {/* A small bar in a 44 px tall button; the negative margins give back the section's gaps around it. */}
      <button
        type="button"
        className="-my-2 flex h-11 w-full shrink-0 cursor-ns-resize touch-none items-center justify-center lg:hidden"
        aria-label={t("serial.resize")}
        title={t("serial.resize")}
        onKeyDown={onGripKey}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
        onDoubleClick={() => resize(DEFAULT_H)}
      >
        <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-muted" />
      </button>
      <form onSubmit={send} className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2">
        <TextInput
          label={t("serial.input")}
          hideLabel
          className={cx("text-ellipsis", consoleFont)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("serial.inputPlaceholder")}
          autoComplete="off"
          spellCheck={false}
        />
        <Select label={t("serial.baud")} hideLabel className="tabular" value={serial.baud} onChange={(e) => store.dispatch({ type: "serial/baud", baud: Number(e.target.value) })}>
          {BAUDS.map((b) => (
            <option key={b} value={b}>
              {t("serial.baudValue", { baud: b })}
            </option>
          ))}
        </Select>
        <Button type="submit" size="md" className="h-11 shrink-0" disabled={!draft}>
          {t("serial.send")}
        </Button>
      </form>
    </section>
  );
}
