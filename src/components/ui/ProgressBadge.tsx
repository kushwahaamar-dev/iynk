"use client";

import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";
import { TipBubble, useTip } from "./Tooltip";

type ProgressBadgeProps = {
  done: number;
  total: number;
  /** Visible label, e.g. "Lessons" (screen-reader only at size xs). */
  label: string;
  /** Visible count, e.g. "3/16" (from the "ui.progress" template). */
  countText: string;
  /** Read-out, e.g. "Lessons: 3 of 16 done". */
  valueText: string;
  /** xs is the compact form for a workspace bar: a thin bar and the count. */
  size?: "xs" | "sm" | "md";
  className?: string;
};

/**
 * Progress shown as "done/total" with a label and a small bar. When the row is
 * too narrow, the bar and the count drop under the label instead of squeezing it.
 */
export function ProgressBadge({ done, total, label, countText, valueText, size = "md", className }: ProgressBadgeProps) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const complete = total > 0 && done >= total;
  const fill = (
    <span
      className={cx("absolute inset-0 motion-move", complete ? "bg-good" : "bg-accent")}
      style={{ transform: `scaleX(${pct / 100})`, transformOrigin: "left" }}
    />
  );
  const aria = {
    role: "progressbar",
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": total,
    "aria-valuenow": Math.min(done, total),
    "aria-valuetext": valueText,
  } as const;

  if (size === "xs") return <CompactProgress aria={aria} fill={fill} countText={countText} valueText={valueText} className={className} />;

  return (
    <div {...aria} className={cx("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <span className="kicker min-w-0">{label}</span>
      <span
        aria-hidden="true"
        className={cx("relative min-w-16 flex-1 overflow-hidden rounded-full border border-muted bg-sunken", size === "sm" ? "h-2" : "h-3")}
      >
        {fill}
      </span>
      <span aria-hidden="true" className={cx("tabular shrink-0 font-ui font-semibold", size === "sm" ? "text-sm" : "text-base")}>
        {countText}
      </span>
    </div>
  );
}

// The workspace bar's form: a thin bar and the count, with no room for the label. The read-out says what it counts:
// screen readers hear it as the bar's value, and a mouse sees it in a tip on hover.
function CompactProgress({
  aria,
  fill,
  countText,
  valueText,
  className,
}: {
  aria: ComponentProps<"div">;
  fill: ReactNode;
  countText: string;
  valueText: string;
  className?: string;
}) {
  const tip = useTip();
  return (
    <div {...aria} onPointerEnter={tip.onPointerEnter} onPointerLeave={tip.onPointerLeave} className={cx("relative inline-flex items-center gap-2", className)}>
      <span aria-hidden="true" className="relative h-2 w-24 overflow-hidden rounded-full border border-muted bg-sunken">
        {fill}
      </span>
      <span aria-hidden="true" className="tabular whitespace-nowrap font-ui text-xs font-semibold">
        {countText}
      </span>
      <TipBubble open={tip.open} side="bottom" aria-hidden>
        {valueText}
      </TipBubble>
    </div>
  );
}
