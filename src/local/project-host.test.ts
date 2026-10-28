// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createInlinePort } from "@/protocol";
import type { Project } from "@/project/generated/types";
import { stateHash } from "@/project/hash";
import { generateSession } from "@/project/testing/generators";
import { createProjectHandler } from "./project-handler";
import { createProjectHost } from "./project-host";
import type { ProjectEv } from "./project-protocol";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import type { IndexRow, ProjectRecord } from "./repository";
import { createShadow } from "./shadow";

function rig(options: { degraded?: boolean } = {}) {
  const rows = emptyRows();
  const repo = createMemoryRepository({ rows });
  const host = createProjectHost({
    makePort: () =>
      createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => 5_000, ...options })),
  });
  const events: ProjectEv[] = [];
  host.onEvent((ev) => events.push(ev));
  const of = <T extends ProjectEv["t"]>(t: T) => events.filter((ev): ev is Extract<ProjectEv, { t: T }> => ev.t === t);
  return { rows, repo, host, events, of };
}

function mainThread(seed: number, steps = 30) {
  const { start, live } = generateSession(seed, steps);
  return { start, live, envelopes: live.state.history.ops, hash: () => stateHash(live.state) };
}

function recordOf(doc: Project, title: string): { rec: ProjectRecord; row: IndexRow } {
  const next = { ...doc, meta: { ...doc.meta, title } };
  const hash = stateHash(next);
  return {
    rec: { doc: next, hash, writtenAt: 1 },
    row: { name: title, updatedAt: next.meta.updatedAt, hash, board: "uno", size: 1, hasFileCopy: false, archived: false },
  };
}

