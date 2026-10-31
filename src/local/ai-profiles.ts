import { validProviderKey } from "../protocol/ai-relay";
import { validateProfile, type ProviderProfile } from "../ai/profiles";
import { toDbError } from "./db";
import type { KeysBackend } from "./keys-backend";

export interface ProfileStore {
  /** False when profiles live in this tab's memory only, for instance in a private window. */
  readonly persisted: boolean;
  list(): Promise<ProviderProfile[]>;
  get(id: string): Promise<ProviderProfile | null>;
  /** `secret` undefined keeps the stored secret, null removes it, a string replaces it. */
  put(p: ProviderProfile, secret?: string | null): Promise<void>;
  remove(id: string): Promise<void>;
  hasSecret(id: string): Promise<boolean>;
  subscribe(fn: () => void): () => void;
  maskedTail(id: string): Promise<string>;
}

const CHANNEL_NAME = "iynk:ai-profiles";
const PROFILE_PREFIX = "ai-profile:";
const SECRET_PREFIX = "ai-secret:";
const ID_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";
const MIN_MASKABLE_LENGTH = 12;
const TAIL_LENGTH = 4;

const profileRow = (id: string) => `${PROFILE_PREFIX}${id}`;
const secretRow = (keyId: string) => `${SECRET_PREFIX}${keyId}`;

export function newKeyId(random: () => number): string {
  let id = "key_";
  for (let i = 0; i < 10; i++) id += ID_ALPHABET[Math.min(31, Math.floor(random() * 32))];
  return id;
}

function tailOf(secret: string | null): string {
  return secret !== null && secret.length >= MIN_MASKABLE_LENGTH ? secret.slice(-TAIL_LENGTH) : "";
}

function checkSecret(p: ProviderProfile, secret: string | null | undefined): void {
  if (typeof secret !== "string") return;
  if (p.keyId === null) throw new Error("A profile without a key id cannot hold a secret.");
  if (!validProviderKey(secret)) throw new Error("The key must be 8 to 512 visible characters.");
}

function validRow(raw: unknown): ProviderProfile | null {
  if (typeof raw !== "string") return null;
  try {
    const checked = validateProfile(JSON.parse(raw));
    return checked.ok ? checked.value : null;
  } catch {
    return null;
  }
}

function sorted(profiles: ProviderProfile[]): ProviderProfile[] {
  return profiles.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

function notifier() {
  const listeners = new Set<() => void>();
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL_NAME);
  const fire = () => listeners.forEach((fn) => fn());
  if (channel) channel.onmessage = fire;
  return {
    changed() {
      fire();
      channel?.postMessage("changed");
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

function finished<T>(tx: IDBTransaction, read: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(read());
    tx.onerror = () => reject(toDbError(tx.error));
    tx.onabort = () => reject(toDbError(tx.error ?? new DOMException("transaction aborted", "AbortError")));
  });
}

function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return run();
  } catch (cause) {
    return Promise.reject(toDbError(cause));
  }
}

function readRow(db: Pick<IDBDatabase, "transaction">, key: string): Promise<unknown> {
  return guarded(() => {
    const tx = db.transaction("keys", "readonly");
    const request = tx.objectStore("keys").get(key);
    return finished(tx, () => request.result as unknown);
  });
}

/** Only `custody.ts` calls this. No index re-exports it. */
export async function readSecret(db: Pick<IDBDatabase, "transaction">, keyId: string): Promise<string | null> {
  const value = await readRow(db, secretRow(keyId));
  return typeof value === "string" ? value : null;
}

export function idbProfileStore(db: Pick<IDBDatabase, "transaction">): ProfileStore {
  const { changed, subscribe } = notifier();

  async function get(id: string): Promise<ProviderProfile | null> {
    const profile = validRow(await readRow(db, profileRow(id)));
    return profile?.id === id ? profile : null;
  }

  async function secretOf(id: string): Promise<string | null> {
    const profile = await get(id);
    return profile?.keyId ? readSecret(db, profile.keyId) : null;
  }

  return {
    persisted: true,
    get,
    subscribe,

    list() {
      return guarded(() => {
        const tx = db.transaction("keys", "readonly");
        const store = tx.objectStore("keys");
        const range = IDBKeyRange.bound(PROFILE_PREFIX, `${PROFILE_PREFIX}￿`);
        const keys = store.getAllKeys(range);
        const values = store.getAll(range);
        return finished(tx, () => {
          const profiles: ProviderProfile[] = [];
          values.result.forEach((raw, i) => {
            const profile = validRow(raw);
            if (profile && profileRow(profile.id) === keys.result[i]) profiles.push(profile);
          });
          return sorted(profiles);
        });
      });
    },

    async put(p, secret) {
      checkSecret(p, secret);
      const previous = await get(p.id);
      await guarded(() => {
        const tx = db.transaction("keys", "readwrite");
        const store = tx.objectStore("keys");
        store.put(JSON.stringify(p), profileRow(p.id));
        if (typeof secret === "string" && p.keyId) store.put(secret, secretRow(p.keyId));
        if (secret === null && p.keyId) store.delete(secretRow(p.keyId));
        if (previous?.keyId && previous.keyId !== p.keyId) store.delete(secretRow(previous.keyId));
        return finished(tx, () => undefined);
      });
      changed();
    },

    async remove(id) {
      const profile = await get(id);
      await guarded(() => {
        const tx = db.transaction("keys", "readwrite");
        const store = tx.objectStore("keys");
        store.delete(profileRow(id));
        if (profile?.keyId) store.delete(secretRow(profile.keyId));
        return finished(tx, () => undefined);
      });
      changed();
    },

    async hasSecret(id) {
      return (await secretOf(id)) !== null;
    },

    async maskedTail(id) {
      return tailOf(await secretOf(id));
    },
  };
}

export function memoryProfileStore(): ProfileStore {
  const profiles = new Map<string, ProviderProfile>();
  const secrets = new Map<string, string>();
  const { changed, subscribe } = notifier();

  const secretOf = (id: string) => {
    const keyId = profiles.get(id)?.keyId;
    return keyId ? (secrets.get(keyId) ?? null) : null;
  };

  return {
    persisted: false,
    subscribe,

    async list() {
      return sorted([...profiles.values()].map((p) => structuredClone(p)));
    },
    async get(id) {
      const profile = profiles.get(id);
      return profile ? structuredClone(profile) : null;
    },
    async put(p, secret) {
      checkSecret(p, secret);
      const previous = profiles.get(p.id);
      profiles.set(p.id, structuredClone(p));
      if (typeof secret === "string" && p.keyId) secrets.set(p.keyId, secret);
      if (secret === null && p.keyId) secrets.delete(p.keyId);
      if (previous?.keyId && previous.keyId !== p.keyId) secrets.delete(previous.keyId);
      changed();
    },
    async remove(id) {
      const keyId = profiles.get(id)?.keyId;
      profiles.delete(id);
      if (keyId) secrets.delete(keyId);
      changed();
    },
    async hasSecret(id) {
      return secretOf(id) !== null;
    },
    async maskedTail(id) {
      return tailOf(secretOf(id));
    },
  };
}

/** Hands back the B1 single key once, for the form to attach to a new profile, and empties its slot. */
export async function importLegacyKey(backend: Pick<KeysBackend, "load" | "save">): Promise<string | null> {
  const { ai } = await backend.load();
  if (!ai || ai.key === "") return null;
  await backend.save("ai", null);
  return ai.key;
}
