import { describe, expect, it } from "vitest";
import type { Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { startProject } from "@/project/testing/generators";
import type { IndexRow, ProjectRecord, Repository } from "./repository";
import type { StoreName } from "./stores";

export interface RepositoryHarness {
  repo: Repository;
  raw: {
    get(store: StoreName, key: string): Promise<unknown>;
    put(store: StoreName, key: string, value: unknown): Promise<void>;
    keys(store: StoreName): Promise<string[]>;
  };
  /** The next write transaction fails with this error and leaves the stored rows as they were. */
  failNextWrite(error: Error): void;
  close(): void;
}

const ID = "prj_contract";

function versionOf(n: number): ProjectRecord {
  const base = startProject(1);
  const doc: Project = { ...base, revision: n, meta: { ...base.meta, title: `Version ${n}` } };
  return { doc, hash: stateHash(doc), writtenAt: 1_000 + n };
}

function rowOf(rec: ProjectRecord): IndexRow {
  return {
    name: rec.doc.meta.title,
    updatedAt: rec.doc.meta.updatedAt,
    hash: rec.hash,
    board: "uno",
    size: 1_000,
    hasFileCopy: false,
    archived: false,
  };
}

const expectOf = (rec: ProjectRecord) => ({ revision: rec.doc.revision, hash: rec.hash });

async function saveAll(repo: Repository, ...versions: ProjectRecord[]): Promise<void> {
  let previous: ProjectRecord | null = null;
  for (const rec of versions) {
    const saved = await repo.save(ID, rec, rowOf(rec), previous && expectOf(previous));
    expect(saved.ok).toBe(true);
    previous = rec;
  }
}

export function repositoryContract(name: string, open: () => Promise<RepositoryHarness>): void {
  describe(`Repository contract: ${name}`, () => {
    async function withHarness(body: (h: RepositoryHarness) => Promise<void>): Promise<void> {
      const harness = await open();
      try {
        await body(harness);
      } finally {
        harness.close();
      }
    }

    it("saves and loads a record, and the index row equals the saved row", () =>
      withHarness(async ({ repo }) => {
        const v1 = versionOf(1);
        expect(await repo.save(ID, v1, rowOf(v1), null)).toEqual({ ok: true, hash: v1.hash, writtenAt: v1.writtenAt });
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: v1 });
        expect(await repo.list()).toEqual([{ id: ID, ...rowOf(v1) }]);
      }));

    it("keeps the first save in the previous slot after a second", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await saveAll(repo, v1, v2);
        expect(await raw.get("projects", ID)).toEqual(v2);
        expect(await raw.get("projects", `${ID}~prev`)).toEqual(v1);
      }));

    it("rejects a stale expect and leaves the stored record untouched", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2, v3] = [versionOf(1), versionOf(2), versionOf(3)];
        await saveAll(repo, v1, v2);
        const stale = await repo.save(ID, v3, rowOf(v3), expectOf(v1));
        expect(stale).toMatchObject({ ok: false, kind: "conflict" });
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: v2 });
        expect(await raw.get("projects", `${ID}~prev`)).toEqual(v1);
      }));

    it("conflicts on a first save over an existing record and on an update of a missing one", () =>
      withHarness(async ({ repo }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        expect(await repo.save(ID, v2, rowOf(v2), expectOf(v1))).toMatchObject({ ok: false, kind: "conflict" });
        await saveAll(repo, v1);
        expect(await repo.save(ID, v2, rowOf(v2), null)).toMatchObject({ ok: false, kind: "conflict" });
      }));

    it("rejects a hash that is not 64 hex digits", () =>
      withHarness(async ({ repo }) => {
        const v1 = { ...versionOf(1), hash: "abc" };
        expect(await repo.save(ID, v1, rowOf(v1), null)).toMatchObject({ ok: false, kind: "validation" });
        expect(await repo.load(ID)).toEqual({ status: "missing" });
      }));

    it("serialises two saves racing on the same id", () =>
      withHarness(async ({ repo }) => {
        const [v1, v2, v3] = [versionOf(1), versionOf(2), versionOf(3)];
        await saveAll(repo, v1);
        const [a, b] = await Promise.all([
          repo.save(ID, v2, rowOf(v2), expectOf(v1)),
          repo.save(ID, v3, rowOf(v3), expectOf(v1)),
        ]);
        expect([a.ok, b.ok].sort()).toEqual([false, true]);
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: a.ok ? v2 : v3 });
      }));

    it("falls back to the previous slot when the current one is corrupt", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await saveAll(repo, v1, v2);
        await raw.put("projects", ID, "garbage");
        expect(await repo.load(ID)).toEqual({ status: "recovered", rec: v1 });
      }));

    it("treats a record whose content no longer matches its hash as corrupt", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await saveAll(repo, v1, v2);
        await raw.put("projects", ID, { ...v2, doc: { ...v2.doc, meta: { ...v2.doc.meta, title: "edited" } } });
        expect(await repo.load(ID)).toEqual({ status: "recovered", rec: v1 });
      }));

    it("saves over a recovered record without touching the good previous slot", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2, v3] = [versionOf(1), versionOf(2), versionOf(3)];
        await saveAll(repo, v1, v2);
        await raw.put("projects", ID, "garbage");
        expect(await repo.save(ID, v3, rowOf(v3), expectOf(v1))).toMatchObject({ ok: true });
        expect(await raw.get("projects", `${ID}~prev`)).toEqual(v1);
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: v3 });
      }));

    it("reports lost when both slots are corrupt and deletes nothing", () =>
      withHarness(async ({ repo, raw }) => {
        await saveAll(repo, versionOf(1), versionOf(2));
        await raw.put("projects", ID, "garbage");
        await raw.put("projects", `${ID}~prev`, { hash: "nope" });
        expect(await repo.load(ID)).toEqual({ status: "lost" });
        expect(await raw.keys("projects")).toEqual([ID, `${ID}~prev`]);
        const v3 = versionOf(3);
        expect(await repo.save(ID, v3, rowOf(v3), null)).toMatchObject({ ok: false, kind: "conflict" });
      }));

    it("reports missing for an unknown id", () =>
      withHarness(async ({ repo }) => {
        expect(await repo.load("prj_nothing")).toEqual({ status: "missing" });
      }));

    it("clears the journal in the save, and appends only edits of the same base revision", () =>
      withHarness(async ({ repo }) => {
        const edit = { src: "a.ino", pos: 0, del: 0, ins: "x", t: 1 };
        await repo.journal.append(ID, 1, [edit], 10);
        await repo.journal.append(ID, 1, [edit], 11);
        expect(await repo.journal.read(ID)).toEqual({ baseRevision: 1, edits: [edit, edit], writtenAt: 11 });
        await repo.journal.append(ID, 2, [edit], 12);
        expect(await repo.journal.read(ID)).toEqual({ baseRevision: 2, edits: [edit], writtenAt: 12 });
        const v1 = versionOf(1);
        await repo.save(ID, v1, rowOf(v1), null);
        expect(await repo.journal.read(ID)).toBeNull();
      }));

    it("keeps a failed save from touching the journal", () =>
      withHarness(async ({ repo, failNextWrite }) => {
        const edit = { src: "a.ino", pos: 0, del: 0, ins: "x", t: 1 };
        const v1 = versionOf(1);
        await repo.journal.append(ID, 0, [edit], 10);
        failNextWrite(new DOMException("full", "QuotaExceededError"));
        expect(await repo.save(ID, v1, rowOf(v1), null)).toMatchObject({ ok: false, kind: "quota" });
        expect(await repo.journal.read(ID)).not.toBeNull();
      }));

    it("moves a project to the trash and restores it whole", () =>
      withHarness(async ({ repo, raw }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await saveAll(repo, v1, v2);
        await repo.remove(ID, 500);
        expect(await repo.load(ID)).toEqual({ status: "missing" });
        expect(await repo.list()).toEqual([]);
        expect(await raw.keys("projects")).toEqual([]);
        expect(await repo.listTrash()).toEqual([{ id: ID, name: v2.doc.meta.title, deletedAt: 500 }]);

        await repo.restore(ID);
        expect(await repo.listTrash()).toEqual([]);
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: v2 });
        expect(await raw.get("projects", `${ID}~prev`)).toEqual(v1);
        expect(await repo.list()).toEqual([{ id: ID, ...rowOf(v2) }]);
      }));

    it("purges only the trash rows older than the cut-off and counts them", () =>
      withHarness(async ({ repo }) => {
        for (const [id, deletedAt] of [["prj_a", 100], ["prj_b", 200], ["prj_c", 300]] as const) {
          const rec = versionOf(1);
          await repo.save(id, rec, rowOf(rec), null);
          await repo.remove(id, deletedAt);
        }
        expect(await repo.purgeTrash(250)).toBe(2);
        expect((await repo.listTrash()).map((row) => row.id)).toEqual(["prj_c"]);
        expect(await repo.purgeTrash(250)).toBe(0);
      }));

    it("puts, gets and lists revisions in numeric order", () =>
      withHarness(async ({ repo }) => {
        const snap = (n: number) => ({ state: versionOf(n).doc, stateHash: versionOf(n).hash });
        for (const n of [10, 2, 1]) await repo.revisions.put(ID, n, snap(n));
        await repo.revisions.put("prj_other", 5, snap(5));
        expect(await repo.revisions.list(ID)).toEqual([1, 2, 10]);
        expect(await repo.revisions.get(ID, 2)).toEqual(snap(2));
        expect(await repo.revisions.get(ID, 3)).toBeNull();
      }));

    it("numbers backups per project", () =>
      withHarness(async ({ repo }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await repo.backups.put(ID, v1.doc, v1.hash, 10);
        await repo.backups.put(ID, v2.doc, v2.hash, 20);
        await repo.backups.put("prj_other", v1.doc, v1.hash, 30);
        expect(await repo.backups.list(ID)).toEqual([
          { n: 1, at: 10, hash: v1.hash },
          { n: 2, at: 20, hash: v2.hash },
        ]);
      }));

    it("sets the file-copy flag on the index row", () =>
      withHarness(async ({ repo }) => {
        const v1 = versionOf(1);
        await repo.save(ID, v1, rowOf(v1), null);
        await repo.setFileCopy(ID, true);
        expect(await repo.list()).toEqual([{ id: ID, ...rowOf(v1), hasFileCopy: true }]);
      }));

    it("clears only the stores it is told to", () =>
      withHarness(async ({ repo, raw }) => {
        const v1 = versionOf(1);
        await repo.save(ID, v1, rowOf(v1), null);
        await repo.journal.append(ID, 1, [], 1);
        await repo.clearStores(["journal"]);
        expect(await repo.journal.read(ID)).toBeNull();
        expect(await raw.keys("projects")).toEqual([ID]);
      }));

    it("keeps the last good copy when a save runs out of quota", () =>
      withHarness(async ({ repo, failNextWrite }) => {
        const [v1, v2] = [versionOf(1), versionOf(2)];
        await saveAll(repo, v1);
        failNextWrite(new DOMException("full", "QuotaExceededError"));
        expect(await repo.save(ID, v2, rowOf(v2), expectOf(v1))).toMatchObject({ ok: false, kind: "quota" });
        expect(await repo.load(ID)).toEqual({ status: "ok", rec: v1 });
        expect(await repo.list()).toEqual([{ id: ID, ...rowOf(v1) }]);
      }));

    it("keeps exactly two project rows over 500 saves of the same id", () =>
      withHarness(async ({ repo, raw }) => {
        let previous: ProjectRecord | null = null;
        for (let n = 1; n <= 500; n++) {
          const rec = versionOf(n);
          await repo.save(ID, rec, rowOf(rec), previous && expectOf(previous));
          previous = rec;
        }
        expect(await raw.keys("projects")).toEqual([ID, `${ID}~prev`]);
        expect(await repo.load(ID)).toMatchObject({ status: "ok" });
      }), 60_000);
  });
}
