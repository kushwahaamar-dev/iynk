import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/progress";
import type { KeyKind, KeyRow, KeysBackend } from "./store";

const KEY = "iynk-canary-KEY-0001-do-not-use";
const SEARCH = "iynk-canary-SEARCH-0001";
const TOKEN = "iynk-canary-TOKEN-0001";

type Store = typeof import("./store");
type Rows = Record<KeyKind, KeyRow | null>;

function memoryBackend(initial?: Partial<Rows>) {
  const rows: Rows = { search: null, ...initial };
  const backend: KeysBackend = {
    load: vi.fn(async () => ({ ...rows })),
    save: vi.fn(async (slot: KeyKind, row: KeyRow | null) => {
      rows[slot] = row;
    }),
  };
  return { rows, backend };
}

function stored(): Record<string, unknown> | null {
  const raw = localStorage.getItem("iynk:keys:v1");
  return raw ? JSON.parse(raw) : null;
}

let store: Store;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  store = await import("./store");
  localStorage.setItem("iynk:keys:v1", JSON.stringify({ v: 1, ai: { key: KEY, label: "mine" }, search: { key: SEARCH }, server: { token: TOKEN } }));
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

test("moves the search key into the backend and drops old fields", async () => {
  const { rows, backend } = memoryBackend();
  expect(await store.hydrateKeys(backend)).toEqual({ moved: ["search"], degraded: false });

  expect(stored()).toBeNull();
  expect(rows.search).toMatchObject({ providerProfile: null, key: SEARCH, lastUsedAt: null });
  expect(store.readSecret("search")).toBe(SEARCH);
  expect(store.getMasked("search")).toMatchObject({ set: true, persisted: true });
});

test("keeps the secrets out of the progress document and the masked view", async () => {
  await store.hydrateKeys(memoryBackend().backend);
  expect(localStorage.getItem(STORAGE_KEY) ?? "").not.toContain(KEY);
  expect(JSON.stringify(store.getMasked("search"))).not.toContain(SEARCH);
  expect(JSON.stringify(localStorage.getItem("iynk:keys:v1"))).not.toContain(KEY);
});

test("a second call is a no-op", async () => {
  const { backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: false });
  expect(backend.save).toHaveBeenCalledTimes(1);
});

test("an interrupted move leaves both copies, and the next start finishes it", async () => {
  const { rows, backend } = memoryBackend();
  vi.mocked(backend.save).mockImplementationOnce(async (slot, row) => {
    rows[slot] = row;
    throw new Error("tab closed");
  });
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: true });
  expect(stored()).toMatchObject({ search: { key: SEARCH } });
  expect(rows.search?.key).toBe(SEARCH);
  expect(store.readSecret("search")).toBe(SEARCH);

  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: false });
  expect(stored()).toBeNull();
  expect(store.readSecret("search")).toBe(SEARCH);
});

test("degraded mode keeps localStorage and B1 behaviour", async () => {
  const backend = { load: vi.fn().mockRejectedValue(new Error("blocked")), save: vi.fn() };
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: true });
  expect(stored()).toMatchObject({ search: { key: SEARCH } });
  expect(store.readSecret("search")).toBe(SEARCH);
  expect(store.setKey("search", "another-key-0000001")).toEqual({ ok: true });
  expect(backend.save).not.toHaveBeenCalled();
});

test("a row without a usable key is ignored", async () => {
  const { backend } = memoryBackend({ search: { providerProfile: null, key: "", addedAt: 1, lastUsedAt: null } });
  await store.hydrateKeys(backend);
  expect(store.readSecret("search")).toBe(SEARCH);
});

test("writes after hydration go to the backend and not to localStorage", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(store.setKey("search", "second-key-00000001")).toEqual({ ok: true });
  await vi.waitFor(() => expect(rows.search?.key).toBe("second-key-00000001"));
  expect(stored()).toBeNull();
  expect(store.readSecret("search")).toBe("second-key-00000001");

  store.removeKey("search");
  await vi.waitFor(() => expect(rows.search).toBeNull());
  expect(store.readSecret("search")).toBeNull();
});

test("removeAllKeys empties the backend", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  store.removeAllKeys();
  await vi.waitFor(() => expect(rows).toEqual({ search: null }));
  expect(localStorage.getItem("iynk:keys:v1")).toBeNull();
});

test("a failed backend write is reported as not persisted", async () => {
  const { backend } = memoryBackend();
  await store.hydrateKeys(backend);
  vi.mocked(backend.save).mockRejectedValueOnce(new Error("quota"));
  store.setKey("search", "second-key-00000001");
  await vi.waitFor(() => expect(store.getMasked("search").persisted).toBe(false));
  expect(store.readSecret("search")).toBe("second-key-00000001");
});

test("restore puts the secret back and empties the row", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(await store.restoreKeysToLocalStorage(backend)).toEqual({ restored: ["search"] });
  expect(stored()).toEqual({ v: 1, search: { key: SEARCH } });
  expect(rows).toEqual({ search: null });
  expect(store.readSecret("search")).toBe(SEARCH);
  expect(await store.restoreKeysToLocalStorage(backend)).toEqual({ restored: [] });
});

test("an interrupted restore leaves both copies", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  vi.mocked(backend.save).mockRejectedValueOnce(new Error("tab closed"));
  await expect(store.restoreKeysToLocalStorage(backend)).rejects.toThrow("tab closed");
  expect(stored()).toMatchObject({ search: { key: SEARCH } });
  expect(rows.search?.key).toBe(SEARCH);
});
