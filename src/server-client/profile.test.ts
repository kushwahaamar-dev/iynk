import { describe, expect, it, vi } from "vitest";
import type { ServerClient } from "./client";
import { memoryKeyStore, type StoredKey } from "./keys";
import {
  blockBuddy,
  emptyProfile,
  idbProfileStore,
  leaveServer,
  memoryProfileStore,
  parseServerAddress,
  resolveServerUrl,
  settleLeave,
  type ServerProfile,
} from "./profile";
import type { Page, Pairing } from "./types";

const ORIGIN = "https://srv.example";
const KEY = { privateKey: {} as CryptoKey, publicSpki: new Uint8Array([1]), createdAt: 1 } satisfies StoredKey;
const HOUR = 3_600_000;

const profileOf = (patch: Partial<ServerProfile> = {}): ServerProfile => ({
  ...emptyProfile(),
  url: ORIGIN,
  identityId: "id_me",
  deviceId: "dev_1",
  displayName: "Amar",
  ...patch,
});

const pairing = (id: string, status: Pairing["status"]): Pairing => ({
  id,
  from: "id_me",
  status,
  createdAt: "2026-10-28T00:00:00.000Z",
  expiresAt: "2026-10-29T00:00:00.000Z",
});

describe("resolveServerUrl", () => {
  it("reads the address the deployment's config names", () => {
    expect(resolveServerUrl({ server: "https://a.example" }, emptyProfile())).toBe("https://a.example");
  });

  it("gives null for no config, a null server or a non-URL", () => {
    expect(resolveServerUrl(null, emptyProfile())).toBeNull();
    expect(resolveServerUrl({ server: null }, emptyProfile())).toBeNull();
    expect(resolveServerUrl({ server: "not a url" }, emptyProfile())).toBeNull();
    expect(resolveServerUrl({ server: "ftp://a.example" }, emptyProfile())).toBeNull();
  });

  it("lets the saved address win and drops a trailing slash", () => {
    expect(resolveServerUrl({ server: "https://a.example" }, profileOf({ url: "https://b.example/" }))).toBe("https://b.example");
  });
});

describe("parseServerAddress", () => {
  it("accepts an origin, with or without a trailing slash, and an IPv6 literal on http", () => {
    expect(parseServerAddress(" https://srv.example/ ")).toEqual({ ok: true, url: ORIGIN });
    expect(parseServerAddress("http://localhost:8080")).toEqual({ ok: true, url: "http://localhost:8080" });
    expect(parseServerAddress("http://[::1]:8080")).toEqual({ ok: true, url: "http://[::1]:8080" });
  });

  it("refuses paths, queries, credentials, other schemes and text", () => {
    for (const bad of ["https://srv.example/v1", "https://srv.example?x=1", "https://u:p@srv.example", "ftp://srv.example", "srv", ""]) {
      expect(parseServerAddress(bad), bad).toEqual({ ok: false, problem: "invalid" });
    }
  });

  it("refuses http away from localhost", () => {
    expect(parseServerAddress("http://srv.example")).toEqual({ ok: false, problem: "insecure" });
  });
});

describe("blockBuddy", () => {
  it("removes the buddy, revokes every open pairing, then stores the id", async () => {
    const calls: string[] = [];
    const pages: Page<Pairing>[] = [
      { items: [pairing("p1", "open"), pairing("p2", "redeemed")], nextCursor: "c2" },
      { items: [pairing("p3", "open")], nextCursor: null },
    ];
    const client = {
      removeBuddy: vi.fn(async (id: string) => void calls.push(`remove ${id}`)),
      listPairings: vi.fn(async () => pages.shift()!),
      revokePairing: vi.fn(async (id: string) => void calls.push(`revoke ${id}`)),
    } as unknown as ServerClient;
    const store = memoryProfileStore();
    await store.write(profileOf());

    await blockBuddy(client, store, "id_x");

    expect(calls).toEqual(["remove id_x", "revoke p1", "revoke p3"]);
    expect((await store.read()).blocked).toEqual(["id_x"]);
  });

  it("stores nothing when the server refuses", async () => {
    const client = { removeBuddy: vi.fn(async () => Promise.reject(new Error("down"))) } as unknown as ServerClient;
    const store = memoryProfileStore();
    await store.write(profileOf());
    await expect(blockBuddy(client, store, "id_x")).rejects.toThrow("down");
    expect((await store.read()).blocked).toEqual([]);
  });
});

