"use client";

import { useSyncExternalStore } from "react";
import type { BoardLabState, BoardLabStore } from "@/lib/boardlab/store";

/**
 * Read a slice of the lab store. The selector must return a value already in
 * the state (or a primitive), never a fresh object, so renders stay stable.
 */
export function useLab<T>(store: BoardLabStore, select: (s: BoardLabState) => T): T {
  const get = () => select(store.getState());
  return useSyncExternalStore(store.subscribe, get, get);
}
