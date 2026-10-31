import { openDb } from "./db";

export interface AssetBytes {
  put(sha256: string, bytes: Uint8Array): Promise<void>;
  get(sha256: string): Promise<Uint8Array | null>;
}

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** The files of a project's `assets` list, kept by sha256 in the `assets` store next to the files of parts. */
export function createAssetBytes(db: IDBDatabase): AssetBytes {
  return {
    async put(sha256, bytes) {
      await settle(db.transaction("assets", "readwrite").objectStore("assets").put(new Blob([bytes as BlobPart]), sha256));
    },
    async get(sha256) {
      const blob = await settle<Blob | undefined>(db.transaction("assets", "readonly").objectStore("assets").get(sha256));
      return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
    },
  };
}

let shared: Promise<AssetBytes> | undefined;

/** The device's store, opened the first time a file is read or written. */
export function deviceAssetBytes(): AssetBytes {
  const open = () =>
    (shared ??= openDb()
      .then(createAssetBytes)
      .catch((error) => {
        shared = undefined;
        throw error;
      }));
  return {
    put: async (sha256, bytes) => (await open()).put(sha256, bytes),
    get: async (sha256) => (await open()).get(sha256),
  };
}
