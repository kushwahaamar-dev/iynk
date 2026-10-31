import { createIdbRepository } from "./idb-repository";
import { openDb } from "./db";
import type { Repository } from "./repository";

export const LEARNING_KINDS = ["hint.open", "diagnose.answer", "reveal", "diagnosis.record", "check.transition", "code.changed"] as const;
export type LearningKind = (typeof LEARNING_KINDS)[number];

export interface LearningEvent {
  id: string;
  at: string;
  kind: LearningKind;
  payload: Record<string, unknown>;
}

export interface EventStats {
  /** Appends refused for an oversize payload, a key outside the allow-list or an unknown kind. */
  dropped: number;
  /** Appends the repository failed to store. */
  unsaved: number;
}

export interface EventLog {
  enabled(): Promise<boolean>;
  setEnabled(on: boolean): Promise<void>;
  /** Does nothing when the switch is off, and never throws. */
  append(kind: LearningKind, payload: Record<string, unknown>): Promise<void>;
  list(limit?: number): Promise<LearningEvent[]>;
  clear(): Promise<void>;
  stats(): EventStats;
}

export const MAX_EVENTS = 5000;
export const MAX_PAYLOAD_BYTES = 2048;

const ALLOWED_KEYS: Record<LearningKind, readonly string[]> = {
  "hint.open": ["projectId", "level", "via"],
  "diagnose.answer": ["projectId", "cause_id", "correct", "confidence"],
  reveal: ["projectId"],
  "diagnosis.record": ["projectId", "diagnosis", "outcome"],
  "check.transition": ["projectId", "test", "check", "from", "to"],
  "code.changed": ["projectId"],
};

const encoder = new TextEncoder();

function acceptable(kind: LearningKind, payload: Record<string, unknown>): boolean {
  const allowed = ALLOWED_KEYS[kind] as readonly string[] | undefined;
  if (allowed === undefined) return false;
  if (!Object.keys(payload).every((key) => allowed.includes(key))) return false;
  return encoder.encode(JSON.stringify(payload)).length <= MAX_PAYLOAD_BYTES;
}

export function createEventLog(repo: Repository, clock: { isoNow(): string }, newId: () => string): EventLog {
  const stats: EventStats = { dropped: 0, unsaved: 0 };

  return {
    enabled: () => repo.events.enabled(),
    setEnabled: (on) => repo.events.setEnabled(on),
    async append(kind, payload) {
      try {
        if (!(await repo.events.enabled())) return;
        if (!acceptable(kind, payload)) {
          stats.dropped += 1;
          return;
        }
        const row: LearningEvent = { id: newId(), at: clock.isoNow(), kind, payload };
        await repo.events.append(row, MAX_EVENTS);
      } catch {
        stats.unsaved += 1;
      }
    },
    async list(limit = MAX_EVENTS) {
      return (await repo.events.list(limit)) as LearningEvent[];
    },
    clear: () => repo.events.clear(),
    stats: () => ({ ...stats }),
  };
}

let shared: EventLog | null = null;

/** The browser's log over the app database, opened on first use. */
export function appEventLog(): EventLog {
  if (shared !== null) return shared;
  const inner = openDb().then((db) =>
    createEventLog(createIdbRepository(db), { isoNow: () => new Date().toISOString() }, () => crypto.randomUUID()),
  );
  let opened: EventLog | null = null;
  void inner.then((log) => (opened = log), () => undefined);
  shared = {
    enabled: async () => (await inner).enabled(),
    setEnabled: async (on) => (await inner).setEnabled(on),
    append: async (kind, payload) => {
      try {
        await (await inner).append(kind, payload);
      } catch {
        // the database would not open; the learner's flow goes on
      }
    },
    list: async (limit) => (await inner).list(limit),
    clear: async () => (await inner).clear(),
    stats: () => opened?.stats() ?? { dropped: 0, unsaved: 0 },
  };
  return shared;
}
