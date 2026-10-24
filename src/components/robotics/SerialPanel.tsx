"use client";

import { useEffect, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import type { SerialLine } from "@/lib/robotics/store";
import type { BenchT } from "./messages";

type Props = {
  kind: "serial" | "notes" | "terminal";
  lines: readonly SerialLine[];
  onClear: () => void;
  t: BenchT;
  headingId: string;
  /** The scrolling log; the page focuses it for the "s" shortcut. */
  logRef: RefObject<HTMLDivElement | null>;
};

export function SerialPanel({ kind, lines, onClear, t, headingId, logRef }: Props) {
  const heading = kind === "notes" ? t("serial.notes") : kind === "terminal" ? t("serial.terminal") : t("serial.heading");

  // Keep the newest line in view, like a terminal.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, logRef]);

  return (
    <section aria-labelledby={headingId} className="ink-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={headingId} className="text-xl">
          {heading}
        </h2>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={lines.length === 0}>
          {t("serial.clear")}
        </Button>
      </div>
      <div
        ref={logRef}
        role="log"
        aria-live="off"
        aria-labelledby={headingId}
        tabIndex={0}
        data-serial
        className="mt-3 h-48 overflow-y-auto rounded-ink-sm border-2 border-line bg-[#1d2a26] p-3 font-ui text-[0.8rem] leading-relaxed text-[#8af0ae] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {lines.length === 0 ? (
          <p className="text-[#b9d8c6]">{t("serial.empty")}</p>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="whitespace-pre-wrap break-words">
              {line.text}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
