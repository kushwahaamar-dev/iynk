import { isEdited } from './edit.ts';
import { evaluateGate } from './gates.ts';
import type { CompleteGate, GuidedPlan, PinAddr } from './plan.ts';
import type { LearnerRecord, LessonRun, Tier } from './record.ts';
import type { SubstanceDeps } from './substance.ts';
import type { Project } from '../generated/types.ts';

export interface GuideDeps extends SubstanceDeps {
  stateMatches(state: Record<string, unknown>, cond: Record<string, unknown>): boolean;
  connected(a: PinAddr, b: PinAddr): boolean;
  partCount(definition: string): number;
  paramValue(parameter: string): { value: unknown; default: unknown } | undefined;
  legacyState(): Record<string, unknown> | null;
  diagnosisCorrect?(): boolean | null;
}

export type GuideRun = { tests: Record<string, Record<string, boolean>>; at: string; tier: Tier } | null;

export function toGuideRun(run: LessonRun | null): GuideRun {
  if (!run) return null;
  const tests: Record<string, Record<string, boolean>> = {};
  for (const t of run.tests) {
    tests[t.testId] = Object.fromEntries(t.verdicts.map((v) => [v.checkId, v.ok]));
  }
  return { tests, at: run.at, tier: run.tier };
}

export interface HistoryView {
  startRevision: number;
  localActor: string;
  ops: { revision: number; actor: string; kind: string }[];
}

export interface GuideInput {
  project: Project;
  plan: GuidedPlan;
  record: LearnerRecord | undefined;
  run: GuideRun;
  activeFaults: readonly string[];
  history: HistoryView;
}

export type StepState = { index: number; state: 'notStarted' | 'current' | 'done' | 'blocked'; by: 'gate' | 'manual' | null };

function stepCount(project: Project): number {
  const guide = project.guide;
  if (!guide) return 0;
  return (guide.kind === 'tour' ? guide.assembly : guide.steps)?.length ?? 0;
}

export function evaluateSteps(i: GuideInput, d: GuideDeps): { steps: StepState[]; flips: number[] } {
  const gates = new Map(i.plan.gates.map((g) => [g.step, g]));
  const steps: StepState[] = [];
  const flips: number[] = [];
  let currentFound = false;
  for (let index = 0; index < stepCount(i.project); index++) {
    const latched = i.record?.steps[String(index)];
    if (latched) {
      steps.push({ index, state: 'done', by: latched.by });
      continue;
    }
    const gate = gates.get(index);
    const verdict = gate ? evaluateGate(gate, i, d) : false;
    if (verdict === true) {
      flips.push(index);
      steps.push({ index, state: 'done', by: 'gate' });
    } else if (currentFound) {
      steps.push({ index, state: 'notStarted', by: null });
    } else {
      currentFound = true;
      steps.push({ index, state: verdict === 'blocked' ? 'blocked' : 'current', by: null });
    }
  }
  return { steps, flips };
}

export type OpenReason = 'edit' | 'quiz' | 'checks' | 'fault' | 'steps' | 'goal' | 'diagnosis';

export interface CompletionResult {
  complete: boolean;
  gates: Record<CompleteGate, boolean | null>;
  open: OpenReason[];
  warnings: string[];
  editFlip: boolean;
}

const OPEN_ORDER: CompleteGate[] = ['edit', 'quiz', 'checks', 'steps', 'goal', 'diagnosis'];

function testPassed(run: GuideRun, testId: string): boolean {
  const checks = run?.tests[testId];
  return checks !== undefined && Object.values(checks).every(Boolean);
}

function requiredGates(plan: GuidedPlan): CompleteGate[] {
  if (plan.complete.length > 0) return plan.complete;
  return plan.rung === 'demo' ? ['steps'] : ['checks', 'edit', 'quiz'];
}

export function evaluateCompletion(i: GuideInput, d: GuideDeps): CompletionResult {
  const { plan, record, run } = i;
  const warnings: string[] = [];
  if (plan.starterSubstanceHash === undefined) warnings.push('plan has no starterSubstanceHash');

  const edited = plan.starterSubstanceHash === undefined ? null : isEdited(i, d);
  const checksPass = run !== null && plan.tests.every((t) => testPassed(run, t));
  const gates: Record<CompleteGate, boolean | null> = {
    checks: checksPass && i.activeFaults.length === 0,
    edit: edited,
    quiz: Object.values(record?.quiz ?? {}).some((q) => Object.keys(q.answers).length > 0),
    goal: plan.goalTest === undefined ? null : testPassed(run, plan.goalTest),
    steps: evaluateSteps(i, d).steps.every((s) => s.state === 'done'),
    diagnosis: d.diagnosisCorrect?.() ?? null,
  };

  const required = requiredGates(plan);
  const open = OPEN_ORDER.filter((g) => required.includes(g) && gates[g] === false).map(
    (g): OpenReason => (g === 'checks' && checksPass ? 'fault' : g),
  );
  return {
    complete: open.length === 0 && required.some((g) => gates[g] === true),
    gates,
    open,
    warnings,
    editFlip: edited === true && record?.editedAt === undefined,
  };
}
