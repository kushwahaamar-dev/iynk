import type { Tx } from "../store/port.ts";

export type BuddyView = {
  identityId: string;
  deviceId: string;
  displayName: string;
  color?: string;
  keyThumbprint: string;
  alias?: string;
  pairedAt: string;
  online: boolean | null;
  activity: null;
};

type BuddyRow = {
  identity_id: string;
  device_id: string;
  name: string;
  color: string | null;
  thumbprint: string;
  show_online: number;
  alias: string | null;
  since: number;
};

export function listBuddies(tx: Tx, me: string): BuddyView[] {
  const rows = tx.all<BuddyRow>(
    `SELECT d.identity_id, d.id AS device_id, d.name, d.color, d.thumbprint, d.show_online,
            CASE WHEN bu.a = ? THEN bu.alias_a ELSE bu.alias_b END AS alias, bu.since
       FROM buddies bu JOIN devices d ON d.id = CASE WHEN bu.a = ? THEN bu.b ELSE bu.a END
      WHERE (bu.a = ? OR bu.b = ?) AND d.revoked_at IS NULL AND d.deletion_requested_at IS NULL
      ORDER BY d.name COLLATE NOCASE, d.id`,
    me,
    me,
    me,
    me,
  );
  return rows.map((row) => ({
    identityId: row.identity_id,
    deviceId: row.device_id,
    displayName: row.name,
    ...(row.color === null ? {} : { color: row.color }),
    keyThumbprint: row.thumbprint,
    ...(row.alias === null ? {} : { alias: row.alias }),
    pairedAt: new Date(row.since).toISOString(),
    online: row.show_online === 1 ? false : null,
    activity: null,
  }));
}
