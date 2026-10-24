// Runs one check job off the main thread, so a 15 s Wi-Fi lesson never freezes the tab.
// Messages: in { job, budgetMs }; out { type: 'progress', doneMs, runMs } then { type: 'done', outcome }.

import { runChecks, type CheckJob } from './check-job';
import type { CheckWorkerReply } from './check-client';

const scope = self as unknown as { onmessage: ((e: MessageEvent<{ job: CheckJob; budgetMs: number }>) => void) | null; postMessage: (m: CheckWorkerReply) => void };

scope.onmessage = (e) => {
  const { job, budgetMs } = e.data;
  const outcome = runChecks(job, { budgetMs, onProgress: (doneMs, runMs) => scope.postMessage({ type: 'progress', doneMs, runMs }) });
  scope.postMessage({ type: 'done', outcome });
};
