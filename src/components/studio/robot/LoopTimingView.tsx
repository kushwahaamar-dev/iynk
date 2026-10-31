"use client";

import { useMemo } from "react";
import type { LoopStats } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";

export interface LoopTimingViewProps {
  stats: LoopStats;
  targetPeriodNs?: number;
  messages: Messages["robot"];
  lang: Locale;
}

const WIDTH = 600;
const HEIGHT = 120;
const PAD = { left: 8, right: 8, top: 8, bottom: 20 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const OVERRUN_WARN = 0.05;
/** A pass counts as an overrun past this many target periods, the same rule the loop probe uses. */
const OVERRUN_FACTOR = 2;

const ms = (ns: number) => String(Number((ns / 1e6).toPrecision(3)));

/** The share of loop passes in bins that lie wholly past the overrun line; a bin that straddles the line is not counted. */
function overrunFraction(stats: LoopStats, targetPeriodNs: number | undefined): number {
  if (targetPeriodNs === undefined || stats.n === 0) return 0;
  let over = 0;
  for (const bin of stats.histogram) if (bin.loNs >= OVERRUN_FACTOR * targetPeriodNs) over += bin.count;
  return over / stats.n;
}

export function LoopTimingView({ stats, targetPeriodNs, messages, lang }: LoopTimingViewProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);

  if (stats.n === 0) {
    return (
      <section className="flex flex-col gap-2" data-testid="loop-timing">
        <h3 className="text-sm font-semibold">{t("loop.title")}</h3>
        <p className="rounded-xl border border-rule bg-console px-3 py-8 text-center text-sm text-console-muted">{t("loop.empty")}</p>
      </section>
    );
  }

  const over = overrunFraction(stats, targetPeriodNs);
  const tallest = Math.max(...stats.histogram.map((b) => b.count), 1);
  const slot = PLOT_W / stats.histogram.length;
  const first = stats.histogram[0]!;
  const last = stats.histogram[stats.histogram.length - 1]!;
  const figures = [
    t("loop.mean", { ms: ms(stats.meanNs) }),
    t("loop.p95", { ms: ms(stats.p95Ns) }),
    t("loop.max", { ms: ms(stats.maxNs) }),
    t("loop.jitter", { ms: ms(stats.jitterNs) }),
  ];

  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid="loop-timing">
      <h3 className="text-sm font-semibold">{t("loop.title")}</h3>
      {over > OVERRUN_WARN ? (
        <p role="alert" className="rounded-xl bg-warn-bg px-3 py-2 text-sm font-medium text-warn tabular-nums" data-testid="loop-overrun">
          {t("loop.overrun", { percent: Math.round(over * 100) })}
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="loop-figures">
        {figures.map((text) => (
          <li key={text} className="rounded-xl bg-sunken px-3 py-2 font-mono font-semibold tabular-nums">{text}</li>
        ))}
      </ul>
      <svg role="img" aria-label={t("loop.histogram")} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-xl border border-rule bg-console" focusable="false">
        {stats.histogram.map((bin, i) => {
          const h = (bin.count / tallest) * PLOT_H;
          return (
            <rect
              key={bin.loNs}
              x={PAD.left + i * slot + 1}
              y={PAD.top + PLOT_H - h}
              width={Math.max(slot - 2, 1)}
              height={h}
              rx="2"
              className="fill-console-accent"
              data-testid="loop-bar"
            />
          );
        })}
        <g className="fill-console-muted font-mono text-xs tabular-nums" aria-hidden="true">
          <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="#313131" />
          <text x={PAD.left} y={HEIGHT - 4}>{ms(first.loNs)} ms</text>
          <text x={PAD.left + PLOT_W} y={HEIGHT - 4} textAnchor="end">{ms(last.hiNs)} ms</text>
        </g>
      </svg>
      <details>
        <summary className="cursor-pointer text-sm font-medium">{t("pid.table")}</summary>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-start font-mono text-xs tabular-nums" data-testid="loop-table">
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-start">ms</th>
                <th scope="col" className="px-2 py-1 text-start">n</th>
              </tr>
            </thead>
            <tbody>
              {stats.histogram.map((bin) => (
                <tr key={bin.loNs}>
                  <td className="px-2 py-1">{ms(bin.loNs)} to {ms(bin.hiNs)}</td>
                  <td className="px-2 py-1">{bin.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
