import type { ServerClient } from "./client.ts";
import type { DeviceKeyStore } from "./keys.ts";
import { isLocalHost } from "./probe.ts";
import type { Buddy } from "./types.ts";

export type CachedBuddy = Pick<Buddy, "identityId" | "displayName" | "alias" | "color">;

/** What this browser remembers about its server. Nothing secret: the device key and the session live elsewhere. */
export type ServerProfile = {
  url: string | null;
  identityId: string | null;
  deviceId: string | null;
  displayName: string | null;
  blocked: string[];
  leaving?: { effectiveAt: number };
  buddyCache: { at: number; items: CachedBuddy[] } | null;
};

export interface ProfileStore {
  read(): Promise<ServerProfile>;
  write(p: ServerProfile): Promise<void>;
}

const DB_NAME = "iynk-server";
const IDENTITY_STORE = "identity";
const PROFILE_STORE = "server";
const PROFILE_KEY = "profile";

export function emptyProfile(): ServerProfile {
  return { url: null, identityId: null, deviceId: null, displayName: null, blocked: [], buddyCache: null };
}

/** Opens the small database that holds the device key and the profile. It rejects where IndexedDB is missing. */
export function openServerDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb_unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDENTITY_STORE);
      req.result.createObjectStore(PROFILE_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("indexeddb_blocked"));
  });
}

function run<T>(db: IDBDatabase, mode: IDBTransactionMode, act: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROFILE_STORE, mode);
    const req = act(tx.objectStore(PROFILE_STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error ?? req.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function idbProfileStore(open: () => Promise<IDBDatabase>): ProfileStore {
  let handle: Promise<IDBDatabase> | undefined;
  const db = () =>
    (handle ??= open().catch((e: unknown) => {
      handle = undefined;
      throw e;
    }));
  return {
    async read() {
      const found = await run<Partial<ServerProfile> | undefined>(await db(), "readonly", (s) => s.get(PROFILE_KEY));
      return { ...emptyProfile(), ...found };
    },
    async write(p) {
      await run(await db(), "readwrite", (s) => s.put(p, PROFILE_KEY));
    },
  };
}

export function memoryProfileStore(): ProfileStore {
  let profile = emptyProfile();
  return {
    read: async () => ({ ...profile }),
    write: async (p) => {
      profile = { ...p };
    },
  };
}

export type AddressProblem = "invalid" | "insecure";

/** A server address as the person typed it: an http(s) origin with no path, query or credentials. */
export function parseServerAddress(raw: string): { ok: true; url: string } | { ok: false; problem: AddressProblem } {
  const text = raw.trim();
  if (!URL.canParse(text)) return { ok: false, problem: "invalid" };
  const url = new URL(text);
  const web = url.protocol === "http:" || url.protocol === "https:";
  const bare = (url.pathname === "" || url.pathname === "/") && !url.search && !url.hash && !url.username && !url.password;
  if (!web || !bare) return { ok: false, problem: "invalid" };
  if (url.protocol === "http:" && !isLocalHost(url.hostname)) return { ok: false, problem: "insecure" };
  return { ok: true, url: url.origin };
}

function webOrigin(address: string | null | undefined): string | null {
  if (!address || !URL.canParse(address)) return null;
  const url = new URL(address);
  return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
}

/** The address of the server to use: what the person saved wins over the deployment's /config.json. */
export function resolveServerUrl(configJson: { server?: string | null } | null, profile: ServerProfile): string | null {
  return webOrigin(profile.url ?? configJson?.server);
}

/** Removes a buddy, closes every pairing still open and remembers the id so they cannot be paired again by accident. */
export async function blockBuddy(client: ServerClient, store: ProfileStore, identityId: string): Promise<void> {
  await client.removeBuddy(identityId);
  let cursor: string | undefined;
  do {
    const page = await client.listPairings({ cursor });
    for (const pairing of page.items) {
      if (pairing.status === "open") await client.revokePairing(pairing.id);
    }
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  const profile = await store.read();
  if (!profile.blocked.includes(identityId)) await store.write({ ...profile, blocked: [...profile.blocked, identityId] });
}

/**
 * Asks the server to delete this person after its grace period. The profile is cleared and the session dropped
 * once the server has said yes. The device key stays until the grace has passed so the person can still sign in
 * and cancel; the address is kept for the same reason. Local projects are not touched.
 */
export async function leaveServer(
  client: ServerClient,
  store: ProfileStore,
  keys: DeviceKeyStore,
  now: () => number,
): Promise<void> {
  const profile = await store.read();
  if (!profile.displayName) throw new Error("not_enrolled");
  const status = await client.requestDeletion(`delete ${profile.displayName}`);
  const effectiveAt = Date.parse(status.effectiveAt);
  await client.signOut().catch(() => undefined);
  const origin = webOrigin(profile.url);
  if (effectiveAt <= now()) {
    if (origin) await keys.delete(origin);
    await store.write(emptyProfile());
    return;
  }
  await store.write({ ...emptyProfile(), url: profile.url, leaving: { effectiveAt } });
}

/** Run on load: once a pending leave has passed its date, the device key and the address go too. */
export async function settleLeave(store: ProfileStore, keys: DeviceKeyStore, now: () => number): Promise<ServerProfile> {
  const profile = await store.read();
  if (!profile.leaving || profile.leaving.effectiveAt > now()) return profile;
  const origin = webOrigin(profile.url);
  if (origin) await keys.delete(origin);
  const cleared = emptyProfile();
  await store.write(cleared);
  return cleared;
}
