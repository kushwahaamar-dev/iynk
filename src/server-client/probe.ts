export type ConfigDoc = {
  server: string | null;
  protocol: 1;
  modules?: { ai: boolean; search: boolean; voice: boolean };
};

function parseModules(raw: unknown): ConfigDoc["modules"] {
  if (!raw || typeof raw !== "object") return undefined;
  const { ai, search, voice } = raw as Record<string, unknown>;
  return { ai: ai === true, search: search === true, voice: voice === true };
}

/** The config document, or null when the payload is not one this app understands. */
export function parseConfig(raw: unknown): ConfigDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const { server, protocol, modules } = raw as Record<string, unknown>;
  if (protocol !== 1) return null;
  if (server !== null && typeof server !== "string") return null;
  const doc: ConfigDoc = { server, protocol };
  const parsed = parseModules(modules);
  if (parsed) doc.modules = parsed;
  return doc;
}

/**
 * Reads /config.json. A missing file (404, a static host) is a normal answer with
 * no config; only a network failure, another status or an unreadable body is `ok: false`.
 */
export async function fetchConfig(
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<{ ok: true; config: ConfigDoc | null } | { ok: false }> {
  try {
    const res = await fetchFn("/config.json", { headers: { accept: "application/json" }, signal });
    if (res.status === 404) return { ok: true, config: null };
    if (!res.ok) return { ok: false };
    return { ok: true, config: parseConfig(await res.json()) };
  } catch {
    return { ok: false };
  }
}
