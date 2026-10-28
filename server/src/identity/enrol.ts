import { utf8Encode } from "../../../src/core/canonical.ts";
import { sha256Bytes } from "../../../src/core/sha256.ts";
import { base32Lower, CROCKFORD, fromBase64Url, parseEnrolmentCode, toBase64Url } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";
import type { Tx } from "../store/port.ts";

const CODE_TTL_MS = 24 * 60 * 60 * 1000;
const TYPED_LENGTH = 12;

export type NewCode = { id: string; link: string; typed: string; expiresAt: number };

function crockford(bytes: Uint8Array, length: number): string {
  let out = "";
  let acc = 0;
  let bits = 0;
  for (const byte of bytes) {
    acc = ((acc << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5 && out.length < length) {
      bits -= 5;
      out += CROCKFORD[(acc >> bits) & 31];
    }
  }
  return out;
}

export function createEnrolmentCode(tx: Tx, deps: Deps): NewCode {
  const now = deps.clock.now();
  const id = `code_${base32Lower(deps.ids.random(8))}`;
  const linkBytes = deps.ids.random(16);
  const typed = crockford(deps.ids.random(8), TYPED_LENGTH);
  const expiresAt = now + CODE_TTL_MS;
  tx.run(
    "INSERT INTO enrollment_codes (id, secret_hash, typed_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
    id,
    sha256Bytes(linkBytes),
    sha256Bytes(utf8Encode(typed)),
    expiresAt,
    now,
  );
  return { id, link: toBase64Url(linkBytes), typed: `${typed.slice(0, 4)}-${typed.slice(4, 8)}-${typed.slice(8)}`, expiresAt };
}

/** The device row must already exist in this transaction: `used_by` references it. */
export function redeemEnrolmentCode(tx: Tx, input: string, deviceId: string, deps: Deps): "ok" | "invalid" {
  const parsed = parseEnrolmentCode(input);
  if (!parsed) return "invalid";
  const now = deps.clock.now();
  const column = parsed.kind === "link" ? "secret_hash" : "typed_hash";
  const secret = parsed.kind === "link" ? fromBase64Url(parsed.canonical) : utf8Encode(parsed.canonical);
  if (!secret) return "invalid";
  const { changes } = tx.run(
    `UPDATE enrollment_codes SET used_by = ?, used_at = ? WHERE ${column} = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`,
    deviceId,
    now,
    sha256Bytes(secret),
    now,
  );
  return changes === 1 ? "ok" : "invalid";
}

export function listOpenCodes(tx: Tx, now: number): { id: string; expiresAt: number }[] {
  return tx
    .all<{ id: string; expires_at: number }>(
      "SELECT id, expires_at FROM enrollment_codes WHERE used_at IS NULL AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at, id",
      now,
    )
    .map((row) => ({ id: row.id, expiresAt: row.expires_at }));
}

export function revokeCode(tx: Tx, id: string, now: number): boolean {
  const { changes } = tx.run(
    "UPDATE enrollment_codes SET revoked_at = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
    now,
    id,
    now,
  );
  return changes === 1;
}
