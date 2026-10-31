"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { MAX_COLUMNS, type PlotRow, type PlotStore } from "@/studio/run/plot";

export interface PlotterProps {
  store: PlotStore;
  paused: boolean;
  windowRows: number;
  messages: Messages["instruments"];
  lang: Locale;
}

const WIDTH = 600;
const HEIGHT = 200;
const PAD = { left: 40, right: 72, top: 8, bottom: 20 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const MIN_WINDOW = 100;
const MAX_WINDOW = 5000;
const TABLE_ROWS = 200;

/** Colour is a second cue only: every trace also has its own dash pattern and a label at its end. */
const TRACE_STYLES: readonly { stroke: string; dash: string | undefined }[] = [
  { stroke: "#8af0ae", dash: undefined },
  { stroke: "#f4b829", dash: "6 3" },
  { stroke: "#7cc4ff", dash: "2 2" },
  { stroke: "#ff8a7a", dash: "8 3 2 3" },
  { stroke: "#d6a8ff", dash: "12 4" },
  { stroke: "#f2e394", dash: "1 3" },
  { stroke: "#7ee8e0", dash: "10 3 2 3 2 3" },
  { stroke: "#e8e8e8", dash: "4 4" },
];

type Point = readonly [number, number];

/** The rows as they were when last drawn: at most one update per animation frame, and none while paused. */
function useDrawnRows(store: PlotStore, paused: boolean): readonly PlotRow[] {
  const [rows, setRows] = useState(() => store.rows());
  const frame = useRef(0);

  useEffect(() => {
    if (paused) return;
    const schedule = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setRows(store.rows());
      });
    };
    schedule();
    const unsubscribe = store.subscribe(schedule);
    return () => {
      unsubscribe();
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [store, paused]);

  return rows;
}

/** Keeps the lowest and highest point of every pixel column, which is all the eye can tell apart. */
function decimate(points: Point[]): Point[] {
  if (points.length <= PLOT_W * 2) return points;
  const out: Point[] = [];
  let bucket = Math.floor(points[0]![0]);
  let low = points[0]!;
  let high = points[0]!;
  const flush = () => {
    out.push(...([low, high].sort((a, b) => a[0] - b[0]) as Point[]));
  };
  for (const p of points) {
    const b = Math.floor(p[0]);
    if (b !== bucket) {
      flush();
      bucket = b;
      low = p;
      high = p;
    } else {
      if (p[1] < low[1]) low = p;
      if (p[1] > high[1]) high = p;
    }
  }
  flush();
  return out;
}

function toSegments(rows: readonly PlotRow[], column: number, x: (tNs: number) => number, y: (v: number) => number): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];
  for (const row of rows) {
    const v = row.values[column];
    if (v === null || v === undefined) {
      if (current.length) segments.push(current);
      current = [];
    } else current.push([x(row.tNs), y(v)]);
  }
  if (current.length) segments.push(current);
  return segments.map(decimate);
}

const seconds = (tNs: number) => (tNs / 1e9).toFixed(3);
const num = (v: number) => String(Number(v.toPrecision(6)));

