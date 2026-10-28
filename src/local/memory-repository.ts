import { createRepository, type Backend, type Tx } from "./repository-core";
import type { Repository } from "./repository";
import { STORE_NAMES, type StoreName } from "./stores";

export type MemoryRows = Record<StoreName, Map<string, unknown>>;

export function emptyRows(): MemoryRows {
  return Object.fromEntries(STORE_NAMES.map((name) => [name, new Map()])) as MemoryRows;
}

export interface MemoryOptions {
  /** The rows to work on; a test keeps the object to look at or damage what was stored. */
  rows?: MemoryRows;
  /** Runs before a write transaction commits. Throwing aborts it and leaves the rows as they were. */
  beforeCommit?: () => void;
}

export function createMemoryRepository({ rows = emptyRows(), beforeCommit }: MemoryOptions = {}): Repository {
  let queue: Promise<unknown> = Promise.resolve();

  const backend: Backend = {
    transact(stores, mode, work) {
      const run = async () => {
        const staged = new Map(stores.map((name) => [name, new Map(rows[name])]));
        const table = (name: StoreName) => staged.get(name) as Map<string, unknown>;
        const tx: Tx = {
          get: async (store, key) => table(store).get(key),
          put: async (store, key, value) => void table(store).set(key, structuredClone(value)),
          delete: async (store, key) => void table(store).delete(key),
          clear: async (store) => table(store).clear(),
          entries: async (store, prefix) =>
            [...table(store)].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        };
        const result = await work(tx);
        if (mode === "readwrite") {
          beforeCommit?.();
          for (const [name, map] of staged) rows[name] = map;
        }
        return result;
      };
      const next = queue.then(run);
      queue = next.catch(() => undefined);
      return next;
    },
    estimate: async () => null,
  };

  return createRepository(backend);
}
