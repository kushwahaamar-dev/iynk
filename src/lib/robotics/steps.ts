// Build-and-break steps (ARCHITECTURE §6): steps complete strictly in order, a build or test
// step when its `done` condition holds, a break step when its fault was seen, then cleared,
// and then `done` holds.

import type { BuildStep, FailureMode, FigureState } from "@/content/schema";
import { condHolds } from "./state";

export type StepProgress = { done: boolean; seen: boolean };
export type StepsSession = Record<string, StepProgress>;

export const emptySession = (steps: readonly BuildStep[]): StepsSession =>
  Object.fromEntries(steps.map((step) => [step.id, { done: false, seen: false }]));

/** The fault id the figure reports for a content fault: the `fault` its bridge command sets, else its own id. */
export function engineFaultId(fault: FailureMode): string {
  const cmd = fault.figure;
  if (cmd.type === "set" && typeof cmd.state.fault === "string") return cmd.state.fault;
  return fault.id;
}

function reportedFaults(state: FigureState): string[] {
  const ids: string[] = [];
  const current = state.fault;
  if (typeof current === "object" && current !== null && typeof (current as { id?: unknown }).id === "string") {
    ids.push((current as { id: string }).id);
  } else if (typeof current === "string") {
    ids.push(current);
  }
  if (Array.isArray(state.faults)) for (const id of state.faults) if (typeof id === "string") ids.push(id);
  return ids;
}

/** Is this content fault showing on the bench right now? */
export function faultPresent(fault: FailureMode, state: FigureState): boolean {
  const reported = reportedFaults(state);
  if (reported.includes(engineFaultId(fault)) || reported.includes(fault.id)) return true;
  return fault.kind === "brownout" && state.status === "brownout";
}

export function activeFaults(faults: readonly FailureMode[], state: FigureState): FailureMode[] {
  return faults.filter((fault) => faultPresent(fault, state));
}

/** Index of the first step not done in this session, or steps.length when all are. */
export function currentStepIndex(steps: readonly BuildStep[], session: StepsSession): number {
  const index = steps.findIndex((step) => !session[step.id]?.done);
  return index === -1 ? steps.length : index;
}

/**
 * Applies one figure state report. Only the current step can move; when it completes the next
 * step is tried against the same state, so a report can finish several steps in a row.
 */
export function advanceSteps(
  steps: readonly BuildStep[],
  faults: readonly FailureMode[],
  session: StepsSession,
  state: FigureState,
): { session: StepsSession; completed: string[]; seen: string[] } {
  let next = session;
  const completed: string[] = [];
  const seen: string[] = [];
  for (let i = currentStepIndex(steps, next); i < steps.length; i += 1) {
    const step = steps[i];
    const progress = next[step.id] ?? { done: false, seen: false };
    if (step.kind === "break") {
      const fault = faults.find((f) => f.id === step.fault);
      const present = fault ? faultPresent(fault, state) : false;
      if (!progress.seen) {
        if (!present) break;
        next = { ...next, [step.id]: { done: false, seen: true } };
        seen.push(step.id);
        break;
      }
      if (present || !condHolds(step.done, state)) break;
    } else if (!condHolds(step.done, state)) {
      break;
    }
    next = { ...next, [step.id]: { done: true, seen: progress.seen } };
    completed.push(step.id);
  }
  return { session: next, completed, seen };
}

/** The step a learner may start now: everything before it is done this session. */
export function canStart(steps: readonly BuildStep[], session: StepsSession, stepId: string): boolean {
  const index = steps.findIndex((step) => step.id === stepId);
  if (index === -1) return false;
  return steps.slice(0, index).every((step) => session[step.id]?.done);
}
