"use client";

import { Callout } from "@/components/ui/Callout";
import { Meter } from "@/components/ui/Meter";
import { Stat } from "@/components/ui/Stat";
import type { FigureState, RoboticsContent } from "@/content/schema";
import type { CurrentDraw } from "@/lib/robotics/current";
import { readStatus, type StatusReading } from "@/lib/robotics/status";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  figure: FigureState;
  draw: CurrentDraw;
  t: BenchT;
  tx: TextOf;
  headingId: string;
};

const FIGURE_STATUS = ["off", "no-power", "powered", "running", "uploading", "brownout", "fault"] as const;
type FigureStatus = (typeof FIGURE_STATUS)[number];

const isFigureStatus = (value: unknown): value is FigureStatus =>
  typeof value === "string" && (FIGURE_STATUS as readonly string[]).includes(value);

function shown(reading: StatusReading, t: BenchT): { text: string; tone: "ink" | "good" | "bad" | "warn" } {
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

type FaultReport = { msg?: unknown; fix?: unknown };

export function StatusPanel({ bench, figure, draw, t, tx, headingId }: Props) {
  const status = figure.status;
  const fault = (typeof figure.fault === "object" && figure.fault !== null ? figure.fault : null) as FaultReport | null;

  return (
    <section aria-labelledby={headingId} className="ink-card p-4 sm:p-5">
      <h2 id={headingId} className="text-xl">
        {t("status.heading")}
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <li>
          <Stat
            label={t("status.figure")}
            size="sm"
            value={isFigureStatus(status) ? t(`status.states.${status}`) : t("status.none")}
            tone={status === "running" ? "good" : status === "fault" || status === "brownout" ? "bad" : "ink"}
          />
        </li>
        {bench.status.map((field) => {
          const { text, tone } = shown(readStatus(field, figure, draw), t);
          return (
            <li key={field.id} data-status={field.id}>
              <Stat label={tx(field.label)} size="sm" value={text} tone={tone} />
            </li>
          );
        })}
      </ul>

      {fault && typeof fault.msg === "string" ? (
        <Callout tone="danger" className="mt-4" title={t("status.fault", { msg: fault.msg })}>
          {typeof fault.fix === "string" ? t("status.faultFix", { fix: fault.fix }) : null}
        </Callout>
      ) : null}

      <div className="mt-5 flex flex-col gap-4" aria-label={t("current.heading")} role="group">
        <h3 className="text-base">{t("current.heading")}</h3>
        {draw.supplies.map((supply) => (
          <div key={supply.id} data-supply={supply.id}>
            <Meter
              label={t("current.supply", { label: tx(supply.label), volts: supply.volts })}
              value={supply.ma}
              max={Math.max(supply.limitMa, supply.ma)}
              valueText={t("current.of", { ma: supply.ma, limit: supply.limitMa })}
              warn={supply.limitMa * 0.8}
              danger={supply.limitMa}
            />
            <p className="mt-1 text-sm">
              {supply.over ? (
                <strong className="text-bad">{t("current.over", { ma: -supply.headroomMa })}</strong>
              ) : (
                t("current.headroom", { ma: supply.headroomMa })
              )}
            </p>
            {supply.loads.length > 0 ? (
              <details className="mt-1 text-sm">
                <summary className="cursor-pointer font-ui text-xs font-bold">{t("current.loads")}</summary>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {supply.loads.map((load) => (
                    <li key={load.id} className="flex justify-between gap-3">
                      <span>{tx(load.label)}</span>
                      <span className="tabular font-ui">{t("current.load", { ma: load.ma })}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-1 text-sm text-muted">{t("current.idle")}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
