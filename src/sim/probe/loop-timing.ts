import type { LoopStats } from "../../core/robot-report.ts";
import type { SimTime } from "../core/clock.ts";

export type LoopSource = { kind: "event"; eventKind: string } | { kind: "pin"; part: string; pin: string };

export interface LoopTimingProbe {
  push(atNs: SimTime): void;
  stats(): LoopStats;
  dropped(): number;
  targetPeriodNs?: number;
  overrunFraction(): number;
}

export const DEFAULT_LOOP_CAPACITY = 65_536;
export const DEFAULT_LOOP_BUCKETS = 32;
const OVERRUN_FACTOR = 2;

export function createLoopTiming(
  opts: { buckets?: number; capacity?: number; targetPeriodNs?: number } = {},
): LoopTimingProbe {
  const capacity = opts.capacity ?? DEFAULT_LOOP_CAPACITY;
  const buckets = opts.buckets ?? DEFAULT_LOOP_BUCKETS;
  if (!Number.isInteger(capacity) || capacity < 2) throw new RangeError("capacity must be an integer of at least 2");
  if (!Number.isInteger(buckets) || buckets < 1) throw new RangeError("buckets must be a positive integer");

  const ring = new Float64Array(capacity);
  let head = 0;
  let size = 0;
  let droppedCount = 0;

  const periods = (): Float64Array => {
    const out = new Float64Array(Math.max(0, size - 1));
    const first = (head - size + capacity) % capacity;
    for (let i = 1; i < size; i++) out[i - 1] = ring[(first + i) % capacity] - ring[(first + i - 1) % capacity];
    return out;
  };

  const histogram = (p: Float64Array, min: number, max: number): LoopStats["histogram"] => {
    const lo = Math.max(min, 1);
    const ratio = Math.max(max, lo) / lo;
    const edge = (i: number) => lo * ratio ** (i / buckets);
    const counts = new Array<number>(buckets).fill(0);
    for (const v of p) {
      const at = ratio === 1 ? 0 : Math.floor((Math.log(Math.max(v, lo) / lo) / Math.log(ratio)) * buckets);
      counts[Math.min(buckets - 1, at)]++;
    }
    return counts.map((count, i) => ({ loNs: edge(i), hiNs: edge(i + 1), count }));
  };

  const probe: LoopTimingProbe = {
    push(atNs) {
      if (size > 0 && atNs < ring[(head - 1 + capacity) % capacity]) {
        droppedCount++;
        return;
      }
      ring[head] = atNs;
      head = (head + 1) % capacity;
      if (size < capacity) size++;
    },
    stats() {
      const p = periods();
      const n = p.length;
      if (n === 0) return { n: 0, meanNs: 0, p95Ns: 0, maxNs: 0, jitterNs: 0, histogram: [] };
      const sorted = Float64Array.from(p).sort();
      let sum = 0;
      for (const v of p) sum += v;
      const meanNs = sum / n;
      let sq = 0;
      for (const v of p) sq += (v - meanNs) ** 2;
      return {
        n,
        meanNs,
        p95Ns: sorted[Math.ceil(0.95 * n) - 1],
        maxNs: sorted[n - 1],
        jitterNs: Math.sqrt(sq / n),
        histogram: histogram(p, sorted[0], sorted[n - 1]),
      };
    },
    dropped: () => droppedCount,
    targetPeriodNs: opts.targetPeriodNs,
    overrunFraction() {
      const target = probe.targetPeriodNs;
      if (target === undefined) return 0;
      const p = periods();
      if (p.length === 0) return 0;
      let over = 0;
      for (const v of p) if (v > OVERRUN_FACTOR * target) over++;
      return over / p.length;
    },
  };
  return probe;
}
