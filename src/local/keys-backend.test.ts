import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, expect, it } from "vitest";
import { openDb } from "./db";
import { createKeysBackend, type StoredKeyRow } from "./keys-backend";

const row = (key: string): StoredKeyRow => ({ providerProfile: null, key, addedAt: 1, lastUsedAt: null });

function plant(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("keys", "readwrite");
    tx.objectStore("keys").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function storedKeys(db: IDBDatabase): Promise<IDBValidKey[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction("keys").objectStore("keys").getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

it("loads empty slots from an empty store", async () => {
  const backend = createKeysBackend(await openDb());
  expect(await backend.load()).toEqual({ ai: null, search: null });
});

it("round-trips a row under slot:ai and slot:search", async () => {
  const db = await openDb();
  const backend = createKeysBackend(db);
  const ai = { ...row("ai-key-0000000001"), label: "mine" };
  await backend.save("ai", ai);
  await backend.save("search", row("search-key-0001"));
  expect(await backend.load()).toEqual({ ai, search: row("search-key-0001") });
  expect((await storedKeys(db)).sort()).toEqual(["slot:ai", "slot:search"]);
});

it("deletes a row when saved as null", async () => {
  const backend = createKeysBackend(await openDb());
  await backend.save("ai", row("ai-key-0000000001"));
  await backend.save("ai", null);
  expect(await backend.load()).toEqual({ ai: null, search: null });
});

it("ignores a row planted under another key and a malformed slot row", async () => {
  const db = await openDb();
  await plant(db, "openai", row("planted-key-0001"));
  await plant(db, "slot:search", { key: 5 });
  expect(await createKeysBackend(db).load()).toEqual({ ai: null, search: null });
});

it("rejects with a DbError when the database is unusable", async () => {
  const db = await openDb();
  db.close();
  await expect(createKeysBackend(db).load()).rejects.toMatchObject({ name: "DbError" });
});
