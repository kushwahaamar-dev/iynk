import { probeServer as fetchServerInfo } from "./auth.ts";
import { ClientError } from "./types.ts";
import type { ServerInfo } from "./types.ts";

export type ConfigDoc = {
  server: string | null;
  protocol: 1;
};

/** The config document, or null when the payload is not one this app understands. */
export function parseConfig(raw: unknown): ConfigDoc | null {
  if (!raw || typeof raw !== "object") return null;
  const { server, protocol } = raw as Record<string, unknown>;
  if (protocol !== 1) return null;
  if (server !== null && typeof server !== "string") return null;
  return { server, protocol };
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

export type ServerState = "none" | "checking" | "ready" | "unreachable" | "insecure";

export type ServerProbe = {
  state: Exclude<ServerState, "none" | "checking">;
  info: ServerInfo | null;
  /** The server answered 426: its minimum client is newer than this app. */
  upgradeRequired: boolean;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname);
}

/**
 * Asks the server who it is. Every failure becomes a state, never a throw: a dead server, a blocked origin and a
 * refusal all look like `unreachable`, and nothing is logged. An http address on a page the browser does not treat
 * as secure is `insecure` without a request, because device keys cannot be used there.
 */
export async function probeServer(
  base: string,
  o: { fetch?: typeof fetch; secure?: boolean } = {},
): Promise<ServerProbe> {
  const secure = o.secure ?? globalThis.isSecureContext ?? true;
  const url = URL.canParse(base) ? new URL(base) : null;
  if (!url) return { state: "unreachable", info: null, upgradeRequired: false };
  if (!secure && url.protocol === "http:" && !isLocalHost(url.hostname)) {
    return { state: "insecure", info: null, upgradeRequired: false };
  }
  try {
    const info = await fetchServerInfo({ base: url.origin, fetch: o.fetch ?? ((input, init) => fetch(input, init)) });
    return { state: "ready", info, upgradeRequired: false };
  } catch (e) {
    return { state: "unreachable", info: null, upgradeRequired: e instanceof ClientError && e.status === 426 };
  }
}
