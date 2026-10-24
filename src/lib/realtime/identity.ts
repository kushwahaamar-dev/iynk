// The name and colour this browser uses in rooms. Self-chosen, kept only in
// localStorage, never sent anywhere but the rooms you join (H11).

import { MAX_NAME_LENGTH } from "./protocol";

export const IDENTITY_KEY = "simlab:together:v1";

/** The Colorfigures palette, as the colours peers wear. */
export const PEER_COLORS = [
  { id: "tomato", hex: "#ef6a4c" },
  { id: "mustard", hex: "#f4b829" },
  { id: "mint", hex: "#93d3b0" },
  { id: "cobalt", hex: "#76a0e2" },
  { id: "blush", hex: "#f3a6bb" },
] as const;

export type Identity = { name: string; color: string };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: Identity | null = null;
/** Where the identity lives when storage is blocked (private mode, sandboxed frames). */
let memory: Identity | null = null;

function parse(raw: string | null): Identity | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { v?: unknown; name?: unknown; color?: unknown };
    if (value.v !== 1 || typeof value.name !== "string" || typeof value.color !== "string") return null;
    const name = cleanName(value.name);
    if (!name || !PEER_COLORS.some((c) => c.hex === value.color)) return null;
    return { name, color: value.color };
  } catch {
    return null;
  }
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

export function getIdentity(): Identity | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(IDENTITY_KEY);
  } catch {
    return memory;
  }
  if (raw === null && memory) return memory;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function getServerIdentity(): Identity | null {
  return null;
}

export function saveIdentity(identity: Identity) {
  const name = cleanName(identity.name);
  if (!name) return;
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({ v: 1, name, color: identity.color }));
  } catch {
    // Storage is blocked: the name lasts for this page only.
    memory = { name, color: identity.color };
  }
  for (const listener of [...listeners]) listener();
}

export function subscribeIdentity(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === IDENTITY_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** A colour for someone who hasn't picked one, spread by name. */
export function colorFor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PEER_COLORS[hash % PEER_COLORS.length].hex;
}
