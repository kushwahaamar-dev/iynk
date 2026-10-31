// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { utf8Encode } from "@/core/canonical";
import { readIynk, writeIynk } from "@/export/iynk";
import { createInlinePort, WorkerError } from "@/protocol";
import { loadExample } from "@/project/apply/fixtures.testing";
import { stateHash } from "@/project/hash";
import { seededRandom } from "@/project/testing/harness";
import { createLibrary, LibraryError } from "./library";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import { createProjectHandler } from "./project-handler";
import { createProjectHost, type ProjectHostOptions } from "./project-host";
import { createShadow } from "./shadow";
import type { ProgressKv } from "./storage-health";
import { STORE_NAMES } from "./stores";
import { WIPE_PHRASE } from "./wipe";

const NOW = Date.parse("2026-10-28T09:00:00.000Z");
const ACTOR = "usr_owner";

function memoryKv(): ProgressKv & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return { data, get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v) };
}

function fakeStorage(entries: Record<string, string>): Storage {
  const map = new Map(Object.entries(entries));
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  };
}

function rig(browser: Pick<ProjectHostOptions, "local" | "caches" | "sw"> = { local: null, caches: null, sw: null }) {
  const rows = emptyRows();
  const repo = createMemoryRepository({ rows });
  const progress = memoryKv();
  const deps = { repo, shadowFactory: createShadow, clock: () => NOW, rnd: seededRandom(7), actor: ACTOR, progress };
  const host = createProjectHost({ makePort: () => createInlinePort(createProjectHandler(deps)), ...browser });
  const direct = createLibrary({ repo, clock: () => NOW, rnd: seededRandom(7), actor: ACTOR });
  return { rows, repo, progress, host, direct };
}

const failure = async (work: Promise<unknown>) => work.then(() => null, (e: unknown) => e);

afterEach(() => vi.unstubAllGlobals());

describe("library through the host", () => {
  it("gives the same results as the module called directly", async () => {
    const through = rig();
    const direct = rig();
    const ids = {
      host: await through.host.library.create({ board: "uno", title: "Blink" }),
      direct: await direct.direct.create({ board: "uno", title: "Blink" }),
    };
    expect(ids.host).toBe(ids.direct);

    await through.host.library.rename(ids.host, "Renamed");
    await direct.direct.rename(ids.direct, "Renamed");
    const copy = await through.host.library.fork(ids.host, { title: "Second" });
    const copyDirect = await direct.direct.fork(ids.direct, { title: "Second" });
    expect(copy).toBe(copyDirect);
    expect(await through.host.library.list()).toEqual(await direct.direct.list());

    await through.host.library.trash(copy);
    await direct.direct.trash(copyDirect);
    expect(await through.host.library.trashList()).toEqual(await direct.direct.trashList());
    await through.host.library.restore(copy);
    await direct.direct.restore(copyDirect);
    await through.host.library.trash(copy);
    expect(await through.host.library.purgeExpired()).toBe(0);
    expect(await through.host.library.emptyTrash()).toBe(1);
    expect((await through.host.library.list()).map((r) => r.id)).toEqual([ids.host]);
  });

  it("returns library errors as LibraryError", async () => {
    const { host } = rig();
    const error = await failure(host.library.rename("prj_missing", "x"));
    expect(error).toBeInstanceOf(LibraryError);
    expect((error as LibraryError).code).toBe("not_found");
  });
});

describe("files through the host", () => {
  it("imports exported bytes into an empty library with the same hash", async () => {
    const source = rig();
    const id = await source.host.library.create({ board: "uno" });
    const bytes = await source.host.files.exportProject(id, "iynk");
    const exported = readIynk(bytes, () => NOW);
    expect(exported.ok).toBe(true);

    const target = rig();
    const outcome = await target.host.files.importBytes(bytes, "blink.iynk");
    expect(outcome).toMatchObject({ ok: true, id, hashMatches: true, forked: false });
    expect(outcome.ok && outcome.hash).toBe(exported.ok && exported.hash);
    expect((await target.host.library.list()).map((r) => r.id)).toEqual([id]);
  });

  it("imports a .iynkz container", async () => {
    const source = rig();
    const id = await source.host.library.create({ board: "uno" });
    const bytes = await source.host.files.exportProject(id, "iynkz");
    const outcome = await rig().host.files.importBytes(bytes, "blink.iynkz");
    expect(outcome).toMatchObject({ ok: true, id });
  });

  it("stores a second import of the same file under a new id", async () => {
    const { host } = rig();
    const id = await host.library.create({ board: "uno" });
    const bytes = await host.files.exportProject(id, "iynk");
    const again = await host.files.importBytes(bytes, "a.iynk");
    expect(again).toMatchObject({ ok: true, forked: true });
    expect(again.ok && again.id).not.toBe(id);
    expect(await host.library.list()).toHaveLength(2);
  });

  it("names the error for a hostile file and hands the bytes back", async () => {
    const { host } = rig();
    const bytes = utf8Encode('{"format":"iynk.file","format":"again"}');
    const outcome = await host.files.importBytes(bytes, "bad.iynk");
    expect(outcome).toMatchObject({ ok: false, error: { kind: "duplicate-key" } });
    expect(!outcome.ok && outcome.raw).toEqual(bytes);
    expect(await host.library.list()).toEqual([]);
  });

  it("refuses a newer schema and returns the raw bytes", async () => {
    const { host } = rig();
    const envelope = JSON.parse(new TextDecoder().decode(writeIynk(loadExample("uno-blink-d12")))) as {
      project: Record<string, unknown>;
    };
    envelope.project.schemaVersion = "2.0";
    const bytes = utf8Encode(JSON.stringify(envelope));
    const outcome = await host.files.importBytes(bytes, "newer.iynk");
    expect(outcome).toMatchObject({ ok: false, error: { kind: "newer-schema" } });
    expect(!outcome.ok && outcome.raw).toEqual(bytes);
    expect(await host.library.list()).toEqual([]);
  });

  it("marks the file copy and exports the saved record of an open project", async () => {
    const { host, repo } = rig();
    const id = await host.library.create({ board: "uno" });
    await host.files.markFileCopy(id, true);
    expect((await repo.list())[0]?.hasFileCopy).toBe(true);

    const loaded = await host.load(id);
    await host.open(id, loaded.state!, loaded.revision!);
    const bytes = await host.files.exportProject(id, "iynk");
    const read = readIynk(bytes, () => NOW);
    expect(read.ok && read.hash).toBe(stateHash(loaded.state!));
  });
});

