import type { ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type StatProps = {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  /** sm for strips and rails, md for tiles, lg only on reading pages. */
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "good" | "bad" | "warn";
  className?: string;
};

const valueSize = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };
const toneClass = { ink: "text-ink", good: "text-good", bad: "text-bad", warn: "text-warn" };

/** A number with a small caps label, like the figures' stats. */
export function Stat({ label, value, unit, hint, size = "md", tone = "ink", className }: StatProps) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="ink-kicker">{label}</div>
      <div className={cx("tabular whitespace-nowrap font-ui font-bold leading-tight", valueSize[size], toneClass[tone])}>
        {value}
        {unit ? <span className="ms-1 text-[0.6em] font-semibold text-muted">{unit}</span> : null}
      </div>
      {hint ? <div className="text-sm text-muted">{hint}</div> : null}
    </div>
  );
}

type StatStripProps = Omit<ComponentProps<"div">, "children"> & {
  /** Each becomes a small Stat; `id` keys the list. */
  stats?: ReadonlyArray<Omit<StatProps, "size" | "className"> & { id?: string }>;
  children?: ReactNode;
};

/** A row of small numbers (telemetry, live status, design tiles) that wraps instead of squeezing. */
export function StatStrip({ stats, children, className, ...rest }: StatStripProps) {
  return (
    <div className={cx("flex flex-wrap gap-x-6 gap-y-2", className)} {...rest}>
      {stats?.map(({ id, ...stat }) => <Stat key={id ?? stat.label} size="sm" className="shrink-0" {...stat} />)}
      {children}
    </div>
  );
}
