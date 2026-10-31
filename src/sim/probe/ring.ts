import type { SimTime } from "../core/clock.ts";
import type { TraceChunk } from "./tap.ts";

export const MAX_CAPACITY = 1_048_576;

export interface Ring {
  push(at: SimTime, v: number): void;
  /** At most `maxPoints` points of the samples in `[from, to]`; the oldest samples come first. */
  slice(from: SimTime, to: SimTime, maxPoints: number): TraceChunk;
  /** Samples overwritten because the ring was full. */
  readonly dropped: number;
  readonly length: number;
  clear(): void;
}

/** A circular buffer of `(time, value)` samples; with `envelope`, a decimated slice also carries each bucket's min and max. */
export function createRing(capacity: number, envelope: boolean): Ring {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) throw new RangeError(`ring capacity must be an integer from 1 to ${MAX_CAPACITY}, got ${capacity}`);
  const times = new Float64Array(capacity);
  const values = new Float64Array(capacity);
  let head = 0;
  let length = 0;
  let dropped = 0;

  const slot = (i: number): number => (head + i) % capacity;

  /** First logical index whose time is at least `t`; samples arrive in time order. */
  function lowerBound(t: SimTime): number {
    let lo = 0;
    let hi = length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (times[slot(mid)] < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  return {
    push(at, v) {
      if (length === capacity) {
        times[head] = at;
        values[head] = v;
        head = (head + 1) % capacity;
        dropped++;
        return;
      }
      times[slot(length)] = at;
      values[slot(length)] = v;
      length++;
    },

    slice(from, to, maxPoints) {
      if (!Number.isInteger(maxPoints) || maxPoints < 1) throw new RangeError(`maxPoints must be a positive integer, got ${maxPoints}`);
      const first = lowerBound(from);
      const count = Math.max(0, lowerBound(to + 1) - first);
      const points = Math.min(count, maxPoints);
      const t = new Float64Array(points);
      const v = new Float64Array(points);
      const min = envelope ? new Float64Array(points) : undefined;
      const max = envelope ? new Float64Array(points) : undefined;
      for (let k = 0; k < points; k++) {
        const start = first + Math.floor((k * count) / points);
        const end = first + Math.floor(((k + 1) * count) / points);
        t[k] = times[slot(start)];
        v[k] = values[slot(end - 1)];
        if (!min || !max) continue;
        let lo = Infinity;
        let hi = -Infinity;
        for (let i = start; i < end; i++) {
          const x = values[slot(i)];
          if (x < lo) lo = x;
          if (x > hi) hi = x;
        }
        min[k] = lo;
        max[k] = hi;
      }
      return { id: "", from, to, t, v, ...(min && max ? { min, max } : {}), dropped, staircase: false };
    },

    get dropped() {
      return dropped;
    },

    get length() {
      return length;
    },

    clear() {
      head = 0;
      length = 0;
      dropped = 0;
    },
  };
}
