"use client";

import { Callout } from "@/components/ui/Callout";
import { cx } from "@/components/ui/cx";
import { Meter } from "@/components/ui/Meter";
import type { FigureState, RoboticsContent, StatusField } from "@/content/schema";
import type { CurrentDraw } from "@/lib/robotics/current";
import { readStatus, type StatusReading } from "@/lib/robotics/status";
import { Fold } from "./Fold";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  figure: FigureState;
  draw: CurrentDraw;
  t: BenchT;
  tx: TextOf;
  headingId: string;
};

type Tone = "ink" | "good" | "bad" | "warn";

const FIGURE_STATUS = ["off", "no-power", "powered", "running", "uploading", "brownout", "fault"] as const;
type FigureStatus = (typeof FIGURE_STATUS)[number];

const isFigureStatus = (value: unknown): value is FigureStatus =>
  typeof value === "string" && (FIGURE_STATUS as readonly string[]).includes(value);

const TONE: Record<Tone, string> = { ink: "text-ink", good: "text-good", bad: "text-bad", warn: "text-warn" };

function shown(reading: StatusReading, t: BenchT): { text: string; tone: Tone } {
  switch (reading.kind) {
    case "none":
      return { text: t("status.none"), tone: "ink" };
    case "on-off":
      return { text: reading.on ? t("status.on") : t("status.off"), tone: reading.on ? "good" : "ink" };
    case "high-low":
      return { text: reading.high ? t("status.high") : t("status.low"), tone: "ink" };
    case "running":
      return { text: reading.running ? t("status.running") : t("status.stopped"), tone: reading.running ? "good" : "ink" };
    case "text":
      return { text: reading.text, tone: "ink" };
    case "number":
      return { text: reading.unit ? t(`status.units.${reading.unit}`, { v: reading.value }) : String(reading.value), tone: "ink" };
  }
}

/**
 * A label over a value. The label is sentence case, never small caps: bench
 * labels carry units ("Meter reads (mA)") that capitals would turn into MA.
 */
type ReadingProps = {
  label: string;
  value: string;
  tone?: Tone;
  /** One line each, cut with an ellipsis (the full text in a tooltip): the strip above the tabs. */
  compact?: boolean;
  className?: string;
  "data-status"?: string;
};

export function Reading({ label, value, tone = "ink", compact, className, ...rest }: ReadingProps) {
  return (
    <div className={cx("min-w-0", className)} title={compact ? `${label}: ${value}` : undefined} {...rest}>
      <div className={cx("ink-label", compact && "truncate")}>{label}</div>
      <div className={cx("tabular font-ui font-bold leading-snug", compact ? "truncate text-base" : "break-words text-base", TONE[tone])}>{value}</div>
    </div>
  );
}

function benchState(figure: FigureState, t: BenchT): { text: string; tone: Tone } {
  const status = figure.status;
  return {
    text: isFigureStatus(status) ? t(`status.states.${status}`) : t("status.none"),
    tone: status === "running" ? "good" : status === "fault" || status === "brownout" ? "bad" : "ink",
  };
}

// The one number a bench is about: its first measured field (the meter, a rail, the distance), not a
// switch, a pin level, the program name or the current (which has its own reading).
const QUIET_FORMATS = new Set<StatusField["format"]>(["running", "on-off", "high-low"]);
const QUIET_KEYS = new Set(["mode", "boot", "status", "power"]);
function mainField(bench: RoboticsContent): StatusField | undefined {
  return bench.status.find((field) => !QUIET_FORMATS.has(field.format) && !QUIET_KEYS.has(field.key) && !field.key.startsWith("currentMa"));
}

