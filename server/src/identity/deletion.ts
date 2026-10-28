import type { Deps } from "../deps.ts";
import type { Authed } from "../http/classes.ts";
import type { Tx } from "../store/port.ts";

const HOUR_MS = 3_600_000;

export type DeletionStatus = { status: "scheduled"; requestedAt: number; effectiveAt: number };

/** Asking twice returns the first schedule, so a retry never moves the date. */
export function requestDeletion(tx: Tx, deps: Deps, who: Authed, graceHours: number): DeletionStatus {
  const existing = tx.get<{ deletion_requested_at: number | null; deletion_at: number | null }>(
    "SELECT deletion_requested_at, deletion_at FROM devices WHERE id = ?",
    who.deviceId,
  );
  if (existing?.deletion_requested_at != null && existing.deletion_at != null) {
    return { status: "scheduled", requestedAt: existing.deletion_requested_at, effectiveAt: existing.deletion_at };
  }
  const requestedAt = deps.clock.now();
  const effectiveAt = requestedAt + graceHours * HOUR_MS;
  tx.run("UPDATE devices SET deletion_requested_at = ?, deletion_at = ? WHERE id = ?", requestedAt, effectiveAt, who.deviceId);
  return { status: "scheduled", requestedAt, effectiveAt };
}

export function cancelDeletion(tx: Tx, who: Authed): boolean {
  const { changes } = tx.run(
    "UPDATE devices SET deletion_requested_at = NULL, deletion_at = NULL WHERE id = ? AND deletion_requested_at IS NOT NULL",
    who.deviceId,
  );
  return changes > 0;
}

/** Sessions, pairings and buddy rows go with the device; used_by on codes and pairings is set to NULL. */
export function purgeDue(tx: Tx, now: number): number {
  return tx.run("DELETE FROM devices WHERE deletion_at IS NOT NULL AND deletion_at <= ?", now).changes;
}
