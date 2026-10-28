"use client";

// The user's own keys (D-015), kept apart from the progress document
// localStorage["iynk:v1"]. Reads return a masked view; only the header builder
// calls readSecret. Reads are cached by the raw string for useSyncExternalStore.

import { useSyncExternalStore } from "react";
import { parseSecret, type SecretProblem } from "./format";

export const KEYS_STORAGE_KEY = "iynk:keys:v1";
const KEYS_VERSION = 1;
const LABEL_MAX = 40;

export type KeyKind = "ai" | "search" | "server";

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

let cachedRaw: string | null = null;
let cachedDoc: KeysDoc = EMPTY_DOC;
// Holds the keys when storage cannot be written, so the session still has them.
let memoryOnly: KeysDoc | null = null;
let snapshot: Readonly<Record<KeyKind, MaskedKey>> | null = null;

function currentDoc(): KeysDoc {
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

const listeners = new Set<() => void>();

function notify() {
  snapshot = null;
  for (const listener of [...listeners]) listener();
}

function write(next: KeysDoc) {
  if (typeof window === "undefined") {
    throw new Error("iynk keys: keys can only change in the browser.");
  }
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
    persisted: memoryOnly === null,
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
