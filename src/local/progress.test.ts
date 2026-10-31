import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyRecord } from "@/project/guided/record";
import { openDb } from "./db";
import { createProgressRepo, idbLearnKv, LEARN_PREFIX, memoryLearnKv, type LearnKv } from "./progress";

const NOW = "2026-10-31T10:00:00.000Z";

async function seeded(): Promise<LearnKv> {
  const kv = memoryLearnKv();
  await kv.put("storage.persist", { persisted: true, askedAt: 1 });
  await kv.put(`${LEARN_PREFIX}old`, { ...emptyRecord("old", NOW), v: 2 });
  return kv;
}

describe("progress repo", () => {
  it("round trips a record", async () => {
    const repo = createProgressRepo(memoryLearnKv());
    const r = emptyRecord("prj_uno-r3-blink", NOW);
    await repo.put(r);
    expect(await repo.get(r.projectId)).toEqual(r);
    expect(await repo.all()).toEqual([r]);
  });

  it("skips foreign rows and other versions, and leaves them on remove", async () => {
    const kv = await seeded();
    const repo = createProgressRepo(kv);
    await repo.put(emptyRecord("a", NOW));
    expect((await repo.all()).map((r) => r.projectId)).toEqual(["a"]);
    expect(await repo.get("old")).toBeUndefined();
    await repo.remove("a");
    expect(await kv.get("storage.persist")).toEqual({ persisted: true, askedAt: 1 });
    expect(await repo.all()).toEqual([]);
  });
});

describe("idb learn kv", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it("round trips a record next to a foreign row", async () => {
    const db = await openDb();
    db.transaction("progress", "readwrite").objectStore("progress").put({ persisted: false }, "storage.persist");
    db.close();
    const repo = createProgressRepo(await idbLearnKv());
    const r = emptyRecord("prj_uno-r3-blink", NOW);
    await repo.put(r);
    expect(await repo.all()).toEqual([r]);
    await repo.remove(r.projectId);
    expect(await repo.all()).toEqual([]);
  });
});
