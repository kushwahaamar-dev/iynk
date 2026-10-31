"use client";

import { type KeyboardEvent, useId, useMemo, useState } from "react";
import { Button, Select, TextInput } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { buildFrame, type CaptureFrame, type CaptureSpec, type ChannelKind, type CsvMeta, type FrameChannel, MAX_CHANNELS, tableRows, toCsv } from "@/sim/probe/capture";
import { MAX_CAPACITY } from "@/sim/probe/ring";
import type { TraceChunk } from "@/sim/probe/tap";

export const MIN_CAPACITY = 1024;

export interface ChannelInfo {
  id: string;
  kind: ChannelKind;
  /** Shown instead of the numbered default. */
  label?: string;
}

export interface CaptureViewProps {
  channels: ChannelInfo[];
  chunks: Record<string, TraceChunk>;
  nowNs: number;
  paused: boolean;
  capacity: number;
  onCapacity: (capacity: number) => void;
  meta: CsvMeta;
  messages: Messages["instruments"];
  lang: Locale;
  /** Starting time base in ms. */
  timeBaseMs?: number;
  testId?: string;
}

const WIDTH = 600;
const PAD = { left: 40, right: 16, top: 8, bottom: 20 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const ANALOG_H = 120;
const LANE_H = 24;
const LANE_GAP = 8;
const TABLE_ROWS = 200;
const NS_PER_MS = 1e6;

/** Colour is a second cue only: every channel also has its own dash pattern and a label. */
const STYLES: readonly { stroke: string; dash: string | undefined }[] = [
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

const ms = (tNs: number) => (tNs / NS_PER_MS).toFixed(3);
const num = (v: number | string) => (typeof v === "number" ? String(Number(v.toPrecision(6))) : v);
const clampCapacity = (n: number) => Math.min(MAX_CAPACITY, Math.max(MIN_CAPACITY, Math.round(n)));

/** Zero-order hold: the line runs flat to the next sample, then steps. Past two points per pixel column it keeps each column's lowest and highest value. */
export function holdPoints(c: FrameChannel, x: (tNs: number) => number, y: (v: number) => number, xEnd: number): Point[] {
  const maxPoints = PLOT_W * 2;
  if (c.t.length === 0) return [];
  if (c.t.length <= maxPoints / 2) {
    const out: Point[] = [];
    for (let i = 0; i < c.t.length; i++) {
      if (i > 0) out.push([x(c.t[i]), y(c.v[i - 1])]);
      out.push([x(c.t[i]), y(c.v[i])]);
    }
    out.push([xEnd, y(c.v[c.v.length - 1])]);
    return out;
  }
  const out: Point[] = [];
  let column = Math.floor(x(c.t[0]));
  let low = c.v[0];
  let high = c.v[0];
  const flush = () => out.push([column, y(low)], [column, y(high)]);
  for (let i = 0; i < c.t.length; i++) {
    const col = Math.floor(x(c.t[i]));
    if (col !== column) {
      flush();
      column = col;
      low = high = c.v[i];
    } else {
      low = Math.min(low, c.v[i]);
      high = Math.max(high, c.v[i]);
    }
  }
  flush();
  return out;
}

const points = (list: Point[]) => list.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");

/** Keeps the inputs as they were when the run paused, so the picture and its table stop together. */
function useHeld<T>(live: T, paused: boolean): T {
  const [held, setHeld] = useState(live);
  if (!paused && held !== live) setHeld(live);
  return paused ? held : live;
}

function download(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "capture.csv";
  link.click();
  URL.revokeObjectURL(url);
}

interface CursorProps {
  label: string;
  index: number;
  count: number;
  text: string;
  onMove: (index: number) => void;
}

function CursorSlider({ label, index, count, text, onMove }: CursorProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, number> = { ArrowRight: index + step, ArrowUp: index + step, ArrowLeft: index - step, ArrowDown: index - step, Home: 0, End: count - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    onMove(Math.min(count - 1, Math.max(0, moves[event.key])));
  }
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={Math.max(0, count - 1)}
      aria-valuenow={index}
      aria-valuetext={text}
      onKeyDown={onKeyDown}
      className="rounded-lg bg-sunken px-3 py-2 text-sm font-medium tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {label} <span className="font-mono tabular-nums">{text}</span>
    </div>
  );
}

export function CaptureView({ channels, chunks, nowNs, paused, capacity, onCapacity, meta, messages, lang, timeBaseMs = 10, testId = "scope" }: CaptureViewProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const [timeBase, setTimeBase] = useState(String(timeBaseMs));
  const [edge, setEdge] = useState<"rising" | "falling" | null>(null);
  const [triggerId, setTriggerId] = useState("");
  const [level, setLevel] = useState("0.5");
  const [cursors, setCursors] = useState<[number, number]>([0, 0]);
  const levelId = useId();

  const used = channels.slice(0, MAX_CHANNELS);
  const live = useMemo(() => ({ chunks, nowNs }), [chunks, nowNs]);
  const input = useHeld(live, paused);
  const timeBaseNs = Math.max(0, Number(timeBase) || 0) * NS_PER_MS;
  const trigger = used.find((c) => c.id === triggerId) ?? used[0];

  const frame: CaptureFrame = useMemo(() => {
    const spec: CaptureSpec = {
      channels: used.map(({ id, kind }) => ({ id, kind })),
      timeBaseNs: Math.max(1, timeBaseNs),
      ...(edge && trigger ? { trigger: { channel: trigger.id, edge, ...(trigger.kind === "analog" ? { level: Number(level) || 0 } : {}) } } : {}),
    };
    return buildFrame(input.chunks, spec, input.nowNs);
  }, [used, timeBaseNs, edge, trigger, level, input]);

  const rows = useMemo(() => tableRows(frame), [frame]);
  const names = used.map((c, i) => c.label ?? t("channel", { n: i + 1 }));
  const analog = frame.channels.flatMap((c, i) => (c.kind === "analog" ? [{ c, i }] : []));
  const digital = frame.channels.flatMap((c, i) => (c.kind === "digital" ? [{ c, i }] : []));

  let low = Infinity;
  let high = -Infinity;
  for (const { c } of analog)
    for (const v of c.v) {
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
  if (!Number.isFinite(low) || low === high) {
    low = (Number.isFinite(low) ? low : 0) - 1;
    high = low + 2;
  }
  const span = Math.max(1, frame.endNs - frame.startNs);
  const x = (tNs: number) => PAD.left + Math.min(1, Math.max(0, (tNs - frame.startNs) / span)) * PLOT_W;
  const analogH = analog.length > 0 ? ANALOG_H : 0;
  const yAnalog = (v: number) => PAD.top + analogH - ((v - low) / (high - low)) * analogH;
  const laneTop = (k: number) => PAD.top + analogH + (analogH > 0 ? LANE_GAP : 0) + k * (LANE_H + LANE_GAP);
  const plotBottom = PAD.top + analogH + (analogH > 0 && digital.length > 0 ? LANE_GAP : 0) + digital.length * (LANE_H + LANE_GAP);
  const height = plotBottom + PAD.bottom;

  const [a, b] = [Math.min(cursors[0], rows.length - 1), Math.min(cursors[1], rows.length - 1)].map((n) => Math.max(0, n));
  const cursorText = (n: number) => (rows[n] ? `${ms(rows[n].tNs)} ms` : "-");
  const delta = rows[a] && rows[b] ? ms(Math.abs(rows[b].tNs - rows[a].tNs)) : "0.000";

  const kept = Math.max(0, ...used.map((c) => chunks[c.id]?.t.length ?? 0));
  const lost = used.reduce((sum, c) => sum + (frame.dropped[c.id] ?? 0), 0);
  const last = rows[rows.length - 1];
  const summary = t("scope.summary", { n: rows.length, t: last ? ms(last.tNs) : "0.000" });
  const pwm = Object.entries(frame.pwm ?? {});
  const tableCapped = rows.slice(-TABLE_ROWS);
  const tableStart = rows.length - tableCapped.length;

  return (
    <section className="flex min-h-0 flex-col gap-2" data-testid={testId}>
      <div className="flex flex-wrap items-end gap-2">
        <TextInput label={`${t("scope.timeBase")} (ms)`} type="number" min={0} step="any" inputMode="decimal" value={timeBase} onChange={(e) => setTimeBase(e.target.value)} className="w-24 tabular-nums" />
        {used.length > 1 ? (
          <Select label={t("scope.trigger")} value={trigger?.id ?? ""} onChange={(e) => setTriggerId(e.target.value)}>
            {used.map((c, i) => (
              <option key={c.id} value={c.id}>{names[i]}</option>
            ))}
          </Select>
        ) : null}
        <div role="group" aria-label={t("scope.trigger")} className="flex gap-1">
          {(["rising", "falling"] as const).map((e) => (
            <Button key={e} size="sm" variant="secondary" aria-pressed={edge === e} onClick={() => setEdge(edge === e ? null : e)}>
              {t(`scope.${e}`)}
            </Button>
          ))}
        </div>
        {trigger?.kind === "analog" ? (
          <TextInput id={levelId} label={t("scope.level")} type="number" step="any" inputMode="decimal" value={level} onChange={(e) => setLevel(e.target.value)} className="w-24 tabular-nums" />
        ) : null}
        <TextInput
          label={t("capSet")}
          type="number"
          min={MIN_CAPACITY}
          max={MAX_CAPACITY}
          step={1}
          value={capacity}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onCapacity(clampCapacity(n));
          }}
          className="w-32 tabular-nums"
        />
        <Button size="sm" variant="secondary" disabled={rows.length === 0} onClick={() => download(toCsv(frame, meta))}>
          {t("scope.export")}
        </Button>
      </div>

      <ul aria-label={names.join(", ")} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {used.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2">
            <svg width="24" height="8" aria-hidden="true" focusable="false">
              <line x1="0" y1="4" x2="24" y2="4" stroke={STYLES[i].stroke} strokeWidth="2" strokeDasharray={STYLES[i].dash} />
            </svg>
            <span className="font-medium">{names[i]}</span>
            {frame.pwm?.[c.id] ? (
              <span className="font-mono tabular-nums text-muted">
                {t("scope.pwm", { duty: (frame.pwm[c.id].duty * 100).toFixed(1), hz: frame.pwm[c.id].hz.toFixed(1) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-sm tabular-nums text-muted" data-testid={`${testId}-summary`}>{summary}</p>
      <p className="text-sm tabular-nums text-muted" data-testid={`${testId}-cap`}>{t("cap", { kept, dropped: lost })}</p>
      {frame.notes.includes("staircase") ? <p className="text-sm text-muted">{t("staircase")}</p> : null}
      {frame.notes.includes("cost-model") ? <p className="text-sm text-muted">{t("costModel")}</p> : null}

      {rows.length > 0 ? (
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full rounded-xl border border-rule bg-console" aria-hidden="true" focusable="false">
          <g className="fill-console-muted font-mono text-xs tabular-nums">
            <line x1={PAD.left} x2={PAD.left + PLOT_W} y1={plotBottom} y2={plotBottom} stroke="#313131" />
            <text x={PAD.left} y={height - 4}>{ms(frame.startNs)} ms</text>
            <text x={PAD.left + PLOT_W} y={height - 4} textAnchor="end">{ms(frame.endNs)} ms</text>
            {analog.length > 0 ? (
              <>
                <text x={PAD.left - 4} y={PAD.top + 8} textAnchor="end">{num(high)}</text>
                <text x={PAD.left - 4} y={PAD.top + analogH} textAnchor="end">{num(low)}</text>
              </>
            ) : null}
          </g>
          {analog.map(({ c, i }) => (
            <polyline key={c.id} points={points(holdPoints(c, x, yAnalog, x(frame.endNs)))} fill="none" stroke={STYLES[i].stroke} strokeDasharray={STYLES[i].dash} strokeWidth="1.5" />
          ))}
          {digital.map(({ c, i }, k) => {
            const top = laneTop(k);
            const yDigital = (v: number) => (v >= 0.5 ? top : top + LANE_H);
            return (
              <g key={c.id}>
                <polyline points={points(holdPoints(c, x, yDigital, x(frame.endNs)))} fill="none" stroke={STYLES[i].stroke} strokeDasharray={STYLES[i].dash} strokeWidth="1.5" />
                <text x={PAD.left - 4} y={top + LANE_H / 2 + 4} textAnchor="end" className="fill-console-muted font-sans text-xs">{names[i]}</text>
              </g>
            );
          })}
          {[a, b].map((n, k) =>
            rows[n] ? <line key={k} x1={x(rows[n].tNs)} x2={x(rows[n].tNs)} y1={PAD.top} y2={plotBottom} stroke="#e8e8e8" strokeDasharray={k === 0 ? "2 2" : "6 2"} /> : null,
          )}
        </svg>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <CursorSlider label={`${t("scope.cursor")} 1`} index={a} count={rows.length} text={cursorText(a)} onMove={(n) => setCursors([n, b])} />
          <CursorSlider label={`${t("scope.cursor")} 2`} index={b} count={rows.length} text={cursorText(b)} onMove={(n) => setCursors([a, n])} />
          <span className="font-mono text-sm tabular-nums">{t("scope.delta", { dt: delta })}</span>
        </div>
      ) : null}

      <details>
        <summary className="cursor-pointer text-sm font-medium">{t("scope.table")}</summary>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-start font-mono text-xs tabular-nums">
            <thead>
              <tr>
                <th scope="col" className="px-2 py-1 text-start">{t("column.time")}</th>
                {names.map((name, i) => (
                  <th key={used[i].id} scope="col" className="px-2 py-1 text-start">{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableCapped.map((row, i) => (
                <tr key={tableStart + i}>
                  <td className="px-2 py-1">{ms(row.tNs)}</td>
                  {row.values.map((v, c) => (
                    <td key={used[c].id} className="px-2 py-1">{num(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {pwm.length > 0 ? <span className="sr-only" aria-live="polite">{pwm.map(([id, p]) => `${names[used.findIndex((c) => c.id === id)]}: ${t("scope.pwm", { duty: (p.duty * 100).toFixed(1), hz: p.hz.toFixed(1) })}`).join(". ")}</span> : null}
    </section>
  );
}

export type ScopeProps = Omit<CaptureViewProps, "testId">;

export function Scope(props: ScopeProps) {
  return <CaptureView {...props} testId="scope" />;
}
