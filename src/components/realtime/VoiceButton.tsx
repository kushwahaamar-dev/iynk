"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { isLocale, type Locale } from "@/i18n/config";
import type { TogetherT } from "./messages";

const MAX_SECONDS = 60;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

type VoiceState =
  | { kind: "idle" }
  | { kind: "recording"; seconds: number }
  | { kind: "transcribing" }
  | { kind: "error"; message: "denied" | "failed" | "unsupported" | "tooLong" };

function recorderType(): string | null {
  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  return TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Push to talk: records up to a minute, sends it to /api/ai/transcribe, hands back the text. */
export function VoiceButton({
  t,
  lang,
  enabled,
  onText,
}: {
  t: TogetherT;
  lang: Locale;
  enabled: boolean;
  onText: (text: string, lang: Locale) => void;
}) {
  const [state, setState] = useState<VoiceState>({ kind: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      clearInterval(timer.current);
      clearTimeout(stopTimer.current);
      const active = recorder.current;
      if (active && active.state !== "inactive") {
        active.onstop = null;
        active.stop();
      }
      active?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const send = async (blob: Blob) => {
    if (blob.size === 0) return setState({ kind: "idle" });
    if (blob.size > MAX_BYTES) return setState({ kind: "error", message: "tooLong" });
    setState({ kind: "transcribing" });
    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    form.append("audio", blob, `voice.${ext}`);
    form.append("lang", lang);
    try {
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { text?: unknown; lang?: unknown };
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) throw new Error("empty");
      onText(text, isLocale(body.lang) ? body.lang : lang);
      setState({ kind: "idle" });
    } catch {
      setState({ kind: "error", message: "failed" });
    }
  };

  const start = async () => {
    const type = recorderType();
    if (type === null) return setState({ kind: "error", message: "unsupported" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setState({ kind: "error", message: "denied" });
    }
    const chunks: Blob[] = [];
    const next = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    recorder.current = next;
    next.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    next.onstop = () => {
      clearInterval(timer.current);
      clearTimeout(stopTimer.current);
      stream.getTracks().forEach((track) => track.stop());
      recorder.current = null;
      void send(new Blob(chunks, { type: next.mimeType || type || "audio/webm" }));
    };
    next.start();
    const began = Date.now();
    setState({ kind: "recording", seconds: 0 });
    timer.current = setInterval(() => setState({ kind: "recording", seconds: Math.floor((Date.now() - began) / 1000) }), 500);
    stopTimer.current = setTimeout(() => next.state !== "inactive" && next.stop(), MAX_SECONDS * 1000);
  };

  const stop = () => {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  };

  const recording = state.kind === "recording";
  const busy = state.kind === "transcribing";
  const label = recording ? t("chat.voice.stop") : t("chat.voice.start");

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={!enabled || busy}
        aria-pressed={recording}
        aria-label={label}
        title={enabled ? label : t("chat.voice.off")}
        className={cx(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line shadow-ink-sm transition-transform active:translate-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50",
          recording ? "animate-pulse bg-tomato text-on-color" : "bg-surface text-ink",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {recording ? <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" /> : <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />}
        </svg>
      </button>
      <p role="status" className="text-xs text-muted empty:hidden">
        {recording
          ? t("chat.voice.recording", { seconds: state.seconds })
          : busy
            ? t("chat.voice.transcribing")
            : state.kind === "error"
              ? t(`chat.voice.${state.message}`)
              : ""}
      </p>
    </div>
  );
}
