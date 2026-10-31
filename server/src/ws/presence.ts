import type { ErrorCode, Presence, PresencePatch } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import { TokenBucket } from "./bucket.ts";

export type PresenceState = {
  name: string;
  color: string;
  app?: string;
  status?: string;
  view?: string;
  sel?: string[];
  focus?: string | null;
  typing?: string | null;
  vp?: { x: number; y: number; zoom: number };
};

type Entry = { state: PresenceState; bucket: TokenBucket };

export class PresenceHub {
  readonly dropped = { count: 0 };
  private readonly members = new Map<number, Entry>();

  private readonly limits: CollabLimits;
  private readonly clock: () => number;

  constructor(limits: CollabLimits, clock: () => number) {
    this.limits = limits;
    this.clock = clock;
  }

  join(m: number, who: { name: string; color: string; app?: string }): void {
    const state: PresenceState = { name: who.name, color: who.color };
    if (who.app !== undefined) state.app = who.app;
    this.members.set(m, { state, bucket: new TokenBucket(this.limits.presencePerSec, this.limits.presencePerSec, this.clock()) });
  }

  leave(m: number): void {
    this.members.delete(m);
  }

  patch(m: number, p: PresencePatch): { frame: Presence } | { error: ErrorCode; retryAfterMs?: number } {
    const entry = this.members.get(m);
    if (entry === undefined) return { error: "bad_frame" };
    const now = this.clock();
    if (!entry.bucket.take(now)) {
      this.dropped.count += 1;
      return { error: "rate_limited", retryAfterMs: entry.bucket.retryAfterMs(now) };
    }
    const { status, ...rest } = p;
    Object.assign(entry.state, rest);
    if (status === null) delete entry.state.status;
    else if (status !== undefined) entry.state.status = status;
    return { frame: { t: "presence", m, patch: p } };
  }

  view(m: number): Readonly<PresenceState> | undefined {
    return this.members.get(m)?.state;
  }
}
