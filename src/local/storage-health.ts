import type { IndexRow, Repository } from "./repository";
import type { Timers } from "./autosave";

export interface ProgressKv {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

export interface HealthState {
  persisted: boolean | null;
  usage: number | null;
  quota: number | null;
  warn: "none" | "near-full" | "quota-failed" | "unavailable";
  fileNudgeDue: boolean;
}

export interface StorageHealth {
  init(): Promise<HealthState>;
  /** The first save asks the browser to keep the data, once, and refreshes the usage numbers. */
  onSaved(): Promise<void>;
  onSaveFailed(kind: string): void;
  /** Re-evaluates the nudge to keep a file copy. Call it when the person starts editing and after each save. */
  checkFileNudge(row: Pick<IndexRow, "hasFileCopy">, firstUnsavedToFileAt: number | null): void;
  subscribe(fn: (s: HealthState) => void): () => void;
}

const PERSIST_KEY = "storage.persist";
const NEAR_FULL = 0.8;
const NUDGE_AFTER_MS = 10 * 60_000;

/** True after ten minutes of editing with no file copy of the project. */
export function fileNudgeDue(row: Pick<IndexRow, "hasFileCopy">, firstUnsavedToFileAt: number | null, now: number): boolean {
  return !row.hasFileCopy && firstUnsavedToFileAt !== null && now - firstUnsavedToFileAt >= NUDGE_AFTER_MS;
}

export function createStorageHealth(deps: {
  storage: Pick<StorageManager, "estimate" | "persist" | "persisted"> | undefined;
  repo: Pick<Repository, "estimate">;
  progress: ProgressKv;
  timers: Timers;
}): StorageHealth {
  const { storage, repo, progress, timers } = deps;
  const listeners = new Set<(s: HealthState) => void>();
  let quotaFailed = false;
  let state: HealthState = { persisted: null, usage: null, quota: null, warn: storage ? "none" : "unavailable", fileNudgeDue: false };

  function set(patch: Partial<HealthState>) {
    state = { ...state, ...patch };
    for (const fn of [...listeners]) fn(state);
  }

  const warnFor = (usage: number | null, quota: number | null): HealthState["warn"] => {
    if (state.warn === "unavailable") return "unavailable";
    if (quotaFailed) return "quota-failed";
    return usage !== null && quota !== null && quota > 0 && usage / quota >= NEAR_FULL ? "near-full" : "none";
  };

  async function measure() {
    const estimate = await repo.estimate().catch(() => null);
    const usage = estimate?.usage ?? null;
    const quota = estimate?.quota ?? null;
    set({ usage, quota, warn: warnFor(usage, quota) });
  }

  return {
    async init() {
      if (storage) {
        const recorded = await progress.get(PERSIST_KEY);
        const persisted = typeof recorded === "object" && recorded !== null && "persisted" in recorded
          ? (recorded as { persisted: boolean }).persisted
          : await storage.persisted().catch(() => null);
        state = { ...state, persisted };
        await measure();
      }
      return state;
    },

    async onSaved() {
      if (!storage) return;
      quotaFailed = false;
      if ((await progress.get(PERSIST_KEY)) === undefined) {
        const persisted = (await storage.persisted().catch(() => false)) || (await storage.persist().catch(() => false));
        await progress.set(PERSIST_KEY, { persisted, askedAt: timers.now() });
        state = { ...state, persisted };
      }
      await measure();
    },

    onSaveFailed(kind) {
      if (kind === "quota") {
        quotaFailed = true;
        set({ warn: "quota-failed" });
      } else if (kind === "unavailable") {
        set({ warn: "unavailable" });
      }
    },

    checkFileNudge(row, firstUnsavedToFileAt) {
      set({ fileNudgeDue: fileNudgeDue(row, firstUnsavedToFileAt, timers.now()) });
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}
