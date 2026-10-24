// Per-lesson chip values, a per-viewer convenience kept in this browser only
// (progress itself lives in "simlab:v1"). Every access is guarded: storage can
// be missing, full or blocked.

import type { ParamValues } from "@/lib/boardlab/template";

const KEY = "simlab:boardlab:values";

function readAll(): Record<string, ParamValues> {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, ParamValues>) : {};
  } catch {
    return {};
  }
}

export function loadValues(board: string, lesson: string): ParamValues | null {
  const v = readAll()[`${board}/${lesson}`];
  return v && typeof v === "object" ? v : null;
}

export function saveValues(board: string, lesson: string, values: ParamValues): void {
  try {
    const all = readAll();
    all[`${board}/${lesson}`] = values;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Not saved: the lesson opens with its defaults next time.
  }
}
