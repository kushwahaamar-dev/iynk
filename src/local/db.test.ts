import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DbError, deleteAiStores, openDb } from "./db";
import { AI_STORES, DB_NAME, STORES, STORE_NAMES } from "./stores";

const TABLE_ORDER = [
  "projects", "index", "trash", "backups", "assets", "revisions", "progress", "proposals", "keys", "events",
  "errors", "server", "ai_threads", "ai_log", "ai_usage", "ai_memo", "ai_debug", "journal", "identity", "parts",
];

function put(db: IDBDatabase, store: string, value: unknown, key?: IDBValidKey): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function count(db: IDBDatabase, store: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openDb", () => {
  it("creates the 19 stores of SYSTEM 8.1 and `parts` with their key shapes", async () => {
    const db = await openDb();
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(2);
    expect([...db.objectStoreNames].sort()).toEqual([...TABLE_ORDER].sort());
    expect(STORE_NAMES).toEqual(TABLE_ORDER);

    const tx = db.transaction(TABLE_ORDER, "readonly");
    for (const name of TABLE_ORDER) {
      const store = tx.objectStore(name);
      expect(store.keyPath, name).toBe(name === "parts" ? "key" : null);
      expect(store.autoIncrement, name).toBe(name === "events" || name === "errors");
    }
    expect([...tx.objectStore("index").indexNames]).toEqual(["updatedAt"]);
    expect([...tx.objectStore("trash").indexNames]).toEqual(["deletedAt"]);
    expect([...tx.objectStore("ai_threads").indexNames]).toEqual(["projectId"]);
    for (const name of TABLE_ORDER) {
      const expected = Object.keys(STORES[name as keyof typeof STORES].indexes);
      expect([...tx.objectStore(name).indexNames], name).toEqual(expected);
    }
    db.close();
  });

  it("opens twice without touching what is stored", async () => {
    const first = await openDb();
    await put(first, "progress", { done: true }, "lesson-1");
    first.close();

    const second = await openDb();
    expect(second.objectStoreNames.length).toBe(20);
    expect(await count(second, "progress")).toBe(1);
    second.close();
  });

  it("adds the parts store to a version 1 database and keeps what it holds", async () => {
    const old = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        for (const name of TABLE_ORDER.filter((n) => n !== "parts")) req.result.createObjectStore(name);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await put(old, "progress", { done: true }, "lesson-1");
    old.close();

    const db = await openDb();
    expect(db.objectStoreNames.contains("parts")).toBe(true);
    expect(await count(db, "progress")).toBe(1);
    db.close();
  });

  it("refuses a database written by a newer version with db_too_new", async () => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 99);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    await expect(openDb()).rejects.toMatchObject({ name: "DbError", kind: "db_too_new" });
  });

  it("reports unavailable when indexedDB is missing", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(openDb()).rejects.toBeInstanceOf(DbError);
    await expect(openDb()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("reports unavailable when indexedDB.open throws", async () => {
    vi.stubGlobal("indexedDB", {
      open() {
        throw new DOMException("denied", "SecurityError");
      },
    });
    await expect(openDb()).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("closes and reports when a newer tab upgrades the database", async () => {
    const onClosed = vi.fn();
    const db = await openDb(onClosed);
    const closeSpy = vi.spyOn(db, "close");
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 3);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
    expect(closeSpy).toHaveBeenCalled();
    expect(onClosed).toHaveBeenCalledOnce();
  });
});

describe("deleteAiStores", () => {
  it("clears the six AI stores and nothing else", async () => {
    const db = await openDb();
    for (const name of AI_STORES) await put(db, name, { x: 1 }, "k");
    await put(db, "keys", { key: "secret" }, "provider");
    await put(db, "journal", { baseRevision: 1, edits: [], writtenAt: 1 }, "p1");

    const names = await deleteAiStores(db);
    expect([...names].sort()).toEqual(["ai_debug", "ai_log", "ai_memo", "ai_threads", "ai_usage", "proposals"]);
    for (const name of AI_STORES) expect(await count(db, name), name).toBe(0);
    expect(await count(db, "keys")).toBe(1);
    expect(await count(db, "journal")).toBe(1);
    db.close();
  });
});
