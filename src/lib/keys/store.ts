"use client";

// The user's own keys (D-015), kept apart from the progress document
// localStorage["iynk:v1"]. Reads return a masked view; only the header builder
// calls readSecret. Reads are cached by the raw string for useSyncExternalStore.
// Once hydrateKeys has run, the ai and search keys live in the IndexedDB `keys` store
// behind an in-memory mirror; the server token stays in localStorage until B6.

import { useSyncExternalStore } from "react";
import { parseSecret, type SecretProblem } from "./format";

export const KEYS_STORAGE_KEY = "iynk:keys:v1";
const KEYS_VERSION = 1;
const LABEL_MAX = 40;

export type KeyKind = "ai" | "search" | "server";
export type KeySlot = "ai" | "search";

export interface KeyRow {
  /** The ProviderProfile arrives in B14; until then rows are keyed by slot. */
  providerProfile: null;
  key: string;
  label?: string;
  addedAt: number;
  lastUsedAt: number | null;
}

export interface KeysBackend {
  load(): Promise<Record<KeySlot, KeyRow | null>>;
  save(slot: KeySlot, row: KeyRow | null): Promise<void>;
}

type KeysDoc = {
  v: typeof KEYS_VERSION;
  ai: { key: string; label?: string } | null;
  search: { key: string } | null;
  server: { token: string } | null;
};

export type MaskedKey = {
  kind: KeyKind;
  set: boolean;
  /** Last four characters, or "" when the secret is too short to show any safely. */
  tail: string;
  label?: string;
  /** False when this browser blocked storage and the key lives only until the tab closes. */
  persisted: boolean;
};

export type SetKeyResult = { ok: true } | { ok: false; reason: SecretProblem | "storage" };

const KINDS: readonly KeyKind[] = ["ai", "search", "server"];
const SLOTS: readonly KeySlot[] = ["ai", "search"];
const CHANNEL_NAME = "iynk-keys";
const TAIL_MIN_LENGTH = 12;

const EMPTY_DOC: Readonly<KeysDoc> = Object.freeze({ v: KEYS_VERSION, ai: null, search: null, server: null });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function secretOf(slot: unknown, field: "key" | "token"): string | null {
  if (!isRecord(slot) || typeof slot[field] !== "string") return null;
  const parsed = parseSecret(slot[field]);
  return parsed.ok ? parsed.value : null;
}

function normalize(value: unknown): KeysDoc {
  if (!isRecord(value) || value.v !== KEYS_VERSION) return EMPTY_DOC;
  const ai = secretOf(value.ai, "key");
  const search = secretOf(value.search, "key");
  const server = secretOf(value.server, "token");
  const label = isRecord(value.ai) && typeof value.ai.label === "string" ? value.ai.label.slice(0, LABEL_MAX) : "";
  return {
    v: KEYS_VERSION,
    ai: ai ? { key: ai, ...(label ? { label } : {}) } : null,
    search: search ? { key: search } : null,
    server: server ? { token: server } : null,
  };
}

function secretIn(doc: KeysDoc, kind: KeyKind): string | null {
  if (kind === "server") return doc.server?.token ?? null;
  return doc[kind]?.key ?? null;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEYS_STORAGE_KEY);
  } catch {
    return null;
  }
}

type Mirror = Record<KeySlot, KeyRow | null>;

let backend: KeysBackend | null = null;
let mirror: Mirror | null = null;
let hydrating: Promise<HydrateResult> | null = null;
let channel: BroadcastChannel | null = null;
// Set when the last write to the backend failed, so the key lasts only until the tab closes.
let backendFailed = false;
let cachedRaw: string | null = null;
let cachedDoc: KeysDoc = EMPTY_DOC;
// Holds the keys when storage cannot be written, so the session still has them.
let memoryOnly: KeysDoc | null = null;
let snapshot: Readonly<Record<KeyKind, MaskedKey>> | null = null;

function localDoc(): KeysDoc {
  if (memoryOnly) return memoryOnly;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    snapshot = null;
    try {
      cachedDoc = raw ? normalize(JSON.parse(raw)) : EMPTY_DOC;
    } catch {
      cachedDoc = EMPTY_DOC;
    }
  }
  return cachedDoc;
}

