// One store behind src/lib/progress. Board lessons and tours, bench tasks, quizzes and craft parts are done in the learner records (src/local/progress.ts);
// the old iynk:v1 keys stay as the backup and as the answer until the import has run and the records are loaded.

import { BOARD_IDS, DRONE_IDS, isRoboticsId, ROBOTICS_IDS } from "@/content/ids";
import { createLearnStore, type LearnStore } from "@/local/learn-store";
import { createProgressRepo, idbLearnKv, memoryLearnKv, type LearnKv, type ProgressRepo } from "@/local/progress";
import { emptyRecord, type LearnerRecord } from "@/project/guided/record";
import { progressKey } from "../progress/keys";
import type { QuizResult } from "../progress/storage";

export const IMPORT_MARKER = "iynk:v1:imported";
/** Its own marker: an install that ran the board import before skipped the bench and craft keys. */
export const LABS_IMPORT_MARKER = "iynk:v1:imported-labs";

export type BoardKind = "lesson" | "assembly";
export type LegacyKind = BoardKind | "bench" | "task" | "craft";
export type LabItem = { kind: "step" | "task" | "quiz" | "build" | "test" | "course"; id: string | null };

const LESSON_KEY = /^board:([^:]+):lesson:([^:]+)$/;
const ASSEMBLY_KEY = /^board:([^:]+):assembly$/;
const ROBOTICS_KEY = /^robotics:([^:]+):(step|task|quiz):([^:]+)$/;
const DRONE_KEY = /^drone:([^:]+):(?:(build)|(test|quiz|course):([^:]+))$/;

const isBoard = (id: string) => (BOARD_IDS as readonly string[]).includes(id);
const isDrone = (id: string) => (DRONE_IDS as readonly string[]).includes(id);

export function boardTargetForKey(key: string): { projectId: string; kind: BoardKind } | null {
  const lesson = LESSON_KEY.exec(key);
  if (lesson?.[1] && lesson[2] && isBoard(lesson[1])) return { projectId: `prj_${lesson[1]}-${lesson[2]}`, kind: "lesson" };
  const assembly = ASSEMBLY_KEY.exec(key);
  if (assembly?.[1] && isBoard(assembly[1])) return { projectId: `prj_${assembly[1]}-tour`, kind: "assembly" };
  return null;
}

/** The project and the part of it that a bench or craft key stands for. Unknown benches, crafts and prefixes give null. */
export function labItemForKey(key: string): { projectId: string; item: LabItem } | null {
  const robotics = ROBOTICS_KEY.exec(key);
  if (robotics?.[1] && robotics[2] && robotics[3] && isRoboticsId(robotics[1])) {
    const kind = robotics[2] as "step" | "task" | "quiz";
    const projectId = kind === "task" ? `prj_robotics-${robotics[1]}-${robotics[3]}` : `prj_robotics-${robotics[1]}`;
    return { projectId, item: { kind, id: robotics[3] } };
  }
  const drone = DRONE_KEY.exec(key);
  if (drone?.[1] && isDrone(drone[1])) {
    const kind = (drone[2] ?? drone[3]) as "build" | "test" | "quiz" | "course";
    return { projectId: `prj_drone-${drone[1]}`, item: { kind, id: drone[4] ?? null } };
  }
  return null;
}

export function projectIdForKey(key: string): { projectId: string; kind: LegacyKind } | null {
  const board = boardTargetForKey(key);
  if (board) return board;
  const lab = labItemForKey(key);
  if (!lab) return null;
  const kind = lab.item.kind === "task" ? "task" : lab.projectId.startsWith("prj_drone-") ? "craft" : "bench";
  return { projectId: lab.projectId, kind };
}

/** A bench or craft project id taken apart; `task` is set for the project of one bench task. */
type LabSpace = { lab: "robotics" | "drone"; id: string; task: string | null };

function labSpace(projectId: string): LabSpace | null {
  const rest = projectId.startsWith("prj_") ? projectId.slice("prj_".length) : "";
  if (rest.startsWith("robotics-")) {
    const tail = rest.slice("robotics-".length);
    const bench = ROBOTICS_IDS.find((id) => tail === id || tail.startsWith(`${id}-`));
    if (!bench) return null;
    return { lab: "robotics", id: bench, task: tail === bench ? null : tail.slice(bench.length + 1) };
  }
  if (rest.startsWith("drone-")) {
    const craft = rest.slice("drone-".length);
    return isDrone(craft) ? { lab: "drone", id: craft, task: null } : null;
  }
  return null;
}

/** Only a bench task has one old `done` key of its own; a bench or craft is many keys. */
export function keyForProject(projectId: string): string | null {
  const space = labSpace(projectId);
  if (space) return space.task ? progressKey.roboticsTask(space.id, space.task) : null;
  if (!projectId.startsWith("prj_")) return null;
  const rest = projectId.slice("prj_".length);
  const board = BOARD_IDS.find((id) => rest.startsWith(`${id}-`));
  if (!board) return null;
  const tail = rest.slice(board.length + 1);
  if (!tail) return null;
  return tail === "tour" ? progressKey.boardAssembly(board) : progressKey.boardLesson(board, tail);
}

const quizKey = (space: LabSpace, quizId: string) =>
  space.lab === "robotics" ? progressKey.roboticsQuiz(space.id, quizId) : progressKey.droneQuiz(space.id, quizId);

