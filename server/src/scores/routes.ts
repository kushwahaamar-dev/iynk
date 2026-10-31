import { badField, iso, readObject, readText } from "../http/auth.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "../http/classes.ts";
import { ApiError } from "../http/errors.ts";
import type { Actor, DeviceId } from "../store/rooms.ts";
import { LAP_BOUNDS_MS, ScoreConflict, TRACKS, type Better, type ScoreRow, type ScoresRepo, type ScoreSubmit, type ScoreUnit } from "./store.ts";

const MAX_BODY_BYTES = 2 * 1024;
const MAX_ROWS = 65;
const NOTE_MAX = 140;
const KEY = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const PROJECT_ID = /^prj_[a-z0-9][a-z0-9_-]{0,63}$/;
const UNITS: readonly ScoreUnit[] = ["ms", "s", "points", "count"];
const DIRECTIONS: readonly Better[] = ["lower", "higher"];
// control, zero-width and bidi override characters, as the display-name cleaner strips them
// eslint-disable-next-line no-control-regex
const NOTE_JUNK = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export type LeaderboardRow = {
  rank: number;
  identityId: Actor;
  displayName: string;
  value: number;
  unit: ScoreUnit;
  submittedAt: string;
  verification: "claimed";
  note?: string;
};

export type BoardEntry = ScoreRow & { identityId: Actor; displayName: string };

export type ScoreRouteDeps = {
  repo: ScoresRepo;
  buddiesOf(device: DeviceId): DeviceId[];
  deviceInfo(ids: DeviceId[]): Map<DeviceId, { identityId: Actor; displayName: string }>;
  now: () => number;
};

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");
const unprocessable = (code: string, message: string): ApiError => new ApiError(422, code, message);

/** Ties share a rank: it is one more than the number of rows strictly better. The earlier submission only orders equal rows. */
export function rankRows(rows: BoardEntry[], better: Better): LeaderboardRow[] {
  const sign = better === "lower" ? 1 : -1;
  const sorted = [...rows].sort((a, b) => sign * (a.value - b.value) || a.at - b.at);
  return sorted.map((row) => ({
    rank: 1 + sorted.filter((other) => sign * (other.value - row.value) < 0).length,
    identityId: row.identityId,
    displayName: row.displayName,
    value: row.value,
    unit: row.unit,
    submittedAt: iso(row.at),
    verification: "claimed",
    ...(row.note === null ? {} : { note: row.note }),
  }));
}

function readKey(ctx: Ctx): string {
  const key = ctx.params["key"] as string;
  if (!KEY.test(key) || !(TRACKS as readonly string[]).includes(key.split(".", 1)[0] as string)) throw badField("/key", "This is not a board key.");
  return key;
}

function readNote(fields: Record<string, unknown>): string | undefined {
  const raw = readText(fields, "note", undefined, NOTE_MAX * 8);
  if (raw === undefined) return undefined;
  const text = raw.replace(NOTE_JUNK, "").replace(/\s+/g, " ").trim();
  if (Array.from(graphemes.segment(text)).length > NOTE_MAX) throw badField("/note", "Use at most 140 characters.");
  return text || undefined;
}

function readSubmit(key: string, body: unknown): ScoreSubmit {
  const fields = readObject(body, ["value", "unit", "better", "projectId", "replayAssetSha256", "note"], ["value", "unit", "better"]);
  const { value, unit, better } = fields;
  if (typeof value !== "number" || !Number.isFinite(value)) throw badField("/value", "Send a finite number.");
  if (!UNITS.includes(unit as ScoreUnit)) throw badField("/unit", "Use ms, s, points or count.");
  if (!DIRECTIONS.includes(better as Better)) throw badField("/better", "Use lower or higher.");
  const projectId = readText(fields, "projectId", PROJECT_ID, 72);
  const note = readNote(fields);
  if (fields["replayAssetSha256"] !== undefined) throw unprocessable("replay_not_supported", "Replays are not accepted yet.");

  if (key.split(".", 1)[0] === "lap") {
    const { min, max } = LAP_BOUNDS_MS;
    if (unit !== "ms" || better !== "lower") throw unprocessable("invalid_score", "A lap is milliseconds, lower is better.");
    if (!Number.isInteger(value) || value < min || value > max) throw unprocessable("invalid_score", "A lap takes from 1 second to 1 hour.");
  } else if (value < 0) {
    throw unprocessable("invalid_score", "A score cannot be negative.");
  }
  return { value, unit: unit as ScoreUnit, better: better as Better, ...(projectId !== undefined && { projectId }), ...(note !== undefined && { note }) };
}

export function scoreRoutes(deps: ScoreRouteDeps): RouteDef[] {
  const { repo } = deps;

  /** The caller and the caller's buddies, ranked. Rows of revoked or deleting devices have no device info and drop out. */
  const board = (device: DeviceId, key: string): { better: Better; rows: LeaderboardRow[]; mine: LeaderboardRow | undefined } | null => {
    const stored = repo.boardFor(device, key, deps.buddiesOf(device));
    const reference = stored.find((row) => row.device_id === device) ?? stored[0];
    if (!reference) return null;
    const info = deps.deviceInfo(stored.map((row) => row.device_id));
    const entries = stored
      .filter((row) => row.unit === reference.unit && row.better === reference.better && info.has(row.device_id))
      .slice(0, MAX_ROWS)
      .map((row) => ({ ...row, ...(info.get(row.device_id) as { identityId: Actor; displayName: string }) }));
    if (entries.length === 0) return null;
    const rows = rankRows(entries, reference.better);
    const mine = entries.find((entry) => entry.device_id === device);
    return { better: reference.better, rows, mine: mine && rows.find((row) => row.identityId === mine.identityId) };
  };

  const submit = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const key = readKey(c);
    const s = readSubmit(key, c.body);
    try {
      repo.submit(deviceId, key, s, deps.now());
    } catch (error) {
      if (!(error instanceof ScoreConflict)) throw error;
      throw error.code === "quota"
        ? new ApiError(409, "quota", "You have reached the limit of boards in this track.")
        : new ApiError(409, "score_key_mismatch", "This board already uses a different unit or direction.");
    }
    const mine = board(deviceId, key)?.mine;
    if (!mine) throw notFound();
    return { status: 200, body: mine };
  };

  const remove = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    repo.remove(deviceId, readKey(c));
    return { status: 204 };
  };

  const leaderboard = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const key = readKey(c);
    const found = board(deviceId, key);
    if (!found) throw notFound();
    return { status: 200, body: { key, better: found.better, rows: found.rows } };
  };

  return defineRoutes([
    { method: "PUT", path: "/v1/scores/{key}", operation: "submitScore", cls: "device", bucket: "write", maxBodyBytes: MAX_BODY_BYTES, handler: submit },
    { method: "DELETE", path: "/v1/scores/{key}", operation: "deleteScore", cls: "device", bucket: "write", handler: remove },
    { method: "GET", path: "/v1/leaderboards/{key}", operation: "getLeaderboard", cls: "device", bucket: "read", handler: leaderboard },
  ]);
}
