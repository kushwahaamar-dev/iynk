import type { ReactNode } from "react";
import { cx } from "./cx";

type StatProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "good" | "bad" | "warn";
  className?: string;
};

const valueSize = { sm: "text-xl", md: "text-3xl", lg: "text-4xl sm:text-5xl" };
const toneClass = { ink: "text-ink", good: "text-good", bad: "text-bad", warn: "text-warn" };

/** A big number with a small caps label, like the figures' stats. */
export function Stat({ label, value, unit, hint, size = "md", tone = "ink", className }: StatProps) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="ink-kicker">{label}</div>
      <div className={cx("tabular hyphens-auto break-words font-ui font-extrabold leading-tight tracking-tight", valueSize[size], toneClass[tone])}>
        {value}
        {unit ? <span className="ms-1 text-[0.5em] font-bold text-muted">{unit}</span> : null}
      </div>
      {hint ? <div className="text-sm text-muted">{hint}</div> : null}
    </div>
  );
}