function itemDoneKey(space: LabSpace, item: string): string | null {
  const [kind, id] = item.split(":");
  if (space.lab === "drone") {
    if (item === "build") return progressKey.droneBuild(space.id);
    if (kind === "test" && id) return progressKey.droneTest(space.id, id);
    if (kind === "course" && id) return progressKey.droneCourse(space.id, id);
    return null;
  }
  return kind === "task" && id ? progressKey.roboticsTask(space.id, id) : null;
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

/** The old-style `done` keys for every craft test, course and build in the records, and the bench task flags kept as items. */
export function labDone(snapshot: ReadonlyMap<string, LearnerRecord>): Record<string, true> {
  const done: Record<string, true> = {};
  for (const record of snapshot.values()) {
    const space = labSpace(record.projectId);
    if (!space) continue;
    for (const item of Object.keys(record.items ?? {})) {
      const key = itemDoneKey(space, item);
      if (key) done[key] = true;
    }
  }
  return done;
}

/** The quiz results in the records next to `base`; the better attempt of the two wins, as `recordQuiz` keeps it. */
export function labQuiz(
  snapshot: ReadonlyMap<string, LearnerRecord>,
  base: Readonly<Record<string, QuizResult>>,
): Record<string, QuizResult> {
  const quiz = { ...base };
  for (const record of snapshot.values()) {
    const space = labSpace(record.projectId);
    if (!space) continue;
    for (const [quizId, entry] of Object.entries(record.quiz)) {
      if (entry.total <= 0) continue;
      const key = quizKey(space, quizId);
      const previous = quiz[key];
      if (!previous || previous.score / previous.total < entry.correct / entry.total) {
        quiz[key] = { score: entry.correct, total: entry.total };
      }
    }
  }
  return quiz;
}

/** A finished record for a lesson or tour that the old pages marked done. A record that is already complete stays as it is. */
export function completeLegacy(
  current: LearnerRecord | undefined,
  projectId: string,
  kind: BoardKind,
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

function hasMarker(marker: string): boolean {
  try {
    return window.localStorage.getItem(marker) !== null;
  } catch {
    return false;
  }
}

/** True once the import has run and the records are loaded, which is when they may answer for the old keys. */
export function facadeActive(): boolean {
  return loaded && hasMarker(IMPORT_MARKER);
}

/** The same for the bench and craft keys, which have their own import. */
export function labsActive(): boolean {
  return loaded && hasMarker(LABS_IMPORT_MARKER);
}

async function benchStepIndex(projectId: string, stepId: string): Promise<number | null> {
  const bench = projectId.slice("prj_robotics-".length);
  if (!isRoboticsId(bench)) return null;
  const { loadRobotics } = await import("@/content/index.generated");
  const index = (await loadRobotics(bench))?.steps.findIndex((step) => step.id === stepId) ?? -1;
  return index < 0 ? null : index;
}

let importStarted = false;

/** Runs the one-time imports in the background; `onDone` fires when they have written their markers. Without IndexedDB nothing is imported. */
export function startLegacyImport(onDone: () => void): void {
  const boards = !hasMarker(IMPORT_MARKER);
  const labs = !hasMarker(LABS_IMPORT_MARKER);
  if (importStarted || typeof indexedDB === "undefined" || (!boards && !labs)) return;
  importStarted = true;
  const current = learnStore();
  void (async () => {
    try {
      await current.ready;
      const { importLegacyLabProgress, importLegacyProgress } = await import("./legacy-import");
      const deps = {
        storage: window.localStorage,
        store: current,
        flush: async () => {
          for (const record of current.snapshot().values()) await repo?.put(record);
        },
        recordCount: async () => (await repo?.all())?.length ?? 0,
        now: () => new Date().toISOString(),
        stepCount: templateStepCount,
      };
      if (boards) {
        const report = await importLegacyProgress(deps);
        if (process.env.NODE_ENV === "development") console.info("iynk progress import", report);
      }
      if (labs) {
        const report = await importLegacyLabProgress({ ...deps, stepIndex: benchStepIndex });
        if (process.env.NODE_ENV === "development") console.info("iynk lab progress import", report);
      }
      onDone();
    } catch (cause) {
      if (process.env.NODE_ENV === "development") console.warn("iynk progress import failed, it retries on the next load", cause);
    }
  })();
}

/** Mirrors a board key the old pages just marked done into the records. */
export function mirrorLegacyDone(key: string): void {
  const target = boardTargetForKey(key);
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

/** Drops the quiz results, items and (when the prefix reaches them) steps of a bench or craft record that lie under `prefix`. */
function resetLabRecord(record: LearnerRecord, space: LabSpace, prefix: string): LearnerRecord {
  const root = `${space.lab}:${space.id}:`;
  const quizIds = Object.keys(record.quiz).filter((id) => !quizKey(space, id).startsWith(prefix));
  const itemIds = Object.keys(record.items ?? {}).filter((item) => !itemDoneKey(space, item)?.startsWith(prefix));
  const clearSteps = root.startsWith(prefix) || `${root}step:`.startsWith(prefix);
  const untouched =
    !clearSteps &&
    quizIds.length === Object.keys(record.quiz).length &&
    itemIds.length === Object.keys(record.items ?? {}).length;
  if (untouched) return record;
  const { completion: _completion, ...rest } = record;
  return {
    ...rest,
    quiz: Object.fromEntries(Object.entries(record.quiz).filter(([id]) => quizIds.includes(id))),
    items: Object.fromEntries(Object.entries(record.items ?? {}).filter(([item]) => itemIds.includes(item))),
    steps: clearSteps ? {} : record.steps,
  };
}

/** Takes the completion off every record whose board key starts with `prefix`, and clears the matching bench and craft progress. */
export function resetBoardRecords(prefix: string): void {
  const current = learnStore();
  void current.ready.then(() => {
    const now = new Date().toISOString();
    for (const record of current.snapshot().values()) {
      const space = labSpace(record.projectId);
      if (space && !space.task) {
        if (resetLabRecord(record, space, prefix) !== record) {
          current.update(record.projectId, (r) => (r ? resetLabRecord(r, space, prefix) : record), now);
        }
        continue;
      }
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
