export type Retention = "session" | "project" | "forever";

export const THREAD_LIMITS = { perProject: 200, projectDays: 90 };

export const PROPOSAL_LIMITS = { perProject: 200, acceptedDays: 365, otherDays: 30 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function shouldPersist(r: Retention): boolean {
  return r !== "session";
}

export function expired(r: Retention, lastUsedMs: number, nowMs: number): boolean {
  if (r === "session") return true;
  if (r === "forever") return false;
  return nowMs - lastUsedMs > THREAD_LIMITS.projectDays * DAY_MS;
}
