import { createRepository, type Backend, type Tx } from "./repository-core";
import type { Repository } from "./repository";

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function prefixRange(prefix: string): IDBKeyRange | undefined {
  return prefix === "" ? undefined : IDBKeyRange.bound(prefix, `${prefix}￿`);
}

export function createIdbRepository(db: IDBDatabase): Repository {
  const backend: Backend = {
    async transact(stores, mode, work) {
      const tx = db.transaction([...stores], mode);
      const finished = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new DOMException("transaction aborted", "AbortError"));
      });
      const view: Tx = {
        get: (store, key) => result(tx.objectStore(store).get(key)),
        put: async (store, key, value) => void (await result(tx.objectStore(store).put(value, key))),
        delete: async (store, key) => void (await result(tx.objectStore(store).delete(key))),
        clear: async (store) => void (await result(tx.objectStore(store).clear())),
        entries: async (store, prefix) => {
          const objects = tx.objectStore(store);
          const range = prefixRange(prefix);
          const [keys, values] = await Promise.all([result(objects.getAllKeys(range)), result(objects.getAll(range))]);
          return keys.map((key, i) => [String(key), values[i]]);
        },
      };
      let outcome: Awaited<ReturnType<typeof work>>;
      try {
        outcome = await work(view);
      } catch (cause) {
        try {
          tx.abort();
        } catch {
          // already finished or aborted
        }
        await finished.catch(() => undefined);
        throw cause;
      }
      await finished;
      return outcome;
    },

    async estimate() {
      if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
      const { usage, quota } = await navigator.storage.estimate();
      return usage === undefined || quota === undefined ? null : { usage, quota };
    },
  };

  return createRepository(backend);
}
