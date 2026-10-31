import type { Descriptor as ComponentDescriptor } from "@/parts/descriptor";

export interface PartRecord {
  key: string;
  id: string;
  version: string;
  descriptor: ComponentDescriptor;
  /** `sha256:` plus the hash of the canonical JSON of `descriptor`. The caller computes it; this store only compares. */
  digest: string;
  trust: "local" | "imported";
  addedAt: string;
  /** Descriptor-relative path to the sha256 of the file; the bytes sit in the `assets` store. */
  files: Readonly<Record<string, string>>;
  source?: { sender?: string; packId?: string; packSha256?: string };
}

export type PutResult = "added" | "same" | "conflict";

export interface PartConflict {
  key: string;
  installedDigest: string;
  incomingDigest: string;
}

export type PutManyResult = { ok: true; results: Array<"added" | "same"> } | { ok: false; conflicts: PartConflict[] };

export interface PartsRepository {
  list(): Promise<PartRecord[]>;
  get(id: string, version: string): Promise<PartRecord | undefined>;
  put(rec: PartRecord): Promise<PutResult>;
  /** All or nothing: a conflict, or a failed write, leaves the store as it was. */
  putMany(recs: readonly PartRecord[], files: ReadonlyMap<string, Blob>): Promise<PutManyResult>;
  /** The files stay in `assets`: other parts may share a sha256. */
  remove(id: string, version: string): Promise<void>;
  getFile(sha256: string): Promise<Blob | undefined>;
}

export interface MemoryPartsRepository extends PartsRepository {
  /** Test hook: the write after the next `n` writes throws. `null` turns it off. */
  failAfter(n: number | null): void;
}

export class StoreFullError extends Error {
  readonly usage: number | null;
  readonly quota: number | null;

  constructor(usage: number | null, quota: number | null, options?: ErrorOptions) {
    super("storage is full", options);
    this.name = "StoreFullError";
    this.usage = usage;
    this.quota = quota;
  }
}

export function partKey(id: string, version: string): string {
  return `${id}@${version}`;
}

const byKey = (a: PartRecord, b: PartRecord) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);

function assertStorable(rec: PartRecord): void {
  if (rec.key !== partKey(rec.id, rec.version)) throw new Error(`part key ${rec.key} is not ${partKey(rec.id, rec.version)}`);
  if (rec.descriptor.id !== rec.id || rec.descriptor.version !== rec.version) {
    throw new Error(`part ${rec.key} does not match its descriptor`);
  }
  if ((rec.trust as string) === "core") throw new Error(`core part ${rec.key} is not stored`);
}

interface Plan {
  results: PutResult[];
  conflicts: PartConflict[];
}

/** Decides each record against what is installed, and against earlier records of the same batch. */
function plan(recs: readonly PartRecord[], installed: ReadonlyMap<string, PartRecord>): Plan {
  const seen = new Map<string, string>();
  const results: PutResult[] = [];
  const conflicts: PartConflict[] = [];
  for (const rec of recs) {
    assertStorable(rec);
    const known = seen.get(rec.key) ?? installed.get(rec.key)?.digest;
    if (known === undefined) {
      seen.set(rec.key, rec.digest);
      results.push("added");
    } else if (known === rec.digest) {
      results.push("same");
    } else {
      conflicts.push({ key: rec.key, installedDigest: known, incomingDigest: rec.digest });
      results.push("conflict");
    }
  }
  return { results, conflicts };
}

function outcome({ results, conflicts }: Plan): PutManyResult {
  return conflicts.length > 0 ? { ok: false, conflicts } : { ok: true, results: results as Array<"added" | "same"> };
}

