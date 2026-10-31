import { timingSafeEqual } from "node:crypto";
import { utf8Encode } from "../../../src/core/canonical.ts";
import { sha256Bytes } from "../../../src/core/sha256.ts";
import { base32Lower, toBase64Url } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";
import type { Tx } from "../store/port.ts";

export const MCP_KEY_PREFIX = "iynk_mcp_";

const WELL_FORMED = /^iynk_mcp_[A-Za-z0-9_-]{43}$/;
const DUMMY_KEY = `${MCP_KEY_PREFIX}${"A".repeat(43)}`;

export type FoundToken = { id: string; kind: "personal" | "mcp"; deviceId: string | null };

type TokenRow = { id: string; kind: "personal" | "mcp"; device_id: string | null; token_hash: Uint8Array };

export function revokeMcpKey(tx: Tx, deps: Deps): number {
  return tx.run("UPDATE api_tokens SET revoked_at = ? WHERE kind = 'mcp' AND revoked_at IS NULL", deps.clock.now()).changes;
}

/** Only the SHA-256 is stored. Any earlier live key ends first, so there is one live key. */
export function issueMcpKey(tx: Tx, deps: Deps): { id: string; key: string } {
  revokeMcpKey(tx, deps);
  const key = `${MCP_KEY_PREFIX}${toBase64Url(deps.ids.random(32))}`;
  const id = `tok_${base32Lower(deps.ids.random(10))}`;
  tx.run(
    "INSERT INTO api_tokens (id, kind, device_id, token_hash, scopes, created_at, expires_at, revoked_at) VALUES (?, 'mcp', NULL, ?, 'tools:read', ?, NULL, NULL)",
    id,
    sha256Bytes(utf8Encode(key)),
    deps.clock.now(),
  );
  return { id, key };
}

/** Unknown, malformed, revoked and expired keys all run the same lookup and compare. */
export function findToken(tx: Tx, key: string, nowMs: number): FoundToken | null {
  const presented = key.trim();
  const wellFormed = WELL_FORMED.test(presented);
  const hash = sha256Bytes(utf8Encode(wellFormed ? presented : DUMMY_KEY));
  const row = tx.get<TokenRow>(
    "SELECT id, kind, device_id, token_hash FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)",
    hash,
    nowMs,
  );
  const same = row !== undefined && timingSafeEqual(row.token_hash, hash);
  if (!wellFormed || !row || !same) return null;
  return { id: row.id, kind: row.kind, deviceId: row.device_id };
}
