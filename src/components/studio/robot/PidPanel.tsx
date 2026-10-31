"use client";

import { useMemo } from "react";
import type { PidTrace, StepMetrics } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";

export interface PidPanelProps {
  trace: PidTrace;
  metrics: StepMetrics;
  /** The unit of the setpoint and the response, from the user's unit preference. */
  unit: string;
  messages: Messages["robot"];
  lang: Locale;
}

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { left: 40, right: 8, top: 8, bottom: 20 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MAX_POINTS = 1000;
const TABLE_ROWS = 200;

type TraceKey = "setpoint" | "response" | "output" | "integral";

/** Colour is a second cue only: each trace has its own dash pattern too. */
const TRACES: readonly { key: TraceKey; label: "pid.target" | "pid.measured" | "pid.output" | "pid.integral"; stroke: string; dash: string | undefined }[] = [
  { key: "setpoint", label: "pid.target", stroke: "#f4b829", dash: "6 3" },
  { key: "response", label: "pid.measured", stroke: "#8af0ae", dash: undefined },
  { key: "output", label: "pid.output", stroke: "#7cc4ff", dash: "2 2" },
  { key: "integral", label: "pid.integral", stroke: "#ff8a7a", dash: "8 3 2 3" },
];

const num = (v: number) => String(Number(v.toPrecision(4)));
const seconds = (tNs: number) => (tNs / 1e9).toFixed(3);
const millis = (ns: number | null) => (ns === null ? "-" : `${num(ns / 1e6)} ms`);

/** At most MAX_POINTS indices, evenly spaced, always ending on the last sample. */
function sampleIndices(n: number): number[] {
  if (n <= MAX_POINTS) return Array.from({ length: n }, (_, i) => i);
  const out = Array.from({ length: MAX_POINTS - 1 }, (_, i) => Math.floor((i * (n - 1)) / (MAX_POINTS - 1)));
  out.push(n - 1);
  return out;
}

function metricRows(metrics: StepMetrics, unit: string, t: Translate<Messages["robot"]>) {
  return [
    { key: "rise", label: t("pid.riseTime"), value: millis(metrics.riseNs) },
    { key: "overshoot", label: t("pid.overshoot"), value: `${Math.round(metrics.overshootPct)} %` },
    { key: "settle", label: t("pid.settlingTime"), value: millis(metrics.settleNs) },
    { key: "steady", label: t("pid.steadyError"), value: `${num(metrics.steadyError)} ${unit}` },
  ];
}

export function PidPanel({ trace, metrics, unit, messages, lang }: PidPanelProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);
  const n = trace.tNs.length;

  if (n === 0) {
    return (
      <section className="flex flex-col gap-2" data-testid="pid-panel">
        <h3 className="text-sm font-semibold">{t("pid.title")}</h3>
        <p className="rounded-xl border border-rule bg-console px-3 py-8 text-center text-sm text-console-muted">{t("pid.empty")}</p>
      </section>
    );
  }

  const picked = sampleIndices(n);
  let min = Infinity;
  let max = -Infinity;
  for (const { key } of TRACES)
    for (const v of trace[key]) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const t0 = trace.tNs[0]!;
  const t1 = trace.tNs[n - 1]!;
  const x = (tNs: number) => PAD.left + (t1 === t0 ? PLOT_W : ((tNs - t0) / (t1 - t0)) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - ((v - min) / (max - min)) * PLOT_H;

  const rows = metricRows(metrics, unit, t);
  const first = Math.max(0, n - TABLE_ROWS);

  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid="pid-panel">
      <h3 className="text-sm font-semibold">{t("pid.title")}</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" data-testid="pid-legend">
        {TRACES.map((tr) => (
          <li key={tr.key} className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden="true" focusable="false">
              <line x1="0" y1="4" x2="24" y2="4" stroke={tr.stroke} strokeWidth="2" strokeDasharray={tr.dash} />
            </svg>
            <span className="font-medium">{t(tr.label)}</span>
            <span className="font-mono tabular-nums text-muted">{num(trace[tr.key][n - 1]!)}</span>
          </li>
        ))}
      </ul>
      <svg
        role="img"
        aria-label={`${t("pid.title")}: ${rows.map((r) => `${r.label} ${r.value}`).join(", ")}`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full rounded-xl border border-rule bg-console"
        focusable="false"
      >
        <g className="fill-console-muted font-mono text-xs tabular-nums" aria-hidden="true">
          <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="#313131" />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="#313131" />
          <text x={PAD.left - 4} y={PAD.top + 8} textAnchor="end">{num(max)}</text>
          <text x={PAD.left - 4} y={PAD.top + PLOT_H} textAnchor="end">{num(min)}</text>
          <text x={PAD.left} y={HEIGHT - 4}>{seconds(t0)} s</text>
          <text x={PAD.left + PLOT_W} y={HEIGHT - 4} textAnchor="end">{seconds(t1)} s</text>
        </g>
        {TRACES.map((tr) => (
          <polyline
            key={tr.key}
            points={picked.map((i) => `${x(trace.tNs[i]!).toFixed(1)},${y(trace[tr.key][i]!).toFixed(1)}`).join(" ")}
            stroke={tr.stroke}
            strokeDasharray={tr.dash}
            strokeWidth="1.5"
            fill="none"
            data-testid="pid-trace"
          />
        ))}
      </svg>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" data-testid="pid-metrics">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-0 rounded-xl bg-sunken px-3 py-2">
            <dt className="text-muted">{r.label}</dt>
            <dd className="font-mono text-base font-semibold tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">{t("pid.noGains")}</p>
      <details>
        <summary className="cursor-pointer text-sm font-medium">{t("pid.table")}</summary>
        <div className="max-h-48 overflow-auto">
          <table className="mb-2 w-full text-start font-mono text-xs tabular-nums" data-testid="pid-metrics-table">
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <th scope="row" className="px-2 py-1 text-start font-medium">{r.label}</th>
                  <td className="px-2 py-1">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <table className="w-full text-start font-mono text-xs tabular-nums" data-testid="pid-table">
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-start">t (s)</th>
                {TRACES.map((tr) => (
                  <th key={tr.key} scope="col" className="px-2 py-1 text-start">{t(tr.label)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n - first }, (_, k) => first + k).map((i) => (
                <tr key={i}>
                  <td className="px-2 py-1">{seconds(trace.tNs[i]!)}</td>
                  {TRACES.map((tr) => (
                    <td key={tr.key} className="px-2 py-1">{num(trace[tr.key][i]!)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
