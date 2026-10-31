// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deps, inputFor, NOW, ownEdit, planFor, projectWith } from './engine.testing.ts';
import { evaluateCompletion, evaluateSteps, toGuideRun } from './engine.ts';
import { emptyRecord, withAnswer, withStep, type LessonRun } from './record.ts';

const starter = projectWith('delay(500);');
const edited = projectWith('delay(250);');
const passing = { tests: { t1: { c1: true, c2: true } }, at: NOW, tier: 'T1' as const };
const editedInput = (over = {}) =>
  inputFor(edited, { plan: planFor(starter), history: { startRevision: 1, localActor: 'me', ops: [ownEdit] }, ...over });

describe('evaluateCompletion', () => {
  it('leaves edit and quiz open on an untouched lesson with passing checks', () => {
    const r = evaluateCompletion(inputFor(starter, { run: passing }), deps);
    expect(r.complete).toBe(false);
    expect(r.open).toEqual(['edit', 'quiz']);
    expect(r.editFlip).toBe(false);
  });

  it('completes after an edit, a passing run and one answer', () => {
    const record = withAnswer(emptyRecord('p', NOW), 'q1', 'a', 1, false, 1);
    const r = evaluateCompletion(editedInput({ run: passing, record }), deps);
    expect(r.complete).toBe(true);
    expect(r.open).toEqual([]);
    expect(r.editFlip).toBe(true);
  });

  it('lists every open reason in order', () => {
    expect(evaluateCompletion(inputFor(starter), deps).open).toEqual(['edit', 'quiz', 'checks']);
  });

  it('keeps checks open with reason fault while a fault is on', () => {
    const r = evaluateCompletion(inputFor(starter, { run: passing, activeFaults: ['f1'] }), deps);
    expect(r.gates.checks).toBe(false);
    expect(r.open).toEqual(['edit', 'quiz', 'fault']);
  });

  it('fails a check that did not pass', () => {
    const run = { ...passing, tests: { t1: { c1: true, c2: false } } };
    expect(evaluateCompletion(inputFor(starter, { run }), deps).gates.checks).toBe(false);
  });

  it('does not report an edit flip twice', () => {
    const record = { ...emptyRecord('p', NOW), editedAt: NOW };
    expect(evaluateCompletion(editedInput({ record }), deps).editFlip).toBe(false);
  });

  it('warns and skips the edit gate for a plan without a starter hash', () => {
    const plan = { ...planFor(starter), starterSubstanceHash: undefined, complete: ['edit' as const] };
    const r = evaluateCompletion(inputFor(edited, { plan }), deps);
    expect(r.warnings).toEqual(['plan has no starterSubstanceHash']);
    expect(r.gates.edit).toBeNull();
    expect(r.complete).toBe(false);
  });

  it('completes a tour on its steps, latching fault and legacy-state gates', () => {
    const project = projectWith('x', 3);
    const plan = {
      ...planFor(project),
      rung: 'demo' as const,
      complete: ['steps' as const],
      gates: [
        { step: 0, kind: 'fault' as const, state: 'injected' as const },
        { step: 1, kind: 'legacy-state' as const, cond: { led: true } },
        { step: 2, kind: 'manual' as const },
      ],
    };
    let record = emptyRecord('p', NOW);
    const first = evaluateSteps(inputFor(project, { plan, record, activeFaults: ['f1'] }), deps);
    expect(first.flips).toEqual([0]);
    expect(first.steps.map((s) => s.state)).toEqual(['done', 'blocked', 'notStarted']);

    record = withStep(record, 0, 'gate', NOW);
    const legacy = { ...deps, legacyState: () => ({ led: true }) };
    const second = evaluateSteps(inputFor(project, { plan, record }), legacy);
    expect(second.flips).toEqual([1]);
    expect(second.steps.map((s) => s.state)).toEqual(['done', 'done', 'current']);

    record = withStep(withStep(record, 1, 'gate', NOW), 2, 'manual', NOW);
    const done = evaluateCompletion(inputFor(project, { plan, record }), deps);
    expect(done.complete).toBe(true);
    expect(done.gates.steps).toBe(true);
  });
});

describe('toGuideRun', () => {
  it('maps verdicts by test and check', () => {
    const run: LessonRun = {
      tests: [
        {
          testId: 't1',
          verdicts: [
            { testId: 't1', checkId: 'c1', kind: 'runs', visibility: 'visible', ok: true },
            { testId: 't1', checkId: 'c2', kind: 'runs', visibility: 'hidden', ok: false },
          ],
          error: null,
          ms: 4,
          limit: false,
        },
      ],
      passedAll: false,
      tier: 'T2',
      at: NOW,
    };
    expect(toGuideRun(run)).toEqual({ tests: { t1: { c1: true, c2: false } }, at: NOW, tier: 'T2' });
    expect(toGuideRun(null)).toBeNull();
  });
});
