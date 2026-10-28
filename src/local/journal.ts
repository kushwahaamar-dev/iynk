import type { Op } from "@/project/generated/types";
import type { Repository } from "./repository";
import type { JournalEdit, JournalRow } from "./stores";
import type { Timers } from "./autosave";

export type { JournalEdit } from "./stores";

const BURST_MS = 300;

interface Pending {
  baseRevision: number;
  edits: JournalEdit[];
  timer: number;
}

export interface JournalWriter {
  record(projectId: string, baseRevision: number, edit: JournalEdit): void;
  flushNow(): Promise<void>;
}

export function createJournalWriter(repo: Pick<Repository, "journal">, timers: Timers, burstMs = BURST_MS): JournalWriter {
  const pending = new Map<string, Pending>();
  let writes: Promise<unknown> = Promise.resolve();

  function write(projectId: string): Promise<void> {
    const batch = pending.get(projectId);
    if (!batch) return writes.then(() => undefined);
    timers.clearTimeout(batch.timer);
    pending.delete(projectId);
    const next = writes.then(() => repo.journal.append(projectId, batch.baseRevision, batch.edits, timers.now()));
    writes = next.catch(() => undefined);
    return next;
  }

  return {
    record(projectId, baseRevision, edit) {
      const open = pending.get(projectId);
      if (open && open.baseRevision !== baseRevision) void write(projectId).catch(() => undefined);
      const batch = pending.get(projectId) ?? { baseRevision, edits: [], timer: 0 };
      if (batch.timer) timers.clearTimeout(batch.timer);
      batch.edits.push(edit);
      batch.timer = timers.setTimeout(() => void write(projectId).catch(() => undefined), burstMs);
      pending.set(projectId, batch);
    },

    async flushNow() {
      await Promise.all([...pending.keys()].map(write));
      await writes;
    },
  };
}

/**
 * Turns a journal row back into `source.edit` ops. Each edit was typed on top of the one before, so its base is the
 * revision the previous edit produced. `stale` means the document moved on since the journal was started.
 */
export function journalToOps(journal: JournalRow, current: { revision: number }): Op[] | "stale" {
  if (journal.baseRevision !== current.revision) return "stale";
  return journal.edits.map((edit, i) => ({
    k: "source.edit",
    id: edit.src,
    baseSeq: journal.baseRevision + i,
    pos: edit.pos,
    del: edit.del,
    ins: edit.ins,
  }));
}
