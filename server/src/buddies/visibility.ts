import type { Authed } from "../http/classes.ts";
import type { Tx } from "../store/port.ts";
import { fetchBuddies, type BuddyView } from "./list.ts";

const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

export function areBuddies(tx: Tx, a: string, b: string): boolean {
  const [low, high] = pair(a, b);
  return tx.get("SELECT 1 AS present FROM buddies WHERE a = ? AND b = ?", low, high) !== undefined;
}

/** A stranger, an unknown id, oneself, a revoked device and a deleting identity all give null. */
export function visibleBuddy(tx: Tx, viewer: Authed, identityId: string, now: number): BuddyView | null {
  if (identityId === viewer.identityId) return null;
  return fetchBuddies(tx, viewer.deviceId, now, identityId)[0] ?? null;
}

/** Runs inside the removal transaction, after the pair is deleted. A throw rolls the removal back; a returned function runs after COMMIT. */
export type BuddyRemovalHook = (tx: Tx, a: string, b: string) => void | (() => void);

/** Deletes the pair on both sides. Removing a buddy that is not there is not an error, so the call tells a stranger nothing. */
export function removeBuddy(
  tx: Tx,
  viewer: Authed,
  identityId: string,
  onRemoved?: BuddyRemovalHook,
): { removed: boolean; after: (() => void) | null } {
  const others = tx
    .all<{ other: string }>(
      `SELECT d.id AS other FROM buddies bu JOIN devices d ON d.id = CASE WHEN bu.a = ? THEN bu.b ELSE bu.a END
        WHERE (bu.a = ? OR bu.b = ?) AND d.identity_id = ?`,
      viewer.deviceId,
      viewer.deviceId,
      viewer.deviceId,
      identityId,
    )
    .map((row) => row.other);
  const afters: Array<() => void> = [];
  for (const other of others) {
    const [low, high] = pair(viewer.deviceId, other);
    tx.run("DELETE FROM buddies WHERE a = ? AND b = ?", low, high);
    const after = onRemoved?.(tx, viewer.deviceId, other);
    if (after) afters.push(after);
  }
  return { removed: others.length > 0, after: afters.length > 0 ? () => afters.forEach((run) => run()) : null };
}

/** An empty alias clears it. */
export function setAlias(tx: Tx, viewer: Authed, identityId: string, alias: string | null, now: number): BuddyView | null {
  const buddy = visibleBuddy(tx, viewer, identityId, now);
  if (!buddy) return null;
  const [a, b] = pair(viewer.deviceId, buddy.deviceId);
  const column = a === viewer.deviceId ? "alias_a" : "alias_b";
  tx.run(`UPDATE buddies SET ${column} = ? WHERE a = ? AND b = ?`, alias, a, b);
  return visibleBuddy(tx, viewer, identityId, now);
}
