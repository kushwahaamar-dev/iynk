import { createClient, type ServerClient } from "./client.ts";
import { idbKeyStore, keySupport, memoryKeyStore } from "./keys.ts";
import { fetchConfig, probeServer } from "./probe.ts";
import { idbProfileStore, memoryProfileStore, openServerDb, resolveServerUrl, settleLeave } from "./profile.ts";
import { ClientError, NeedsEnrolment } from "./types.ts";

export const LAP_BOUNDS_MS = { min: 1000, max: 3_600_000 } as const;

export type BoardRow = {
  rank: number;
  identityId: string;
  displayName: string;
  value: number;
  unit: string;
  submittedAt: string;
  you: boolean;
};

export type Board = { rows: BoardRow[]; better: "lower" | "higher" };

const KEY_LENGTH = 64;
const OPT_IN_KEY = "iynk:board:optIn";
const JSON_HEADERS = { "content-type": "application/json" };

/** The leaderboard key of a lap. The daily challenge has one board for everybody, named by its day. */
export function lapKey(craftId: string, courseOrBoardId: string): string {
  const name = courseOrBoardId.startsWith("daily-") ? courseOrBoardId : `${craftId}-${courseOrBoardId}`;
  return `lap.${name}`.toLowerCase().replace(/[^a-z0-9._-]/g, "-").slice(0, KEY_LENGTH);
}

const path = (key: string) => encodeURIComponent(key);

export async function submitLap(c: ServerClient, key: string, timeMs: number): Promise<"sent" | "skipped" | "failed"> {
  if (!Number.isFinite(timeMs) || timeMs < LAP_BOUNDS_MS.min || timeMs > LAP_BOUNDS_MS.max) return "skipped";
  try {
    const res = await c.fetchAuthed(`/scores/${path(key)}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ value: Math.round(timeMs), unit: "ms", better: "lower" }),
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}

const identities = new WeakMap<ServerClient, string>();

async function identityOf(c: ServerClient): Promise<string> {
  const known = identities.get(c);
  if (known) return known;
  const { id } = await c.me();
  identities.set(c, id);
  return id;
}

/** The caller's board and their buddies' rows. A board nobody has a time on is "none". Anything else that goes wrong throws. */
export async function getBoard(c: ServerClient, key: string): Promise<Board | "none"> {
  const res = await c.fetchAuthed(`/leaderboards/${path(key)}`);
  if (res.status === 404) return "none";
  if (!res.ok) throw new ClientError(`http_${res.status}`, res.status);
  const body = (await res.json()) as { better: Board["better"]; rows: Omit<BoardRow, "you">[] };
  const me = await identityOf(c);
  return { better: body.better, rows: body.rows.map((row) => ({ ...row, you: row.identityId === me })) };
}

export async function removeScore(c: ServerClient, key: string): Promise<void> {
  const res = await c.fetchAuthed(`/scores/${path(key)}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new ClientError(`http_${res.status}`, res.status);
}

let sessionOptIn = false;

export function readOptIn(): boolean {
  try {
    return localStorage.getItem(OPT_IN_KEY) === "1";
  } catch {
    return sessionOptIn;
  }
}

export function writeOptIn(on: boolean): void {
  sessionOptIn = on;
  try {
    if (on) localStorage.setItem(OPT_IN_KEY, "1");
    else localStorage.removeItem(OPT_IN_KEY);
  } catch {
    // storage is blocked: the choice holds for this page only
  }
}

export type ScoresSession = { state: "no-server" | "signed-out" } | { state: "ready"; client: ServerClient };

let ready: ScoresSession | null = null;

/** Where this browser stands with its server: none, not enrolled on it, or a client that can send. */
export async function scoresSession(): Promise<ScoresSession> {
  if (ready) return ready;
  const hasDb = typeof indexedDB !== "undefined";
  const keys = hasDb ? idbKeyStore(openServerDb) : memoryKeyStore();
  const store = hasDb ? idbProfileStore(openServerDb) : memoryProfileStore();
  try {
    const profile = await settleLeave(store, keys, Date.now);
    const config = await fetchConfig();
    const url = resolveServerUrl(config.ok ? config.config : null, profile);
    if (!url) return { state: "no-server" };
    const probe = await probeServer(url);
    if (probe.state !== "ready") return { state: "no-server" };
    const enrolled = profile.identityId !== null && (await keys.get(url).catch(() => null)) !== null;
    if (!enrolled || keySupport() !== "ok") return { state: "signed-out" };
    ready = { state: "ready", client: createClient({ base: url, keys }) };
    return ready;
  } catch {
    return { state: "no-server" };
  }
}

/** True when the error means the person is no longer signed in. */
export const isSignedOut = (e: unknown): boolean => e instanceof NeedsEnrolment;
