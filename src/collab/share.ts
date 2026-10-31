import type { RoomId } from "../protocol/index.ts";
import { chainStart, canonicalBytes, stateHash } from "../project/hash.ts";
import type { Project } from "../project/generated/types.ts";
import type { ServerClient } from "../server-client/client.ts";
import { ClientError } from "../server-client/types.ts";

export type ShareAudience = "link" | "buddies";

export type ShareRequest = {
  audience: ShareAudience;
  expiry: { kind: "default" } | { kind: "days"; days: number } | { kind: "never" };
  allowFork: boolean;
  label?: string;
};

export type ShareView = {
  id: string;
  audience: ShareAudience;
  revision: number;
  stateHash: string;
  allowFork: boolean;
  label?: string;
  createdAt: string;
  expiresAt: string | null;
  opens: number;
  revokedAt: string | null;
};

export type ShareErrorKind = "needs_server" | "tooLarge" | "secret" | "liveLimit" | "expiry" | "network";

export type BlobReader = (sha256: string) => Promise<Uint8Array | null>;

const DAY_MS = 86_400_000;
const MAX_SHARE_BYTES = 5 * 1024 * 1024;
const QUERY_BATCH = 256;
const LIST_PAGE = 100;

export function stripForShare(doc: Project): Project {
  return { ...doc, history: { baseRevision: doc.revision, baseChain: chainStart(doc.id), checkpoints: [], ops: [] } };
}

/** `undefined` leaves the field out, so the server applies its own default. */
export function expiryToIso(e: ShareRequest["expiry"], now: Date): string | null | undefined {
  if (e.kind === "default") return undefined;
  if (e.kind === "never") return null;
  return new Date(now.getTime() + e.days * DAY_MS).toISOString();
}

/** The token travels in the fragment, so it never reaches a server log or a Referer header. */
export function shareLink(lang: string, origin: string, token: string): string {
  return `${origin}/${lang}/studio#share=${token}`;
}

async function failure(res: Response): Promise<ClientError> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; requestId?: string } } | null;
  return new ClientError(body?.error?.code ?? `http_${res.status}`, res.status, body?.error?.requestId ?? res.headers.get("x-request-id"));
}

async function send(c: ServerClient, path: string, init: RequestInit): Promise<Response> {
  const res = await c.fetchAuthed(path, init);
  if (!res.ok) throw await failure(res);
  return res;
}

const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method,
  headers: { "content-type": "application/json", accept: "application/json", ...headers },
  body: JSON.stringify(body),
});

function toView(raw: ShareView): ShareView {
  return {
    id: raw.id,
    audience: raw.audience,
    revision: raw.revision,
    stateHash: raw.stateHash,
    allowFork: raw.allowFork,
    ...(raw.label === undefined ? {} : { label: raw.label }),
    createdAt: raw.createdAt,
    expiresAt: raw.expiresAt,
    opens: raw.opens,
    revokedAt: raw.revokedAt,
  };
}

/** Uploads the files the server does not hold yet. Without `room` the files belong to the caller alone. */
export async function syncAssets(
  c: ServerClient,
  hashes: readonly string[],
  readBlob: BlobReader,
  room?: RoomId,
  mediaTypes: ReadonlyMap<string, string> = new Map(),
): Promise<{ uploaded: number }> {
  const unique = [...new Set(hashes)];
  let uploaded = 0;
  for (let from = 0; from < unique.length; from += QUERY_BATCH) {
    const batch = unique.slice(from, from + QUERY_BATCH);
    const res = await send(c, "/assets/query", jsonInit("POST", { sha256: batch }));
    const { missing } = (await res.json()) as { missing: string[] };
    for (const sha256 of missing) {
      const bytes = await readBlob(sha256);
      if (bytes === null) throw new Error(`The file ${sha256} is not stored on this device.`);
      const query = room === undefined ? "" : `?room=${encodeURIComponent(room)}`;
      await send(c, `/assets/${sha256}${query}`, {
        method: "PUT",
        headers: { "content-type": mediaTypes.get(sha256) ?? "application/octet-stream" },
        body: bytes as BodyInit,
      });
      uploaded += 1;
    }
  }
  return { uploaded };
}

export async function createShare(
  c: ServerClient,
  doc: Project,
  r: ShareRequest,
  deps: { readBlob: BlobReader; lang: string; origin: string; idempotencyKey?: string; now?: Date },
): Promise<{ share: ShareView; link: string; localHash: string; hashMatches: boolean }> {
  const snapshot = stripForShare(doc);
  if (canonicalBytes(snapshot) > MAX_SHARE_BYTES) throw new ClientError("too_large", 413);
  await syncAssets(
    c,
    doc.assets.map((asset) => asset.sha256),
    deps.readBlob,
    undefined,
    new Map(doc.assets.map((asset) => [asset.sha256, asset.mediaType])),
  );
  const expiresAt = expiryToIso(r.expiry, deps.now ?? new Date());
  const body = {
    snapshot,
    audience: r.audience,
    allowFork: r.allowFork,
    ...(expiresAt === undefined ? {} : { expiresAt }),
    ...(r.label ? { label: r.label } : {}),
  };
  const res = await send(c, "/shares", jsonInit("POST", body, { "idempotency-key": deps.idempotencyKey ?? crypto.randomUUID() }));
  const reply = (await res.json()) as ShareView & { token: string };
  const share = toView(reply);
  const localHash = stateHash(snapshot);
  return { share, link: shareLink(deps.lang, deps.origin, reply.token), localHash, hashMatches: localHash === share.stateHash };
}

export async function listShares(c: ServerClient): Promise<ShareView[]> {
  const shares: ShareView[] = [];
  let cursor: string | null = null;
  do {
    const query: string = `?limit=${LIST_PAGE}${cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`}`;
    const res = await send(c, `/shares${query}`, { headers: { accept: "application/json" } });
    const page = (await res.json()) as { items: ShareView[]; nextCursor: string | null };
    shares.push(...page.items.map(toView));
    cursor = page.nextCursor;
  } while (cursor !== null);
  return shares;
}

export async function revokeShare(c: ServerClient, id: string): Promise<void> {
  await send(c, `/shares/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function describeShareError(e: unknown): ShareErrorKind {
  if (!(e instanceof ClientError)) return "network";
  if (e.status === 413 || e.code === "too_large" || (e.status === 422 && e.code === "quota")) return "tooLarge";
  if (e.status === 409 && e.code === "quota") return "liveLimit";
  if (e.status === 422 && e.code === "secret_in_document") return "secret";
  if (e.status === 422 && e.code === "invalid_expiry") return "expiry";
  if (e.status === 404 || e.status === 501 || e.code === "links_disabled") return "needs_server";
  return "network";
}
