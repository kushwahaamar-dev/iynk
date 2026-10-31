"use client";

import { useRef } from "react";
import { IconButton, cx } from "@/components/ui";
import type { AiT } from "@/ai/messages";
import type { VoiceProblem, VoiceState } from "./useVoice";

/** Held this long, a press is push-to-talk: letting go sends. Shorter is a tap that toggles. */
const HOLD_MS = 350;

type MicProps = {
  t: AiT;
  voice: boolean;
  phase: VoiceState["phase"];
  start(): void;
  stop(): Promise<void>;
  toggle(): void;
};

export function MicButton({ t, voice, phase, start, stop, toggle }: MicProps) {
  const press = useRef<{ at: number; wasOn: boolean } | null>(null);
  const on = phase === "recording" || phase === "starting";
  const label = !voice ? t("voice.unavailable") : on ? t("voice.stopRecording") : t("voice.hold");
  const disabled = !voice || phase === "transcribing";

  return (
    <IconButton
      icon="mic"
      label={label}
      tooltipSide="top"
      aria-pressed={on}
      aria-disabled={disabled}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        press.current = { at: performance.now(), wasOn: on };
        if (!on) start();
      }}
      onPointerUp={() => {
        const held = press.current;
        press.current = null;
        if (held && (held.wasOn || performance.now() - held.at > HOLD_MS)) void stop();
      }}
      onPointerCancel={() => {
        press.current = null;
        void stop();
      }}
      onClick={(event) => {
        // Enter, Space and screen readers click without a pointer (detail 0).
        if (event.detail === 0 && !disabled) toggle();
      }}
      className="touch-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
    />
  );
}

const PROBLEM: Record<VoiceProblem, "voice.denied" | "voice.unsupported" | "voice.unavailable" | "voice.empty" | "voice.failed"> = {
  denied: "voice.denied",
  unsupported: "voice.unsupported",
  unavailable: "voice.unavailable",
  empty: "voice.empty",
  failed: "voice.failed",
};

/** What the mic is doing, announced politely. */
export function VoiceLine({ t, phase, problem }: { t: AiT; phase: VoiceState["phase"]; problem: VoiceProblem | null }) {
  const recording = phase === "recording" || phase === "starting";
  const text = recording
    ? t("voice.recording")
    : phase === "transcribing"
      ? t("voice.transcribing")
      : problem
        ? t(PROBLEM[problem])
        : "";
  return (
    <p role="status" className={cx("flex min-h-0 items-center gap-2 text-sm", problem ? "text-bad" : "text-muted", !text && "sr-only")}>
      {recording ? <span aria-hidden="true" className="size-2 shrink-0 rounded-md bg-bad motion-safe:animate-pulse" /> : null}
      {text}
    </p>
  );
}
