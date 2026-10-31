import type { LearnStore } from "@/local/learn-store";
import { migrate, STORAGE_KEY } from "../progress/storage";
import { completeLegacy, IMPORT_MARKER, projectIdForKey } from "./facade";

export { IMPORT_MARKER };

export interface ImportReport {
  imported: number;
  skipped: string[];
  byPrefix: Record<string, number>;
}

interface ImportDeps {
  storage: Pick<Storage, "getItem" | "setItem">;
  store: LearnStore;
  flush(): Promise<void>;
  recordCount(): Promise<number>;
  now(): string;
  stepCount(projectId: string): Promise<number | null>;
}

/** Copies the board `done` keys of `iynk:v1` into learner records, once. The old document is never changed. */
export async function importLegacyProgress(deps: ImportDeps): Promise<ImportReport> {
  const report: ImportReport = { imported: 0, skipped: [], byPrefix: {} };

  let raw: string | null;
  try {
    if (deps.storage.getItem(IMPORT_MARKER) !== null) return report;
    raw = deps.storage.getItem(STORAGE_KEY);
  } catch {
    return report;
  }
  let document: unknown = null;
  try {
    document = raw === null ? null : JSON.parse(raw);
  } catch {
    // An unreadable document has nothing to import.
  }

  const now = deps.now();
  for (const key of Object.keys(migrate(document).done)) {
    const target = projectIdForKey(key);
    if (!target) continue;
    const steps = await deps.stepCount(target.projectId);
    if (steps === null) {
      report.skipped.push(key);
      continue;
    }
    deps.store.update(target.projectId, (record) => completeLegacy(record, target.projectId, target.kind, steps, now), now);
    report.imported += 1;
    const prefix = target.kind === "lesson" ? key.slice(0, key.lastIndexOf(":") + 1) : key;
    report.byPrefix[prefix] = (report.byPrefix[prefix] ?? 0) + 1;
  }

  await deps.flush();
  const stored = await deps.recordCount();
  if (stored < report.imported) {
    throw new Error(`iynk progress import: ${report.imported} keys imported but only ${stored} records are stored.`);
  }
  deps.storage.setItem(IMPORT_MARKER, JSON.stringify({ at: now, count: report.imported }));
  return report;
}
