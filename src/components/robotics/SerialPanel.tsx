"use client";

import { useEffect, type RefObject } from "react";
import { StageDrawer } from "@/components/shell/workspace";
import { Button } from "@/components/ui/Button";
import type { SerialLine } from "@/lib/robotics/store";
import type { BenchT } from "./messages";

type Props = {
  kind: "serial" | "notes" | "terminal";
  lines: readonly SerialLine[];
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Body height in px when open. */
  height: number;
  t: BenchT;
  /** The scrolling log; the page focuses it for the "s" shortcut. */
  logRef: RefObject<HTMLDivElement | null>;
};

export function serialHeading(kind: Props["kind"], t: BenchT): string {
  return kind === "notes" ? t("serial.notes") : kind === "terminal" ? t("serial.terminal") : t("serial.heading");
}

/** The bench's serial output (or notes, or SSH terminal) as a drawer under the figure; closed, it shows the last line. */
export function SerialPanel({ kind, lines, onClear, open, onOpenChange, height, t, logRef }: Props) {
  const heading = serialHeading(kind, t);
  const last = lines.at(-1)?.text;

  // Keep the newest line in view, like a terminal.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, logRef, open]);

  return (
    <StageDrawer title={heading} summary={last ?? t("serial.empty")} open={open} onOpenChange={onOpenChange} height={height}>
      <div className="relative h-full bg-console">
        <div
          ref={logRef}
          role="log"
          aria-live="off"
          aria-label={heading}
          tabIndex={0}
          data-serial
          className="h-full overflow-y-auto px-3 py-2 pe-20 font-mono text-xs leading-relaxed text-console-accent outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus)"
        >
          {lines.length === 0 ? (
            <p className="text-console-muted">{t("serial.empty")}</p>
          ) : (
            lines.map((line) => (
              <div key={line.id} className="whitespace-pre-wrap break-words">
                {line.text}
              </div>
            ))
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={lines.length === 0}
          className="absolute end-2 top-1.5 !text-console-ink hover:!bg-console-well disabled:!border-transparent disabled:!bg-transparent disabled:!text-console-muted"
        >
          {t("serial.clear")}
        </Button>
      </div>
    </StageDrawer>
  );
}
