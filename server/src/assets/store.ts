import { DEFAULT_COLLAB_LIMITS } from "../collab-config.ts";
import type { ServerStore, Tx } from "../store/port.ts";
import type { DeviceId, RoomId } from "../store/rooms.ts";

export class QuotaError extends Error {
  constructor() {
    super("The upload quota for this device is used up.");
    this.name = "QuotaError";
  }
}

export interface AssetsRepo {
  put(device: DeviceId, sha256: Uint8Array, bytes: Uint8Array, mime: string, room: RoomId | null, now: number): "created" | "exists";
  get(sha256: Uint8Array): { bytes: Uint8Array; mime: string } | null;
  has(room: RoomId, sha256Hex: string): boolean;
  uploaded(device: DeviceId, sha256Hex: string): boolean;
  usage(device: DeviceId, since?: number): number;
  sweepUnreferenced(now: number, olderThanMs: number, listed: (room: RoomId, sha256Hex: string) => boolean): number;
}

type SizeRow = { total: number };

const hex = (bytes: Uint8Array): string => Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString("hex");
const unhex = (text: string): Uint8Array => Buffer.from(text, "hex");

function usageTx(tx: Tx, device: DeviceId, since: number): number {
  const row = tx.get<SizeRow>(
    "SELECT COALESCE(SUM(b.size), 0) AS total FROM uploads u JOIN blobs b ON b.sha256 = u.sha256 WHERE u.device_id = ? AND u.at >= ?",
    device,
    since,
  );
  return Number(row?.total ?? 0);
}

export function createAssetsRepo(store: ServerStore, quotaBytes: number = DEFAULT_COLLAB_LIMITS.deviceQuotaBytes): AssetsRepo {
  return {
    put(device, sha256, bytes, mime, room, now) {
      return store.transaction((tx) => {
        const known = tx.get("SELECT 1 AS one FROM uploads WHERE device_id = ? AND sha256 = ?", device, sha256) !== undefined;
        if (!known && usageTx(tx, device, 0) + bytes.byteLength > quotaBytes) throw new QuotaError();
        const stored = tx.get("SELECT 1 AS one FROM blobs WHERE sha256 = ?", sha256) !== undefined;
        if (!stored) tx.run("INSERT INTO blobs (sha256, bytes, size, mime, created_at) VALUES (?, ?, ?, ?, ?)", sha256, bytes, bytes.byteLength, mime, now);
        if (known) {
          if (room !== null) tx.run("UPDATE uploads SET room_id = ? WHERE device_id = ? AND sha256 = ?", room, device, sha256);
        } else {
          tx.run("INSERT INTO uploads (device_id, sha256, room_id, at) VALUES (?, ?, ?, ?)", device, sha256, room, now);
        }
        return stored ? "exists" : "created";
      });
    },

    get(sha256) {
      const row = store.read((tx) => tx.get<{ bytes: Uint8Array; mime: string }>("SELECT bytes, mime FROM blobs WHERE sha256 = ?", sha256));
      return row ? { bytes: row.bytes, mime: row.mime } : null;
    },

    has: (room, sha256Hex) =>
      store.read((tx) => tx.get("SELECT 1 AS one FROM uploads WHERE room_id = ? AND sha256 = ? LIMIT 1", room, unhex(sha256Hex)) !== undefined),

    uploaded: (device, sha256Hex) =>
      store.read((tx) => tx.get("SELECT 1 AS one FROM uploads WHERE device_id = ? AND sha256 = ?", device, unhex(sha256Hex)) !== undefined),

    usage: (device, since = 0) => store.read((tx) => usageTx(tx, device, since)),

    sweepUnreferenced(now, olderThanMs, listed) {
      return store.transaction((tx) => {
        const stale = tx.all<{ device_id: string; sha256: Uint8Array; room_id: string | null }>(
          "SELECT device_id, sha256, room_id FROM uploads WHERE at < ?",
          now - olderThanMs,
        );
        for (const upload of stale) {
          if (upload.room_id !== null && listed(upload.room_id, hex(upload.sha256))) continue;
          tx.run("DELETE FROM uploads WHERE device_id = ? AND sha256 = ?", upload.device_id, upload.sha256);
        }
        const shared = tx.get("SELECT 1 AS one FROM sqlite_master WHERE type = 'table' AND name = 'share_blobs'") !== undefined;
        const unshared = shared ? " AND NOT EXISTS (SELECT 1 FROM share_blobs s WHERE s.sha256 = blobs.sha256)" : "";
        return tx.run(`DELETE FROM blobs WHERE NOT EXISTS (SELECT 1 FROM uploads u WHERE u.sha256 = blobs.sha256)${unshared}`).changes;
      });
    },
  };
}
