import type { CollabLimits } from "../collab-config.ts";
import type { DeviceId } from "../store/rooms.ts";
import type { ServerStore, Tx } from "../store/port.ts";

export type ShareAudience = "link" | "buddies";

export type ShareRow = {
  id: string;
  owner: DeviceId;
  owner_name: string;
  created_at: number;
  expires_at: number | null;
  revoked_at: number | null;
  state_hash: string;
  bytes: number;
  audience: ShareAudience;
  allow_fork: boolean;
  label: string | null;
  revision: number;
  opens: number;
  last_opened_at: number | null;
};

export type NewShare = Pick<
  ShareRow,
  "id" | "owner" | "created_at" | "expires_at" | "state_hash" | "audience" | "allow_fork" | "label" | "revision"
> & { token_hash: Uint8Array; doc: Uint8Array; blobs: Uint8Array[] };

export type ShareQuota = "live" | "stored" | "bytes";

export class ShareQuotaError extends Error {
  readonly quota: ShareQuota;

  constructor(quota: ShareQuota) {
    super(`share quota reached: ${quota}`);
    this.name = "ShareQuotaError";
    this.quota = quota;
  }
}

export interface SharesRepo {
  create(s: NewShare): ShareRow;
  byTokenHash(h: Uint8Array): ShareRow | null;
  docOf(id: string): Uint8Array | null;
  byId(id: string, owner: DeviceId): ShareRow | null;
  listOwned(owner: DeviceId, limit: number, cursor: string | null): { items: ShareRow[]; next: string | null };
  hasBlob(id: string, sha256: Uint8Array): boolean;
  revoke(id: string, owner: DeviceId, now: number): boolean;
  touch(id: string, now: number): void;
  sweep(now: number, tombstoneMs: number): number;
}

type ShareColumns = Omit<ShareRow, "allow_fork"> & { allow_fork: number };

const COLUMNS =
  "s.id, s.owner, d.name AS owner_name, s.created_at, s.expires_at, s.revoked_at, s.state_hash, s.bytes, s.audience, s.allow_fork, s.label, s.revision, s.opens, s.last_opened_at";
const FROM = "FROM shares s JOIN devices d ON d.id = s.owner";
const LIVE = "s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > ?)";

function toRow(row: ShareColumns): ShareRow {
  return { ...row, allow_fork: row.allow_fork === 1 };
}

function parseCursor(cursor: string | null): [number, string] {
  const match = cursor === null ? null : /^(\d+):(shr_[a-z0-9]+)$/.exec(cursor);
  return match ? [Number(match[1]), match[2] as string] : [-1, ""];
}

function count(tx: Tx, sql: string, ...params: (string | number)[]): number {
  return tx.get<{ n: number }>(sql, ...params)?.n ?? 0;
}

export function createSharesRepo(store: ServerStore, limits: CollabLimits): SharesRepo {
  const checkQuotas = (tx: Tx, s: NewShare): void => {
    const live = count(tx, `SELECT COUNT(*) AS n FROM shares s WHERE s.owner = ? AND ${LIVE}`, s.owner, s.created_at);
    if (live >= limits.liveSharesPerIdentity) throw new ShareQuotaError("live");
    if (count(tx, "SELECT COUNT(*) AS n FROM shares WHERE owner = ?", s.owner) >= limits.sharesStoredPerDevice) throw new ShareQuotaError("stored");
    const stored = count(tx, "SELECT COALESCE(SUM(bytes), 0) AS n FROM shares WHERE owner = ?", s.owner);
    const uploaded = count(tx, "SELECT COALESCE(SUM(b.size), 0) AS n FROM uploads u JOIN blobs b ON b.sha256 = u.sha256 WHERE u.device_id = ?", s.owner);
    if (stored + uploaded + s.doc.length > limits.deviceQuotaBytes) throw new ShareQuotaError("bytes");
  };

  return {
    create(s) {
      return store.transaction((tx) => {
        checkQuotas(tx, s);
        tx.run(
          `INSERT INTO shares (id, token_hash, owner, created_at, expires_at, doc, state_hash, bytes, audience, allow_fork, label, revision)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          s.id,
          s.token_hash,
          s.owner,
          s.created_at,
          s.expires_at,
          s.doc,
          s.state_hash,
          s.doc.length,
          s.audience,
          s.allow_fork ? 1 : 0,
          s.label,
          s.revision,
        );
        for (const sha of s.blobs) tx.run("INSERT OR IGNORE INTO share_blobs (share_id, sha256) VALUES (?, ?)", s.id, sha);
        return toRow(tx.get<ShareColumns>(`SELECT ${COLUMNS} ${FROM} WHERE s.id = ?`, s.id) as ShareColumns);
      });
    },

    byTokenHash: (h) =>
      store.read((tx) => {
        const row = tx.get<ShareColumns>(`SELECT ${COLUMNS} ${FROM} WHERE s.token_hash = ?`, h);
        return row ? toRow(row) : null;
      }),

    docOf: (id) => store.read((tx) => tx.get<{ doc: Uint8Array }>("SELECT doc FROM shares WHERE id = ?", id)?.doc ?? null),

    byId: (id, owner) =>
      store.read((tx) => {
        const row = tx.get<ShareColumns>(`SELECT ${COLUMNS} ${FROM} WHERE s.id = ? AND s.owner = ?`, id, owner);
        return row ? toRow(row) : null;
      }),

    listOwned: (owner, limit, cursor) =>
      store.read((tx) => {
        const [at, after] = parseCursor(cursor);
        const rows = tx.all<ShareColumns>(
          `SELECT ${COLUMNS} ${FROM} WHERE s.owner = ? AND (s.created_at, s.id) > (?, ?) ORDER BY s.created_at, s.id LIMIT ?`,
          owner,
          at,
          after,
          limit + 1,
        );
        const items = rows.slice(0, limit).map(toRow);
        const last = items[items.length - 1];
        return { items, next: rows.length > limit && last ? `${last.created_at}:${last.id}` : null };
      }),

    hasBlob: (id, sha256) => store.read((tx) => tx.get("SELECT 1 AS present FROM share_blobs WHERE share_id = ? AND sha256 = ?", id, sha256) !== undefined),

    revoke: (id, owner, now) =>
      store.transaction((tx) => {
        const { changes } = tx.run("UPDATE shares SET revoked_at = COALESCE(revoked_at, ?), doc = x'' WHERE id = ? AND owner = ?", now, id, owner);
        if (changes === 0) return false;
        tx.run("DELETE FROM share_blobs WHERE share_id = ?", id);
        return true;
      }),

    touch: (id, now) => {
      store.transaction((tx) => tx.run("UPDATE shares SET opens = opens + 1, last_opened_at = ? WHERE id = ?", now, id));
    },

    sweep: (now, tombstoneMs) =>
      store.transaction((tx) => {
        const expired = "expires_at IS NOT NULL AND expires_at <= ? AND length(doc) > 0";
        tx.run(`DELETE FROM share_blobs WHERE share_id IN (SELECT id FROM shares WHERE ${expired})`, now);
        tx.run(`UPDATE shares SET doc = x'' WHERE ${expired}`, now);
        return tx.run(
          "DELETE FROM shares WHERE (revoked_at IS NOT NULL AND revoked_at < ?) OR (expires_at IS NOT NULL AND expires_at < ?)",
          now - tombstoneMs,
          now - tombstoneMs,
        ).changes;
      }),
  };
}
