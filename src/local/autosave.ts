import type { ProjectHost } from "./project-host";
import type { ProjectEv, SaveReason } from "./project-protocol";
import type { ProjectSession } from "@/project/session";
import type { DocChange } from "@/project/touched";

export interface Timers {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
  now(): number;
}

/**
 * S2 found that a transaction first requested in `pagehide` is not reliable in either engine, so the journal batch is
 * also written from the main thread before the page goes, and `pagehide` is only a best-effort extra.
 */
export type FlushStrategy = "worker-at-pagehide" | "main-journal-at-pagehide";

export const DEFAULT_FLUSH_STRATEGY: FlushStrategy = "main-journal-at-pagehide";

export type AutosaveStatus = "saved" | "saving" | "unsaved" | "failed";

export interface AutosaveHandle {
  dispose(): void;
  status(): AutosaveStatus;
  lastSavedAt(): number | null;
}

export interface AutosaveEnv {
  timers: Timers;
  doc: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
  win: Pick<Window, "addEventListener" | "removeEventListener">;
  strategy: FlushStrategy;
  /** Writes the pending text edits to the journal; called when the page hides or goes away. */
  flushJournal?: () => Promise<void>;
  debounceMs?: number;
  maxWaitMs?: number;
}

const DEBOUNCE_MS = 500;
const MAX_WAIT_MS = 5_000;

export function attachAutosave(
  session: Pick<ProjectSession, "subscribe" | "state" | "revision">,
  host: Pick<ProjectHost, "open" | "commit" | "save" | "onEvent">,
  env: AutosaveEnv,
): AutosaveHandle {
  const { timers, doc, win, strategy, flushJournal } = env;
  const debounceMs = env.debounceMs ?? DEBOUNCE_MS;
  const maxWaitMs = env.maxWaitMs ?? MAX_WAIT_MS;

  let dirty = false;
  let saving = false;
  let failed = false;
  let queued: SaveReason | null = null;
  let firstUnsavedAt: number | null = null;
  let debounceId: number | null = null;
  let maxWaitId: number | null = null;
  let savedAt: number | null = null;

  function clearTimers() {
    if (debounceId !== null) timers.clearTimeout(debounceId);
    if (maxWaitId !== null) timers.clearTimeout(maxWaitId);
    debounceId = null;
    maxWaitId = null;
  }

  function send(reason: SaveReason) {
    clearTimers();
    if (saving) {
      queued = reason;
      return;
    }
    saving = true;
    dirty = false;
    firstUnsavedAt = null;
    host.save(reason).catch(() => {
      saving = false;
      failed = true;
    });
  }

  function schedule() {
    if (debounceId !== null) timers.clearTimeout(debounceId);
    debounceId = timers.setTimeout(() => send("debounce"), debounceMs);
    if (firstUnsavedAt === null) {
      firstUnsavedAt = timers.now();
      maxWaitId = timers.setTimeout(() => send("maxwait"), maxWaitMs);
    }
  }

  function flush(reason: "hidden" | "pagehide") {
    if (strategy === "main-journal-at-pagehide") void flushJournal?.().catch(() => undefined);
    if (dirty && !failed) send(reason);
  }

  function pushToHost(change: DocChange) {
    const { state } = session;
    const envelopes = state.history.ops.filter((e) => e.seq > change.from && e.seq <= change.to);
    const sent =
      state.history.baseRevision > change.from || envelopes.length !== change.to - change.from
        ? host.open(state.id, state, session.revision)
        : host.commit(change.from, change.to, envelopes);
    sent.catch(() => {
      failed = true;
      clearTimers();
    });
  }

  const unsubscribe = session.subscribe((change) => {
    if (change.origin === "load") return;
    pushToHost(change);
    dirty = true;
    if (!failed) schedule();
  });

  const unlisten = host.onEvent((ev: ProjectEv) => {
    if (ev.t === "saved") {
      savedAt = timers.now();
      if (saving) saving = false;
      else if (failed) {
        dirty = false;
        firstUnsavedAt = null;
        clearTimers();
      }
      failed = false;
      if (queued && dirty) send(queued);
      queued = null;
    } else if (ev.t === "save_failed") {
      saving = false;
      failed = true;
      queued = null;
      clearTimers();
    }
  });

  const onVisibility = () => {
    if (doc.visibilityState === "hidden") flush("hidden");
  };
  const onPageHide = () => flush("pagehide");
  doc.addEventListener("visibilitychange", onVisibility);
  win.addEventListener("pagehide", onPageHide);

  return {
    dispose() {
      unsubscribe();
      unlisten();
      doc.removeEventListener("visibilitychange", onVisibility);
      win.removeEventListener("pagehide", onPageHide);
      clearTimers();
    },
    status: () => (failed ? "failed" : saving ? "saving" : dirty ? "unsaved" : "saved"),
    lastSavedAt: () => savedAt,
  };
}
