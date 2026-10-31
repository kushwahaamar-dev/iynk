"use client";

import { Button, ButtonGroup, Kbd } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";

export type DebugState = "running" | "paused" | "stopped";
export type DebugAt = { file: string; line: number };

export interface DebugPanelProps {
  state: DebugState;
  /** Where the run is stopped; null when it is paused without a source line. */
  at: DebugAt | null;
  onStep(unit: "line" | "over" | "out"): void;
  onResume(): void;
  strings: Messages["fidelity"]["debug"];
}

function status(state: DebugState, at: DebugAt | null, s: DebugPanelProps["strings"]): string {
  if (state === "paused") return at ? s.pausedAt.replace("{file}", at.file).replace("{line}", String(at.line)) : s.paused;
  return state === "running" ? s.running : s.gutter;
}

/** Continue and the three steps. They work only while the run is stopped; the keys F5, F10, F11 and Shift+F11 do the same from the editor. */
export function DebugPanel({ state, at, onStep, onResume, strings }: DebugPanelProps) {
  const idle = state !== "paused";
  return (
    <div role="region" aria-label={strings.toggle} className="flex flex-wrap items-center gap-3">
      <ButtonGroup label={strings.toggle}>
        <Button size="sm" variant="primary" disabled={idle} onClick={onResume}>
          {strings.continue}
          <Kbd>F5</Kbd>
        </Button>
        <Button size="sm" variant="ghost" disabled={idle} onClick={() => onStep("over")}>
          {strings.over}
          <Kbd>F10</Kbd>
        </Button>
        <Button size="sm" variant="ghost" disabled={idle} onClick={() => onStep("line")}>
          {strings.step}
          <Kbd>F11</Kbd>
        </Button>
        <Button size="sm" variant="ghost" disabled={idle} onClick={() => onStep("out")}>
          {strings.out}
          <Kbd>Shift F11</Kbd>
        </Button>
      </ButtonGroup>
      <p role="status" aria-live="polite" className="min-w-0 text-sm text-ink tabular-nums">
        {status(state, at, strings)}
      </p>
    </div>
  );
}
