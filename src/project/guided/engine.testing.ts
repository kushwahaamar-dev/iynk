import type { Project } from '../generated/types.ts';
import type { GuideDeps, GuideInput } from './engine.ts';
import type { GuidedPlan } from './plan.ts';
import { emptyRecord } from './record.ts';
import { stripComments } from './substance.ts';

export const NOW = '2026-10-31T10:00:00.000Z';

export function projectWith(code: string, stepCount = 2): Project {
  return {
    meta: { title: 'Blink' },
    sources: [{ id: 'main', content: code }],
    components: [],
    tests: [],
    guide: { kind: 'lesson', steps: Array.from({ length: stepCount }, (_, n) => ({ id: `s${n}` })) },
  } as unknown as Project;
}

export const deps: GuideDeps = {
  sha256: (s) => s,
  canonical: (v) => JSON.stringify(v),
  codeOnly: stripComments,
  stateMatches: (state, cond) => Object.entries(cond).every(([k, v]) => state[k] === v),
  connected: () => false,
  partCount: () => 0,
  paramValue: () => undefined,
  legacyState: () => null,
};

export function planFor(project: Project, over: Partial<GuidedPlan> = {}): GuidedPlan {
  return {
    v: 1,
    mode: 'guided',
    rung: 'lesson',
    skill: [],
    gates: [],
    complete: ['checks', 'edit', 'quiz'],
    tests: ['t1'],
    starterSubstanceHash: deps.sha256(deps.canonical({ meta: {}, sources: [{ id: 'main', content: 'delay(500);' }], components: [], tests: [], guide: project.guide })),
    ...over,
  };
}

export function inputFor(project: Project, over: Partial<GuideInput> = {}): GuideInput {
  return {
    project,
    plan: planFor(project),
    record: emptyRecord('prj_blink', NOW),
    run: null,
    activeFaults: [],
    history: { startRevision: 1, localActor: 'me', ops: [] },
    ...over,
  };
}

export const ownEdit = { revision: 2, actor: 'me', kind: 'source.edit' };
