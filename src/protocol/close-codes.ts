import type { ErrorCode } from "./frames.ts";

export const CLOSE = {
  restarting: 1012,
  busy: 1013,
  helloTimeout: 4000,
  superseded: 4001,
  kicked: 4003,
  roomFull: 4004,
  unauthorized: 4401,
  roomUnavailable: 4403,
  tooLarge: 4413,
  upgradeRequired: 4426,
  rateLimited: 4429,
  roomCorrupt: 4500,
} as const;

const CLOSES: Partial<Record<ErrorCode, number>> = {
  too_large: CLOSE.tooLarge,
  unauthorized: CLOSE.unauthorized,
  room_unavailable: CLOSE.roomUnavailable,
  room_full: CLOSE.roomFull,
  kicked: CLOSE.kicked,
  superseded: CLOSE.superseded,
  upgrade_required: CLOSE.upgradeRequired,
};

const RETRYABLE: ReadonlySet<ErrorCode> = new Set(["room_full", "locked", "not_ready", "rate_limited", "server_error"]);

/** The close code that ends the socket after this error, or null when the socket stays open. */
export function closeCodeFor(code: ErrorCode): number | null {
  return CLOSES[code] ?? null;
}

export function isRetryable(code: ErrorCode): boolean {
  return RETRYABLE.has(code);
}
