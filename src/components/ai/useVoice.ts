"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { AiError, transcribe } from "@/lib/ai/client";
import { RecorderError, startRecording, type Recording } from "@/lib/ai/recorder";

export type VoiceProblem = "denied" | "unsupported" | "unavailable" | "empty" | "failed";

export type VoiceState =
  | { phase: "idle"; problem: VoiceProblem | null }
  | { phase: "starting" | "recording" | "transcribing"; problem: null };

/**
 * Push-to-talk: start() opens the mic, stop() sends the audio to
 * /api/ai/transcribe and hands the text to onText. toggle() is for the M key
 * and for taps.
 */
export function useVoice(locale: Locale, onText: (text: string) => void) {
  const [state, setState] = useState<VoiceState>({ phase: "idle", problem: null });
  const recording = useRef<Recording | null>(null);
  const starting = useRef<Promise<void> | null>(null);
  const phase = useRef<VoiceState["phase"]>("idle");
  const abort = useRef<AbortController | null>(null);
  const textRef = useRef(onText);
  useEffect(() => {
    textRef.current = onText;
  });

  const go = useCallback((next: VoiceState) => {
    phase.current = next.phase;
    setState(next);
  }, []);

  const stop = useCallback(async () => {
    if (starting.current) await starting.current;
    const active = recording.current;
    if (!active || phase.current !== "recording") return;
    recording.current = null;
    go({ phase: "transcribing", problem: null });
    const audio = await active.stop();
    if (!audio) {
      go({ phase: "idle", problem: "empty" });
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    try {
      const { text } = await transcribe(audio, locale, { signal: controller.signal });
      if (!text.trim()) {
        go({ phase: "idle", problem: "empty" });
        return;
      }
      go({ phase: "idle", problem: null });
      textRef.current(text.trim());
    } catch (error) {
      if (error instanceof AiError && error.code === "aborted") return go({ phase: "idle", problem: null });
      go({ phase: "idle", problem: error instanceof AiError && error.code === "not_configured" ? "unavailable" : "failed" });
    } finally {
      if (abort.current === controller) abort.current = null;
    }
  }, [go, locale]);

  const start = useCallback(() => {
    if (phase.current !== "idle") return;
    go({ phase: "starting", problem: null });
    starting.current = startRecording(() => void stop())
      .then((active) => {
        recording.current = active;
        go({ phase: "recording", problem: null });
      })
      .catch((error: unknown) => {
        go({ phase: "idle", problem: error instanceof RecorderError ? error.reason : "failed" });
      })
      .finally(() => {
        starting.current = null;
      });
  }, [go, stop]);

  const toggle = useCallback(() => {
    if (phase.current === "idle") start();
    else if (phase.current === "recording" || phase.current === "starting") void stop();
  }, [start, stop]);

  useEffect(
    () => () => {
      recording.current?.cancel();
      abort.current?.abort();
    },
    [],
  );

  return { state, start, stop, toggle };
}
