import type { LearnerRecord } from "@/project/guided/record";
import { openDb, toDbError } from "./db";

export const LEARN_PREFIX = "learn:";

/** Key-value view of the `progress` store, which other writers share (B3 keeps the storage-health answer there). */
export interface LearnKv {
  get(key: string): Promise<unknown>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  entries(): Promise<Array<[string, unknown]>>;
}

export function memoryLearnKv(): LearnKv {
  const rows = new Map<string, unknown>();
  return {
    get: async (key) => rows.get(key),
    put: async (key, value) => void rows.set(key, structuredClone(value)),
    delete: async (key) => void rows.delete(key),
    entries: async () => [...rows].map(([key, value]) => [key, structuredClone(value)]),
  };
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toDbError(req.error));
  });
}

export async function idbLearnKv(): Promise<LearnKv> {
  const db = await openDb();
  const store = (mode: IDBTransactionMode) => db.transaction("progress", mode).objectStore("progress");
  return {
    get: (key) => request(store("readonly").get(key)),
    put: async (key, value) => void (await request(store("readwrite").put(value, key))),
    delete: (key) => request(store("readwrite").delete(key)),
    async entries() {
      const s = store("readonly");
      const [keys, values] = await Promise.all([request(s.getAllKeys()), request(s.getAll())]);
      return keys.map((key, i) => [String(key), values[i]]);
    },
  };
}

export interface ProgressRepo {
  get(projectId: string): Promise<LearnerRecord | undefined>;
  put(r: LearnerRecord): Promise<void>;
  all(): Promise<LearnerRecord[]>;
  remove(projectId: string): Promise<void>;
}

function isLearnerRecord(value: unknown): value is LearnerRecord {
  if (typeof value !== "object" || value === null) return false;
  const row = value as { v?: unknown; projectId?: unknown };
  return row.v === 1 && typeof row.projectId === "string";
}

/** Only rows under `learn:` that look like a record are read; other writers' rows are never returned or deleted. */
export function createProgressRepo(kv: LearnKv): ProgressRepo {
  return {
    async get(projectId) {
      const value = await kv.get(LEARN_PREFIX + projectId);
      return isLearnerRecord(value) ? value : undefined;
    },
    put: (r) => kv.put(LEARN_PREFIX + r.projectId, r),
    async all() {
      const rows = await kv.entries();
      return rows.filter(([key]) => key.startsWith(LEARN_PREFIX)).map(([, value]) => value).filter(isLearnerRecord);
    },
    remove: (projectId) => kv.delete(LEARN_PREFIX + projectId),
  };
}