function currentDoc(): KeysDoc {
  const local = localDoc();
  if (!mirror) return local;
  return {
    v: KEYS_VERSION,
    ai: mirror.ai ? { key: mirror.ai.key, ...(mirror.ai.label ? { label: mirror.ai.label.slice(0, LABEL_MAX) } : {}) } : null,
    search: mirror.search ? { key: mirror.search.key } : null,
    server: local.server,
  };
}

const listeners = new Set<() => void>();

function notify() {
  snapshot = null;
  for (const listener of [...listeners]) listener();
}

function writeLocal(next: KeysDoc) {
  const empty = KINDS.every((kind) => secretIn(next, kind) === null);
  try {
    if (empty) window.localStorage.removeItem(KEYS_STORAGE_KEY);
    else window.localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(next));
    memoryOnly = null;
    cachedRaw = readRaw();
    cachedDoc = next;
  } catch {
    memoryOnly = next;
  }
}

function rowFor(slot: KeySlot, doc: KeysDoc, previous: KeyRow | null): KeyRow | null {
  const key = secretIn(doc, slot);
  if (key === null) return null;
  const label = slot === "ai" ? doc.ai?.label : undefined;
  const sameKey = previous?.key === key;
  if (sameKey && previous.label === label) return previous;
  return {
    providerProfile: null,
    key,
    ...(label ? { label } : {}),
    addedAt: sameKey ? previous.addedAt : Date.now(),
    lastUsedAt: sameKey ? previous.lastUsedAt : null,
  };
}

function saveRow(target: KeysBackend, slot: KeySlot, row: KeyRow | null) {
  target.save(slot, row).then(
    () => {
      channel?.postMessage(slot);
      if (backendFailed) {
        backendFailed = false;
        notify();
      }
    },
    () => {
      backendFailed = true;
      notify();
    },
  );
}

function write(next: KeysDoc) {
  if (typeof window === "undefined") {
    throw new Error("iynk keys: keys can only change in the browser.");
  }
  if (backend && mirror) {
    const previous = mirror;
    mirror = { ai: rowFor("ai", next, previous.ai), search: rowFor("search", next, previous.search) };
    for (const slot of SLOTS) {
      if (mirror[slot] !== previous[slot]) saveRow(backend, slot, mirror[slot]);
    }
    writeLocal({ ...next, ai: null, search: null });
  } else {
    writeLocal(next);
  }
  notify();
}

export function setKey(kind: KeyKind, secret: string, label?: string): SetKeyResult {
  const parsed = parseSecret(secret);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const doc = currentDoc();
  if (kind === "ai") {
    const text = label?.trim().slice(0, LABEL_MAX);
    write({ ...doc, ai: { key: parsed.value, ...(text ? { label: text } : {}) } });
  } else if (kind === "search") {
    write({ ...doc, search: { key: parsed.value } });
  } else {
    write({ ...doc, server: { token: parsed.value } });
  }
  return { ok: true };
}

export function removeKey(kind: KeyKind): void {
  const doc = currentDoc();
  if (secretIn(doc, kind) === null) return;
  write({ ...doc, [kind]: null });
}

export function removeAllKeys(): void {
  if (KINDS.every((kind) => secretIn(currentDoc(), kind) === null)) return;
  write(EMPTY_DOC);
}

function mask(doc: KeysDoc, kind: KeyKind): MaskedKey {
  const secret = secretIn(doc, kind);
  const label = kind === "ai" ? doc.ai?.label : undefined;
  return {
    kind,
    set: secret !== null,
    tail: secret !== null && secret.length >= TAIL_MIN_LENGTH ? secret.slice(-4) : "",
    ...(label ? { label } : {}),
    persisted: memoryOnly === null && !backendFailed,
  };
}

export function getMasked(kind: KeyKind): MaskedKey {
  return mask(currentDoc(), kind);
}

/** The secret itself. Only the header builder (headers.ts) may call this. */
export function readSecret(kind: KeyKind): string | null {
  return secretIn(currentDoc(), kind);
}

/** Same-tab writes notify directly; other tabs arrive as storage events. */
export function subscribeKeys(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEYS_STORAGE_KEY || event.key === null) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Readonly<Record<KeyKind, MaskedKey>> {
  const doc = currentDoc();
  snapshot ??= { ai: mask(doc, "ai"), search: mask(doc, "search"), server: mask(doc, "server") };
  return snapshot;
}

