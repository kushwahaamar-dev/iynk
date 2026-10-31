import { AI_STORES, DB_NAME, DB_VERSION, STORES, STORE_NAMES, type StoreName, type StoreSpec } from "./stores";

export type DbErrorKind = "unavailable" | "db_too_new" | "blocked" | "quota" | "aborted";

export class DbError extends Error {
  readonly kind: DbErrorKind;

  constructor(kind: DbErrorKind, detail: string, options?: ErrorOptions) {
    super(detail, options);
    this.name = "DbError";
    this.kind = kind;
  }
}

/** Maps what IndexedDB threw to a `DbError`; anything it does not recognise is `unavailable`. */
export function toDbError(cause: unknown): DbError {
  if (cause instanceof DbError) return cause;
  const name = cause instanceof DOMException ? cause.name : "";
  const detail = cause instanceof Error ? cause.message : String(cause);
  const options = { cause };
  if (name === "QuotaExceededError") return new DbError("quota", detail, options);
  if (name === "AbortError") return new DbError("aborted", detail, options);
  if (name === "VersionError") return new DbError("db_too_new", detail, options);
  return new DbError("unavailable", detail, options);
}

function createStores(db: IDBDatabase): void {
  for (const name of STORE_NAMES) {
    if (db.objectStoreNames.contains(name)) continue;
    const spec: StoreSpec = STORES[name];
    const store = db.createObjectStore(name, { autoIncrement: spec.autoIncrement, keyPath: spec.keyPath });
    for (const [indexName, keyPath] of Object.entries(spec.indexes)) store.createIndex(indexName, keyPath);
  }
}

/**
 * Opens database `iynk`, creating the stores that are missing. `onClosed` runs when a newer tab asks this one to let go,
 * after the connection is closed.
 */
export function openDb(onClosed?: () => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === "undefined") throw new DbError("unavailable", "indexedDB is not available");
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (cause) {
      reject(toDbError(cause));
      return;
    }
    request.onupgradeneeded = () => createStores(request.result);
    request.onblocked = () => reject(new DbError("blocked", "another tab holds an older version of the database open"));
    request.onerror = () => reject(toDbError(request.error));
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        onClosed?.();
      };
      resolve(db);
    };
  });
}

/** Clears the six AI stores in one transaction and returns their names. */
export function deleteAiStores(db: IDBDatabase): Promise<readonly StoreName[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...AI_STORES], "readwrite");
    for (const name of AI_STORES) tx.objectStore(name).clear();
    tx.oncomplete = () => resolve(AI_STORES);
    tx.onerror = () => reject(toDbError(tx.error));
    tx.onabort = () => reject(toDbError(tx.error ?? new DOMException("transaction aborted", "AbortError")));
  });
}
