import { useId } from "react";
import { cx } from "./cx";

type MeterProps = {
  label: string;
  value: number;
  min?: number;
  max: number;
  /** Shown next to the label and read out, e.g. "420 mA". Defaults to the value. */
  valueText?: string;
  /** At or above `warn` the bar turns mustard, at or above `danger` tomato. */
  warn?: number;
  danger?: number;
  className?: string;
};

/** A labelled gauge (role="meter"): current draw, throttle, battery. */
export function Meter({ label, value, min = 0, max, valueText, warn, danger, className }: MeterProps) {
  const id = useId();
  const span = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((value - min) / span) * 100));
  const level = danger !== undefined && value >= danger ? "danger" : warn !== undefined && value >= warn ? "warn" : "ok";
  const text = valueText ?? String(value);
  return (
    <div className={cx("min-w-0", className)}>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span id={id} className="ink-kicker">
          {label}
        </span>
        <span className="tabular font-ui text-sm font-bold">{text}</span>
      </div>
      <div
        role="meter"
        aria-labelledby={id}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        className="relative h-3.5 overflow-hidden rounded-full border-2 border-line bg-sunken"
      >
        <div
          className={cx(
            "h-full border-e-2 border-line transition-[width] duration-300",
            level === "danger" ? "bg-tomato" : level === "warn" ? "bg-mustard" : "bg-mint",
            pct === 0 && "border-e-0",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
