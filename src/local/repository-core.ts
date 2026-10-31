import { stateHash } from "@/project/hash";
import type { IndexRow, ProjectRecord, RecordLoad, Repository, SaveResult } from "./repository";
import type { JournalEdit, JournalRow, StoreName } from "./stores";

/** One open transaction. Keys of the stores used here are always strings. */
export interface Tx {
  get(store: StoreName, key: string): Promise<unknown>;
  put(store: StoreName, key: string, value: unknown): Promise<void>;
  delete(store: StoreName, key: string): Promise<void>;
  clear(store: StoreName): Promise<void>;
  /** Every row whose key starts with `prefix` (all rows when it is empty), in key order. */
  entries(store: StoreName, prefix: string): Promise<Array<[string, unknown]>>;
}

/** What a storage engine has to give: all-or-nothing transactions, one after another per store. */
export interface Backend {
  transact<T>(stores: readonly StoreName[], mode: "readonly" | "readwrite", work: (tx: Tx) => Promise<T>): Promise<T>;
  estimate(): Promise<{ usage: number; quota: number } | null>;
}

interface TrashRow {
  deletedAt: number;
  rec: ProjectRecord;
  prev?: ProjectRecord;
  row: IndexRow;
}

interface BackupRow {
  doc: ProjectRecord["doc"];
  hash: string;
  at: number;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

const EVENTS_ENABLED_KEY = "events:enabled";
const EVENTS_RANGE_KEY = "events:range";

interface EventRange {
  first: number;
  next: number;
}

const eventKey = (n: number) => String(n).padStart(10, "0");

const prevKey = (id: string) => `${id}~prev`;

function intact(value: unknown): value is ProjectRecord {
  if (typeof value !== "object" || value === null) return false;
  const rec = value as Partial<ProjectRecord>;
  if (typeof rec.hash !== "string" || typeof rec.doc !== "object" || rec.doc === null) return false;
  try {
    return stateHash(rec.doc) === rec.hash;
  } catch {
    return false;
  }
}

function pick(current: unknown, prev: unknown): RecordLoad {
  if (current === undefined && prev === undefined) return { status: "missing" };
  if (intact(current)) return { status: "ok", rec: current };
  if (intact(prev)) return { status: "recovered", rec: prev };
  return { status: "lost" };
}

/** Maps what a failed save threw to the result kinds the worker reacts to. */
function failure(cause: unknown): Extract<SaveResult, { ok: false }> {
  const name = typeof cause === "object" && cause !== null && "name" in cause ? String(cause.name) : "";
  const detail = cause instanceof Error ? cause.message : String(cause);
  if (name === "QuotaExceededError") return { ok: false, kind: "quota", detail };
  if (name === "AbortError" || name === "InvalidStateError" || name === "TransactionInactiveError") {
    return { ok: false, kind: "blocked", detail };
  }
  return { ok: false, kind: "unavailable", detail };
}

function numbered(rows: Array<[string, unknown]>, prefix: string): number[] {
  return rows.map(([key]) => Number(key.slice(prefix.length))).sort((a, b) => a - b);
}

/** The behaviour of `Repository` over any `Backend`, so the IndexedDB and memory versions cannot drift apart. */
export function createRepository(backend: Backend): Repository {
  return {
    async list() {
      const rows = await backend.transact(["index"], "readonly", (tx) => tx.entries("index", ""));
      return rows.map(([id, row]) => ({ id, ...(row as IndexRow) }));
    },

    async load(id) {
      return backend.transact(["projects"], "readonly", async (tx) =>
        pick(await tx.get("projects", id), await tx.get("projects", prevKey(id))),
      );
    },

    async save(id, rec, row, expect) {
      if (!SHA256_HEX.test(rec.hash)) return { ok: false, kind: "validation", detail: "hash is not 64 hex digits" };
      try {
        return await backend.transact(["projects", "index", "journal"], "readwrite", async (tx): Promise<SaveResult> => {
          const current = await tx.get("projects", id);
          const found = pick(current, await tx.get("projects", prevKey(id)));
          if (found.status === "lost") {
            return { ok: false, kind: "conflict", detail: "the stored record is unreadable" };
          }
          const stored = found.status === "missing" ? null : found.rec;
          const matches = stored === null
            ? expect === null
            : expect !== null && stored.doc.revision === expect.revision && stored.hash === expect.hash;
          if (!matches) return { ok: false, kind: "conflict", detail: "the project changed since it was opened" };

          if (found.status === "ok") await tx.put("projects", prevKey(id), current);
          await tx.put("projects", id, rec);
          await tx.put("index", id, row);
          await tx.delete("journal", id);
          return { ok: true, hash: rec.hash, writtenAt: rec.writtenAt };
        });
      } catch (cause) {
        return failure(cause);
      }
    },

    async remove(id, deletedAt) {
      await backend.transact(["projects", "index", "trash"], "readwrite", async (tx) => {
        const prev = await tx.get("projects", prevKey(id));
        const found = pick(await tx.get("projects", id), prev);
        const row = (await tx.get("index", id)) as IndexRow | undefined;
        if (found.status === "missing" || found.status === "lost" || row === undefined) return;
        const trashed: TrashRow = {
          deletedAt,
          rec: found.rec,
          ...(found.status === "ok" && intact(prev) ? { prev } : {}),
          row,
        };
        await tx.put("trash", id, trashed);
        await tx.delete("projects", id);
        await tx.delete("projects", prevKey(id));
        await tx.delete("index", id);
      });
    },

    async restore(id) {
      await backend.transact(["projects", "index", "trash"], "readwrite", async (tx) => {
        const trashed = (await tx.get("trash", id)) as TrashRow | undefined;
        if (trashed === undefined) return;
        await tx.put("projects", id, trashed.rec);
        if (trashed.prev) await tx.put("projects", prevKey(id), trashed.prev);
        await tx.put("index", id, trashed.row);
        await tx.delete("trash", id);
      });
    },

    async purgeTrash(olderThan) {
      return backend.transact(["trash"], "readwrite", async (tx) => {
        const expired = (await tx.entries("trash", "")).filter(([, row]) => (row as TrashRow).deletedAt < olderThan);
        for (const [id] of expired) await tx.delete("trash", id);
        return expired.length;
      });
    },

    async listTrash() {
      const rows = await backend.transact(["trash"], "readonly", (tx) => tx.entries("trash", ""));
      return rows.map(([id, row]) => ({ id, name: (row as TrashRow).row.name, deletedAt: (row as TrashRow).deletedAt }));
    },

    journal: {
      async read(id) {
        const row = await backend.transact(["journal"], "readonly", (tx) => tx.get("journal", id));
        return (row as JournalRow | undefined) ?? null;
      },
      async append(id, baseRevision, edits: JournalEdit[], now) {
        await backend.transact(["journal"], "readwrite", async (tx) => {
          const existing = (await tx.get("journal", id)) as JournalRow | undefined;
          const kept = existing !== undefined && existing.baseRevision === baseRevision ? existing.edits : [];
          const row: JournalRow = { baseRevision, edits: [...kept, ...edits], writtenAt: now };
          await tx.put("journal", id, row);
        });
      },
      async clear(id) {
        await backend.transact(["journal"], "readwrite", (tx) => tx.delete("journal", id));
      },
    },

    backups: {
      async put(id, doc, hash, at) {
        await backend.transact(["backups"], "readwrite", async (tx) => {
          const prefix = `${id}:`;
          const n = Math.max(0, ...numbered(await tx.entries("backups", prefix), prefix)) + 1;
          const row: BackupRow = { doc, hash, at };
          await tx.put("backups", `${prefix}${n}`, row);
        });
      },
      async list(id) {
        const prefix = `${id}:`;
        const rows = await backend.transact(["backups"], "readonly", (tx) => tx.entries("backups", prefix));
        return rows
          .map(([key, row]) => ({ n: Number(key.slice(prefix.length)), at: (row as BackupRow).at, hash: (row as BackupRow).hash }))
          .sort((a, b) => a.n - b.n);
      },
    },

    revisions: {
      async put(id, revision, snap) {
        await backend.transact(["revisions"], "readwrite", (tx) => tx.put("revisions", `${id}:${revision}`, snap));
      },
      async get(id, revision) {
        const snap = await backend.transact(["revisions"], "readonly", (tx) => tx.get("revisions", `${id}:${revision}`));
        return (snap as { state: ProjectRecord["doc"]; stateHash: string } | undefined) ?? null;
      },
      async list(id) {
        const prefix = `${id}:`;
        return numbered(await backend.transact(["revisions"], "readonly", (tx) => tx.entries("revisions", prefix)), prefix);
      },
    },

    events: {
      async enabled() {
        return (await backend.transact(["progress"], "readonly", (tx) => tx.get("progress", EVENTS_ENABLED_KEY))) === true;
      },
      async setEnabled(on) {
        await backend.transact(["progress"], "readwrite", (tx) => tx.put("progress", EVENTS_ENABLED_KEY, on));
      },
      async append(row, cap) {
        await backend.transact(["events", "progress"], "readwrite", async (tx) => {
          const range = (await tx.get("progress", EVENTS_RANGE_KEY)) as EventRange | undefined;
          let { first, next } = range ?? { first: 0, next: 0 };
          await tx.put("events", eventKey(next), row);
          next += 1;
          for (; next - first > cap; first += 1) await tx.delete("events", eventKey(first));
          await tx.put("progress", EVENTS_RANGE_KEY, { first, next });
        });
      },
      async list(limit) {
        const rows = await backend.transact(["events"], "readonly", (tx) => tx.entries("events", ""));
        return rows.slice(-limit).reverse().map(([, row]) => row);
      },
      async clear() {
        await backend.transact(["events", "progress"], "readwrite", async (tx) => {
          await tx.clear("events");
          await tx.delete("progress", EVENTS_RANGE_KEY);
        });
      },
    },

    async setFileCopy(id, has) {
      await backend.transact(["index"], "readwrite", async (tx) => {
        const row = (await tx.get("index", id)) as IndexRow | undefined;
        if (row !== undefined) await tx.put("index", id, { ...row, hasFileCopy: has });
      });
    },

    async clearStores(names) {
      await backend.transact(names, "readwrite", async (tx) => {
        for (const name of names) await tx.clear(name);
      });
    },

    estimate: () => backend.estimate(),
  };
}
