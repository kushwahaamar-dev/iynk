export type Tier = "T0" | "T1" | "T2" | "T3";

type HintLevel = 0 | 1 | 2 | 3;

export interface CompletionRecord {
  at: string;
  /** null means the gate is not part of this project's rule. */
  gates: Record<"checks" | "edit" | "quiz" | "goal", boolean | null>;
  /** Lowest tier chip at the time of the run. */
  tier: Tier;
  sourceSha256: string;
  hintsMax: HintLevel;
  engineVersions: Record<string, string>;
  legacy: boolean;
}

/** One per local project that has a plan. Plain JSON, no source text and no free text. */
export interface LearnerRecord {
  v: 1;
  projectId: string;
  templateId?: string;
  startedAt: string;
  /** Key: step index as a string. */
  steps: Record<string, { doneAt: string; by: "gate" | "manual" }>;
  /** testId -> checkId -> ok */
  lastRun?: { at: string; tier: Tier; tests: Record<string, Record<string, boolean>> };
  quiz: Record<string, { answers: Record<string, number>; correct: number; total: number }>;
  hintsMax: HintLevel;
  picks: number;
  completion?: CompletionRecord;
  legacy?: boolean;
  /** Stamped the first time the edit gate flips true and never cleared, because history compaction can drop the edit ops. */
  editedAt?: string;
}

export interface CheckVerdict {
  testId: string;
  checkId: string;
  kind: string;
  visibility: "visible" | "hidden";
  ok: boolean;
  detail?: string;
}

export interface TestRun {
  testId: string;
  verdicts: CheckVerdict[];
  error: { line: number; message: string } | null;
  ms: number;
  limit: boolean;
}

export interface LessonRun {
  tests: TestRun[];
  passedAll: boolean;
  tier: Tier;
  at: string;
}

export const MAX_STEPS = 64;
export const MAX_QUIZZES = 8;

export function emptyRecord(projectId: string, now: string, templateId?: string): LearnerRecord {
  const record: LearnerRecord = { v: 1, projectId, startedAt: now, steps: {}, quiz: {}, hintsMax: 0, picks: 0 };
  return templateId === undefined ? record : { ...record, templateId };
}

/** A step that is already done keeps its first stamp. */
export function withStep(r: LearnerRecord, index: number, by: "gate" | "manual", now: string): LearnerRecord {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_STEPS) {
    throw new RangeError(`step index ${index} is outside 0 to ${MAX_STEPS - 1}`);
  }
  const key = String(index);
  if (r.steps[key]) return r;
  return { ...r, steps: { ...r.steps, [key]: { doneAt: now, by } } };
}

/** Only the first answer to a question counts towards `correct`; a later answer replaces the stored choice. */
export function withAnswer(
  r: LearnerRecord,
  quizId: string,
  questionId: string,
  choice: number,
  correct: boolean,
  total: number,
): LearnerRecord {
  const entry = r.quiz[quizId];
  if (!entry && Object.keys(r.quiz).length >= MAX_QUIZZES) {
    throw new RangeError(`a record holds at most ${MAX_QUIZZES} quizzes`);
  }
  const base = entry ?? { answers: {}, correct: 0, total };
  const first = !(questionId in base.answers);
  const next = {
    answers: { ...base.answers, [questionId]: choice },
    correct: base.correct + (first && correct ? 1 : 0),
    total,
  };
  return { ...r, quiz: { ...r.quiz, [quizId]: next } };
}

export function withLastRun(r: LearnerRecord, run: NonNullable<LearnerRecord["lastRun"]>): LearnerRecord {
  return { ...r, lastRun: run };
}

/** The level only goes up. */
export function withHintLevel(r: LearnerRecord, level: HintLevel): LearnerRecord {
  return level > r.hintsMax ? { ...r, hintsMax: level } : r;
}

export function withEdited(r: LearnerRecord, now: string): LearnerRecord {
  return r.editedAt === undefined ? { ...r, editedAt: now } : r;
}

export function withCompletion(r: LearnerRecord, c: Omit<CompletionRecord, "at">, now: string): LearnerRecord {
  return { ...r, completion: { ...c, at: now } };
}
