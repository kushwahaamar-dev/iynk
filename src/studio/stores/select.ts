import { useRef, useSyncExternalStore } from "react";

export interface Store<S> {
  getState(): S;
  subscribe(listener: () => void): () => void;
}

export function createStore<S>(initial: S): Store<S> & { setState(next: S | ((s: S) => S)): void } {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setState(next) {
      const value = typeof next === "function" ? (next as (s: S) => S)(state) : next;
      if (Object.is(value, state)) return;
      state = value;
      for (const listener of [...listeners]) if (listeners.has(listener)) listener();
    },
  };
}

export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/**
 * Re-renders only when `pick` returns something `eq` calls different. `pick` may be an inline function: the last
 * result is kept in a ref, so a new function with an equal result hands back the same value.
 */
export function useStoreSelector<S, R>(store: Store<S>, pick: (s: S) => R, eq: (a: R, b: R) => boolean = Object.is): R {
  const last = useRef<{ state: S; value: R } | null>(null);
  const getSnapshot = (): R => {
    const state = store.getState();
    const prev = last.current;
    if (prev && prev.state === state) return prev.value;
    const picked = pick(state);
    const value = prev && eq(prev.value, picked) ? prev.value : picked;
    last.current = { state, value };
    return value;
  };
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
