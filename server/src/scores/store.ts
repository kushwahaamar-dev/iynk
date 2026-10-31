import type { DeviceId } from "../store/rooms.ts";
import type { ServerStore, Tx } from "../store/port.ts";

export const TRACKS = ["lap", "diagnosis", "built", "solved"] as const;
export const LAP_BOUNDS_MS = { min: 1_000, max: 3_600_000 } as const;
export const KEYS_PER_TRACK = 200;

export type ScoreUnit = "ms" | "s" | "points" | "count";
export type Better = "lower" | "higher";

export type ScoreSubmit = {
  value: number;
  unit: ScoreUnit;
  better: Better;
  projectId?: string;
  note?: string;
};

export type ScoreRow = {
  device_id: DeviceId;
  key: string;
  value: number;
  unit: ScoreUnit;
  better: Better;
  at: number;
  project_id: string | null;
  note: string | null;
};

export type ScoreConflictCode = "score_key_mismatch" | "quota";

/** The key already holds a different unit or direction, or the device has no room for another key in the track. */
export class ScoreConflict extends Error {
  readonly code: ScoreConflictCode;

  constructor(code: ScoreConflictCode) {
    super(code);
    this.name = "ScoreConflict";
    this.code = code;
  }
}

export interface ScoresRepo {
  submit(device: DeviceId, key: string, s: ScoreSubmit, now: number): { row: ScoreRow; changed: boolean };
  remove(device: DeviceId, key: string): void;
  boardFor(device: DeviceId, key: string, visible: DeviceId[]): ScoreRow[];
  countKeys(device: DeviceId, track: string): number;
}

const COLUMNS = "device_id, key, value, unit, better, at, project_id, note";

const isBetter = (better: Better, next: number, stored: number): boolean => (better === "lower" ? next < stored : next > stored);

function countKeysTx(tx: Tx, device: DeviceId, track: string): number {
  const row = tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM scores WHERE device_id = ? AND (key = ? OR key LIKE ?)", device, track, `${track}.%`);
  return row?.n ?? 0;
}

export function createScoresRepo(store: ServerStore): ScoresRepo {
  return {
    submit(device, key, s, now) {
      return store.transaction((tx) => {
        const stored = tx.get<ScoreRow>(`SELECT ${COLUMNS} FROM scores WHERE device_id = ? AND key = ?`, device, key);
        if (stored) {
          if (stored.unit !== s.unit || stored.better !== s.better) throw new ScoreConflict("score_key_mismatch");
          if (!isBetter(s.better, s.value, stored.value)) return { row: stored, changed: false };
        } else if (countKeysTx(tx, device, key.split(".", 1)[0] as string) >= KEYS_PER_TRACK) {
          throw new ScoreConflict("quota");
        }
        const row: ScoreRow = {
          device_id: device,
          key,
          value: s.value,
          unit: s.unit,
          better: s.better,
          at: now,
          project_id: s.projectId ?? null,
          note: s.note ?? null,
        };
        tx.run(
          `INSERT OR REPLACE INTO scores (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          row.device_id,
          row.key,
          row.value,
          row.unit,
          row.better,
          row.at,
          row.project_id,
          row.note,
        );
        return { row, changed: true };
      });
    },

    remove(device, key) {
      store.transaction((tx) => {
        tx.run("DELETE FROM scores WHERE device_id = ? AND key = ?", device, key);
      });
    },

    boardFor(device, key, visible) {
      const ids = [...new Set([device, ...visible])];
      const marks = ids.map(() => "?").join(", ");
      return store.read((tx) =>
        tx.all<ScoreRow>(`SELECT ${COLUMNS} FROM scores WHERE key = ? AND device_id IN (${marks}) ORDER BY at, device_id`, key, ...ids),
      );
    },

    countKeys(device, track) {
      return store.read((tx) => countKeysTx(tx, device, track));
    },
  };
}
