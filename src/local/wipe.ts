import { AI_STORES, STORE_NAMES } from "./stores";
import type { Repository } from "./repository";

export interface WipeReport {
  stores: string[];
  localStorageKeys: string[];
  caches: string[];
  serviceWorkers: number;
  errors: string[];
}

export const WIPE_PHRASE = "wipe iynk";

const KEY_PREFIX = "iynk:";
const CACHE_PREFIX = "iynk-";

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

function requirePhrase(confirmation: string) {
  if (confirmation !== WIPE_PHRASE) throw new Error("bad_confirmation");
}

/** Worker half: IndexedDB only. Every store is tried even when one fails, and the failure is listed. */
export async function wipeStores(
  repo: Pick<Repository, "clearStores">,
  confirmation: string,
): Promise<Pick<WipeReport, "stores" | "errors">> {
  requirePhrase(confirmation);
  const report: Pick<WipeReport, "stores" | "errors"> = { stores: [], errors: [] };
  for (const name of STORE_NAMES) {
    try {
      await repo.clearStores([name]);
      report.stores.push(name);
    } catch (error) {
      report.errors.push(`store ${name}: ${reason(error)}`);
    }
  }
  return report;
}

/** Clears the AI stores in one transaction. The keys, server, identity and journal stores stay. */
export function deleteAiData(repo: Pick<Repository, "clearStores">): Promise<void> {
  return repo.clearStores(AI_STORES);
}

/** Main-thread half: localStorage, Cache Storage and the service worker. A missing API is skipped. */
export async function wipeBrowser(
  deps: { local: Storage | null; caches: CacheStorage | null; sw: ServiceWorkerContainer | null },
  confirmation: string,
): Promise<Pick<WipeReport, "localStorageKeys" | "caches" | "serviceWorkers" | "errors">> {
  requirePhrase(confirmation);
  const report: Pick<WipeReport, "localStorageKeys" | "caches" | "serviceWorkers" | "errors"> = {
    localStorageKeys: [],
    caches: [],
    serviceWorkers: 0,
    errors: [],
  };

  if (deps.local) {
    const { local } = deps;
    try {
      const keys = Array.from({ length: local.length }, (_, i) => local.key(i)).filter(
        (key): key is string => key !== null && key.startsWith(KEY_PREFIX),
      );
      for (const key of keys) {
        try {
          local.removeItem(key);
          report.localStorageKeys.push(key);
        } catch (error) {
          report.errors.push(`localStorage ${key}: ${reason(error)}`);
        }
      }
    } catch (error) {
      report.errors.push(`localStorage: ${reason(error)}`);
    }
  }

  if (deps.caches) {
    const { caches } = deps;
    try {
      const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
      for (const name of names) {
        try {
          if (await caches.delete(name)) report.caches.push(name);
        } catch (error) {
          report.errors.push(`cache ${name}: ${reason(error)}`);
        }
      }
    } catch (error) {
      report.errors.push(`caches: ${reason(error)}`);
    }
  }

  if (deps.sw) {
    const { sw } = deps;
    try {
      for (const registration of await sw.getRegistrations()) {
        try {
          if (await registration.unregister()) report.serviceWorkers += 1;
        } catch (error) {
          report.errors.push(`service worker: ${reason(error)}`);
        }
      }
    } catch (error) {
      report.errors.push(`service workers: ${reason(error)}`);
    }
  }

  return report;
}

export function mergeWipeReports(
  a: Pick<WipeReport, "stores" | "errors">,
  b: Pick<WipeReport, "localStorageKeys" | "caches" | "serviceWorkers" | "errors">,
): WipeReport {
  return {
    stores: a.stores,
    localStorageKeys: b.localStorageKeys,
    caches: b.caches,
    serviceWorkers: b.serviceWorkers,
    errors: [...a.errors, ...b.errors],
  };
}
