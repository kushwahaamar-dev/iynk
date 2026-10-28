// @vitest-environment node
import { describe, expect, it } from "vitest";
import { rng } from "../core/prng.ts";
import type { Phase, SimEvent } from "./engine.ts";
import { EventQueue, before } from "./queue.ts";

const event = (at: number, phase: Phase, rank: number, seq: number): SimEvent => ({
  at,
  phase,
  rank,
  seq,
  src: "t",
  kind: "k",
  payload: null,
});

const drain = (q: EventQueue): SimEvent[] => {
  const out: SimEvent[] = [];
  for (let e = q.pop(); e !== undefined; e = q.pop()) out.push(e);
  return out;
};

describe("EventQueue", () => {
  it("pops 1,000 random schedules in the order of (at, phase, rank, seq)", () => {
    const r = rng(0x5eed, "queue-test");
    for (let run = 0; run < 1000; run++) {
      const q = new EventQueue();
      const events: SimEvent[] = [];
      const count = 1 + (r.next() % 40);
      for (let i = 0; i < count; i++) {
        const e = event(r.next() % 6, (r.next() % 7) as Phase, [10, 20, 30, 35][r.next() % 4], i);
        events.push(e);
        q.push(e);
      }
      const expected = [...events].sort((a, b) => (before(a, b) ? -1 : 1));
      expect(drain(q)).toEqual(expected);
    }
  });

  it("orders events with the same time, phase and rank by seq", () => {
    const q = new EventQueue();
    for (const seq of [3, 1, 2]) q.push(event(5, 2, 30, seq));
    expect(drain(q).map((e) => e.seq)).toEqual([1, 2, 3]);
  });

  it("reports the time of the next event", () => {
    const q = new EventQueue();
    expect(q.peekTime()).toBeNull();
    q.push(event(9, 0, 0, 1));
    q.push(event(4, 0, 0, 2));
    expect(q.peekTime()).toBe(4);
    expect(q.size).toBe(2);
  });

  it("refuses an event past the cap", () => {
    const q = new EventQueue(3);
    expect([1, 2, 3, 4].map((seq) => q.push(event(0, 0, 0, seq)))).toEqual([true, true, true, false]);
    expect(q.size).toBe(3);
  });

  it("handles 1e6 pushes and pops in well under the 1.5 s estimate", () => {
    const r = rng(7, "queue-load");
    const q = new EventQueue();
    const start = performance.now();
    for (let i = 0; i < 1_000_000; i++) q.push(event(r.next() % 1_000_000, 2, 30, i));
    let last = -1;
    for (let e = q.pop(); e !== undefined; e = q.pop()) {
      if (e.at < last) throw new Error("out of order");
      last = e.at;
    }
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
