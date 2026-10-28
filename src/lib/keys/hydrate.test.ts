import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { STORAGE_KEY } from "@/lib/progress";
import type { KeyRow, KeySlot, KeysBackend } from "./store";

const KEY = "iynk-canary-KEY-0001-do-not-use";
const SEARCH = "iynk-canary-SEARCH-0001";
const TOKEN = "iynk-canary-TOKEN-0001";

type Store = typeof import("./store");
type Rows = Record<KeySlot, KeyRow | null>;

function memoryBackend(initial?: Partial<Rows>) {
  const rows: Rows = { ai: null, search: null, ...initial };
  const backend: KeysBackend = {
    load: vi.fn(async () => ({ ...rows })),
    save: vi.fn(async (slot: KeySlot, row: KeyRow | null) => {
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

test("moves ai and search into the backend and leaves server", async () => {
  const { rows, backend } = memoryBackend();
  expect(await store.hydrateKeys(backend)).toEqual({ moved: ["ai", "search"], degraded: false });

  expect(stored()).toEqual({ v: 1, ai: null, search: null, server: { token: TOKEN } });
  expect(rows.ai).toMatchObject({ providerProfile: null, key: KEY, label: "mine", lastUsedAt: null });
  expect(rows.search).toMatchObject({ key: SEARCH });
  expect(store.readSecret("ai")).toBe(KEY);
  expect(store.readSecret("search")).toBe(SEARCH);
  expect(store.readSecret("server")).toBe(TOKEN);
  expect(store.getMasked("ai")).toMatchObject({ set: true, label: "mine", persisted: true });
});

test("keeps the secrets out of the progress document and the masked view", async () => {
  await store.hydrateKeys(memoryBackend().backend);
  expect(localStorage.getItem(STORAGE_KEY) ?? "").not.toContain(KEY);
  expect(JSON.stringify(store.getMasked("ai"))).not.toContain(KEY);
  expect(JSON.stringify(localStorage.getItem("iynk:keys:v1"))).not.toContain(KEY);
});

test("a second call is a no-op", async () => {
  const { backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: false });
  expect(backend.save).toHaveBeenCalledTimes(2);
});

test("an interrupted move leaves both copies, and the next start finishes it", async () => {
  const { rows, backend } = memoryBackend();
  vi.mocked(backend.save).mockImplementationOnce(async (slot, row) => {
    rows[slot] = row;
    throw new Error("tab closed");
  });
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: true });
  expect(stored()).toMatchObject({ ai: { key: KEY }, search: { key: SEARCH } });
  expect(rows.ai?.key).toBe(KEY);
  expect(store.readSecret("ai")).toBe(KEY);

  expect(await store.hydrateKeys(backend)).toEqual({ moved: ["search"], degraded: false });
  expect(stored()).toEqual({ v: 1, ai: null, search: null, server: { token: TOKEN } });
  expect(store.readSecret("ai")).toBe(KEY);
});

test("degraded mode keeps localStorage and B1 behaviour", async () => {
  const backend = { load: vi.fn().mockRejectedValue(new Error("blocked")), save: vi.fn() };
  expect(await store.hydrateKeys(backend)).toEqual({ moved: [], degraded: true });
  expect(stored()).toMatchObject({ ai: { key: KEY }, search: { key: SEARCH } });
  expect(store.readSecret("ai")).toBe(KEY);
  expect(store.setKey("ai", "another-key-0000001")).toEqual({ ok: true });
  expect(backend.save).not.toHaveBeenCalled();
});

test("a row without a usable key is ignored", async () => {
  const { backend } = memoryBackend({ ai: { providerProfile: null, key: "", addedAt: 1, lastUsedAt: null } });
  await store.hydrateKeys(backend);
  expect(store.readSecret("ai")).toBe(KEY);
});

test("writes after hydration go to the backend and not to localStorage", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(store.setKey("ai", "second-key-00000001", "work")).toEqual({ ok: true });
  await vi.waitFor(() => expect(rows.ai?.key).toBe("second-key-00000001"));
  expect(rows.ai?.label).toBe("work");
  expect(stored()).toEqual({ v: 1, ai: null, search: null, server: { token: TOKEN } });
  expect(store.readSecret("ai")).toBe("second-key-00000001");

  store.removeKey("search");
  await vi.waitFor(() => expect(rows.search).toBeNull());
  expect(store.readSecret("search")).toBeNull();
});

test("removeAllKeys empties the backend and the server slot", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  store.removeAllKeys();
  await vi.waitFor(() => expect(rows).toEqual({ ai: null, search: null }));
  expect(localStorage.getItem("iynk:keys:v1")).toBeNull();
});

test("a failed backend write is reported as not persisted", async () => {
  const { backend } = memoryBackend();
  await store.hydrateKeys(backend);
  vi.mocked(backend.save).mockRejectedValueOnce(new Error("quota"));
  store.setKey("ai", "second-key-00000001");
  await vi.waitFor(() => expect(store.getMasked("ai").persisted).toBe(false));
  expect(store.readSecret("ai")).toBe("second-key-00000001");
});

test("restore puts both secrets back, empties the rows and keeps server", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  expect(await store.restoreKeysToLocalStorage(backend)).toEqual({ restored: ["ai", "search"] });
  expect(stored()).toEqual({ v: 1, ai: { key: KEY, label: "mine" }, search: { key: SEARCH }, server: { token: TOKEN } });
  expect(rows).toEqual({ ai: null, search: null });
  expect(store.readSecret("ai")).toBe(KEY);
  expect(await store.restoreKeysToLocalStorage(backend)).toEqual({ restored: [] });
});

test("an interrupted restore leaves both copies", async () => {
  const { rows, backend } = memoryBackend();
  await store.hydrateKeys(backend);
  vi.mocked(backend.save).mockRejectedValueOnce(new Error("tab closed"));
  await expect(store.restoreKeysToLocalStorage(backend)).rejects.toThrow("tab closed");
  expect(stored()).toMatchObject({ ai: { key: KEY }, search: { key: SEARCH } });
  expect(rows.ai?.key).toBe(KEY);
});