export function Plotter({ store, paused, windowRows, messages, lang }: PlotterProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const all = useDrawnRows(store, paused);
  const size = Math.min(MAX_WINDOW, Math.max(MIN_WINDOW, windowRows));
  const rows = all.length > size ? all.slice(-size) : all;
  const names = store.columns();
  const count = Math.min(names.length, MAX_COLUMNS);
  const columns = Array.from({ length: count }, (_, i) => names[i] || t("plotter.col", { n: i + 1 }));

  let min = Infinity;
  let max = -Infinity;
  for (const row of rows)
    for (const v of row.values)
      if (v !== null) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const t0 = rows[0]?.tNs ?? 0;
  const t1 = rows[rows.length - 1]?.tNs ?? 0;
  const x = (tNs: number) => PAD.left + (t1 === t0 ? PLOT_W : ((tNs - t0) / (t1 - t0)) * PLOT_W);
  const y = (v: number) => PAD.top + PLOT_H - ((v - min) / (max - min)) * PLOT_H;

  const traces = columns.map((name, i) => {
    const segments = toSegments(rows, i, x, y);
    let latest: number | null = null;
    for (let r = rows.length - 1; r >= 0 && latest === null; r--) latest = rows[r]!.values[i] ?? null;
    return { name, style: TRACE_STYLES[i]!, segments, latest };
  });

  const latestText = (v: number | null) => t("plotter.latest", { value: v === null ? "-" : num(v) });
  const summary = [t("plotter.legend"), ...traces.map((tr) => `${tr.name}, ${latestText(tr.latest)}`)].join(". ");
  const dropped = store.dropped();
  const tableRows = rows.slice(-TABLE_ROWS);

  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid="plotter">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <ul aria-label={t("plotter.legend")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm" data-testid="plotter-legend">
          {traces.map((tr) => (
            <li key={tr.name} className="flex items-center gap-2">
              <svg width="24" height="8" aria-hidden="true" focusable="false">
                <line x1="0" y1="4" x2="24" y2="4" stroke={tr.style.stroke} strokeWidth="2" strokeDasharray={tr.style.dash} />
              </svg>
              <span className="font-medium">{tr.name}</span>
              <span className="font-mono tabular-nums text-muted">{latestText(tr.latest)}</span>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" disabled={all.length === 0 && dropped === 0} onClick={() => store.clear()}>
          {t("plotter.clear")}
        </Button>
      </div>
      {store.columnsIgnored() ? <p className="text-sm text-muted">{t("plotter.columnsIgnored")}</p> : null}
      {dropped > 0 ? <p className="text-sm tabular-nums text-muted">{t("plotter.dropped", { n: dropped })}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-rule bg-console px-3 py-8 text-center text-sm text-console-muted">{t("plotter.empty")}</p>
      ) : (
        <svg role="img" aria-label={summary} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-xl border border-rule bg-console" focusable="false">
          <g className="fill-console-muted font-mono text-xs tabular-nums" aria-hidden="true">
            <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="#313131" />
            <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="#313131" />
            <text x={PAD.left - 4} y={PAD.top + 8} textAnchor="end">{num(max)}</text>
            <text x={PAD.left - 4} y={PAD.top + PLOT_H} textAnchor="end">{num(min)}</text>
            <text x={PAD.left} y={HEIGHT - 4}>{seconds(t0)} s</text>
            <text x={PAD.left + PLOT_W} y={HEIGHT - 4} textAnchor="end">{seconds(t1)} s</text>
          </g>
          {traces.map((tr) => (
            <g key={tr.name} stroke={tr.style.stroke} strokeDasharray={tr.style.dash} strokeWidth="1.5" fill="none" data-testid="plotter-trace">
              {tr.segments.map((seg, i) => (
                <polyline key={i} points={seg.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")} />
              ))}
            </g>
          ))}
          <g className="font-sans text-xs" aria-hidden="true">
            {traces.map((tr) => {
              const end = tr.segments[tr.segments.length - 1]?.at(-1);
              return end ? (
                <text key={tr.name} x={Math.min(end[0] + 4, WIDTH - PAD.right + 4)} y={end[1] + 4} fill={tr.style.stroke}>
                  {tr.name}
                </text>
              ) : null;
            })}
          </g>
        </svg>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-medium">{t("scope.table")}</summary>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-start font-mono text-xs tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-start">{t("column.time")}</th>
                {columns.map((name) => (
                  <th key={name} scope="col" className="px-2 py-1 text-start">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">{seconds(row.tNs)}</td>
                  {columns.map((name, c) => (
                    <td key={name} className="px-2 py-1">{row.values[c] == null ? "" : num(row.values[c])}</td>
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