export function createMemoryPartsRepository(): MemoryPartsRepository {
  let records = new Map<string, PartRecord>();
  let blobs = new Map<string, Blob>();
  let budget: number | null = null;

  const commit = (recs: readonly PartRecord[], results: readonly PutResult[], files: ReadonlyMap<string, Blob>) => {
    const nextRecords = new Map(records);
    const nextBlobs = new Map(blobs);
    const spend = () => {
      if (budget === null) return;
      if (budget === 0) throw new Error("injected write failure");
      budget -= 1;
    };
    recs.forEach((rec, i) => {
      if (results[i] !== "added") return;
      spend();
      nextRecords.set(rec.key, structuredClone(rec));
    });
    for (const [sha, blob] of files) {
      spend();
      nextBlobs.set(sha, blob);
    }
    records = nextRecords;
    blobs = nextBlobs;
  };

  return {
    failAfter: (n) => {
      budget = n;
    },
    list: async () => [...records.values()].map((rec) => structuredClone(rec)).sort(byKey),
    get: async (id, version) => {
      const rec = records.get(partKey(id, version));
      return rec && structuredClone(rec);
    },
    put: async (rec) => {
      const { results } = plan([rec], records);
      commit([rec], results, new Map());
      return results[0];
    },
    putMany: async (recs, files) => {
      const decided = plan(recs, records);
      const done = outcome(decided);
      if (done.ok) commit(recs, decided.results, files);
      return done;
    },
    remove: async (id, version) => {
      const next = new Map(records);
      next.delete(partKey(id, version));
      records = next;
    },
    getFile: async (sha256) => blobs.get(sha256),
  };
}

function settle<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function toStoreFull(cause: unknown): Promise<unknown> {
  if (!(cause instanceof DOMException) || cause.name !== "QuotaExceededError") return cause;
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  return new StoreFullError(estimate?.usage ?? null, estimate?.quota ?? null, { cause });
}

export function createIndexedDbPartsRepository(db: IDBDatabase): PartsRepository {
  /** Runs `work` in one transaction over `parts` and `assets`; resolves once it has committed. */
  async function transact<T>(mode: IDBTransactionMode, work: (parts: IDBObjectStore, assets: IDBObjectStore) => Promise<T>): Promise<T> {
    try {
      const tx = db.transaction(["parts", "assets"], mode);
      const finished = new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new DOMException("transaction aborted", "AbortError"));
      });
      let value: T;
      try {
        value = await work(tx.objectStore("parts"), tx.objectStore("assets"));
      } catch (cause) {
        try {
          tx.abort();
        } catch {
          // already finished
        }
        await finished.catch(() => undefined);
        throw cause;
      }
      await finished;
      return value;
    } catch (cause) {
      throw await toStoreFull(cause);
    }
  }

  const installedOf = async (parts: IDBObjectStore, recs: readonly PartRecord[]) => {
    const found = await Promise.all(recs.map((rec) => settle<PartRecord | undefined>(parts.get(rec.key))));
    return new Map(found.flatMap((rec) => (rec ? [[rec.key, rec] as const] : [])));
  };

  const writeBatch = (recs: readonly PartRecord[], files: ReadonlyMap<string, Blob>) =>
    transact("readwrite", async (parts, assets) => {
      const decided = plan(recs, await installedOf(parts, recs));
      const done = outcome(decided);
      if (!done.ok) return done;
      await Promise.all([
        ...recs.filter((_, i) => decided.results[i] === "added").map((rec) => settle(parts.put(rec))),
        ...[...files].map(([sha, blob]) => settle(assets.put(blob, sha))),
      ]);
      return done;
    });

  return {
    list: () => transact("readonly", (parts) => settle<PartRecord[]>(parts.getAll())),
    get: (id, version) => transact("readonly", (parts) => settle<PartRecord | undefined>(parts.get(partKey(id, version)))),
    put: async (rec) => {
      const done = await writeBatch([rec], new Map());
      return done.ok ? done.results[0] : "conflict";
    },
    putMany: writeBatch,
    remove: (id, version) => transact("readwrite", async (parts) => void (await settle(parts.delete(partKey(id, version))))),
    getFile: (sha256) => transact("readonly", (_, assets) => settle<Blob | undefined>(assets.get(sha256))),
  };
}
