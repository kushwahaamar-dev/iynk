// Starts a check job in a Web Worker and reports progress; where there is no Worker (tests, server)
// the same job runs in this thread after a yield. Either way a run gets CHECK_BUDGET_MS of wall
// clock and ends with a `limit` error after that.

import { CHECK_BUDGET_MS, runChecks, type CheckJob, type CheckOutcome } from './check-job';
import { LIMIT_MESSAGE } from './headless';

export type CheckWorkerReply = { type: 'progress'; doneMs: number; runMs: number } | { type: 'done'; outcome: CheckOutcome };

export interface CheckHandle {
  result: Promise<CheckOutcome>;
  /** Stop the run; `result` then never settles. */
  cancel(): void;
}

/** Grace on top of the budget for a worker stuck inside one interpreter step. */
const KILL_GRACE_MS = 2_000;

function limitOutcome(job: CheckJob, doneMs: number): CheckOutcome {
  return {
    trace: { ms: doneMs, error: { line: 0, message: LIMIT_MESSAGE }, serial: [], pins: {}, figure: [], inputs: [] },
    results: job.checks.map(() => ({ ok: false })),
  };
}

export function startChecks(job: CheckJob, onProgress?: (fraction: number) => void, budgetMs = CHECK_BUDGET_MS): CheckHandle {
  if (typeof Worker === 'undefined') {
    let cancelled = false;
    const result = new Promise<CheckOutcome>((resolve) => {
      setTimeout(() => {
        if (cancelled) return;
        resolve(runChecks(job, { budgetMs, onProgress: onProgress && ((d, r) => onProgress(d / r)) }));
      }, 0);
    });
    return { result, cancel: () => void (cancelled = true) };
  }

  const worker = new Worker(new URL('./check.worker.ts', import.meta.url), { type: 'module' });
  let doneMs = 0;
  let killTimer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    clearTimeout(killTimer);
    worker.terminate();
  };
  const result = new Promise<CheckOutcome>((resolve) => {
    worker.onmessage = (e: MessageEvent<CheckWorkerReply>) => {
      const m = e.data;
      if (m.type === 'progress') {
        doneMs = m.doneMs;
        onProgress?.(m.doneMs / m.runMs);
        return;
      }
      stop();
      resolve(m.outcome);
    };
    worker.onerror = (e) => {
      e.preventDefault();
      stop();
      resolve({ trace: { ms: doneMs, error: { line: 0, message: e.message || 'worker failed' }, serial: [], pins: {}, figure: [], inputs: [] }, results: job.checks.map(() => ({ ok: false })) });
    };
    killTimer = setTimeout(() => {
      stop();
      resolve(limitOutcome(job, doneMs));
    }, budgetMs + KILL_GRACE_MS);
  });
  worker.postMessage({ job, budgetMs });
  return { result, cancel: stop };
}