describe("leaveServer", () => {
  const setup = async (effectiveAt: number, fail = false) => {
    const requestDeletion = vi.fn(async () =>
      fail
        ? Promise.reject(new Error("down"))
        : { status: "scheduled" as const, requestedAt: "2026-10-28T00:00:00.000Z", effectiveAt: new Date(effectiveAt).toISOString() },
    );
    const signOut = vi.fn(async () => {});
    const client = { requestDeletion, signOut } as unknown as ServerClient;
    const store = memoryProfileStore();
    await store.write(profileOf({ blocked: ["id_x"] }));
    const keys = memoryKeyStore();
    await keys.put(ORIGIN, KEY);
    return { client, store, keys, requestDeletion, signOut };
  };

  it("sends exactly the confirmation phrase and keeps the key while the grace runs", async () => {
    const now = 1_000_000;
    const { client, store, keys, requestDeletion, signOut } = await setup(now + 24 * HOUR);

    await leaveServer(client, store, keys, () => now);

    expect(requestDeletion).toHaveBeenCalledWith("delete Amar");
    expect(signOut).toHaveBeenCalledOnce();
    expect(await keys.get(ORIGIN)).toEqual(KEY);
    expect(await store.read()).toEqual({ ...emptyProfile(), url: ORIGIN, leaving: { effectiveAt: now + 24 * HOUR } });
  });

  it("deletes the key and the profile at once when the date has already passed", async () => {
    const now = 1_000_000;
    const { client, store, keys } = await setup(now);

    await leaveServer(client, store, keys, () => now);

    expect(await keys.get(ORIGIN)).toBeNull();
    expect(await store.read()).toEqual(emptyProfile());
  });

  it("clears nothing when the request fails", async () => {
    const { client, store, keys, signOut } = await setup(0, true);

    await expect(leaveServer(client, store, keys, () => 0)).rejects.toThrow("down");

    expect(signOut).not.toHaveBeenCalled();
    expect(await keys.get(ORIGIN)).toEqual(KEY);
    expect((await store.read()).displayName).toBe("Amar");
  });
});

describe("settleLeave", () => {
  it("finishes a leave once its date has passed, and not before", async () => {
    const store = memoryProfileStore();
    const keys = memoryKeyStore();
    await keys.put(ORIGIN, KEY);
    await store.write({ ...emptyProfile(), url: ORIGIN, leaving: { effectiveAt: 100 } });

    expect((await settleLeave(store, keys, () => 99)).leaving).toEqual({ effectiveAt: 100 });
    expect(await keys.get(ORIGIN)).toEqual(KEY);

    expect(await settleLeave(store, keys, () => 100)).toEqual(emptyProfile());
    expect(await keys.get(ORIGIN)).toBeNull();
  });
});

describe("idbProfileStore", () => {
  it("reads an empty profile when nothing is stored and round-trips a write", async () => {
    const records = new Map<string, unknown>();
    const store = {
      get: (k: string) => request(records.get(k)),
      put: (v: unknown, k: string) => request(records.set(k, v) && undefined),
    };
    function request<T>(result: T) {
      const req = { result } as IDBRequest<T>;
      queueMicrotask(() => tx.oncomplete?.(new Event("complete")));
      return req;
    }
    const tx = { objectStore: () => store, oncomplete: null as ((e: Event) => void) | null } as unknown as IDBTransaction;
    const db = { transaction: () => tx } as unknown as IDBDatabase;
    const profiles = idbProfileStore(async () => db);

    expect(await profiles.read()).toEqual(emptyProfile());
    await profiles.write(profileOf());
    expect(await profiles.read()).toEqual(profileOf());
  });
});
