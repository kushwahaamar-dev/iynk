import { generateKeyPairSync } from "node:crypto";
import { utf8Encode } from "../../../src/core/canonical.ts";
import { sha256Bytes } from "../../../src/core/sha256.ts";
import { base32Lower, toBase64Url } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";
import type { Authed } from "../http/classes.ts";
import type { Tx } from "../store/port.ts";
import { verifySignature } from "./challenge.ts";
import { getDevice } from "./devices.ts";

export const TOKEN_PREFIX = "iynk_at_";

const WELL_FORMED = /^iynk_at_[A-Za-z0-9_-]{43}$/;
const DUMMY_TOKEN = `${TOKEN_PREFIX}${"A".repeat(43)}`;
const TOUCH_AFTER_MS = 60_000;
const MAX_LIVE_SESSIONS = 20;

const dummyKey = new Uint8Array(generateKeyPairSync("ec", { namedCurve: "P-256" }).publicKey.export({ format: "der", type: "spki" }));

export type MintedToken = { token: string; sessionId: string; expiresAt: number };

export function mintToken(tx: Tx, deps: Deps, deviceId: string, ttlMs: number, client: string | null): MintedToken {
  const now = deps.clock.now();
  const live = tx.all<{ id: string }>(
    "SELECT id FROM sessions WHERE device_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at, rowid",
    deviceId,
    now,
  );
  for (const old of live.slice(0, Math.max(0, live.length - (MAX_LIVE_SESSIONS - 1)))) {
    tx.run("UPDATE sessions SET revoked_at = ? WHERE id = ?", now, old.id);
  }
  const token = `${TOKEN_PREFIX}${toBase64Url(deps.ids.random(32))}`;
  const sessionId = `ses_${base32Lower(deps.ids.random(10))}`;
  const expiresAt = now + ttlMs;
  tx.run(
    "INSERT INTO sessions (id, device_id, token_hash, created_at, expires_at, last_used_at, client) VALUES (?, ?, ?, ?, ?, ?, ?)",
    sessionId,
    deviceId,
    sha256Bytes(utf8Encode(token)),
    now,
    expiresAt,
    now,
    client,
  );
  return { token, sessionId, expiresAt };
}

type SessionJoin = {
  id: string;
  last_used_at: number;
  device_id: string;
  identity_id: string;
  server_role: "owner" | "member";
  name: string;
  deletion_requested_at: number | null;
};

/** Reads only. A scheduled deletion still verifies; a purged, unswept identity does not. */
export function verifyToken(tx: Tx, deps: Deps, presented: string | null): { authed: Authed | null; touch: boolean } {
  const wellFormed = presented !== null && WELL_FORMED.test(presented);
  const now = deps.clock.now();
  const row = tx.get<SessionJoin>(
    `SELECT s.id, s.last_used_at, d.id AS device_id, d.identity_id, d.server_role, d.name, d.deletion_requested_at
       FROM sessions s JOIN devices d ON d.id = s.device_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
        AND d.revoked_at IS NULL AND (d.deletion_at IS NULL OR d.deletion_at > ?)`,
    sha256Bytes(utf8Encode(wellFormed ? presented : DUMMY_TOKEN)),
    now,
    now,
  );
  if (!wellFormed || !row) return { authed: null, touch: false };
  return {
    authed: {
      deviceId: row.device_id,
      identityId: row.identity_id,
      role: row.server_role,
      sessionId: row.id,
      name: row.name,
      deleting: row.deletion_requested_at !== null,
    },
    touch: now - row.last_used_at >= TOUCH_AFTER_MS,
  };
}

export function touchSession(tx: Tx, deps: Deps, sessionId: string): void {
  const now = deps.clock.now();
  tx.run("UPDATE sessions SET last_used_at = ? WHERE id = ?", now, sessionId);
  tx.run("UPDATE devices SET last_seen_at = ? WHERE id = (SELECT device_id FROM sessions WHERE id = ?)", now, sessionId);
}

export function revokeSession(tx: Tx, deviceId: string, sessionId: string, now: number): boolean {
  const { changes } = tx.run("UPDATE sessions SET revoked_at = ? WHERE id = ? AND device_id = ? AND revoked_at IS NULL", now, sessionId, deviceId);
  return changes === 1;
}

export function revokeAllSessions(tx: Tx, deviceId: string, now: number): number {
  return tx.run("UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL", now, deviceId).changes;
}

export type LoginArgs = {
  identityId: string;
  thumbprint: string;
  signingInput: string;
  signature: string;
  ttlMs: number;
  client: string | null;
};

/**
 * The caller has consumed a `login` challenge and passes what it returned. An unknown identity still
 * runs one signature check, against a throwaway key, so the work matches a real failure.
 */
export function loginDevice(tx: Tx, deps: Deps, a: LoginArgs): (MintedToken & { deviceId: string }) | null {
  const now = deps.clock.now();
  const device = getDevice(tx, a.identityId);
  const signed = verifySignature(device?.publicKey ?? dummyKey, a.signingInput, a.signature);
  if (!device || !signed || device.thumbprint !== a.thumbprint) return null;
  if (device.revokedAt !== null || (device.deletionAt !== null && device.deletionAt <= now)) return null;
  return { ...mintToken(tx, deps, device.id, a.ttlMs, a.client), deviceId: device.id };
}
