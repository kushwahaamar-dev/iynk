import type { Library } from "../local/library.ts";
import type { Project } from "../project/generated/types.ts";
import { stateHash } from "../project/hash.ts";
import { validateValue } from "../project/validate.ts";
import type { ServerClient } from "../server-client/client.ts";
import { NeedsEnrolment, ServerUnreachable } from "../server-client/types.ts";
import type { EditAccess } from "./authority.ts";
import { keepCopy } from "./fork.ts";

const FRAGMENT = /^#share=([A-Za-z0-9_-]{22})$/;
const READ_INIT: RequestInit = { headers: { accept: "application/json" }, referrerPolicy: "no-referrer", cache: "no-store" };

export type OpenedShare = {
  doc: Project;
  share: { id: string; allowFork: boolean; revision: number; expiresAt: string | null };
  owner: { displayName: string };
  stateHash: string;
  /** The files the shared project lists, by sha256; one the server could not serve is left out. */
  assets: ReadonlyMap<string, Uint8Array>;
};

export type OpenShareResult =
  | { ok: true; opened: OpenedShare }
  | { ok: false; reason: "gone" | "needs_server" | "invalid" | "network" };

type SharedReply = {
  share: OpenedShare["share"];
  owner: OpenedShare["owner"];
  stateHash: string;
  document: unknown;
  assets: Array<{ sha256: string }>;
};

export function parseShareFragment(hash: string): { token: string } | null {
  const match = FRAGMENT.exec(hash);
  return match ? { token: match[1]! } : null;
}

/** A link share needs no sign in; a buddies share answers the anonymous read with the same 404 as a dead link, so a signed in reader asks again with the bearer. */
async function read(c: ServerClient, path: string, init: RequestInit): Promise<Response> {
  const anonymous = await c.fetchAnon(path, init);
  if (anonymous.status !== 404) return anonymous;
  try {
    return await c.fetchAuthed(path, init);
  } catch (e) {
    if (e instanceof NeedsEnrolment) return anonymous;
    throw e;
  }
}

export async function fetchSharedAsset(c: ServerClient, token: string, sha256: string): Promise<Uint8Array | null> {
  const res = await read(c, `/shares/${encodeURIComponent(token)}/assets/${sha256}`, { referrerPolicy: "no-referrer" });
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
}

export async function openShare(c: ServerClient, token: string): Promise<OpenShareResult> {
  let res: Response;
  try {
    res = await read(c, `/shares/${encodeURIComponent(token)}`, READ_INIT);
  } catch (e) {
    if (e instanceof ServerUnreachable) return { ok: false, reason: "network" };
    throw e;
  }
  if (res.status === 501) return { ok: false, reason: "needs_server" };
  if (!res.ok) return { ok: false, reason: "gone" };

  const reply = (await res.json().catch(() => null)) as SharedReply | null;
  if (!reply) return { ok: false, reason: "invalid" };
  const report = validateValue(reply.document);
  if (!report.ok || !report.doc) {
    console.warn("[iynk] shared project rejected", report.first20[0]?.code);
    return { ok: false, reason: "invalid" };
  }
  if (stateHash(report.doc) !== reply.stateHash) {
    console.warn("[iynk] shared project rejected", "hash_mismatch");
    return { ok: false, reason: "invalid" };
  }

  const fetched = await Promise.all(
    reply.assets.map(async ({ sha256 }) => [sha256, await fetchSharedAsset(c, token, sha256).catch(() => null)] as const),
  );
  const assets = new Map<string, Uint8Array>();
  for (const [sha256, bytes] of fetched) if (bytes) assets.set(sha256, bytes);

  return { ok: true, opened: { doc: report.doc, share: reply.share, owner: reply.owner, stateHash: reply.stateHash, assets } };
}

/** The library makes the new id and names the opener as the only owner; the shared project is recorded as the origin. */
export function makeMyCopy(d: { lib: Library }, opened: OpenedShare): Promise<string> {
  return keepCopy(d.lib, opened.doc, { project: opened.doc.id, revision: opened.share.revision, stateHash: opened.stateHash });
}

export function readOnlyAccess(opened: OpenedShare, makeCopy: () => Promise<void>): EditAccess {
  return {
    mode: "readonly",
    reason: "share",
    ...(opened.share.allowFork && { action: { id: "makeCopy" as const, run: makeCopy } }),
  };
}
