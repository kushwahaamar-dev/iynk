"use client";

import { useRef } from "react";
import { cx } from "@/components/ui";
import type { AiT } from "@/lib/ai/messages";
import { PartnerIcon } from "./icons";
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
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      title={label}
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
      className={cx(
        "inline-flex size-11 shrink-0 touch-none items-center justify-center rounded-full border-2 border-line shadow-ink-sm transition-colors aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
        on ? "bg-tomato text-on-color motion-safe:animate-pulse" : "bg-paper text-ink",
      )}
    >
      <PartnerIcon name="mic" />
    </button>
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
  const text =
    phase === "recording" || phase === "starting"
      ? t("voice.recording")
      : phase === "transcribing"
        ? t("voice.transcribing")
        : problem
          ? t(PROBLEM[problem])
          : "";
  return (
    <p role="status" className={cx("min-h-0 text-xs", problem ? "text-bad" : "text-muted", !text && "sr-only")}>
      {text}
    </p>
  );
}
