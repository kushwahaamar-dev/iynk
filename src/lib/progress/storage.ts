// The one saved document (D7): localStorage["iynk:v1"] holds progress and
// settings together. Reads are cached by the raw string, so React's
// useSyncExternalStore gets the same object until something is written.

import { boardDone, facadeActive, labDone, labQuiz, labsActive, learnStore, startLegacyImport } from "../learn/facade";

export const STORAGE_KEY = "iynk:v1";
export const STORAGE_VERSION = 1;

export type ThemeSetting = "system" | "light" | "dark";

export type Settings = {
  theme: ThemeSetting;
  /** Figure sound effects and lab cues (src/lib/sound). Off until the learner turns it on. */
  sound: boolean;
  lofi: boolean;
  labels: boolean;
  reduceMotion: boolean;
  /** Anonymous usage events (src/lib/telemetry). Off until the learner turns it on. */
  telemetry: boolean;
};

export type QuizResult = { score: number; total: number };

export type Saved = {
  v: typeof STORAGE_VERSION;
  done: Record<string, true>;
  quiz: Record<string, QuizResult>;
  best: Record<string, number>;
  settings: Settings;
};

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  // Light until the learner picks dark or system, whatever the OS prefers.
  theme: "light",
  sound: false,
  lofi: false,
  labels: true,
  reduceMotion: false,
  telemetry: false,
});

/** What the server renders and what a first visit starts from: nothing saved. */
export const EMPTY_SAVED: Readonly<Saved> = Object.freeze({
  v: STORAGE_VERSION,
  done: Object.freeze({}) as Record<string, true>,
  quiz: Object.freeze({}) as Record<string, QuizResult>,
  best: Object.freeze({}) as Record<string, number>,
  settings: DEFAULT_SETTINGS,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Upgrades older documents one version at a time: MIGRATIONS[n] turns a
 * version-n document into version n + 1. Version 1 is the first, so the table
 * is empty; a future v2 adds MIGRATIONS[1] and bumps STORAGE_VERSION.
 */
const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrate(value: unknown): Saved {
  if (!isRecord(value)) return EMPTY_SAVED;
  let doc = value;
  let version = typeof doc.v === "number" ? doc.v : STORAGE_VERSION;
  while (version < STORAGE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return EMPTY_SAVED;
    doc = step(doc);
    version += 1;
  }
  // A document from a newer build: keep what still parses rather than wiping it.
  return normalize(doc);
}

function normalize(doc: Record<string, unknown>): Saved {
  const done: Record<string, true> = {};
  if (isRecord(doc.done)) {
    for (const [key, value] of Object.entries(doc.done)) if (value === true) done[key] = true;
  }

  const quiz: Record<string, QuizResult> = {};
  if (isRecord(doc.quiz)) {
    for (const [key, value] of Object.entries(doc.quiz)) {
      if (!isRecord(value)) continue;
      const { score, total } = value;
      if (typeof score === "number" && typeof total === "number" && total > 0 && score >= 0 && score <= total) {
        quiz[key] = { score, total };
      }
    }
  }

  const best: Record<string, number> = {};
  if (isRecord(doc.best)) {
    for (const [key, value] of Object.entries(doc.best)) {
      if (typeof value === "number" && Number.isFinite(value)) best[key] = value;
    }
  }

  const raw = isRecord(doc.settings) ? doc.settings : {};
  const settings: Settings = {
    theme: raw.theme === "light" || raw.theme === "dark" || raw.theme === "system" ? raw.theme : DEFAULT_SETTINGS.theme,
    sound: typeof raw.sound === "boolean" ? raw.sound : DEFAULT_SETTINGS.sound,
    lofi: typeof raw.lofi === "boolean" ? raw.lofi : DEFAULT_SETTINGS.lofi,
    labels: typeof raw.labels === "boolean" ? raw.labels : DEFAULT_SETTINGS.labels,
    reduceMotion: typeof raw.reduceMotion === "boolean" ? raw.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    telemetry: typeof raw.telemetry === "boolean" ? raw.telemetry : DEFAULT_SETTINGS.telemetry,
  };

  return { v: STORAGE_VERSION, done, quiz, best, settings };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (privacy mode, sandbox): behave as a first visit.
    return null;
  }
}

let cachedRaw: string | null = null;
let cached: Saved = EMPTY_SAVED;
// Used when storage cannot be written, so the session still remembers.
let memoryOnly: Saved | null = null;

function readStored(): Saved {
  if (memoryOnly) return memoryOnly;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cached = raw ? migrate(JSON.parse(raw)) : EMPTY_SAVED;
    } catch {
      cached = EMPTY_SAVED;
    }
  }
  return cached;
}

let overlay: { base: Saved; snapshot: ReadonlyMap<string, unknown>; saved: Saved } | null = null;

/**
 * Once the imports have run and the records are loaded, they answer for the board, bench and craft keys. The old keys stay in the
 * answer too, so a lesson whose template is missing never reads as not done.
 */
export function getSaved(): Saved {
  const base = readStored();
  const boards = facadeActive();
  const labs = labsActive();
  if (!boards && !labs) return base;
  const snapshot = learnStore().snapshot();
  if (overlay?.base === base && overlay.snapshot === snapshot) return overlay.saved;
  const saved = {
    ...base,
    done: { ...base.done, ...(boards ? boardDone(snapshot) : {}), ...(labs ? labDone(snapshot) : {}) },
    quiz: labs ? labQuiz(snapshot, base.quiz) : base.quiz,
  };
  overlay = { base, snapshot, saved };
  return saved;
}

export function getServerSaved(): Saved {
  return EMPTY_SAVED;
}

const listeners = new Set<() => void>();

function notify() {
  for (const listener of [...listeners]) listener();
}

/** Applies `change` to the latest saved document and writes it back. */
export function updateSaved(change: (current: Saved) => Saved): Saved {
  if (typeof window === "undefined") {
    throw new Error("iynk progress: saved progress and settings can only change in the browser.");
  }
  const current = readStored();
  const next = change(current);
  if (next === current) return current;
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    memoryOnly = null;
    cachedRaw = raw;
    cached = next;
  } catch {
    memoryOnly = next;
  }
  notify();
  return next;
}

/** Same-tab writes notify directly; other tabs arrive as storage events. */
export function subscribeSaved(listener: () => void): () => void {
  listeners.add(listener);
  const records = learnStore();
  let live = true;
  const stopRecords = records.subscribe(listener);
  void records.ready.then(() => {
    if (live) listener();
  });
  startLegacyImport(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    live = false;
    stopRecords();
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
