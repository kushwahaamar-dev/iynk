// The seam between practice tasks and src/lib/interp (D8, D14c). A task run is src/lib/interp's one
// check path (runHeadless + evaluateChecks, in a Web Worker): a pure function of (board, language,
// source, world script, runMs), so the bench, the content tests and a verifying server agree.

import type { BoardId } from "@/content/ids";
import type { Check, Language, WorldModel } from "@/content/schema";
import { startChecks } from "@/lib/interp";

export type RunRequest = {
  board: BoardId;
  language: Language;
  source: string;
  world: WorldModel;
  runMs: number;
};

/** One check's verdict as the bench store, the tasks panel and the AI adapter read it. */
export type CheckResult = { pass: boolean; detail?: string };

/** Serializable outcome of one task run (it lives in the bench store). */
export type TaskRunResult =
  | { status: "ok"; checks: CheckResult[]; serial: string[]; ms: number }
  | { status: "error"; line: number; message: string; serial: string[] };

export type TaskRunner = (request: RunRequest, checks: readonly Check[]) => Promise<TaskRunResult>;

/** Runs the task through the shared check path and reports its checks. */
export const interpRunner: TaskRunner = async (request, checks) => {
  const { trace, results } = await startChecks({ ...request, variant: null, checks: [...checks] }).result;
  const serial = trace.serial.map((line) => line.text);
  if (trace.error) return { status: "error", line: trace.error.line, message: trace.error.message, serial };
  return { status: "ok", checks: results.map(({ ok, detail }) => (detail === undefined ? { pass: ok } : { pass: ok, detail })), serial, ms: trace.ms };
};

export const allPass = (result: TaskRunResult | null): boolean =>
  result?.status === "ok" && result.checks.length > 0 && result.checks.every((check) => check.pass);
