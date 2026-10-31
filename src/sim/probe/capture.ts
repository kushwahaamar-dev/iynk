import type { SimTime } from "../core/clock.ts";
import type { Provenance, TraceChunk } from "./tap.ts";

export const MAX_CHANNELS = 8;
/** The trigger looks for an edge in this many time bases before now. */
const TRIGGER_WINDOWS = 4;
const DIGITAL_LEVEL = 0.5;
const GUARDED = /^[=+\-@]/;

export type ChannelKind = "analog" | "digital";

export interface CaptureSpec {
  channels: { id: string; kind: ChannelKind }[];
  timeBaseNs: number;
  trigger?: { channel: string; edge: "rising" | "falling"; level?: number };
  holdoffNs?: number;
}

export interface FrameChannel {
  id: string;
  kind: ChannelKind;
  t: Float64Array;
  v: Float64Array;
  min?: Float64Array;
  max?: Float64Array;
  /** The value holds until the next sample. */
  zoh: boolean;
}

export interface CaptureFrame {
  startNs: number;
  endNs: number;
  channels: FrameChannel[];
  dropped: Record<string, number>;
  notes: Array<"staircase" | "cost-model">;
  pwm?: Record<string, { duty: number; hz: number }>;
}

export interface CsvMeta {
  docHash: string;
  seed: number;
  versions: Record<string, string>;
  provenance: Record<string, Provenance>;
}

const EMPTY = new Float64Array(0);

function crosses(prev: number, next: number, edge: "rising" | "falling", level: number): boolean {
  return edge === "rising" ? prev < level && next >= level : prev > level && next <= level;
}

/** Time of the first matching edge at or after `from` in the newest part of the trace, or null. */
function findTrigger(chunk: TraceChunk, trigger: NonNullable<CaptureSpec["trigger"]>, kind: ChannelKind, from: SimTime): number | null {
  const level = trigger.level ?? (kind === "digital" ? DIGITAL_LEVEL : 0);
  for (let i = 1; i < chunk.t.length; i++) {
    if (chunk.t[i] >= from && crosses(chunk.v[i - 1], chunk.v[i], trigger.edge, level)) return chunk.t[i];
  }
  return null;
}

/** The samples in `[start, end]`, led by the sample that holds at `start` so the line does not begin in mid air. */
function windowOf(id: string, kind: ChannelKind, chunk: TraceChunk | undefined, start: SimTime, end: SimTime): FrameChannel {
  if (!chunk || chunk.t.length === 0) return { id, kind, t: EMPTY, v: EMPTY, zoh: true };
  let first = chunk.t.length;
  for (let i = 0; i < chunk.t.length; i++) {
    if (chunk.t[i] >= start) {
      first = i;
      break;
    }
  }
  let last = first;
  while (last < chunk.t.length && chunk.t[last] <= end) last++;
  const lead = first > 0 && (first === chunk.t.length || chunk.t[first] > start) ? first - 1 : first;
  const slice = (a?: Float64Array) => a?.slice(lead, last);
  const t = chunk.t.slice(lead, last);
  if (lead < first && t.length > 0) t[0] = start;
  const min = slice(chunk.min);
  const max = slice(chunk.max);
  return { id, kind, t, v: chunk.v.slice(lead, last), ...(min && max ? { min, max } : {}), zoh: true };
}

/** Duty and frequency from the last two rising edges and the falling edge between them. */
function pwmOf(chunk: TraceChunk): { duty: number; hz: number } | null {
  let rise2 = -1;
  let rise1 = -1;
  let fall = -1;
  for (let i = chunk.t.length - 1; i > 0; i--) {
    const before = chunk.v[i - 1] >= DIGITAL_LEVEL;
    const after = chunk.v[i] >= DIGITAL_LEVEL;
    if (before === after) continue;
    if (after) {
      if (rise2 < 0) rise2 = chunk.t[i];
      else {
        rise1 = chunk.t[i];
        break;
      }
    } else if (rise2 >= 0 && fall < 0) fall = chunk.t[i];
  }
  if (rise1 < 0 || fall < 0) return null;
  const period = rise2 - rise1;
  return { duty: (fall - rise1) / period, hz: 1e9 / period };
}

export function buildFrame(chunks: Record<string, TraceChunk>, spec: CaptureSpec, nowNs: SimTime): CaptureFrame {
  const channels = spec.channels.slice(0, MAX_CHANNELS);
  let startNs = nowNs - spec.timeBaseNs;
  let endNs = nowNs;
  if (spec.trigger) {
    const { channel } = spec.trigger;
    const source = chunks[channel];
    const kind = channels.find((c) => c.id === channel)?.kind;
    if (source && kind) {
      const from = nowNs - spec.timeBaseNs * TRIGGER_WINDOWS + (spec.holdoffNs ?? 0);
      const at = findTrigger(source, spec.trigger, kind, from);
      if (at !== null) {
        startNs = at;
        endNs = at + spec.timeBaseNs;
      }
    }
  }
  const frame: CaptureFrame = {
    startNs,
    endNs,
    channels: channels.map((c) => windowOf(c.id, c.kind, chunks[c.id], startNs, endNs)),
    dropped: Object.fromEntries(channels.map((c) => [c.id, chunks[c.id]?.dropped ?? 0])),
    notes: [],
  };
  if (channels.some((c) => c.kind === "analog" && chunks[c.id]?.staircase)) frame.notes.push("staircase");
  if (channels.some((c) => c.kind === "digital")) frame.notes.push("cost-model");
  const pwm: Record<string, { duty: number; hz: number }> = {};
  for (const c of channels) {
    const found = c.kind === "digital" && chunks[c.id] ? pwmOf(chunks[c.id]) : null;
    if (found) pwm[c.id] = found;
  }
  if (Object.keys(pwm).length > 0) frame.pwm = pwm;
  return frame;
}

/** One row per sample time of any channel; a channel reads as its held value, or empty before its first sample. */
export function tableRows(f: CaptureFrame): { tNs: number; values: (number | string)[] }[] {
  const times = [...new Set(f.channels.flatMap((c) => Array.from(c.t)))].sort((a, b) => a - b);
  const at = f.channels.map(() => 0);
  return times.map((tNs) => ({
    tNs,
    values: f.channels.map((c, k) => {
      while (at[k] < c.t.length && c.t[at[k]] <= tNs) at[k]++;
      return at[k] === 0 ? "" : c.v[at[k] - 1];
    }),
  }));
}

/** A text cell a spreadsheet could read as a formula gets a leading quote; numbers are left alone. */
function cell(value: number | string): string {
  if (typeof value === "number") return String(value);
  const text = GUARDED.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const oneLine = (text: string): string => text.replace(/\s+/g, " ");

export function toCsv(f: CaptureFrame, meta: CsvMeta): string {
  const lines = [
    `# project: ${oneLine(meta.docHash)}`,
    `# seed: ${meta.seed}`,
    ...Object.entries(meta.versions).map(([name, version]) => `# version ${oneLine(name)}: ${oneLine(version)}`),
    ...f.channels.map((c) => `# column ${oneLine(c.id)}: ${meta.provenance[c.id] ?? "not-modelled"}`),
    ["t_ns", ...f.channels.map((c) => cell(c.id))].join(","),
    ...tableRows(f).map((row) => [row.tNs, ...row.values].map(cell).join(",")),
  ];
  return `${lines.join("\n")}\n`;
}
