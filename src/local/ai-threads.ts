import { expired, shouldPersist, THREAD_LIMITS, type Retention } from "../ai/retention";
import type { Mode } from "../ai/log";
import { toDbError } from "./db";

export type ThreadTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: { name: string; ok: boolean }[];
  at: number;
};

export type ThreadRecord = {
  id: string;
  projectId: string;
  mode: Mode;
  title: string;
  createdAt: number;
  lastUsedAt: number;
  turns: ThreadTurn[];
};

export interface ThreadStore {
  /** Newest first. */
  load(projectId: string): Promise<ThreadRecord[]>;
  save(t: ThreadRecord): Promise<void>;
  remove(id: string): Promise<void>;
  /** Returns how many threads were removed. */
  prune(retention: Retention, nowMs: number): Promise<number>;
  clearAll(projectId?: string): Promise<void>;
}

function isThread(value: unknown): value is ThreadRecord {
  if (typeof value !== "object" || value === null) return false;
  const t = value as Partial<ThreadRecord>;
  return (
    typeof t.id === "string" &&
    typeof t.projectId === "string" &&
    typeof t.title === "string" &&
    typeof t.createdAt === "number" &&
    typeof t.lastUsedAt === "number" &&
    Array.isArray(t.turns)
  );
}

const newestFirst = (a: ThreadRecord, b: ThreadRecord) => b.lastUsedAt - a.lastUsedAt;

/** The ids retention drops: expired threads, then the oldest beyond the per-project cap. */
function pruneIds(all: readonly ThreadRecord[], retention: Retention, nowMs: number): string[] {
  const doomed = all.filter((t) => expired(retention, t.lastUsedAt, nowMs)).map((t) => t.id);
  if (retention === "forever") return doomed;
  const byProject = new Map<string, ThreadRecord[]>();
  for (const t of all) {
    if (expired(retention, t.lastUsedAt, nowMs)) continue;
    byProject.set(t.projectId, [...(byProject.get(t.projectId) ?? []), t]);
  }
  for (const list of byProject.values()) {
    for (const t of list.sort(newestFirst).slice(THREAD_LIMITS.perProject)) doomed.push(t.id);
  }
  return doomed;
}

export function memoryThreadStore(): ThreadStore {
  const threads = new Map<string, ThreadRecord>();
  return {
    async load(projectId) {
      return [...threads.values()].filter((t) => t.projectId === projectId).sort(newestFirst);
    },
    async save(t) {
      threads.set(t.id, t);
    },
    async remove(id) {
      threads.delete(id);
    },
    async prune(retention, nowMs) {
      const ids = pruneIds([...threads.values()], retention, nowMs);
      for (const id of ids) threads.delete(id);
      return ids.length;
    },
    async clearAll(projectId) {
      for (const t of [...threads.values()]) if (projectId === undefined || t.projectId === projectId) threads.delete(t.id);
    },
  };
}

function finished<T>(tx: IDBTransaction, read: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(read());
    tx.onerror = () => reject(toDbError(tx.error));
    tx.onabort = () => reject(toDbError(tx.error ?? new DOMException("transaction aborted", "AbortError")));
  });
}

function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return run();
  } catch (cause) {
    return Promise.reject(toDbError(cause));
  }
}

/** A corrupt row is dropped on load and ignored by prune; clearAll removes it. `retention` is read on every save. */
export function idbThreadStore(db: Pick<IDBDatabase, "transaction">, retention: () => Retention = () => "project"): ThreadStore {
  return {
    load(projectId) {
      return guarded(() => {
        const tx = db.transaction("ai_threads", "readonly");
        const rows = tx.objectStore("ai_threads").index("projectId").getAll(projectId);
        return finished(tx, () => (rows.result as unknown[]).filter(isThread).sort(newestFirst));
      });
    },

    async save(t) {
      if (!shouldPersist(retention())) return;
      await guarded(() => {
        const tx = db.transaction("ai_threads", "readwrite");
        tx.objectStore("ai_threads").put(t, t.id);
        return finished(tx, () => undefined);
      });
    },

    remove(id) {
      return guarded(() => {
        const tx = db.transaction("ai_threads", "readwrite");
        tx.objectStore("ai_threads").delete(id);
        return finished(tx, () => undefined);
      });
    },

    prune(mode, nowMs) {
      return guarded(() => {
        const tx = db.transaction("ai_threads", "readwrite");
        const store = tx.objectStore("ai_threads");
        const all = store.getAll();
        let removed = 0;
        all.onsuccess = () => {
          const ids = pruneIds((all.result as unknown[]).filter(isThread), mode, nowMs);
          for (const id of ids) store.delete(id);
          removed = ids.length;
        };
        return finished(tx, () => removed);
      });
    },

    clearAll(projectId) {
      return guarded(() => {
        const tx = db.transaction("ai_threads", "readwrite");
        const store = tx.objectStore("ai_threads");
        if (projectId === undefined) store.clear();
        else {
          const keys = store.index("projectId").getAllKeys(projectId);
          keys.onsuccess = () => {
            for (const key of keys.result) store.delete(key);
          };
        }
        return finished(tx, () => undefined);
      });
    },
  };
}
