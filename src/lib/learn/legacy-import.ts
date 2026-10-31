import type { LearnStore } from "@/local/learn-store";
import { emptyRecord, MAX_QUIZZES, MAX_STEPS, withItem, withStep, type LearnerRecord } from "@/project/guided/record";
import { migrate, STORAGE_KEY } from "../progress/storage";
import { boardTargetForKey, completeLegacy, IMPORT_MARKER, labItemForKey, LABS_IMPORT_MARKER } from "./facade";

export { IMPORT_MARKER, LABS_IMPORT_MARKER };

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
    const target = boardTargetForKey(key);
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

type LabImportDeps = Omit<ImportDeps, "stepCount"> & {
  /** Where the bench step sits in the bench guide, or null when the bench or step is unknown. */
  stepIndex(projectId: string, stepId: string): Promise<number | null>;
};

/**
 * Copies the bench and craft `done` keys and quiz results of `iynk:v1` into learner records, once. It has its own marker
 * because installs that ran `importLegacyProgress` before skipped these keys. The old document is never changed.
 */
export async function importLegacyLabProgress(deps: LabImportDeps): Promise<ImportReport> {
  const report: ImportReport = { imported: 0, skipped: [], byPrefix: {} };

  let raw: string | null;
  try {
    if (deps.storage.getItem(LABS_IMPORT_MARKER) !== null) return report;
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
  const saved = migrate(document);
  const touched = new Set<string>();

  const write = (key: string, projectId: string, change: (record: LearnerRecord) => LearnerRecord) => {
    try {
      deps.store.update(projectId, (record) => change(record ?? { ...emptyRecord(projectId, now), legacy: true }), now);
    } catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      report.skipped.push(key);
      return;
    }
    touched.add(projectId);
    report.imported += 1;
    const prefix = key.slice(0, key.lastIndexOf(":") + 1);
    report.byPrefix[prefix] = (report.byPrefix[prefix] ?? 0) + 1;
  };

  for (const key of Object.keys(saved.done)) {
    const target = labItemForKey(key);
    if (!target) continue;
    const { projectId, item } = target;
    if (item.kind === "step") {
      const index = await deps.stepIndex(projectId, item.id ?? "");
      if (index === null || index >= MAX_STEPS) report.skipped.push(key);
      else write(key, projectId, (record) => withStep(record, index, "manual", now));
    } else if (item.kind === "task") {
      write(key, projectId, (record) => completeLegacy(record, projectId, "lesson", 0, now));
    } else if (item.kind !== "quiz") {
      write(key, projectId, (record) => withItem(record, item.id === null ? item.kind : `${item.kind}:${item.id}`, "manual", now));
    }
  }

  for (const [key, result] of Object.entries(saved.quiz)) {
    const target = labItemForKey(key);
    if (target?.item.kind !== "quiz" || target.item.id === null) continue;
    const { projectId, item } = target;
    write(key, projectId, (record) => {
      if (item.id === null || record.quiz[item.id]) return record;
      if (Object.keys(record.quiz).length >= MAX_QUIZZES) throw new RangeError("quiz limit");
      return { ...record, quiz: { ...record.quiz, [item.id]: { answers: {}, correct: result.score, total: result.total } } };
    });
  }

  await deps.flush();
  const stored = await deps.recordCount();
  if (stored < touched.size) {
    throw new Error(`iynk lab progress import: ${touched.size} records written but only ${stored} are stored.`);
  }
  deps.storage.setItem(LABS_IMPORT_MARKER, JSON.stringify({ at: now, count: report.imported }));
  return report;
}
