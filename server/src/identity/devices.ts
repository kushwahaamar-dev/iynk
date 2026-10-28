import { deriveDeviceId, deriveIdentityId, keyThumbprint } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";
import type { Row, Tx } from "../store/port.ts";

export type DeviceRow = {
  id: string;
  identityId: string;
  publicKey: Uint8Array;
  thumbprint: string;
  name: string;
  role: "owner" | "member";
  createdAt: number;
  lastSeenAt: number;
  revokedAt: number | null;
  color: string | null;
  locale: string;
  showOnline: boolean;
  showActivity: boolean;
  deletionRequestedAt: number | null;
  deletionAt: number | null;
};

type DeviceColumns = Row & {
  id: string;
  identity_id: string;
  public_key: Uint8Array;
  thumbprint: string;
  name: string;
  server_role: "owner" | "member";
  created_at: number;
  last_seen_at: number;
  revoked_at: number | null;
  color: string | null;
  locale: string;
  show_online: number;
  show_activity: number;
  deletion_requested_at: number | null;
  deletion_at: number | null;
};

const SELECT_DEVICE =
  "SELECT id, identity_id, public_key, thumbprint, name, server_role, created_at, last_seen_at, revoked_at, color, locale, show_online, show_activity, deletion_requested_at, deletion_at FROM devices";

function toDevice(row: DeviceColumns): DeviceRow {
  return {
    id: row.id,
    identityId: row.identity_id,
    publicKey: row.public_key,
    thumbprint: row.thumbprint,
    name: row.name,
    role: row.server_role,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    color: row.color,
    locale: row.locale,
    showOnline: row.show_online === 1,
    showActivity: row.show_activity === 1,
    deletionRequestedAt: row.deletion_requested_at,
    deletionAt: row.deletion_at,
  };
}

export type RegisterArgs = {
  spki: Uint8Array;
  displayName: string;
  locale?: string;
  color?: string;
  maxIdentities: number;
};

/**
 * The caller has already checked the key with `isSpkiP256` and the name with `cleanDisplayName`.
 * Revoked and purged-but-not-swept rows count as present, so a key is never enrolled twice.
 */
export function registerDevice(
  tx: Tx,
  deps: Deps,
  a: RegisterArgs,
): { deviceId: string; identityId: string; role: "owner" | "member" } | "full" | "exists" {
  const deviceId = deriveDeviceId(a.spki);
  const identityId = deriveIdentityId(a.spki);
  const thumbprint = keyThumbprint(a.spki);
  const taken = tx.get("SELECT 1 AS present FROM devices WHERE id = ? OR identity_id = ? OR thumbprint = ?", deviceId, identityId, thumbprint);
  if (taken) return "exists";
  const total = tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM devices")?.n ?? 0;
  if (total >= a.maxIdentities) return "full";
  const hasOwner = tx.get("SELECT 1 AS present FROM devices WHERE server_role = 'owner'") !== undefined;
  const role = hasOwner ? "member" : "owner";
  const now = deps.clock.now();
  tx.run(
    "INSERT INTO devices (id, identity_id, public_key, thumbprint, name, server_role, created_at, last_seen_at, color, locale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    deviceId,
    identityId,
    a.spki,
    thumbprint,
    a.displayName,
    role,
    now,
    now,
    a.color ?? null,
    a.locale ?? "en",
  );
  return { deviceId, identityId, role };
}

export function getDevice(tx: Tx, idOrIdentity: string): DeviceRow | null {
  const row = tx.get<DeviceColumns>(`${SELECT_DEVICE} WHERE id = ? OR identity_id = ?`, idOrIdentity, idOrIdentity);
  return row ? toDevice(row) : null;
}

export function listDevices(tx: Tx): DeviceRow[] {
  return tx.all<DeviceColumns>(`${SELECT_DEVICE} ORDER BY created_at, id`).map(toDevice);
}

/** Marks the device revoked and ends its sessions; the caller runs this inside one transaction. */
export function revokeDevice(tx: Tx, idOrIdentity: string, now: number): boolean {
  const device = getDevice(tx, idOrIdentity);
  if (!device || device.revokedAt !== null) return false;
  tx.run("UPDATE devices SET revoked_at = ? WHERE id = ?", now, device.id);
  tx.run("UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL", now, device.id);
  return true;
}
