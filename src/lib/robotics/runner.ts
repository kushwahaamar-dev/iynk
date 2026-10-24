// The seam between practice tasks and src/lib/interp (D8, D14c). A task run is a pure function of
// (board, language, source, world script, runMs); the board fixes the int widths (A9): the same code always gives the same result, so a
// server can re-run and verify it.

import type { BoardId } from "@/content/ids";
import type { Check, Language, WorldModel } from "@/content/schema";
import { getProfile } from "@/lib/interp";
import { evaluateChecks } from "./checks";
import { pinNumber, runHeadless } from "./headless";

export type RunRequest = {
  board: BoardId;
  language: Language;
  source: string;
  world: WorldModel;
  runMs: number;
};

export type CheckResult = { pass: boolean; detail?: string };

/** Serializable outcome of one task run (it lives in the bench store). */
export type TaskRunResult =
  | { status: "ok"; checks: CheckResult[]; serial: string[]; ms: number }
  | { status: "error"; line: number; message: string; serial: string[] };

export type TaskRunner = (request: RunRequest, checks: readonly Check[]) => Promise<TaskRunResult>;

const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Runs the task headless on src/lib/interp and checks the trace. */
export const interpRunner: TaskRunner = async (request, checks) => {
  await nextTick();
  const trace = runHeadless(request);
  const serial = trace.serial.map((line) => line.text);
  if (trace.error) return { status: "error", line: trace.error.line, message: trace.error.message, serial };
  const profile = getProfile(request.board);
  const resolve = (pin: string) => String(pinNumber(profile, pin) ?? pin);
  return { status: "ok", checks: evaluateChecks(checks, trace, request.source, resolve), serial, ms: trace.ms };
};

export const allPass = (result: TaskRunResult | null): boolean =>
  result?.status === "ok" && result.checks.length > 0 && result.checks.every((check) => check.pass);
