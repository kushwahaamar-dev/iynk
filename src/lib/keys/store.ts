"use client";

// The user's own keys (D-015), kept apart from the progress document
// localStorage["iynk:v1"]. Reads return a masked view; only the header builder
// calls readSecret. Reads are cached by the raw string for useSyncExternalStore.
// Once hydrateKeys has run, the search key lives in the IndexedDB `keys` store behind an
// in-memory mirror. AI keys belong to provider profiles; a document written by an older
// build may still carry ai and server fields, which are ignored and dropped on the next write.

import { useSyncExternalStore } from "react";
import type { ProviderProfile } from "../../ai/profiles";
import { parseSecret, type SecretProblem } from "./format";

export const KEYS_STORAGE_KEY = "iynk:keys:v1";
const KEYS_VERSION = 1;

export type KeyKind = "search";

export interface KeyRow {
  providerProfile: ProviderProfile | null;
  key: string;
  addedAt: number;
  lastUsedAt: number | null;
}

export interface KeysBackend {
  load(): Promise<Record<KeyKind, KeyRow | null>>;
  save(slot: KeyKind, row: KeyRow | null): Promise<void>;
}

type KeysDoc = {
  v: typeof KEYS_VERSION;
  search: { key: string } | null;
};

export type MaskedKey = {
  kind: KeyKind;
  set: boolean;
  /** Last four characters, or "" when the secret is too short to show any safely. */
  tail: string;
  /** False when this browser blocked storage and the key lives only until the tab closes. */
  persisted: boolean;
};

export type SetKeyResult = { ok: true } | { ok: false; reason: SecretProblem | "storage" };

const CHANNEL_NAME = "iynk-keys";
const TAIL_MIN_LENGTH = 12;

const EMPTY_DOC: Readonly<KeysDoc> = Object.freeze({ v: KEYS_VERSION, search: null });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function normalize(value: unknown): KeysDoc {
  if (!isRecord(value) || value.v !== KEYS_VERSION || !isRecord(value.search) || typeof value.search.key !== "string") return EMPTY_DOC;
  const parsed = parseSecret(value.search.key);
  return parsed.ok ? { v: KEYS_VERSION, search: { key: parsed.value } } : EMPTY_DOC;
}

function secretIn(doc: KeysDoc): string | null {
  return doc.search?.key ?? null;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEYS_STORAGE_KEY);
  } catch {
    return null;
  }
}

type Mirror = Record<KeyKind, KeyRow | null>;

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
  if (!mirror) return localDoc();
  return { v: KEYS_VERSION, search: mirror.search ? { key: mirror.search.key } : null };
}

const listeners = new Set<() => void>();

function notify() {
  snapshot = null;
  for (const listener of [...listeners]) listener();
}

function writeLocal(next: KeysDoc) {
  try {
    if (secretIn(next) === null) window.localStorage.removeItem(KEYS_STORAGE_KEY);
    else window.localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(next));
    memoryOnly = null;
    cachedRaw = readRaw();
    cachedDoc = next;
  } catch {
    memoryOnly = next;
  }
}

function rowFor(doc: KeysDoc, previous: KeyRow | null): KeyRow | null {
  const key = secretIn(doc);
  if (key === null) return null;
  if (previous?.key === key) return previous;
  return {
    providerProfile: null,
    key,
    addedAt: Date.now(),
    lastUsedAt: null,
  };
}

function saveRow(target: KeysBackend, slot: KeyKind, row: KeyRow | null) {
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
    mirror = { search: rowFor(next, previous.search) };
    if (mirror.search !== previous.search) saveRow(backend, "search", mirror.search);
    writeLocal(EMPTY_DOC);
  } else {
    writeLocal(next);
  }
  notify();
}

export function setKey(kind: KeyKind, secret: string): SetKeyResult {
  const parsed = parseSecret(secret);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  write({ v: KEYS_VERSION, [kind]: { key: parsed.value } });
  return { ok: true };
}

export function removeAllKeys(): void {
  if (secretIn(currentDoc()) === null) return;
  write(EMPTY_DOC);
}

export const removeKey: (kind: KeyKind) => void = removeAllKeys;

function mask(doc: KeysDoc, kind: KeyKind): MaskedKey {
  const secret = secretIn(doc);
  return {
    kind,
    set: secret !== null,
    tail: secret !== null && secret.length >= TAIL_MIN_LENGTH ? secret.slice(-4) : "",
    persisted: memoryOnly === null && !backendFailed,
  };
}

export function getMasked(kind: KeyKind): MaskedKey {
  return mask(currentDoc(), kind);
}

/** The secret itself. Only the search client may call this. */
export function readSecret(_kind: KeyKind): string | null {
  return secretIn(currentDoc());
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
  snapshot ??= { search: mask(doc, "search") };
  return snapshot;
}

const SERVER_SNAPSHOT: Readonly<Record<KeyKind, MaskedKey>> = Object.freeze({
  search: { kind: "search", set: false, tail: "", persisted: true },
});

/** The masked keys; "nothing set" on the server and during hydration. */
export function useKeys(): Readonly<Record<KeyKind, MaskedKey>> {
  return useSyncExternalStore(subscribeKeys, getSnapshot, () => SERVER_SNAPSHOT);
}

/** Replaces the stored secret in `text` with [key]. */
export function redact(text: string): string {
  const secret = secretIn(currentDoc());
  return secret === null ? text : text.split(secret).join("[key]");
}

export type HydrateResult = { moved: KeyKind[]; degraded: boolean };

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
        mirror = { search: usableRow(rows.search) };
        notify();
      },
      () => undefined,
    );
  };
}

async function moveToBackend(source: KeysBackend): Promise<HydrateResult> {
  const rows: Mirror = await source.load().then((loaded) => ({ search: usableRow(loaded.search) }));
  const local = localDoc();
  const key = secretIn(local);
  const moved: KeyKind[] = [];
  if (key !== null && !rows.search) {
    await source.save("search", rowFor(local, null));
    const saved = usableRow((await source.load()).search);
    if (saved?.key !== key) throw new Error("iynk keys: a key did not read back from the store.");
    rows.search = saved;
    moved.push("search");
  }
  if (rows.search !== null && rows.search.key === key) writeLocal(EMPTY_DOC);
  backend = source;
  mirror = rows;
  listenForOtherTabs(source);
  notify();
  return { moved, degraded: false };
}

/**
 * Fills the in-memory mirror from the `keys` store at app start and moves a search key still in
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

/** The revert path: copies the row back into localStorage and deletes it from the store. */
export async function restoreKeysToLocalStorage(source: KeysBackend): Promise<{ restored: KeyKind[] }> {
  const row = usableRow((await source.load()).search);
  if (!row) return { restored: [] };
  writeLocal({ v: KEYS_VERSION, search: { key: row.key } });
  if (secretIn(readStored()) !== row.key) {
    throw new Error("iynk keys: a key did not read back from localStorage.");
  }
  await source.save("search", null);
  backend = null;
  mirror = null;
  hydrating = null;
  notify();
  return { restored: ["search"] };
}
