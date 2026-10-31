import type { LabStore } from "@/components/dock/types";

export type LabSession<S, A extends { type: string }, E> = LabStore<S, A> & {
  /** Effects are held until a handler connects, then delivered in order. Returns a disconnect. */
  connect(handler: (effect: E) => void): () => void;
};

const QUEUE_CAP = 64;

export function createLabSession<S, A extends { type: string }, E>(
  initial: S,
  reduce: (state: S, action: A) => readonly [S, readonly E[]],
): LabSession<S, A, E> {
  let state = initial;
  const listeners = new Set<() => void>();
  let handler: ((effect: E) => void) | null = null;
  let waiting: E[] = [];

  function deliver(effect: E) {
    if (handler) {
      handler(effect);
      return;
    }
    waiting.push(effect);
    if (waiting.length > QUEUE_CAP) waiting.shift();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const [next, effects] = reduce(state, action);
      if (next !== state) {
        state = next;
        for (const listener of [...listeners]) if (listeners.has(listener)) listener();
      }
      for (const effect of effects) deliver(effect);
    },
    connect(next) {
      handler = next;
      const held = waiting;
      waiting = [];
      for (const effect of held) next(effect);
      return () => {
        if (handler === next) handler = null;
      };
    },
  };
}
