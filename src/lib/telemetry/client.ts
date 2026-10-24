// Browser telemetry (HX-CONTRACT H8). track() only queues; batches go out every
// 10 s, at 50 events, right away for the few events people wait to see (a lap on
// the leaderboard), and through sendBeacon when the page is hidden. It does
// nothing on the server, and stops for the page once it learns that this
// deployment has no database. No personal data: a random session id, the event
// kind, and what the caller puts in data.

import {
  MAX_BODY_BYTES,
  MAX_EVENTS_PER_BATCH,
  SESSION_PATTERN,
  type KnownPayloads,
  type TelemetryBatch,
  type TelemetryData,
  type TelemetryEvent,
  type TelemetryKind,
} from "./kinds";

const ENDPOINT = "/api/telemetry";
const STATUS_ENDPOINT = "/api/status";
const SESSION_KEY = "simlab:telemetry:v1";
const FLUSH_MS = 10_000;
const FLUSH_AT = 50;
const MAX_QUEUE = 1000;
const SAMPLE_GAP_MS = 950; // flight.sample is 1 Hz
const URGENT = new Set<TelemetryKind>(["flight.lap", "lesson.pass", "credential.issued"]);

type Mode = "unknown" | "on" | "off";
type Context = { room?: string; item?: string };
type Tally = { kind: TallyKind; room?: string; item?: string; count: number; ts: number };
type TallyKind = { [K in keyof KnownPayloads]: KnownPayloads[K] extends { count: number } ? K : never }[keyof KnownPayloads];
type DataFor<K extends TelemetryKind> = K extends keyof KnownPayloads ? KnownPayloads[K] & TelemetryData : TelemetryData;

let mode: Mode = "unknown";
let queue: TelemetryEvent[] = [];
const tallies = new Map<string, Tally>();
let context: Context = {};
let session: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let sending: Promise<void> | null = null;
let flushAgain = false;
let lastSample = 0;
let wired = false;
const flushedListeners = new Set<(kinds: ReadonlySet<TelemetryKind>) => void>();

const inBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";
const encoder = new TextEncoder();

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * This browser's anonymous telemetry id: random, kept in localStorage, never
 * tied to a person. Browser only; on the server it is "" (no id is ever shared
 * between requests).
 */
export function telemetrySession(): string {
  if (!inBrowser()) return "";
  if (session) return session;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as { session?: unknown } | null;
    if (saved && typeof saved.session === "string" && SESSION_PATTERN.test(saved.session)) {
      session = saved.session;
      return session;
    }
  } catch {
    // Storage blocked or corrupt: a fresh id for this page load.
  }
  session = randomId();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ session }));
  } catch {
    // Private mode: the id lives as long as the page.
  }
  return session;
}

/** Room and item stamped on every following event (the room provider and lab pages set it). */
export function setTelemetryContext(next: Context): void {
  context = { ...context, ...next };
}

/** Records one event. Cheap and synchronous; safe to call anywhere, any time. */
export function track<K extends TelemetryKind>(kind: K, data?: DataFor<K>): void {
  if (!inBrowser() || mode === "off") return;
  const now = Date.now();
  if (kind === "flight.sample") {
    if (now - lastSample < SAMPLE_GAP_MS) return;
    lastSample = now;
  }
  wire();
  queue.push({ ts: now, kind, session: telemetrySession(), ...stamp(), data: data ?? {} });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  if (URGENT.has(kind) || queue.length >= FLUSH_AT) void flush();
  else schedule();
}

/** Counts something that happens too often for one event each (LED blinks); sent as one event per flush. */
export function tally(kind: TallyKind, n = 1): void {
  if (!inBrowser() || mode === "off" || !(n > 0)) return;
  wire();
  const { room, item } = stamp();
  const key = `${kind}|${room ?? ""}|${item ?? ""}`;
  const entry = tallies.get(key) ?? { kind, room, item, count: 0, ts: Date.now() };
  entry.count += Math.round(n);
  tallies.set(key, entry);
  schedule();
}

/** Called after a batch is stored, with the kinds it held (the leaderboard refreshes on a lap). */
export function onFlushed(listener: (kinds: ReadonlySet<TelemetryKind>) => void): () => void {
  flushedListeners.add(listener);
  return () => flushedListeners.delete(listener);
}

