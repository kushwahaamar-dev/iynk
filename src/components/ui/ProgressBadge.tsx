import { cx } from "./cx";

type ProgressBadgeProps = {
  done: number;
  total: number;
  /** Visible label, e.g. "Lessons". */
  label: string;
  /** Visible count, e.g. "3/16" (from the "ui.progress" template). */
  countText: string;
  /** Read-out, e.g. "Lessons: 3 of 16 done". */
  valueText: string;
  size?: "sm" | "md";
  className?: string;
};

/** Progress shown as "done/total" with a label and a small bar. */
export function ProgressBadge({ done, total, label, countText, valueText, size = "md", className }: ProgressBadgeProps) {
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0;
  const complete = total > 0 && done >= total;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(done, total)}
      aria-valuetext={valueText}
      className={cx("flex min-w-0 items-center gap-3", className)}
    >
      <span className={cx("ink-kicker shrink-0", size === "sm" && "text-[0.7rem]")}>{label}</span>
      <span
        aria-hidden="true"
        className={cx("relative min-w-12 flex-1 overflow-hidden rounded-full border-2 border-line bg-sunken", size === "sm" ? "h-2.5" : "h-3")}
      >
        <span
          className={cx("absolute inset-y-0 start-0 transition-[width] duration-700", complete ? "bg-mint" : "bg-mustard")}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span aria-hidden="true" className={cx("tabular shrink-0 font-ui font-extrabold", size === "sm" ? "text-sm" : "text-base")}>
        {countText}
      </span>
    </div>
  );
}
