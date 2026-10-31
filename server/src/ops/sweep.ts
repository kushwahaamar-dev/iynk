import { purgeDue } from "../identity/deletion.ts";
import type { Deps } from "../deps.ts";
import type { ServerStore } from "../store/port.ts";
import type { Logger } from "./log.ts";

const DAY_MS = 86_400_000;
const SESSION_KEEP_MS = 7 * DAY_MS;
const EXPIRED_KEEP_MS = DAY_MS;
const HOURLY_MS = 3_600_000;

export type SweepCounts = { sessions: number; codes: number; pairings: number; identities: number };

export function sweepOnce(store: ServerStore, deps: Deps): SweepCounts {
  const now = deps.clock.now();
  return store.transaction((tx) => {
    const identities = purgeDue(tx, now);
    const sessions = tx.run(
      "DELETE FROM sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)",
      now - SESSION_KEEP_MS,
      now - SESSION_KEEP_MS,
    ).changes;
    const codes = tx.run("DELETE FROM enrollment_codes WHERE expires_at < ?", now - EXPIRED_KEEP_MS).changes;
    const pairings = tx.run("DELETE FROM pairings WHERE expires_at < ?", now - EXPIRED_KEEP_MS).changes;
    return { sessions, codes, pairings, identities };
  });
}

export function startSweep(store: ServerStore, deps: Deps, log: Logger, everyMs = HOURLY_MS): { stop(): void } {
  const timer = setInterval(() => {
    try {
      const counts = sweepOnce(store, deps);
      log.info("swept", counts);
      if (counts.identities > 0) log.info("identity_deleted", { count: counts.identities });
    } catch (error) {
      log.error("sweep_failed", { error });
    }
  }, everyMs);
  timer.unref();
  return { stop: () => clearInterval(timer) };
}
