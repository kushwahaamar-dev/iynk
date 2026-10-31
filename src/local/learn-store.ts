import type { LearnerRecord } from "@/project/guided/record";
import type { ProgressRepo } from "./progress";

export interface LearnStore {
  readonly ready: Promise<void>;
  /** The same object until a record changes; empty before `ready`. */
  snapshot(): ReadonlyMap<string, LearnerRecord>;
  get(projectId: string): LearnerRecord | undefined;
  subscribe(listener: () => void): () => void;
  /** Applies in memory, notifies, then writes through after a quiet spell. Called before `ready`, it waits for it. */
  update(projectId: string, fn: (r: LearnerRecord | undefined) => LearnerRecord, now: string): void;
  persistError(): Error | null;
}

const WRITE_DELAY_MS = 200;
const RETRY_DELAY_MS = 2_000;

export function createLearnStore(
  repo: ProgressRepo,
  deps: { setTimeout?: typeof setTimeout; target?: Pick<EventTarget, "addEventListener"> } = {},
): LearnStore {
  const schedule = deps.setTimeout ?? setTimeout;
  const target = deps.target ?? (typeof window === "undefined" ? undefined : window);
  const listeners = new Set<() => void>();
  const dirty = new Set<string>();
  let records: ReadonlyMap<string, LearnerRecord> = new Map();
  let hydrated = false;
  let failure: Error | null = null;
  let quiet = 0;
  let retried = false;

  function publish(next: ReadonlyMap<string, LearnerRecord>) {
    records = next;
    for (const listener of [...listeners]) listener();
  }

  async function flush(): Promise<void> {
    for (const id of [...dirty]) {
      const record = records.get(id);
      if (!record) {
        dirty.delete(id);
        continue;
      }
      try {
        await repo.put(record);
        if (records.get(id) === record) dirty.delete(id);
      } catch (cause) {
        failure = cause instanceof Error ? cause : new Error(String(cause));
        if (!retried) {
          retried = true;
          schedule(() => void flush(), RETRY_DELAY_MS);
        }
        return;
      }
    }
    failure = null;
    retried = false;
  }

  function queueWrite() {
    const mine = ++quiet;
    schedule(() => {
      if (mine === quiet) void flush();
    }, WRITE_DELAY_MS);
  }

  function apply(projectId: string, fn: (r: LearnerRecord | undefined) => LearnerRecord) {
    const next = new Map(records);
    next.set(projectId, fn(records.get(projectId)));
    dirty.add(projectId);
    publish(next);
    queueWrite();
  }

  async function hydrate(): Promise<void> {
    try {
      const stored = await repo.all();
      const next = new Map(records);
      for (const record of stored) if (!dirty.has(record.projectId)) next.set(record.projectId, record);
      publish(next);
    } catch (cause) {
      failure = cause instanceof Error ? cause : new Error(String(cause));
    }
  }

  const ready = hydrate().then(() => {
    hydrated = true;
  });

  target?.addEventListener("pagehide", () => void flush());
  target?.addEventListener("visibilitychange", () => {
    if (hydrated && dirty.size === 0 && globalThis.document?.visibilityState === "visible") void hydrate();
  });

  return {
    ready,
    snapshot: () => records,
    get: (projectId) => records.get(projectId),
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    update(projectId, fn) {
      if (hydrated) apply(projectId, fn);
      else void ready.then(() => apply(projectId, fn));
    },
    persistError: () => failure,
  };
}
