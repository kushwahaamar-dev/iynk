import { useId } from "react";
import { cx } from "./cx";

type MeterProps = {
  label: string;
  value: number;
  min?: number;
  max: number;
  /** Shown next to the label and read out, e.g. "420 mA". Defaults to the value. */
  valueText?: string;
  /** At or above `warn` the bar turns amber, at or above `danger` red. A full bar with neither is green. */
  warn?: number;
  danger?: number;
  className?: string;
};

const fills = { ok: "bg-accent", complete: "bg-good", warn: "bg-warn", danger: "bg-bad" };

/** A labelled gauge (role="meter"): current draw, throttle, battery. The label may hold a unit, so it is never uppercased. */
export function Meter({ label, value, min = 0, max, valueText, warn, danger, className }: MeterProps) {
  const id = useId();
  const span = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  const level =
    danger !== undefined && value >= danger ? "danger" : warn !== undefined && value >= warn ? "warn" : value >= max ? "complete" : "ok";
  const text = valueText ?? String(value);
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span id={id} className="kicker">
          {label}
        </span>
        <span className="tabular whitespace-nowrap font-ui text-sm font-semibold">{text}</span>
      </div>
      <div
        role="meter"
        aria-labelledby={id}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className="relative h-2 overflow-hidden rounded-full border border-muted bg-sunken"
      >
        <div
          className={cx("h-full w-full motion-move", fills[level])}
          style={{ transform: `scaleX(${pct / 100})`, transformOrigin: "left" }}
        />
      </div>
    </div>
  );
}
