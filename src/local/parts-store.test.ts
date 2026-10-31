import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import type { Descriptor } from "@/parts/descriptor";
import { openDb } from "./db";
import {
  createIndexedDbPartsRepository,
  createMemoryPartsRepository,
  partKey,
  type PartRecord,
  type PartsRepository,
} from "./parts-store";

function recordOf(id: string, version = "1.0.0", digest = `sha256:${id}`, files: Record<string, string> = {}): PartRecord {
  return {
    key: partKey(id, version),
    id,
    version,
    descriptor: { id, version } as unknown as Descriptor,
    digest,
    trust: "local",
    addedAt: "2026-10-30T00:00:00.000Z",
    files,
  };
}

const batch = (n: number) => Array.from({ length: n }, (_, i) => recordOf(`part-${String(i).padStart(2, "0")}`));

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

const kinds: Array<[string, () => Promise<PartsRepository>]> = [
  ["memory", async () => createMemoryPartsRepository()],
  ["indexeddb", async () => createIndexedDbPartsRepository(await openDb())],
];

describe.each(kinds)("PartsRepository (%s)", (_name, make) => {
  it("adds, then reports same, then refuses different bytes and keeps the stored ones", async () => {
    const repo = await make();
    expect(await repo.put(recordOf("led"))).toBe("added");
    expect(await repo.put(recordOf("led"))).toBe("same");
    expect(await repo.put(recordOf("led", "1.0.0", "sha256:other"))).toBe("conflict");
    expect((await repo.get("led", "1.0.0"))?.digest).toBe("sha256:led");
  });

  it("putMany with one conflict writes nothing and names both digests", async () => {
    const repo = await make();
    await repo.put(recordOf("part-07", "1.0.0", "sha256:old"));
    const result = await repo.putMany(batch(20), new Map([["aa", new Blob(["x"])]]));
    expect(result).toEqual({
      ok: false,
      conflicts: [{ key: "part-07@1.0.0", installedDigest: "sha256:old", incomingDigest: "sha256:part-07" }],
    });
    expect(await repo.list()).toHaveLength(1);
    expect(await repo.getFile("aa")).toBeUndefined();
  });

  it("putMany stores records and files together and reports each result", async () => {
    const repo = await make();
    await repo.put(recordOf("part-01"));
    const result = await repo.putMany(batch(3), new Map([["aa", new Blob(["art"])]]));
    expect(result).toEqual({ ok: true, results: ["added", "same", "added"] });
    expect(await repo.list()).toHaveLength(3);
    expect(await repo.getFile("aa")).toBeDefined();
  });

  it("treats two different versions of one batch key as a conflict", async () => {
    const repo = await make();
    const result = await repo.putMany([recordOf("a"), recordOf("a", "1.0.0", "sha256:b")], new Map());
    expect(result.ok).toBe(false);
    expect(await repo.list()).toEqual([]);
  });

  it("removes a record and keeps its files", async () => {
    const repo = await make();
    await repo.putMany([recordOf("led", "1.0.0", "sha256:led", { "art.svg": "aa" })], new Map([["aa", new Blob(["art"])]]));
    await repo.remove("led", "1.0.0");
    expect(await repo.get("led", "1.0.0")).toBeUndefined();
    expect(await repo.getFile("aa")).toBeDefined();
  });

  it("handles keys with @ and dots and lists them by key", async () => {
    const repo = await make();
    await repo.putMany([recordOf("z.part"), recordOf("a@b", "2.10.0"), recordOf("a@b", "2.2.0")], new Map());
    expect((await repo.list()).map((r) => r.key)).toEqual(["a@b@2.10.0", "a@b@2.2.0", "z.part@1.0.0"]);
  });

  it("refuses records that disagree with their key, descriptor or trust", async () => {
    const repo = await make();
    await expect(repo.put({ ...recordOf("led"), key: "led@2.0.0" })).rejects.toThrow();
    await expect(repo.put({ ...recordOf("led"), descriptor: { id: "led", version: "9.9.9" } as unknown as Descriptor })).rejects.toThrow();
    await expect(repo.put({ ...recordOf("led"), trust: "core" as never })).rejects.toThrow();
  });
});

describe("memory PartsRepository", () => {
  it("aborts the whole batch when the 21st write fails", async () => {
    const repo = createMemoryPartsRepository();
    repo.failAfter(20);
    await expect(repo.putMany(batch(20), new Map([["aa", new Blob(["x"])]]))).rejects.toThrow("injected");
    expect(await repo.list()).toEqual([]);
    expect(await repo.getFile("aa")).toBeUndefined();
  });
});

describe("IndexedDB PartsRepository", () => {
  it("keeps 100 parts across a reload", async () => {
    const first = await openDb();
    await createIndexedDbPartsRepository(first).putMany(batch(100), new Map());
    first.close();

    const list = await createIndexedDbPartsRepository(await openDb()).list();
    expect(list).toHaveLength(100);
    expect(list[0].digest).toBe("sha256:part-00");
  });
});