describe("project host", () => {
  it("opens, commits and saves the main thread's document", async () => {
    const { host, repo, of } = rig();
    const { start, live, envelopes, hash } = mainThread(1);

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision, live.revision, envelopes);
    await host.save("manual");

    expect(of("saved")).toEqual([{ t: "saved", revision: live.revision, hash: hash(), writtenAt: 5_000 }]);
    const stored = await repo.load(start.id);
    expect(stored).toMatchObject({ status: "ok", rec: { hash: hash() } });
    expect(stored.status === "ok" && stored.rec.doc.revision).toBe(live.revision);
    expect((await repo.list())[0]).toMatchObject({ id: start.id, name: live.state.meta.title });
  });

  it("writes once for two saves with nothing committed between them", async () => {
    const { host, repo, of } = rig();
    const { start, live, envelopes } = mainThread(2);
    const write = vi.spyOn(repo, "save");

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision, live.revision, envelopes);
    await host.save("debounce");
    await host.save("maxwait");

    expect(write).toHaveBeenCalledTimes(1);
    expect(of("saved")).toHaveLength(2);
    expect(of("saved")[1]).toEqual(of("saved")[0]);
  });

  it("restarts a killed worker from the main thread's snapshot (FA-07, project half)", async () => {
    const { host, repo, of } = rig();
    const { start, live, envelopes, hash } = mainThread(3);
    const mid = Math.floor(envelopes.length / 2);

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision, envelopes[mid - 1]!.seq, envelopes.slice(0, mid));
    await host.kill();
    expect(host.state).toBe("dead");

    await host.commit(envelopes[mid - 1]!.seq, live.revision, envelopes.slice(mid));
    await host.save("manual");

    expect(of("worker_restarted")).toHaveLength(1);
    expect(host.state).toBe("ready");
    expect(of("saved")[0]!.hash).toBe(hash());
    expect(await repo.load(start.id)).toMatchObject({ status: "ok", rec: { hash: hash() } });
  });

  it("answers hash_mismatch to a stale commit and recovers on the next open", async () => {
    const { host, of } = rig();
    const { start, live, envelopes, hash } = mainThread(4);

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision + 5, live.revision, envelopes);
    expect(of("hash_mismatch")).toHaveLength(1);
    await host.save("manual");
    expect(of("save_failed")).toMatchObject([{ kind: "unavailable" }]);

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision, live.revision, envelopes);
    await host.save("manual");
    expect(of("saved")[0]!.hash).toBe(hash());
  });

  it("answers hash_mismatch to a commit before any open", async () => {
    const { host, of } = rig();
    const { start, live, envelopes } = mainThread(5);

    await host.commit(start.revision, live.revision, envelopes);

    expect(of("hash_mismatch")).toEqual([{ t: "hash_mismatch", revision: start.revision, workerHash: "" }]);
  });

  it("reports a conflict when another writer saved first, and keeps the main thread's document", async () => {
    const { host, repo, of } = rig();
    const { start, live, envelopes, hash } = mainThread(6);
    const half = Math.floor(envelopes.length / 2);

    await host.open(start.id, start, start.revision);
    await host.commit(start.revision, envelopes[half - 1]!.seq, envelopes.slice(0, half));
    await host.save("manual");
    const other = recordOf(start, "From another tab");
    await repo.save(start.id, other.rec, other.row, { revision: envelopes[half - 1]!.seq, hash: of("saved")[0]!.hash });

    await host.commit(envelopes[half - 1]!.seq, live.revision, envelopes.slice(half));
    await host.save("manual");

    expect(of("save_failed")).toMatchObject([{ kind: "conflict" }]);
    expect(hash()).toBe(stateHash(live.state));
    expect(await repo.load(start.id)).toMatchObject({ status: "ok", rec: { hash: other.rec.hash } });
  });

  it("refuses an invalid document on open and writes nothing", async () => {
    const { host, repo, of } = rig();
    const { start } = mainThread(7, 5);

    await host.open(start.id, { ...start, format: "nope" } as unknown as Project, start.revision);
    await host.save("manual");

    expect(of("save_failed")[0]).toMatchObject({ kind: "validation" });
    expect(await repo.list()).toEqual([]);
  });

  it("opens the previous version when the current slot is damaged", async () => {
    const { host, repo, rows, of } = rig();
    const { start } = mainThread(8, 5);
    const first = recordOf(start, "First");
    const second = recordOf({ ...start, revision: 1 }, "Second");
    await repo.save(start.id, first.rec, first.row, null);
    await repo.save(start.id, second.rec, second.row, { revision: first.rec.doc.revision, hash: first.rec.hash });
    rows.projects.set(start.id, { doc: second.rec.doc, hash: "0".repeat(64), writtenAt: 1 });

    const loaded = await host.load(start.id);

    expect(loaded).toMatchObject({ status: "recovered", hash: first.rec.hash, revision: first.rec.doc.revision });
    expect(loaded.state?.meta.title).toBe("First");
    expect(of("recovered_from_previous")).toEqual([{ t: "recovered_from_previous", projectId: start.id, revision: 0 }]);

    await host.open(start.id, loaded.state!, loaded.revision!);
    expect(of("recovered_from_previous")).toHaveLength(1);
  });

  it("reports a lost record when both slots fail their hash check", async () => {
    const { host, repo, rows, of } = rig();
    const { start } = mainThread(9, 5);
    const first = recordOf(start, "First");
    const second = recordOf({ ...start, revision: 1 }, "Second");
    await repo.save(start.id, first.rec, first.row, null);
    await repo.save(start.id, second.rec, second.row, { revision: 0, hash: first.rec.hash });
    rows.projects.set(start.id, { ...second.rec, hash: "0".repeat(64) });
    rows.projects.set(`${start.id}~prev`, { ...first.rec, hash: "1".repeat(64) });

    const loaded = await host.load(start.id);

    expect(loaded).toEqual({ status: "lost" });
    expect(of("record_lost")).toEqual([{ t: "record_lost", projectId: start.id }]);
    expect(rows.projects.size).toBe(2);
  });

  it("returns missing for an unknown id", async () => {
    const { host } = rig();
    expect(await host.load("prj_unknown")).toEqual({ status: "missing" });
  });

  it("keeps the compaction snapshot in the revisions store", async () => {
    const { host, repo } = rig();
    const { start, live } = mainThread(10, 10);

    await host.open(start.id, start, start.revision);
    host.keepRevision({ revision: live.revision, state: live.state, stateHash: stateHash(live.state) });
    await host.save("manual");

    expect(await repo.revisions.list(start.id)).toEqual([live.revision]);
  });

  it("reports degraded once when the worker runs on the memory repository", async () => {
    const { host, of } = rig({ degraded: true });
    await host.load("prj_unknown");
    await host.load("prj_unknown");
    expect(of("degraded")).toEqual([{ t: "degraded", reason: "indexeddb-unavailable" }]);
  });

  it("stops forwarding events after unsubscribe", async () => {
    const { host } = rig();
    const seen: ProjectEv[] = [];
    const off = host.onEvent((ev) => seen.push(ev));
    off();
    await host.commit(0, 1, []);
    expect(seen).toEqual([]);
  });
});
