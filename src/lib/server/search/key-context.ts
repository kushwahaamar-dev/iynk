import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export type SearchContext = { key: string; keyId: string };

const storage = new AsyncLocalStorage<SearchContext>();

/** Runs `fn` with the caller's search key in scope, so the search functions can read it without it being passed through. */
export function withSearchKey<T>(ctx: SearchContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

export function currentSearchKey(): SearchContext | undefined {
  return storage.getStore();
}
