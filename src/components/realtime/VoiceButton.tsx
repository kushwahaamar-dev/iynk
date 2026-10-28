"use client";

import { useEffect, useRef, useState } from "react";
import { Chip, Icon, IconButton } from "@/components/ui";
import { isLocale, type Locale } from "@/i18n/config";
import { transcribe } from "@/lib/ai/client";
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
    try {
      const body = await transcribe(blob, lang);
      const text = body.text.trim();
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
      <IconButton
        icon={recording ? "stop" : "mic"}
        label={label}
        title={enabled ? label : t("chat.voice.off")}
        onClick={recording ? stop : start}
        disabled={!enabled || busy}
        aria-pressed={recording}
      />
      <p role="status" className="flex items-center gap-2 text-xs text-muted tabular-nums empty:hidden">
        {recording ? (
          <Chip tone="bad" dot className="tabular-nums">
            {t("chat.voice.recording", { seconds: state.seconds })}
          </Chip>
        ) : busy ? (
          t("chat.voice.transcribing")
        ) : state.kind === "error" ? (
          <>
            <Icon name="warn-circle" size={16} className="shrink-0 text-bad" />
            {t(`chat.voice.${state.message}`)}
          </>
        ) : null}
      </p>
    </div>
  );
}