function stamp(): Context {
  return { ...(context.room ? { room: context.room } : {}), ...(context.item ? { item: context.item } : {}) };
}

function schedule() {
  timer ??= setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
}

function wire() {
  if (wired) return;
  wired = true;
  const onHide = () => {
    if (document.visibilityState === "hidden") beacon();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", beacon);
}

function drainTallies() {
  for (const t of tallies.values()) {
    queue.push({
      ts: t.ts,
      kind: t.kind,
      session: telemetrySession(),
      ...(t.room ? { room: t.room } : {}),
      ...(t.item ? { item: t.item } : {}),
      data: { count: Math.min(t.count, 100_000) },
    });
  }
  tallies.clear();
}

/** Splits the queue into bodies under the per-request event and byte caps. */
function takeBatches(): TelemetryEvent[][] {
  drainTallies();
  const batches: TelemetryEvent[][] = [];
  let current: TelemetryEvent[] = [];
  let bytes = 64;
  for (const event of queue.splice(0)) {
    const size = encoder.encode(JSON.stringify(event)).length + 1;
    if (size > MAX_BODY_BYTES - 64) continue; // can never fit; the server would refuse it anyway
    if (current.length >= MAX_EVENTS_PER_BATCH || bytes + size > MAX_BODY_BYTES) {
      batches.push(current);
      current = [];
      bytes = 64;
    }
    current.push(event);
    bytes += size;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function featureOn(): Promise<Mode> {
  if (mode !== "unknown") return mode;
  try {
    const res = await fetch(STATUS_ENDPOINT, { headers: { accept: "application/json" } });
    if (res.ok) {
      const body = (await res.json()) as { features?: { db?: unknown } };
      mode = body.features?.db === true ? "on" : "off";
    }
  } catch {
    // Offline: ask again at the next flush; the queue keeps the events meanwhile.
  }
  if (mode === "off") stop();
  return mode;
}

function stop() {
  mode = "off";
  queue = [];
  tallies.clear();
  if (timer) clearTimeout(timer);
  timer = null;
}

/** Sends everything queued now. Resolves when the batches are stored, retried later, or dropped. */
export function flush(): Promise<void> {
  if (!inBrowser()) return Promise.resolve();
  if (timer) clearTimeout(timer);
  timer = null;
  if (sending) {
    // Events queued while a send is in flight go out right after it.
    flushAgain = true;
    return sending;
  }
  sending = (async () => {
    try {
      if ((await featureOn()) !== "on") {
        if (mode === "unknown" && (queue.length || tallies.size)) schedule();
        return;
      }
      for (const batch of takeBatches()) {
        const outcome = await post(batch);
        if (outcome === "retry") {
          queue = [...batch, ...queue].slice(-MAX_QUEUE);
          schedule();
          return;
        }
        if (outcome === "off") return stop();
        if (outcome === "stored") notify(batch);
      }
    } finally {
      sending = null;
      if (flushAgain) {
        flushAgain = false;
        void flush();
      }
    }
  })();
  return sending;
}

async function post(events: TelemetryEvent[]): Promise<"stored" | "retry" | "dropped" | "off"> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ events, sentAt: Date.now() } satisfies TelemetryBatch),
      keepalive: true,
    });
    if (res.ok) return "stored";
    if (res.status === 503) return "off";
    if (res.status === 429 || res.status >= 500) return "retry";
    return "dropped";
  } catch {
    return "retry";
  }
}

function notify(batch: TelemetryEvent[]) {
  const kinds = new Set(batch.map((e) => e.kind));
  for (const listener of flushedListeners) listener(kinds);
}

/** The page is going away: hand whatever is queued to sendBeacon, which outlives the page. */
function beacon() {
  if (mode === "off" || typeof navigator.sendBeacon !== "function") return;
  for (const batch of takeBatches()) {
    const payload: TelemetryBatch = { events: batch, sentAt: Date.now() };
    const body = new Blob([JSON.stringify(payload)], { type: "application/json" });
    if (!navigator.sendBeacon(ENDPOINT, body)) queue.push(...batch);
  }
}