const SERVER_SNAPSHOT: Readonly<Record<KeyKind, MaskedKey>> = Object.freeze({
  ai: { kind: "ai", set: false, tail: "", persisted: true },
  search: { kind: "search", set: false, tail: "", persisted: true },
  server: { kind: "server", set: false, tail: "", persisted: true },
});

/** The masked keys; "nothing set" on the server and during hydration. */
export function useKeys(): Readonly<Record<KeyKind, MaskedKey>> {
  return useSyncExternalStore(subscribeKeys, getSnapshot, () => SERVER_SNAPSHOT);
}

/** Replaces every stored secret in `text` with [key], longest first. */
export function redact(text: string): string {
  const doc = currentDoc();
  const secrets = KINDS.map((kind) => secretIn(doc, kind))
    .filter((secret): secret is string => secret !== null)
    .sort((a, b) => b.length - a.length);
  return secrets.reduce((out, secret) => out.split(secret).join("[key]"), text);
}

export type HydrateResult = { moved: KeySlot[]; degraded: boolean };

function usableRow(value: KeyRow | null): KeyRow | null {
  const parsed = value && parseSecret(value.key);
  return value && parsed?.ok ? { ...value, key: parsed.value } : null;
}

function readStored(): KeysDoc {
  try {
    const raw = readRaw();
    return raw ? normalize(JSON.parse(raw)) : EMPTY_DOC;
  } catch {
    return EMPTY_DOC;
  }
}

function listenForOtherTabs(source: KeysBackend) {
  if (channel || typeof BroadcastChannel === "undefined") return;
  channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = () => {
    source.load().then(
      (rows) => {
        mirror = { ai: usableRow(rows.ai), search: usableRow(rows.search) };
        notify();
      },
      () => undefined,
    );
  };
}

async function moveToBackend(source: KeysBackend): Promise<HydrateResult> {
  const rows: Mirror = await source.load().then((loaded) => ({ ai: usableRow(loaded.ai), search: usableRow(loaded.search) }));
  const local = localDoc();
  const moved: KeySlot[] = [];
  for (const slot of SLOTS) {
    const key = secretIn(local, slot);
    if (key === null || rows[slot]) continue;
    const row = rowFor(slot, local, null);
    await source.save(slot, row);
    const saved = usableRow((await source.load())[slot]);
    if (saved?.key !== key) throw new Error("iynk keys: a key did not read back from the store.");
    rows[slot] = saved;
    moved.push(slot);
  }
  const leftover = SLOTS.filter((slot) => rows[slot] !== null && rows[slot]?.key === secretIn(local, slot));
  if (leftover.length > 0) {
    writeLocal({ ...local, ...Object.fromEntries(leftover.map((slot) => [slot, null])) });
  }
  backend = source;
  mirror = rows;
  listenForOtherTabs(source);
  notify();
  return { moved, degraded: false };
}

/**
 * Fills the in-memory mirror from the `keys` store at app start and moves any ai or search key still in
 * localStorage into it. If anything fails nothing is removed and B1 behaviour carries on.
 */
export function hydrateKeys(source: KeysBackend): Promise<HydrateResult> {
  if (mirror) return Promise.resolve({ moved: [], degraded: false });
  hydrating ??= moveToBackend(source).catch(() => {
    hydrating = null;
    return { moved: [], degraded: true };
  });
  return hydrating;
}

/** The revert path: copies both rows back into localStorage and deletes them from the store. */
export async function restoreKeysToLocalStorage(source: KeysBackend): Promise<{ restored: KeySlot[] }> {
  const rows = await source.load();
  const found = SLOTS.flatMap((slot) => {
    const row = usableRow(rows[slot]);
    return row ? [{ slot, row }] : [];
  });
  if (found.length === 0) return { restored: [] };
  const local = localDoc();
  writeLocal({
    ...local,
    ...Object.fromEntries(found.map(({ slot, row }) => [slot, slot === "ai" ? { key: row.key, ...(row.label ? { label: row.label } : {}) } : { key: row.key }])),
  });
  const stored = readStored();
  if (found.some(({ slot, row }) => secretIn(stored, slot) !== row.key)) {
    throw new Error("iynk keys: a key did not read back from localStorage.");
  }
  for (const { slot } of found) await source.save(slot, null);
  backend = null;
  mirror = null;
  hydrating = null;
  notify();
  return { restored: found.map(({ slot }) => slot) };
}
