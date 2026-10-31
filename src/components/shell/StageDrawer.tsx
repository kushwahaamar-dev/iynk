"use client";

import { useId, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";

type StageDrawerProps = {
  /** "Serial monitor", "Betaflight log". */
  title: string;
  /** The latest line, shown in the closed bar. */
  summary?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Height of the open body in px. */
  height?: number;
  /** Stays mounted while closed, so refs and data-* attributes survive. */
  children: ReactNode;
  className?: string;
};

/**
 * A drawer under the figure, like an IDE's terminal: a one-line bar that opens
 * into a fixed-height body. It takes its height from the figure, never the page.
 */
export function StageDrawer({ title, summary, open, onOpenChange, height = 200, children, className }: StageDrawerProps) {
  const id = useId();
  return (
    <div className={cx("flex shrink-0 flex-col overflow-hidden rounded-xl border border-rule bg-surface", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={title}
        onClick={() => onOpenChange(!open)}
        className="flex min-h-10 w-full items-center gap-3 bg-sunken px-3 text-start text-sm font-semibold focus-visible:outline-offset-[-4px] [@media(pointer:coarse)]:min-h-11"
      >
        <span className="shrink-0">{title}</span>
        <span className="min-w-0 flex-1 truncate font-ui text-xs tabular-nums text-muted">{summary}</span>
        <Icon name="chevron-down" size={20} className={cx("shrink-0 motion-move", open && "rotate-180")} />
      </button>
      <div id={id} hidden={!open} className="overflow-y-auto border-t border-rule" style={{ height }}>
        {children}
      </div>
    </div>
  );
}
