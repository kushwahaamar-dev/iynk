import { timingSafeEqual } from "node:crypto";
import { utf8Encode } from "../../../src/core/canonical.ts";
import { sha256Bytes } from "../../../src/core/sha256.ts";
import { base32Lower, CROCKFORD, parsePairingCode, toBase64Url } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";
import type { Authed } from "../http/classes.ts";
import { ApiError } from "../http/errors.ts";
import type { Tx } from "../store/port.ts";
import { listBuddies, type BuddyView } from "./list.ts";

const DEFAULT_TTL_S = 86_400;
const CODE_TTL_S = 600;
const CHANNEL_LENGTH = 4;
const SECRET_LENGTH = 6;
const CHANNEL_TRIES = 5;
const MAX_OPEN = 20;
const MAX_BUDDIES = 64;
const MAX_STRIKES = 5;
const KEEP_CLOSED_MS = 30 * 24 * 60 * 60 * 1000;

export type PairingRef = { token: string } | { code: string };

export type PairingRow = {
  id: string;
  creator: string;
  creatorIdentity: string;
  creatorName: string;
  creatorColor: string | null;
  expiresAt: number;
  codeExpiresAt: number | null;
};

export type PairingItem = {
  id: string;
  label: string | null;
  from: string;
  status: "open" | "redeemed" | "revoked" | "expired";
  createdAt: number;
  expiresAt: number;
  codeExpiresAt: number | null;
  redeemedAt: number | null;
  redeemedBy: string | null;
};

export type Redeemed = { buddy: BuddyView } | "gone" | "self" | "already" | "quota";

const hashText = (text: string): Uint8Array => sha256Bytes(utf8Encode(text));

function crockford(deps: Deps, length: number): string {
  return Array.from(deps.ids.random(length), (byte) => CROCKFORD[byte & 31]).join("");
}

export function createPairing(
  tx: Tx,
  deps: Deps,
  creator: Authed,
  o: { label?: string; ttlSeconds?: number },
): { id: string; token: string; code: string; createdAt: number; expiresAt: number; codeExpiresAt: number } {
  if (creator.deleting) throw new ApiError(403, "forbidden", "This identity is being deleted.");
  const now = deps.clock.now();
  const open = tx.get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM pairings WHERE creator = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
    creator.deviceId,
    now,
  )?.n;
  if ((open ?? 0) >= MAX_OPEN) throw new ApiError(409, "quota", "Too many open pairings. Revoke one first.");

  const ttl = o.ttlSeconds ?? DEFAULT_TTL_S;
  const id = `pair_${base32Lower(deps.ids.random(10))}`;
  const token = toBase64Url(deps.ids.random(16));
  const secret = crockford(deps, SECRET_LENGTH);
  const expiresAt = now + ttl * 1000;
  const codeExpiresAt = now + Math.min(CODE_TTL_S, ttl) * 1000;

  for (let attempt = 0; attempt < CHANNEL_TRIES; attempt++) {
    const channel = crockford(deps, CHANNEL_LENGTH);
    const taken = tx.get("SELECT 1 AS present FROM pairings WHERE channel = ?", channel);
    if (taken) continue;
    tx.run(
      "INSERT INTO pairings (id, creator, token_hash, channel, code_hash, label, expires_at, code_expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      id,
      creator.deviceId,
      hashText(token),
      channel,
      hashText(secret),
      o.label ?? null,
      expiresAt,
      codeExpiresAt,
      now,
    );
    return { id, token, code: `${channel}-${secret}`, createdAt: now, expiresAt, codeExpiresAt };
  }
  throw new Error("no free pairing channel");
}

type LiveColumns = {
  id: string;
  creator: string;
  identity_id: string;
  name: string;
  color: string | null;
  expires_at: number;
  code_expires_at: number | null;
  code_hash: Uint8Array | null;
};

const SELECT_LIVE = `SELECT p.id, p.creator, d.identity_id, d.name, d.color, p.expires_at, p.code_expires_at, p.code_hash
  FROM pairings p JOIN devices d ON d.id = p.creator
 WHERE p.used_at IS NULL AND p.revoked_at IS NULL AND p.expires_at > ?
   AND d.revoked_at IS NULL AND d.deletion_requested_at IS NULL`;

function toRow(row: LiveColumns): PairingRow {
  return {
    id: row.id,
    creator: row.creator,
    creatorIdentity: row.identity_id,
    creatorName: row.name,
    creatorColor: row.color,
    expiresAt: row.expires_at,
    codeExpiresAt: row.code_expires_at,
  };
}

