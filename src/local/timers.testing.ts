import type { Timers } from "./autosave";

export interface FakeTimers extends Timers {
  /** Moves the clock forward, firing every timer that falls due on the way, in order. */
  advance(ms: number): void;
}

export function fakeTimers(start = 0): FakeTimers {
  let clock = start;
  let nextId = 1;
  const due = new Map<number, { at: number; fn: () => void }>();

  return {
    now: () => clock,
    setTimeout(fn, ms) {
      const id = nextId++;
      due.set(id, { at: clock + ms, fn });
      return id;
    },
    clearTimeout: (id) => void due.delete(id),
    advance(ms) {
      const end = clock + ms;
      for (;;) {
        const next = [...due.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
        if (!next) break;
        due.delete(next[0]);
        clock = next[1].at;
        next[1].fn();
      }
      clock = end;
    },
  };
}
