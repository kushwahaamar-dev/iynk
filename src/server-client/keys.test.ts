import { describe, expect, it } from "vitest";
import { createDeviceKey, idbKeyStore, keySupport, memoryKeyStore } from "./keys";
import type { StoredKey } from "./keys";

function fakeDb() {
  const rows = new Map<string, unknown>();
  const stores: string[] = [];
  const db = {
    transaction(name: string) {
      stores.push(name);
      const tx: { oncomplete?: () => void; objectStore(n: string): unknown } = {
        objectStore: () => ({
          get: (k: string) => settle(() => rows.get(k)),
          put: (v: unknown, k: string) => settle(() => void rows.set(k, v)),
          delete: (k: string) => settle(() => void rows.delete(k)),
        }),
      };
      const settle = (act: () => unknown) => {
        const req: { result?: unknown } = {};
        queueMicrotask(() => {
          req.result = act();
          tx.oncomplete?.();
        });
        return req;
      };
      return tx;
    },
  };
  return { db: db as unknown as IDBDatabase, rows, stores };
}

describe("keySupport", () => {
  it("is insecure outside a secure context, even with WebCrypto", () => {
    expect(keySupport({ isSecureContext: false, crypto: { subtle: {} } })).toBe("insecure");
  });

  it("is unsupported without WebCrypto and ok with it", () => {
    expect(keySupport({ isSecureContext: true, crypto: {} })).toBe("unsupported");
    expect(keySupport({ isSecureContext: true, crypto: { subtle: {} } })).toBe("ok");
  });
});

describe("createDeviceKey", () => {
  it("makes a P-256 key whose private half cannot be exported", async () => {
    const key = await createDeviceKey();
    expect(key.privateKey.extractable).toBe(false);
    expect(key.publicSpki).toHaveLength(91);
    await expect(crypto.subtle.exportKey("pkcs8", key.privateKey)).rejects.toThrow();
    await expect(crypto.subtle.exportKey("jwk", key.privateKey)).rejects.toThrow();
  });
});

describe("idbKeyStore", () => {
  it("gets, puts and deletes on the identity store, one row per origin", async () => {
    const { db, rows, stores } = fakeDb();
    const store = idbKeyStore(async () => db);
    const key = await createDeviceKey();
    expect(await store.get("https://a.test")).toBeNull();
    await store.put("https://a.test", key);
    expect((await store.get("https://a.test"))?.publicSpki).toEqual(key.publicSpki);
    expect(await store.get("https://b.test")).toBeNull();
    await store.delete("https://a.test");
    expect(rows.size).toBe(0);
    expect(new Set(stores)).toEqual(new Set(["identity"]));
  });

  it("opens the database once, and tries again after a failed open", async () => {
    const { db } = fakeDb();
    let opens = 0;
    const store = idbKeyStore(async () => {
      if (++opens === 1) throw new Error("blocked");
      return db;
    });
    await expect(store.get("o")).rejects.toThrow("blocked");
    await store.get("o");
    await store.get("o");
    expect(opens).toBe(2);
  });
});

describe("memoryKeyStore", () => {
  it("keeps keys per origin", async () => {
    const store = memoryKeyStore();
    const key = { createdAt: 1 } as StoredKey;
    await store.put("o", key);
    expect(await store.get("o")).toBe(key);
    await store.delete("o");
    expect(await store.get("o")).toBeNull();
  });
});
