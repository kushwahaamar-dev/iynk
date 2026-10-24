/**
 * Deterministic virtual clock with a timer queue. Time is in microseconds of
 * simulated time; nothing here reads the wall clock.
 */
export interface TimerEntry {
  at: number;
  seq: number;
  fn: () => void;
  cancelled?: boolean;
}

export class VirtualClock {
  /** Simulated time in microseconds since power-on. */
  now = 0;
  private queue: TimerEntry[] = [];
  private seq = 0;

  /** Run `fn` when simulated time reaches `at` (µs). Returns a cancel function. */
  at(at: number, fn: () => void): () => void {
    const entry: TimerEntry = { at: Math.max(at, this.now), seq: this.seq++, fn };
    // Keep the queue sorted by time, then insertion order; it stays small.
    let lo = 0;
    let hi = this.queue.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const q = this.queue[mid];
      if (q.at < entry.at || (q.at === entry.at && q.seq < entry.seq)) lo = mid + 1;
      else hi = mid;
    }
    this.queue.splice(lo, 0, entry);
    return () => {
      entry.cancelled = true;
    };
  }

  after(us: number, fn: () => void): () => void {
    return this.at(this.now + us, fn);
  }

  /** Time of the next pending timer, or Infinity. */
  next(): number {
    while (this.queue.length && this.queue[0].cancelled) this.queue.shift();
    return this.queue.length ? this.queue[0].at : Infinity;
  }

  /** Fire every timer due at or before `now`, in order. */
  fireDue(): void {
    while (this.queue.length && this.queue[0].at <= this.now) {
      const e = this.queue.shift()!;
      if (!e.cancelled) e.fn();
    }
  }

  /** Move time forward to `t`, firing timers on the way. */
  advanceTo(t: number): void {
    while (true) {
      const n = this.next();
      if (n > t) break;
      this.now = Math.max(this.now, n);
      this.fireDue();
    }
    if (t > this.now) this.now = t;
  }

  clear(): void {
    this.queue = [];
    this.now = 0;
  }
}
