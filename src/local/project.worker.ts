import { serveWorker, type WorkerScopeLike } from "@/protocol";
import { DbError, openDb } from "./db";
import { createProjectHandler } from "./project-handler";
import { createIdbRepository } from "./idb-repository";
import { createMemoryRepository } from "./memory-repository";
import { createShadow } from "./shadow";
import type { ProgressKv } from "./storage-health";

function idbProgress(db: IDBDatabase): ProgressKv {
  const run = <T>(mode: IDBTransactionMode, use: (store: IDBObjectStore) => IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
      const request = use(db.transaction("progress", mode).objectStore("progress"));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  return {
    get: (key) => run("readonly", (store) => store.get(key)),
    set: async (key, value) => void (await run("readwrite", (store) => store.put(value, key))),
  };
}

async function openRepository() {
  try {
    const db = await openDb();
    return { repo: createIdbRepository(db), progress: idbProgress(db), degraded: false };
  } catch (cause) {
    if (!(cause instanceof DbError) || cause.kind !== "unavailable") throw cause;
    return { repo: createMemoryRepository(), progress: undefined, degraded: true };
  }
}

void openRepository().then(({ repo, progress, degraded }) => {
  serveWorker(
    self as unknown as WorkerScopeLike,
    createProjectHandler({ repo, shadowFactory: createShadow, clock: Date.now, degraded, progress }),
  );
});