describe("data and wipe", () => {
  it("wipes nothing in either thread on a wrong phrase", async () => {
    const local = fakeStorage({ "iynk:v1": "{}" });
    const { host, rows } = rig({ local, caches: null, sw: null });
    await host.library.create({ board: "uno" });

    expect(await failure(host.data.wipe("wipe"))).toMatchObject({ message: "bad_confirmation" });
    expect(local.getItem("iynk:v1")).toBe("{}");
    expect(rows.projects.size).toBe(1);
  });

  it("returns one merged report on the right phrase", async () => {
    const local = fakeStorage({ "iynk:v1": "{}", "other": "keep" });
    const live = new Set(["iynk-shell", "unrelated"]);
    const caches = { keys: async () => [...live], delete: async (n: string) => live.delete(n) } as unknown as CacheStorage;
    const sw = { getRegistrations: async () => [{ unregister: async () => true }] } as unknown as ServiceWorkerContainer;
    const { host, rows } = rig({ local, caches, sw });
    await host.library.create({ board: "uno" });

    const report = await host.data.wipe(WIPE_PHRASE);
    expect(report.stores).toEqual(STORE_NAMES);
    expect(report).toMatchObject({ localStorageKeys: ["iynk:v1"], caches: ["iynk-shell"], serviceWorkers: 1, errors: [] });
    expect(local.getItem("other")).toBe("keep");
    expect([...live]).toEqual(["unrelated"]);
    expect(rows.projects.size).toBe(0);
  });

  it("exportAll carries the settings text from the page's storage", async () => {
    const settings = { theme: "dark" };
    const local = fakeStorage({ "iynk:v1": JSON.stringify({ done: {}, settings }) });
    const { host } = rig({ local, caches: null, sw: null });
    await host.library.create({ board: "uno" });

    const bytes = await host.data.exportAll();
    const text = new TextDecoder("latin1").decode(bytes);
    expect(text).toContain("settings.json");
    expect(text).toContain(JSON.stringify(settings));
  });

  it("deleteAiData clears the AI stores and keeps projects", async () => {
    const { host, rows } = rig();
    await host.library.create({ board: "uno" });
    rows.ai_log.set("a", 1);
    await host.data.deleteAiData();
    expect(rows.ai_log.size).toBe(0);
    expect(rows.projects.size).toBe(1);
  });
});

describe("legacy progress", () => {
  it("is copied once", async () => {
    const saved = { done: { a: true }, quiz: { q: { score: 1, total: 2 } }, best: { b: 3 }, settings: {} };
    const local = fakeStorage({ "iynk:v1": JSON.stringify(saved) });
    const { host, progress } = rig({ local, caches: null, sw: null });
    const id = await host.library.create({ board: "uno" });
    const loaded = await host.load(id);

    await host.open(id, loaded.state!, loaded.revision!);
    expect(progress.data.get("done")).toEqual(saved.done);
    expect(progress.data.get("quiz")).toEqual(saved.quiz);
    expect(progress.data.get("best")).toEqual(saved.best);
    expect(progress.data.has("migrated:iynk-v1")).toBe(true);

    progress.data.set("done", { changed: true });
    await host.open(id, loaded.state!, loaded.revision!);
    expect(progress.data.get("done")).toEqual({ changed: true });
  });
});

describe("worker without page storage", () => {
  it("serves library, file, data and storage calls with no localStorage, caches or serviceWorker", async () => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("navigator", undefined);
    const read = vi.fn();
    const trap = new Proxy({}, { get: read }) as Storage;
    vi.stubGlobal("sessionStorage", trap);

    const { host } = rig();
    const id = await host.library.create({ board: "uno" });
    await host.library.rename(id, "Plain");
    const bytes = await host.files.exportProject(id, "iynk");
    expect(await host.files.importBytes(bytes, "p.iynk")).toMatchObject({ ok: true, forked: true });
    await host.files.markFileCopy(id, true);
    expect((await host.data.exportAll()).length).toBeGreaterThan(0);
    await host.data.deleteAiData();
    expect(await host.health.estimate()).toBeNull();
    expect(await host.health.persist()).toBe(false);
    await host.data.wipe(WIPE_PHRASE);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers an unknown request with bad_message", async () => {
    const handler = createProjectHandler({ repo: createMemoryRepository(), shadowFactory: createShadow, clock: () => NOW });
    const err = await failure(Promise.resolve(handler({ t: "nope" } as never, () => undefined)));
    expect(err).toBeInstanceOf(WorkerError);
    expect(err).toMatchObject({ kind: "bad_message" });
  });
});