/** Three readings that stay in view above the rail's tabs: the bench state, its main reading, its current. */
export function LiveStrip({ bench, figure, draw, t, tx }: Omit<Props, "headingId">) {
  const state = benchState(figure, t);
  const field = mainField(bench);
  const main = field ? shown(readStatus(field, figure, draw), t) : null;
  const supply = draw.supplies[0];
  return (
    <div className="grid shrink-0 grid-cols-3 gap-3 border-b-[1.5px] border-rule px-4 py-2.5" data-live-strip>
      <Reading compact label={t("status.figure")} value={state.text} tone={state.tone} />
      {field && main ? <Reading compact label={tx(field.label)} value={main.text} tone={main.tone} /> : <span />}
      {supply ? (
        <Reading compact label={t("current.heading")} value={t("current.load", { ma: supply.ma })} tone={supply.over ? "bad" : "ink"} />
      ) : null}
    </div>
  );
}

// "USB, 5 V: 500 mA through the polyfuse" names the supply, then its limit: the meter takes the name and the
// line under the bar the limit. Labels without a colon are the supply's name only and get its voltage.
function splitSupply(label: string, volts: string): { name: string; limit: string | null } {
  const match = /^(.+?)\s*[:：]\s*(.+)$/u.exec(label);
  if (match) return { name: match[1], limit: match[2] };
  return { name: `${label} · ${volts}`, limit: null };
}

export function StatusPanel({ bench, figure, draw, t, tx, headingId }: Props) {
  const fault = (typeof figure.fault === "object" && figure.fault !== null ? figure.fault : null) as { msg?: unknown; fix?: unknown } | null;
  const state = benchState(figure, t);

  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h2 id={headingId} className="font-head text-lg">
        {t("status.heading")}
      </h2>

      {fault && typeof fault.msg === "string" ? (
        <Callout tone="danger" className="mt-3" title={t("status.fault", { msg: fault.msg })}>
          {typeof fault.fix === "string" ? t("status.faultFix", { fix: fault.fix }) : null}
        </Callout>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-y-[1.5px] border-rule py-3 sm:grid-cols-3">
        {bench.status.some((field) => field.key === "status") ? null : <Reading label={t("status.figure")} value={state.text} tone={state.tone} />}
        {bench.status.map((field) => {
          const { text, tone } = shown(readStatus(field, figure, draw), t);
          return <Reading key={field.id} data-status={field.id} label={tx(field.label)} value={text} tone={tone} />;
        })}
      </div>

      <div className="mt-4 flex flex-col" aria-label={t("current.heading")} role="group">
        <h3 className="font-head text-base">{t("current.heading")}</h3>
        <div className="mt-1 flex flex-col divide-y divide-rule">
          {draw.supplies.map((supply) => {
            const { name, limit } = splitSupply(tx(supply.label), t("status.units.volts", { v: supply.volts }));
            return (
              <div key={supply.id} data-supply={supply.id} className="py-3">
                <Meter
                  label={name}
                  value={supply.ma}
                  max={Math.max(supply.limitMa, supply.ma)}
                  valueText={t("current.of", { ma: supply.ma, limit: supply.limitMa })}
                  warn={supply.limitMa * 0.8}
                  danger={supply.limitMa}
                />
                <p className="mt-1.5 text-sm">
                  {limit ? <span className="text-muted">{limit} · </span> : null}
                  {supply.over ? (
                    <strong className="text-bad">{t("current.over", { ma: -supply.headroomMa })}</strong>
                  ) : (
                    t("current.headroom", { ma: supply.headroomMa })
                  )}
                </p>
                {supply.loads.length > 0 ? (
                  <Fold summary={t("current.loads")} className="mt-1 text-sm">
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {supply.loads.map((load) => (
                        <li key={load.id} className="flex justify-between gap-3">
                          <span className="min-w-0">{tx(load.label)}</span>
                          <span className="tabular shrink-0 font-ui">{t("current.load", { ma: load.ma })}</span>
                        </li>
                      ))}
                    </ul>
                  </Fold>
                ) : (
                  <p className="mt-1 text-sm text-muted">{t("current.idle")}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
