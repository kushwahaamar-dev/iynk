import { ConfigError } from "./config.ts";

export type CollabLimits = {
  maxLiveRooms: number;
  maxStoredRooms: number;
  maxMembers: number;
  maxSpectators: number;
  maxProjectBytes: number;
  roomsPerMinute: number;
  roomsPerHour: number;
  storedRoomsPerDevice: number;
  activeInvitesPerRoom: number;
  inviteTriesPerHour: number;
  submitPerSec: number;
  submitBurst: number;
  pendingPerSocket: number;
  chatPerSec: number;
  chatBurst: number;
  chatMax: number;
  cursorHz: number;
  cursorBurst: number;
  presencePerSec: number;
  framesPerSec: number;
  floodDrops: number;
  floodWindowMs: number;
  helloTimeoutMs: number;
  heartbeatMs: number;
  deadPeerMs: number;
  lossyBufferedBytes: number;
  maxBufferedBytes: number;
  authFailuresPerMin: number;
  authLockoutMs: number;
  checkEveryOps: number;
  checkEveryMs: number;
  checkpointEveryOps: number;
  checkpointEveryMs: number;
  keepCheckpoints: number;
  keepPayloadOps: number;
  resumeTailOps: number;
  resumeTailGzipBytes: number;
  idleEvictMs: number;
  closedRetentionDays: number;
  shareDefaultDays: number;
  shareMaxDays: number | null;
  maxShareBytes: number;
  liveSharesPerIdentity: number;
  sharesStoredPerDevice: number;
  deviceQuotaBytes: number;
  assetBytes: number;
  allowLinks: boolean;
};

type Env = Record<string, string | undefined>;

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const MIB = 1024 * 1024;

export const DEFAULT_COLLAB_LIMITS: CollabLimits = {
  maxLiveRooms: 20,
  maxStoredRooms: 100,
  maxMembers: 8,
  maxSpectators: 8,
  maxProjectBytes: 5 * MIB,
  roomsPerMinute: 6,
  roomsPerHour: 30,
  storedRoomsPerDevice: 10,
  activeInvitesPerRoom: 20,
  inviteTriesPerHour: 5,
  submitPerSec: 20,
  submitBurst: 40,
  pendingPerSocket: 4,
  chatPerSec: 2,
  chatBurst: 5,
  chatMax: 500,
  cursorHz: 15,
  cursorBurst: 10,
  presencePerSec: 5,
  framesPerSec: 60,
  floodDrops: 600,
  floodWindowMs: 5 * SECOND,
  helloTimeoutMs: 10 * SECOND,
  heartbeatMs: 15 * SECOND,
  deadPeerMs: 45 * SECOND,
  lossyBufferedBytes: 262_144,
  maxBufferedBytes: 4 * MIB,
  authFailuresPerMin: 5,
  authLockoutMs: 5 * MINUTE,
  checkEveryOps: 100,
  checkEveryMs: 30 * SECOND,
  checkpointEveryOps: 500,
  checkpointEveryMs: 10 * MINUTE,
  keepCheckpoints: 8,
  keepPayloadOps: 20_000,
  resumeTailOps: 1000,
  resumeTailGzipBytes: 204_800,
  idleEvictMs: 10 * MINUTE,
  closedRetentionDays: 30,
  shareDefaultDays: 30,
  shareMaxDays: 365,
  maxShareBytes: 16 * MIB,
  liveSharesPerIdentity: 20,
  sharesStoredPerDevice: 200,
  deviceQuotaBytes: 256 * MIB,
  assetBytes: 16 * MIB,
  allowLinks: true,
};

export function loadCollabLimits(env: Env): CollabLimits {
  const problems: string[] = [];

  const integer = (name: string, fallback: number, min: number, max: number): number => {
    const raw = env[name]?.trim();
    if (raw === undefined || raw === "") return fallback;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || value < min || value > max) {
      problems.push(`${name} must be an integer from ${min} to ${max}`);
      return fallback;
    }
    return value;
  };

  const defaults = DEFAULT_COLLAB_LIMITS;
  const shareDays = integer("IYNK_SHARE_TTL_DAYS", defaults.shareMaxDays ?? 0, 0, 3650);
  const allowRaw = env["IYNK_ALLOW_LINKS"]?.trim();
  if (allowRaw !== undefined && allowRaw !== "" && allowRaw !== "0" && allowRaw !== "1") {
    problems.push("IYNK_ALLOW_LINKS must be 1 or 0");
  }

  const limits: CollabLimits = {
    ...defaults,
    maxLiveRooms: integer("IYNK_MAX_LIVE_ROOMS", defaults.maxLiveRooms, 1, 1000),
    maxStoredRooms: integer("IYNK_MAX_STORED_ROOMS", defaults.maxStoredRooms, 1, 100_000),
    maxMembers: integer("IYNK_MAX_MEMBERS", defaults.maxMembers, 2, 8),
    maxSpectators: integer("IYNK_MAX_SPECTATORS", defaults.maxSpectators, 0, 8),
    maxProjectBytes: integer("IYNK_MAX_PROJECT_BYTES", defaults.maxProjectBytes, 65_536, defaults.maxProjectBytes),
    shareMaxDays: shareDays === 0 ? null : shareDays,
    maxShareBytes: integer("IYNK_MAX_SHARE_BYTES", defaults.maxShareBytes, 65_536, 64 * MIB),
    allowLinks: allowRaw !== "0",
  };

  if (problems.length > 0) throw new ConfigError(problems);
  return limits;
}
