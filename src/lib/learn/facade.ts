// One store behind src/lib/progress. Board lessons and tours are done in the learner records (src/local/progress.ts);
// the old iynk:v1 keys stay as the backup and as the answer until the import has run and the records are loaded.

import { BOARD_IDS } from "@/content/ids";
import { createLearnStore, type LearnStore } from "@/local/learn-store";
import { createProgressRepo, idbLearnKv, memoryLearnKv, type LearnKv, type ProgressRepo } from "@/local/progress";
import { emptyRecord, type LearnerRecord } from "@/project/guided/record";
import { progressKey } from "../progress/keys";

export const IMPORT_MARKER = "iynk:v1:imported";

export type LegacyKind = "lesson" | "assembly";

const LESSON_KEY = /^board:([^:]+):lesson:([^:]+)$/;
const ASSEMBLY_KEY = /^board:([^:]+):assembly$/;

const isBoard = (id: string) => (BOARD_IDS as readonly string[]).includes(id);

export function projectIdForKey(key: string): { projectId: string; kind: LegacyKind } | null {
  const lesson = LESSON_KEY.exec(key);
  if (lesson?.[1] && lesson[2] && isBoard(lesson[1])) return { projectId: `prj_${lesson[1]}-${lesson[2]}`, kind: "lesson" };
  const assembly = ASSEMBLY_KEY.exec(key);
  if (assembly?.[1] && isBoard(assembly[1])) return { projectId: `prj_${assembly[1]}-tour`, kind: "assembly" };
  return null;
}

export function keyForProject(projectId: string): string | null {
  if (!projectId.startsWith("prj_")) return null;
  const rest = projectId.slice("prj_".length);
  const board = BOARD_IDS.find((id) => rest.startsWith(`${id}-`));
  if (!board) return null;
  const tail = rest.slice(board.length + 1);
  if (!tail) return null;
  return tail === "tour" ? progressKey.boardAssembly(board) : progressKey.boardLesson(board, tail);
}

const keyForRecord = (record: LearnerRecord) => keyForProject(record.templateId ?? record.projectId);

/** The old-style `done` keys for every board lesson or tour whose record is complete. */
export function boardDone(snapshot: ReadonlyMap<string, LearnerRecord>): Record<string, true> {
  const done: Record<string, true> = {};
  for (const record of snapshot.values()) {
    const key = record.completion ? keyForRecord(record) : null;
    if (key) done[key] = true;
  }
  return done;
}

/** A finished record for a lesson or tour that the old pages marked done. A record that is already complete stays as it is. */
export function completeLegacy(
  current: LearnerRecord | undefined,
  projectId: string,
  kind: LegacyKind,
  stepCount: number,
  now: string,
): LearnerRecord {
  if (current?.completion) return current;
  const base = current ?? { ...emptyRecord(projectId, now), legacy: true };
  const steps = { ...base.steps };
  if (kind === "assembly") {
    for (let i = 0; i < stepCount; i++) steps[String(i)] ??= { doneAt: now, by: "manual" };
  }
  const gate = kind === "lesson" ? true : null;
  return {
    ...base,
    steps,
    completion: {
      at: now,
      legacy: true,
      gates: { checks: gate, edit: null, quiz: null, goal: null },
      tier: "T0",
      sourceSha256: "",
      hintsMax: 0,
      engineVersions: {},
    },
  };
}

/** Lazy, so the template index stays out of the bundle of every page that reads progress. */
export async function templateStepCount(projectId: string): Promise<number | null> {
  const { TEMPLATES } = await import("../../../content/projects");
  return TEMPLATES.find((template) => template.id === projectId)?.stepCount ?? null;
}

function lazyKv(): LearnKv {
  let opened: Promise<LearnKv> | undefined;
  const open = () => (opened ??= typeof indexedDB === "undefined" ? Promise.resolve(memoryLearnKv()) : idbLearnKv());
  return {
    get: async (key) => (await open()).get(key),
    put: async (key, value) => (await open()).put(key, value),
    delete: async (key) => (await open()).delete(key),
    entries: async () => (await open()).entries(),
  };
}

let repo: ProgressRepo | undefined;
let store: LearnStore | undefined;
let loaded = false;

export function learnStore(): LearnStore {
  if (!store) {
    repo = createProgressRepo(lazyKv());
    store = createLearnStore(repo);
    void store.ready.then(() => {
      loaded = true;
    });
  }
  return store;
}

function hasImportMarker(): boolean {
  try {
    return window.localStorage.getItem(IMPORT_MARKER) !== null;
  } catch {
    return false;
  }
}

/** True once the import has run and the records are loaded, which is when they may answer for the old keys. */
export function facadeActive(): boolean {
  return loaded && hasImportMarker();
}

let importStarted = false;

/** Runs the one-time import in the background; `onDone` fires when the marker is written. Without IndexedDB nothing is imported. */
export function startLegacyImport(onDone: () => void): void {
  if (importStarted || typeof indexedDB === "undefined" || hasImportMarker()) return;
  importStarted = true;
  const current = learnStore();
  void (async () => {
    try {
      await current.ready;
      const { importLegacyProgress } = await import("./legacy-import");
      const report = await importLegacyProgress({
        storage: window.localStorage,
        store: current,
        flush: async () => {
          for (const record of current.snapshot().values()) await repo?.put(record);
        },
        recordCount: async () => (await repo?.all())?.length ?? 0,
        now: () => new Date().toISOString(),
        stepCount: templateStepCount,
      });
      if (process.env.NODE_ENV === "development") console.info("iynk progress import", report);
      onDone();
    } catch (cause) {
      if (process.env.NODE_ENV === "development") console.warn("iynk progress import failed, it retries on the next load", cause);
    }
  })();
}

/** Mirrors a board key the old pages just marked done into the records. */
export function mirrorLegacyDone(key: string): void {
  const target = projectIdForKey(key);
  if (!target) return;
  const current = learnStore();
  const { projectId, kind } = target;
  const write = (steps: number) => {
    const now = new Date().toISOString();
    current.update(projectId, (record) => completeLegacy(record, projectId, kind, steps, now), now);
  };
  if (kind === "lesson") write(0);
  else void templateStepCount(projectId).then((steps) => write(steps ?? 0));
}

/** Takes the completion off every record whose board key starts with `prefix`. */
export function resetBoardRecords(prefix: string): void {
  const current = learnStore();
  void current.ready.then(() => {
    const now = new Date().toISOString();
    for (const record of current.snapshot().values()) {
      if (!record.completion || !keyForRecord(record)?.startsWith(prefix)) continue;
      current.update(
        record.projectId,
        (r) => {
          if (!r) return record;
          const { completion: _completion, ...rest } = r;
          return { ...rest, steps: r.legacy ? {} : r.steps };
        },
        now,
      );
    }
  });
}
