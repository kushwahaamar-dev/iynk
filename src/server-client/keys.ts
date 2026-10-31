export type KeySupport = "ok" | "insecure" | "unsupported";

export type StoredKey = { privateKey: CryptoKey; publicSpki: Uint8Array; createdAt: number };

export interface DeviceKeyStore {
  get(origin: string): Promise<StoredKey | null>;
  put(origin: string, k: StoredKey): Promise<void>;
  delete(origin: string): Promise<void>;
}

const STORE = "identity";

/** Device keys need WebCrypto, which browsers only hand out in a secure context (https or localhost). */
export function keySupport(
  scope: { isSecureContext?: boolean; crypto?: { subtle?: unknown } } = globalThis,
): KeySupport {
  if (scope.isSecureContext === false) return "insecure";
  return scope.crypto?.subtle ? "ok" : "unsupported";
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = act(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function idbKeyStore(open: () => Promise<IDBDatabase>): DeviceKeyStore {
  let handle: Promise<IDBDatabase> | undefined;
  const db = () =>
    (handle ??= open().catch((e: unknown) => {
      handle = undefined;
      throw e;
    }));
  return {
    async get(origin) {
      const found = await run<StoredKey | undefined>(await db(), "readonly", (s) => s.get(origin));
      return found ?? null;
    },
    async put(origin, k) {
      await run(await db(), "readwrite", (s) => s.put(k, origin));
    },
    async delete(origin) {
      await run(await db(), "readwrite", (s) => s.delete(origin));
    },
  };
}

export function memoryKeyStore(): DeviceKeyStore {
  const keys = new Map<string, StoredKey>();
  return {
    get: async (origin) => keys.get(origin) ?? null,
    put: async (origin, k) => {
      keys.set(origin, k);
    },
    delete: async (origin) => {
      keys.delete(origin);
    },
  };
}

export async function createDeviceKey(): Promise<StoredKey> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return { privateKey: pair.privateKey, publicSpki: new Uint8Array(spki), createdAt: Date.now() };
}
