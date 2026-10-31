// The bench page's one store (D14b): the session's state changed only through dispatch(action).
// Effects from the reducer are carried out by the connected handlers.

import type { LabStore } from "@/components/dock/types";
import { initialBenchState, reduceBench, type BenchAction, type BenchEffect, type BenchSetup, type BenchState } from "./session";

export * from "./session";

export type EffectHandlers = { run(effect: BenchEffect, store: BenchStore): void };

export type BenchStore = LabStore<BenchState, BenchAction> & {
  /** Carries out effects (figure messages, progress, task runs). Returns a disconnect function. */
  connect(handlers: EffectHandlers): () => void;
};

export function createBenchStore(setup: BenchSetup): BenchStore {
  let state = initialBenchState(setup);
  const listeners = new Set<() => void>();
  let handlers: EffectHandlers | null = null;

  const store: BenchStore = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const [next, effects] = reduceBench(setup, state, action);
      if (next !== state) {
        state = next;
        for (const listener of [...listeners]) listener();
      }
      for (const effect of effects) handlers?.run(effect, store);
    },
    connect(next) {
      handlers = next;
      return () => {
        if (handlers === next) handlers = null;
      };
    },
  };
  return store;
}