/** Wrong, expired, used, revoked and deleted all come back as null. */
export function findPairing(tx: Tx, ref: PairingRef, now: number): PairingRow | null {
  if ("token" in ref) {
    const row = tx.get<LiveColumns>(`${SELECT_LIVE} AND p.token_hash = ?`, now, hashText(ref.token));
    return row ? toRow(row) : null;
  }
  const parsed = parsePairingCode(ref.code);
  if (!parsed) return null;
  const row = tx.get<LiveColumns>(`${SELECT_LIVE} AND p.channel = ?`, now, parsed.channel);
  const stored = row?.code_hash ?? new Uint8Array(32);
  const matches = timingSafeEqual(stored, hashText(parsed.secret));
  if (!row || !matches || row.code_expires_at === null || row.code_expires_at <= now) return null;
  return toRow(row);
}

/** Counts a wrong secret against a live code. Returns true when this strike deleted the code; the link stays valid. */
export function strike(tx: Tx, channel: string): boolean {
  const row = tx.get<{ attempts: number }>(
    "SELECT attempts FROM pairings WHERE channel = ? AND code_expires_at IS NOT NULL AND used_at IS NULL AND revoked_at IS NULL",
    channel,
  );
  if (!row) return false;
  const attempts = row.attempts + 1;
  const dead = attempts >= MAX_STRIKES;
  tx.run(`UPDATE pairings SET attempts = ?${dead ? ", code_expires_at = NULL" : ""} WHERE channel = ?`, attempts, channel);
  return dead;
}

function buddyCount(tx: Tx, device: string): number {
  return tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM buddies WHERE a = ? OR b = ?", device, device)?.n ?? 0;
}

export function redeem(tx: Tx, deps: Deps, redeemer: Authed, ref: PairingRef): Redeemed {
  const now = deps.clock.now();
  const found = findPairing(tx, ref, now);
  if (!found) return "gone";
  if (found.creator === redeemer.deviceId) return "self";
  const [a, b] = found.creator < redeemer.deviceId ? [found.creator, redeemer.deviceId] : [redeemer.deviceId, found.creator];
  if (tx.get("SELECT 1 AS present FROM buddies WHERE a = ? AND b = ?", a, b)) return "already";
  if (buddyCount(tx, found.creator) >= MAX_BUDDIES || buddyCount(tx, redeemer.deviceId) >= MAX_BUDDIES) return "quota";
  const used = tx.run("UPDATE pairings SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL", now, redeemer.deviceId, found.id);
  if (used.changes !== 1) return "gone";
  tx.run("INSERT INTO buddies (a, b, since) VALUES (?, ?, ?)", a, b, now);
  const buddy = listBuddies(tx, redeemer.deviceId, now).find((entry) => entry.deviceId === found.creator);
  return buddy ? { buddy } : "gone";
}

/** False when the pairing is not this device's, or was already redeemed. Revoking twice is fine. */
export function revokePairing(tx: Tx, deviceId: string, pairingId: string, now: number): boolean {
  const row = tx.get<{ used_at: number | null; revoked_at: number | null }>("SELECT used_at, revoked_at FROM pairings WHERE id = ? AND creator = ?", pairingId, deviceId);
  if (!row || row.used_at !== null) return false;
  if (row.revoked_at === null) tx.run("UPDATE pairings SET revoked_at = ? WHERE id = ?", now, pairingId);
  return true;
}

type ItemColumns = {
  id: string;
  label: string | null;
  expires_at: number;
  code_expires_at: number | null;
  used_at: number | null;
  revoked_at: number | null;
  created_at: number;
  redeemer: string | null;
};

/** Open pairings and those closed in the last 30 days, newest first. */
export function listPairings(tx: Tx, creator: Authed, now: number): PairingItem[] {
  const rows = tx.all<ItemColumns>(
    `SELECT p.id, p.label, p.expires_at, p.code_expires_at, p.used_at, p.revoked_at, p.created_at, d.identity_id AS redeemer
       FROM pairings p LEFT JOIN devices d ON d.id = p.used_by
      WHERE p.creator = ?
      ORDER BY p.created_at DESC, p.id`,
    creator.deviceId,
  );
  const items: PairingItem[] = [];
  for (const row of rows) {
    const status = row.used_at !== null ? "redeemed" : row.revoked_at !== null ? "revoked" : row.expires_at <= now ? "expired" : "open";
    const closedAt = row.used_at ?? row.revoked_at ?? row.expires_at;
    if (status !== "open" && closedAt <= now - KEEP_CLOSED_MS) continue;
    items.push({
      id: row.id,
      label: row.label,
      from: creator.identityId,
      status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      codeExpiresAt: status === "open" ? row.code_expires_at : null,
      redeemedAt: row.used_at,
      redeemedBy: row.redeemer,
    });
  }
  return items;
}
