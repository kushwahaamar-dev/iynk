// A check job: everything one check run needs, as plain data, so the same job runs in a Web Worker
// (Board Lab, Robotics), in a test or on a verifying server and gives the same verdicts.

import type { BoardContent, Check, Lesson, PracticeTask, RunTrace } from '@/content/schema';
import { evaluateChecks, type CheckResult } from './checks';
import { runHeadless, type HeadlessOptions } from './headless';
import { pinoutNets } from './pins';
import { getProfile, type BoardId } from './profiles';

/** Wall-clock budget for one check run; a longer run stops with a `limit` error. */
export const CHECK_BUDGET_MS = 20_000;

export interface CheckJob extends Omit<HeadlessOptions, 'onProgress' | 'budgetMs'> {
  checks: Check[];
  /** The live figure state, for `state` checks. */
  figure?: Record<string, unknown>;
}

export interface CheckOutcome {
  trace: RunTrace;
  results: CheckResult[];
}

export interface CheckRunOptions {
  onProgress?: (doneMs: number, runMs: number) => void;
  budgetMs?: number;
}

/** Run the job's program on its world script and evaluate its checks. */
export function runChecks(job: CheckJob, opts: CheckRunOptions = {}): CheckOutcome {
  const { checks, figure, ...run } = job;
  const trace = runHeadless({ ...run, onProgress: opts.onProgress, budgetMs: opts.budgetMs });
  const results = evaluateChecks(checks, trace, { source: job.source, figure, board: job.board, variant: job.variant, nets: job.nets });
  return { trace, results };
}

/** Interpreter pin number -> pinout net for a board (what Board Lab passes as `nets`). */
export function boardNets(board: Pick<BoardContent, 'id' | 'pinout'>): Record<number, string> | undefined {
  try {
    return pinoutNets(getProfile(board.id as BoardId), board.pinout);
  } catch {
    return undefined;
  }
}

/** The variant a lesson runs on: the first one it names, else the board's first. */
export function lessonVariant(board: Pick<BoardContent, 'variants'>, lesson: Pick<Lesson, 'variants'>): string | null {
  return lesson.variants[0] ?? board.variants[0]?.id ?? null;
}

/** A board lesson's check job for `source` on `variant` (default: the lesson's own). */
export function lessonJob(board: BoardContent, lesson: Lesson, source: string, variant: string | null = lessonVariant(board, lesson)): CheckJob {
  return {
    board: board.id,
    variant,
    language: lesson.language,
    source,
    world: lesson.world,
    runMs: lesson.runMs,
    logicV: board.logicVolts,
    nets: boardNets(board),
    ports: lesson.code.ports,
    checks: lesson.checks,
  };
}

/** A practice task's check job for `source`. */
export function taskJob(task: PracticeTask, source: string): CheckJob {
  return { board: task.board, variant: null, language: task.language, source, world: task.world, runMs: task.runMs, checks: task.checks };
}
