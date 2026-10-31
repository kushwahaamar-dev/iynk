import { describe, expect, it } from "vitest";
import { stateHash } from "@/project/hash";
import { startProject } from "@/project/testing/generators";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import { repositoryContract } from "./repository.contract";

repositoryContract("memory", async () => {
  const rows = emptyRows();
  let failure: Error | null = null;
  const repo = createMemoryRepository({
    rows,
    beforeCommit() {
      if (failure) {
        const error = failure;
        failure = null;
        throw error;
      }
    },
  });
  return {
    repo,
    raw: {
      get: async (store, key) => rows[store].get(key),
      put: async (store, key, value) => void rows[store].set(key, value),
      keys: async (store) => [...rows[store].keys()].sort(),
    },
    failNextWrite(error) {
      failure = error;
    },
    close() {},
  };
});

describe("memory repository", () => {
  it("stores a copy, so a caller changing what it saved cannot change the store", async () => {
    const repo = createMemoryRepository();
    const base = startProject(1);
    const doc = { ...base, meta: { ...base.meta } };
    const rec = { doc, hash: stateHash(doc), writtenAt: 1 };
    const row = { name: "x", updatedAt: doc.meta.updatedAt, hash: rec.hash, board: "uno", size: 1, hasFileCopy: false, archived: false };
    await repo.save("prj_copy", rec, row, null);
    doc.meta.title = "changed after saving";
    expect(await repo.load("prj_copy")).toMatchObject({ status: "ok", rec: { doc: { meta: { title: base.meta.title } } } });
  });
});
