// The session log Build Stories are written from: a bounded list of what
// happened on the bench (store changes read as facts), chat lines, faults and
// passes, each with its time and who. One log per lab item, shared by the
// partner panel and the story card.

import type { LabKind, LabStore } from "@/components/dock/types";
import { benchFacts } from "./bench";
import type { BenchFacts } from "./bench/types";
import type { StoryEvent, StoryEventKind } from "./protocol";

/** /api/ai/story takes at most 300 events. */
export const LOG_LIMIT = 300;
const TEXT_MAX = 300;
/** Repeats of the same line by the same person this close together are one entry. */
const COALESCE_MS = 15_000;

/** `helper` is set on "help" entries: the person asked to explain. */
export type LogEntry = StoryEvent & { id: number; helper?: string };

export class SessionLog {
  readonly limit: number;
  /** The local learner's name for entries they cause (their room name, or "Me"). */
  private selfName = "";
  /** Room chat ids already logged. */
  readonly seenRoomLines = new Set<string>();
  private list: LogEntry[] = [];
  private nextId = 1;
  private listeners = new Set<() => void>();
  private readonly now: () => number;

  constructor(limit: number = LOG_LIMIT, now: () => number = Date.now) {
    this.limit = limit;
    this.now = now;
  }

  get self(): string {
    return this.selfName;
  }

  setSelf(name: string): void {
    if (name) this.selfName = name;
  }

  add(who: string, kind: StoryEventKind, text: string, helper?: string): void {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const line = clean.length > TEXT_MAX ? `${clean.slice(0, TEXT_MAX - 1)}…` : clean;
    const t = this.now();
    const last = this.list.at(-1);
    if (last && last.who === who && last.kind === kind && last.text === line && t - last.t < COALESCE_MS) {
      this.list = [...this.list.slice(0, -1), { ...last, t }];
    } else {
      const next = [...this.list, { id: this.nextId++, t, who, kind, text: line, ...(helper ? { helper } : {}) }];
      this.list = next.length > this.limit ? next.slice(next.length - this.limit) : next;
    }
    for (const listener of this.listeners) listener();
  }

  /** A stable snapshot (a new array only after a change), for useSyncExternalStore. */
  entries = (): readonly LogEntry[] => this.list;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  events(): StoryEvent[] {
    return this.list.map(({ t, who, kind, text }) => ({ t, who, kind, text }));
  }

  /** Who helped whom, from the "help" entries, each pair once. */
  helpers(): Array<{ helper: string; learner: string }> {
    const pairs = new Map<string, { helper: string; learner: string }>();
    for (const entry of this.list) {
      if (entry.kind === "help" && entry.helper) pairs.set(`${entry.helper}\u0000${entry.who}`, { helper: entry.helper, learner: entry.who });
    }
    return [...pairs.values()];
  }
}

const logs = new Map<string, SessionLog>();

export function sessionLogFor(lab: LabKind, itemId: string): SessionLog {
  const key = `${lab}:${itemId}`;
  let log = logs.get(key);
  if (!log) {
    log = new SessionLog();
    logs.set(key, log);
  }
  return log;
}

type Line = { kind: StoryEventKind; text: string };

const added = (before: string[], after: string[]) => {
  const old = new Set(before);
  return after.filter((item) => !old.has(item));
};

/** What changed between two readings of the bench, as log lines. */
export function factChanges(before: BenchFacts, after: BenchFacts): Line[] {
  const out: Line[] = [];
  if (before.context.join() !== after.context.join() && after.context.length) {
    out.push({ kind: "action", text: `moved on: ${after.context.join(", ")}` });
  }
  for (const part of added(before.parts, after.parts)) out.push({ kind: "action", text: `placed ${part}` });
  for (const part of added(after.parts, before.parts)) out.push({ kind: "action", text: `removed ${part}` });
  for (const net of added(before.nets, after.nets)) out.push({ kind: "action", text: `wired ${net}` });
  for (const net of added(after.nets, before.nets)) out.push({ kind: "action", text: `unwired ${net}` });
  if (before.code && after.code && before.code.text !== after.code.text) out.push({ kind: "action", text: "edited the code" });
  if (!before.errors.length && after.errors.length) out.push({ kind: "fault", text: `compile error: ${after.errors[0]}` });
  if (before.errors.length && !after.errors.length) out.push({ kind: "action", text: "the code compiles again" });
  for (const fault of added(before.faults, after.faults)) out.push({ kind: "fault", text: fault });
  for (const fault of added(after.faults, before.faults)) out.push({ kind: "action", text: `fixed: ${fault}` });
  const was = new Map(before.tests.map((test) => [test.name, test.pass]));
  for (const test of after.tests) {
    const previous = was.get(test.name) ?? null;
    if (test.pass === true && previous !== true) out.push({ kind: "pass", text: `passed ${test.name}` });
    if (test.pass === false && previous !== false) {
      out.push({ kind: "fault", text: `failed ${test.name}${test.detail ? `: ${test.detail}` : ""}` });
    }
  }
  return out;
}

/** Store changes are read at most this often, so typing code is one entry, not hundreds. */
export const STORE_SETTLE_MS = 400;

/**
 * Logs what changes on the bench, attributed to `log.self` at the time it is
 * read. Returns the unsubscribe function.
 */
function watchStore(log: SessionLog, lab: LabKind, itemId: string, store: LabStore): () => void {
  let last = benchFacts(lab, itemId, store.getState());
  let timer: ReturnType<typeof setTimeout> | undefined;
  const read = () => {
    timer = undefined;
    const next = benchFacts(lab, itemId, store.getState());
    for (const line of factChanges(last, next)) log.add(log.self, line.kind, line.text);
    last = next;
  };
  const unsubscribe = store.subscribe(() => {
    timer ??= setTimeout(read, STORE_SETTLE_MS);
  });
  return () => {
    unsubscribe();
    if (timer !== undefined) {
      clearTimeout(timer);
      read();
    }
  };
}

const watchers = new WeakMap<SessionLog, Map<LabStore, { count: number; stop: () => void }>>();

/**
 * Starts logging a store's changes into the log, once however many components
 * ask (the dock, the partner panel, the story card). Returns the release.
 */
export function attachStore(log: SessionLog, lab: LabKind, itemId: string, store: LabStore): () => void {
  let byStore = watchers.get(log);
  if (!byStore) {
    byStore = new Map();
    watchers.set(log, byStore);
  }
  const map = byStore;
  const entry = map.get(store);
  if (entry) entry.count++;
  else map.set(store, { count: 1, stop: watchStore(log, lab, itemId, store) });
  return () => {
    const current = map.get(store);
    if (!current) return;
    current.count--;
    if (current.count === 0) {
      current.stop();
      map.delete(store);
    }
  };
}

export type RoomLine = { id: string; from: string; text: string; kind: "text" | "voice" | "ai" | "system" };

/** Logs room chat lines not seen before; `name` resolves a peer id. */
export function logRoomLines(log: SessionLog, lines: readonly RoomLine[], name: (id: string) => string) {
  for (const line of lines) {
    if (log.seenRoomLines.has(line.id)) continue;
    log.seenRoomLines.add(line.id);
    if (line.kind === "system") continue;
    log.add(line.kind === "ai" ? "partner" : name(line.from), line.kind === "ai" ? "ai" : "chat", line.text);
  }
}
