import type { SimEvent } from "./engine.ts";

export const QUEUE_CAP = 1_000_000;

/** True when `a` runs before `b` in the total order `(at, phase, rank, seq)`. */
export function before(a: SimEvent, b: SimEvent): boolean {
  if (a.at !== b.at) return a.at < b.at;
  if (a.phase !== b.phase) return a.phase < b.phase;
  if (a.rank !== b.rank) return a.rank < b.rank;
  return a.seq < b.seq;
}

/** Binary min-heap on `(at, phase, rank, seq)`. */
export class EventQueue {
  private readonly heap: SimEvent[] = [];
  private readonly cap: number;

  constructor(cap = QUEUE_CAP) {
    this.cap = cap;
  }

  get size(): number {
    return this.heap.length;
  }

  /** False, and the event is dropped, when the queue is full. */
  push(e: SimEvent): boolean {
    if (this.heap.length >= this.cap) return false;
    const heap = this.heap;
    let i = heap.length;
    heap.push(e);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(e, heap[parent])) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = e;
    return true;
  }

  peek(): SimEvent | undefined {
    return this.heap[0];
  }

  peekTime(): number | null {
    return this.heap.length === 0 ? null : this.heap[0].at;
  }

  pop(): SimEvent | undefined {
    const heap = this.heap;
    const top = heap[0];
    const last = heap.pop();
    if (last === undefined || heap.length === 0) return top;
    let i = 0;
    for (;;) {
      let child = 2 * i + 1;
      if (child >= heap.length) break;
      if (child + 1 < heap.length && before(heap[child + 1], heap[child])) child++;
      if (!before(heap[child], last)) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return top;
  }

  clear(): void {
    this.heap.length = 0;
  }
}
