"use client";

// A local log of what happened in this browser: errors always, events only when the
// usage switch is on. Nothing here talks to the network. The log lives in
// localStorage["iynk:log:v1"] and the copy-for-a-bug-report text redacts the user's keys.

import { useSyncExternalStore } from "react";
import { version } from "../../../package.json";
import { redact } from "@/lib/keys";
import { getSettings } from "@/lib/settings/settings";
import type { KnownPayloads, TelemetryData, TelemetryKind } from "./kinds";

export type LogEntry = { t: number; kind: "event" | "error"; name: string; detail?: string };

const LOG_STORAGE_KEY = "iynk:log:v1";
const MAX_ENTRIES = 200;
const REPORT_ENTRIES = 50;
const DETAIL_MAX = 500;
const REPEAT_WINDOW_MS = 1000;
const WRITE_DELAY_MS = 250;

type TallyKind = { [K in keyof KnownPayloads]: KnownPayloads[K] extends { count: number } ? K : never }[keyof KnownPayloads];
type DataFor<K extends TelemetryKind> = K extends keyof KnownPayloads ? KnownPayloads[K] & TelemetryData : TelemetryData;

const EMPTY: readonly LogEntry[] = Object.freeze([]);

// The newest entry is last. The array is replaced, never changed, so readLog() is a stable snapshot.
let entries: readonly LogEntry[] = EMPTY;
let loaded = false;
let writeTimer: ReturnType<typeof setTimeout> | undefined;
let pagehideBound = false;
// The last pushed entry before its repeat count was added to the detail.
let lastPush: { kind: LogEntry["kind"]; name: string; detail: string | undefined; count: number } | null = null;

const listeners = new Set<() => void>();

const isEntry = (value: unknown): value is LogEntry => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.t === "number" &&
    (entry.kind === "event" || entry.kind === "error") &&
    typeof entry.name === "string" &&
    (entry.detail === undefined || typeof entry.detail === "string")
  );
};

function readStored(): readonly LogEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(LOG_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isEntry).slice(-MAX_ENTRIES) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  entries = readStored();
}

function notify() {
  for (const listener of [...listeners]) listener();
}

function flush() {
  clearTimeout(writeTimer);
  writeTimer = undefined;
  try {
    if (entries.length === 0) window.localStorage.removeItem(LOG_STORAGE_KEY);
    else window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // The log stays in memory for this tab.
  }
}

function scheduleWrite() {
  if (!pagehideBound) {
    pagehideBound = true;
    window.addEventListener("pagehide", () => {
      if (writeTimer !== undefined) flush();
    });
  }
  writeTimer ??= setTimeout(flush, WRITE_DELAY_MS);
}

/** Text for a log line: strings as they are, anything else as JSON that survives cycles. */
function describe(value: unknown): string {
  if (typeof value === "string") return value;
  const seen = new WeakSet<object>();
  try {
    return (
      JSON.stringify(value, (_key, item: unknown) => {
        if (typeof item === "bigint") return item.toString();
        if (typeof item !== "object" || item === null) return item;
        if (seen.has(item)) return "[circular]";
        seen.add(item);
        return item;
      }) ?? String(value)
    );
  } catch {
    return "[unreadable]";
  }
}

function push(kind: LogEntry["kind"], name: string, detail?: string) {
  if (typeof window === "undefined") return;
  try {
    load();
    const now = Date.now();
    const last = entries.at(-1);
    if (last && lastPush && now - last.t < REPEAT_WINDOW_MS && lastPush.kind === kind && lastPush.name === name && lastPush.detail === detail) {
      lastPush.count += 1;
      const repeated = { ...last, t: now, detail: `${detail ?? ""} (x${lastPush.count})`.trim() };
      entries = [...entries.slice(0, -1), repeated];
    } else {
      lastPush = { kind, name, detail, count: 1 };
      entries = [...entries, { t: now, kind, name, ...(detail === undefined ? {} : { detail }) }].slice(-MAX_ENTRIES);
    }
    scheduleWrite();
    notify();
  } catch {
    // The log must never throw into the app.
  }
}

function clean(detail: string): string {
  return redact(detail).slice(0, DETAIL_MAX);
}

export function readLog(): readonly LogEntry[] {
  load();
  return entries;
}

export function clearLog(): void {
  clearTimeout(writeTimer);
  writeTimer = undefined;
  lastPush = null;
  entries = EMPTY;
  loaded = true;
  try {
    window.localStorage.removeItem(LOG_STORAGE_KEY);
  } catch {
    // Nothing stored to remove.
  }
  notify();
}

export function logError(name: string, detail?: string): void {
  push("error", name, detail === undefined ? undefined : clean(detail));
}

/** Records uncaught errors and rejected promises until the returned function is called. */
export function installErrorCapture(): () => void {
  const onError = (event: ErrorEvent) => {
    const where = event.filename ? ` (${event.filename}:${event.lineno})` : "";
    logError("window.error", `${event.message}${where}`);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const { reason } = event;
    logError("unhandledrejection", reason instanceof Error ? `${reason.name}: ${reason.message}` : describe(reason));
  };
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}

/** The text a person pastes into a bug report. Their stored keys come out as [key]. */
export function bugReportText(): string {
  const shown = readLog().slice(-REPORT_ENTRIES);
  const lines = shown.map((entry) => `${new Date(entry.t).toISOString()} ${entry.kind} ${entry.name}${entry.detail ? ` ${entry.detail}` : ""}`);
  const text = [
    "iynk bug report",
    `version: ${version}`,
    `user agent: ${navigator.userAgent}`,
    `language: ${document.documentElement.lang || navigator.language}`,
    `entries: ${shown.length} of ${entries.length}`,
    "",
    ...(lines.length > 0 ? lines : ["(no entries)"]),
  ].join("\n");
  return redact(text);
}

function subscribeLog(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LOG_STORAGE_KEY && event.key !== null) return;
    if (writeTimer === undefined) {
      entries = readStored();
      lastPush = null;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The log, newest last; empty on the server and during hydration. */
export function useLog(): readonly LogEntry[] {
  return useSyncExternalStore(subscribeLog, readLog, () => EMPTY);
}

function recordEvent(name: string, data?: unknown) {
  if (typeof window === "undefined" || !getSettings().telemetry) return;
  push("event", name, data === undefined ? undefined : clean(describe(data)));
}

export function track<K extends TelemetryKind>(kind: K, data?: DataFor<K>): void {
  recordEvent(kind, data);
}

export function tally(kind: TallyKind, n = 1): void {
  recordEvent(kind, { count: n });
}
