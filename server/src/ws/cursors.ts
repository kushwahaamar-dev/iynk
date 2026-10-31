import type { CursorUp, Cursors } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import { authorizeCursor, type Subject } from "../rooms/permissions.ts";
import { TokenBucket } from "./bucket.ts";

type Sample = [view: string, x_mm: number, y_mm: number];

const quantise = (mm: number) => Math.round(mm * 10) / 10;

export class CursorBatcher {
  readonly dropped = { count: 0 };
  private readonly latest = new Map<number, Sample>();
  private readonly buckets = new Map<number, TokenBucket>();

  private readonly limits: CollabLimits;
  private readonly clock: () => number;

  constructor(limits: CollabLimits, clock: () => number) {
    this.limits = limits;
    this.clock = clock;
  }

  push(subject: Subject, m: number, c: CursorUp, spectatorCursors: boolean): "ok" | "dropped" | "permission" {
    if (!authorizeCursor(subject, spectatorCursors).ok) return "permission";
    const now = this.clock();
    let bucket = this.buckets.get(m);
    if (bucket === undefined) {
      bucket = new TokenBucket(this.limits.cursorHz, this.limits.cursorBurst, now);
      this.buckets.set(m, bucket);
    }
    if (!bucket.take(now)) {
      this.dropped.count += 1;
      return "dropped";
    }
    this.latest.set(m, [c.view, quantise(c.x_mm), quantise(c.y_mm)]);
    return "ok";
  }

  leave(m: number): void {
    this.latest.delete(m);
    this.buckets.delete(m);
  }

  drain(memberCount: number): Cursors | null {
    if (memberCount < 2) {
      this.latest.clear();
      return null;
    }
    if (this.latest.size === 0) return null;
    const c: Cursors["c"] = [...this.latest].sort(([a], [b]) => a - b).map(([m, [view, x, y]]) => [m, view, x, y]);
    this.latest.clear();
    return { t: "cursors", c };
  }
}
