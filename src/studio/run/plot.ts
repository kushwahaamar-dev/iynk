export interface PlotRow {
  tNs: number;
  values: (number | null)[];
}

export const MAX_COLUMNS = 8;
const MAX_NAME = 32;
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/** A field that is not a finite number gives NaN, which the store turns into a gap. */
export function parsePlotLine(line: string): { names: (string | null)[]; values: number[] } | null {
  const fields = line.replace(/^﻿/, "").trim().split(/[\s,]+/);
  const names: (string | null)[] = [];
  const values: number[] = [];
  for (const field of fields) {
    const colon = field.indexOf(":");
    const name = colon > 0 ? field.slice(0, Math.min(colon, MAX_NAME)) : null;
    const text = colon >= 0 ? field.slice(colon + 1) : field;
    const value = NUMBER.test(text) ? Number(text) : NaN;
    names.push(name);
    values.push(Number.isFinite(value) ? value : NaN);
  }
  return values.some((v) => !Number.isNaN(v)) ? { names, values } : null;
}

export function createPlotStore(opts: { maxRows?: number } = {}) {
  const maxRows = opts.maxRows ?? 5000;
  const listeners = new Set<() => void>();
  let rows: PlotRow[] = [];
  let snapshot: readonly PlotRow[] | null = [];
  let names: string[] = [];
  let dropped = 0;
  let ignored = false;

  const notify = () => {
    snapshot = null;
    for (const fn of [...listeners]) if (listeners.has(fn)) fn();
  };

  return {
    push(tNs: number, line: string): void {
      const parsed = parsePlotLine(line);
      if (!parsed) return;
      if (parsed.values.length > MAX_COLUMNS) ignored = true;
      const values = parsed.values.slice(0, MAX_COLUMNS).map((v) => (Number.isNaN(v) ? null : v));
      while (names.length < values.length) names.push("");
      parsed.names.slice(0, MAX_COLUMNS).forEach((name, i) => {
        if (name && !names[i]) names[i] = name;
      });
      rows.push({ tNs, values });
      if (rows.length > maxRows) {
        const excess = rows.length - maxRows;
        rows.splice(0, excess);
        dropped += excess;
      }
      notify();
    },
    /** A new array each time the rows change, so it works as a snapshot for useSyncExternalStore. */
    rows(): readonly PlotRow[] {
      return (snapshot ??= rows.slice());
    },
    /** One name per column; empty when the sketch never named it. */
    columns(): string[] {
      return names.slice();
    },
    columnsIgnored: () => ignored,
    dropped: () => dropped,
    clear(): void {
      rows = [];
      names = [];
      dropped = 0;
      ignored = false;
      notify();
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

export type PlotStore = ReturnType<typeof createPlotStore>;
