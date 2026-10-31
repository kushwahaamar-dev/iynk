import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stateHash } from "@/project/hash";
import { startProject } from "@/project/testing/generators";
import { openDb } from "./db";
import { createIdbRepository } from "./idb-repository";
import { repositoryContract } from "./repository.contract";
import type { StoreName } from "./stores";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function rawAccess(db: IDBDatabase) {
  const request = <T>(r: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  return {
    get: (store: StoreName, key: string) => request(db.transaction(store).objectStore(store).get(key)),
    put: async (store: StoreName, key: string, value: unknown) => {
      await request(db.transaction(store, "readwrite").objectStore(store).put(value, key));
    },
    keys: async (store: StoreName) => (await request(db.transaction(store).objectStore(store).getAllKeys())).map(String),
  };
}

repositoryContract("IndexedDB", async () => {
  const db = await openDb();
  return {
    repo: createIdbRepository(db),
    raw: rawAccess(db),
    failNextWrite(error) {
      const put = IDBObjectStore.prototype.put;
      vi.spyOn(IDBObjectStore.prototype, "put").mockImplementationOnce(function (this: IDBObjectStore, ...args) {
        if (this.name !== "projects") return put.apply(this, args);
        throw error;
      });
    },
    close: () => db.close(),
  };
});

describe("IndexedDB repository", () => {
  it("leaves every row as it was when the transaction is aborted before it commits", async () => {
    const db = await openDb();
    const repo = createIdbRepository(db);
    const raw = rawAccess(db);
    const make = (title: string) => {
      const base = startProject(1);
      const doc = { ...base, meta: { ...base.meta, title } };
      return { doc, hash: stateHash(doc), writtenAt: 1 };
    };
    const [v1, v2] = [make("one"), make("two")];
    const rowOf = (rec: typeof v1) => ({ name: rec.doc.meta.title, updatedAt: rec.doc.meta.updatedAt, hash: rec.hash, board: "uno", size: 1, hasFileCopy: false, archived: false });
    await repo.save("prj_abort", v1, rowOf(v1), null);

    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === "index") this.transaction.abort();
      return put.apply(this, args);
    });
    const result = await repo.save("prj_abort", v2, rowOf(v2), { revision: v1.doc.revision, hash: v1.hash });
    vi.restoreAllMocks();

    expect(result).toMatchObject({ ok: false, kind: "blocked" });
    expect(await raw.get("projects", "prj_abort")).toEqual(v1);
    expect(await raw.keys("projects")).toEqual(["prj_abort"]);
    expect(await raw.get("index", "prj_abort")).toEqual(rowOf(v1));
    db.close();
  });

  it("gives no storage estimate where the browser has none", async () => {
    const db = await openDb();
    vi.stubGlobal("navigator", {});
    expect(await createIdbRepository(db).estimate()).toBeNull();
    vi.unstubAllGlobals();
    db.close();
  });
});
