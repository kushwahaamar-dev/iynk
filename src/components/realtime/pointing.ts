import { useSyncExternalStore } from "react";

// Point mode is one switch per page: the room bar turns it on, the figure's overlay lays the surface down.
let pointing = false;
const listeners = new Set<() => void>();

export function setPointing(next: boolean) {
  if (next === pointing) return;
  pointing = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePointing(): boolean {
  return useSyncExternalStore(subscribe, () => pointing, () => false);
}
