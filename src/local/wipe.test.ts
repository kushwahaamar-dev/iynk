import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRepository, emptyRows } from "./memory-repository";
import { AI_STORES, STORE_NAMES } from "./stores";
import { WIPE_PHRASE, deleteAiData, mergeWipeReports, wipeBrowser, wipeStores } from "./wipe";

function fillAll() {
  const rows = emptyRows();
  for (const name of STORE_NAMES) rows[name].set("k", { name });
  return { rows, repo: createMemoryRepository({ rows }) };
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

function fakeCaches(names: string[]) {
  const live = new Set(names);
  return {
    live,
    caches: {
      keys: async () => [...live],
      delete: async (name: string) => live.delete(name),
    } as unknown as CacheStorage,
  };
}

function fakeWorker(count: number) {
  const unregister = vi.fn(async () => true);
  const sw = { getRegistrations: async () => Array.from({ length: count }, () => ({ unregister })) } as unknown as ServiceWorkerContainer;
  return { sw, unregister };
}

afterEach(() => vi.unstubAllGlobals());

describe("wipeStores", () => {
  it("removes nothing on a wrong phrase", async () => {
    const { rows, repo } = fillAll();
    await expect(wipeStores(repo, "wipe")).rejects.toThrow("bad_confirmation");
    expect(STORE_NAMES.every((name) => rows[name].size === 1)).toBe(true);
  });

  it("empties every store in a worker-like context", async () => {
    vi.stubGlobal("localStorage", undefined);
    vi.stubGlobal("caches", undefined);
    vi.stubGlobal("navigator", {});
    const { rows, repo } = fillAll();
    const report = await wipeStores(repo, WIPE_PHRASE);
    expect(report).toEqual({ stores: STORE_NAMES, errors: [] });
    expect(STORE_NAMES.every((name) => rows[name].size === 0)).toBe(true);
    expect(rows.parts.size).toBe(0);
  });

  it("goes on after a store fails and lists it", async () => {
    const calls: string[] = [];
    const repo = {
      clearStores: async (names: readonly string[]) => {
        calls.push(names[0]);
        if (names[0] === "assets") throw new Error("blocked");
      },
    };
    const report = await wipeStores(repo, WIPE_PHRASE);
    expect(calls).toEqual(STORE_NAMES);
    expect(report.stores).toEqual(STORE_NAMES.filter((n) => n !== "assets"));
    expect(report.errors).toEqual(["store assets: blocked"]);
  });
});

describe("deleteAiData", () => {
  it("clears exactly the six AI stores", async () => {
    const { rows, repo } = fillAll();
    await deleteAiData(repo);
    expect(AI_STORES).toHaveLength(6);
    for (const name of STORE_NAMES) expect(rows[name].size).toBe((AI_STORES as readonly string[]).includes(name) ? 0 : 1);
    for (const kept of ["keys", "server", "identity", "journal"] as const) expect(rows[kept].size).toBe(1);
  });
});

describe("wipeBrowser", () => {
  it("removes nothing on a wrong phrase", async () => {
    const local = fakeStorage({ "iynk:v1": "{}" });
    const { caches, live } = fakeCaches(["iynk-shell"]);
    const { sw, unregister } = fakeWorker(1);
    await expect(wipeBrowser({ local, caches, sw }, "yes")).rejects.toThrow("bad_confirmation");
    expect(local.getItem("iynk:v1")).toBe("{}");
    expect(live.has("iynk-shell")).toBe(true);
    expect(unregister).not.toHaveBeenCalled();
  });

  it("removes iynk keys and caches, keeps others, and unregisters every worker", async () => {
    const local = fakeStorage({ "iynk:v1": "{}", "iynk:keys:v1": "{}", "iynk:log:v1": "[]", other: "x" });
    const { caches, live } = fakeCaches(["iynk-shell-1", "iynk-assets", "other"]);
    const { sw, unregister } = fakeWorker(2);
    const report = await wipeBrowser({ local, caches, sw }, WIPE_PHRASE);
    expect(report).toEqual({
      localStorageKeys: ["iynk:v1", "iynk:keys:v1", "iynk:log:v1"],
      caches: ["iynk-shell-1", "iynk-assets"],
      serviceWorkers: 2,
      errors: [],
    });
    expect(local.getItem("other")).toBe("x");
    expect(local.length).toBe(1);
    expect([...live]).toEqual(["other"]);
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it("skips what the browser does not offer", async () => {
    expect(await wipeBrowser({ local: null, caches: null, sw: null }, WIPE_PHRASE)).toEqual({
      localStorageKeys: [],
      caches: [],
      serviceWorkers: 0,
      errors: [],
    });
  });

  it("lists a failure and still does the rest", async () => {
    const local = fakeStorage({ "iynk:v1": "{}" });
    const caches = {
      keys: async () => {
        throw new Error("denied");
      },
    } as unknown as CacheStorage;
    const { sw } = fakeWorker(1);
    const report = await wipeBrowser({ local, caches, sw }, WIPE_PHRASE);
    expect(report.errors).toEqual(["caches: denied"]);
    expect(report.localStorageKeys).toEqual(["iynk:v1"]);
    expect(report.serviceWorkers).toBe(1);
  });
});

describe("mergeWipeReports", () => {
  it("joins the two halves", () => {
    expect(
      mergeWipeReports(
        { stores: ["projects"], errors: ["store a: x"] },
        { localStorageKeys: ["iynk:v1"], caches: ["iynk-c"], serviceWorkers: 1, errors: ["caches: y"] },
      ),
    ).toEqual({ stores: ["projects"], localStorageKeys: ["iynk:v1"], caches: ["iynk-c"], serviceWorkers: 1, errors: ["store a: x", "caches: y"] });
  });
});
