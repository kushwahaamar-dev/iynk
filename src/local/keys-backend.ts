import type { ProviderProfile } from "../ai/profiles";
import { toDbError } from "./db";

type Slot = "ai" | "search";

/** The fields of `KeyRow` in `src/lib/keys/store.ts`, written out so `local` does not import `lib`. */
export interface StoredKeyRow {
  providerProfile: ProviderProfile | null;
  key: string;
  label?: string;
  addedAt: number;
  lastUsedAt: number | null;
}

const SLOTS: readonly Slot[] = ["ai", "search"];
const rowKey = (slot: Slot) => `slot:${slot}`;

function isStoredRow(value: unknown): value is StoredKeyRow {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.key === "string" && typeof row.addedAt === "number";
}

function settle<T>(tx: IDBTransaction, read: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(read());
    tx.onerror = () => reject(toDbError(tx.error));
    tx.onabort = () => reject(toDbError(tx.error ?? new DOMException("transaction aborted", "AbortError")));
  });
}

/** Keys are deliberately not part of the `Repository` interface, so an export can never reach them. */
export type KeysBackend = ReturnType<typeof createKeysBackend>;

export function createKeysBackend(db: Pick<IDBDatabase, "transaction">) {
  return {
    load(): Promise<Record<Slot, StoredKeyRow | null>> {
      try {
        const tx = db.transaction("keys", "readonly");
        const store = tx.objectStore("keys");
        const requests = SLOTS.map((slot) => store.get(rowKey(slot)));
        return settle(tx, () => {
          const [ai, search] = requests.map((request) => (isStoredRow(request.result) ? request.result : null));
          return { ai, search };
        });
      } catch (cause) {
        return Promise.reject(toDbError(cause));
      }
    },

    save(slot: Slot, row: StoredKeyRow | null): Promise<void> {
      try {
        const tx = db.transaction("keys", "readwrite");
        const store = tx.objectStore("keys");
        if (row) store.put(row, rowKey(slot));
        else store.delete(rowKey(slot));
        return settle(tx, () => undefined);
      } catch (cause) {
        return Promise.reject(toDbError(cause));
      }
    },
  };
}
