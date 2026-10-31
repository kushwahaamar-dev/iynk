import { isEdited } from './edit.ts';
import type { GuideDeps, GuideInput } from './engine.ts';
import type { StepGate } from './plan.ts';

function faultInjectedBefore(step: number, i: GuideInput): boolean {
  return i.plan.gates.some((g) => g.kind === 'fault' && g.state === 'injected' && g.step < step && i.record?.steps[String(g.step)] !== undefined);
}

/** Whether a gate is met right now. `'blocked'` means this run cannot tell, for lack of a legacy figure state. */
export function evaluateGate(g: StepGate, i: GuideInput, d: GuideDeps): boolean | 'blocked' {
  switch (g.kind) {
    case 'manual':
      return false;
    case 'check':
      return i.run?.tests[g.test]?.[g.check] === true;
    case 'edit':
      return isEdited(i, d);
    case 'param': {
      const p = d.paramValue(g.parameter);
      return p !== undefined && p.value !== p.default;
    }
    case 'net':
      return 'connected' in g ? d.connected(...g.connected) : !d.connected(...g.apart);
    case 'part':
      return d.partCount(g.definition) >= g.min;
    case 'quiz':
      return Object.keys(i.record?.quiz[g.quiz]?.answers ?? {}).length > 0;
    case 'fault':
      return g.state === 'injected' ? i.activeFaults.length > 0 : i.activeFaults.length === 0 && faultInjectedBefore(g.step, i);
    case 'legacy-state': {
      const state = d.legacyState();
      return state === null ? 'blocked' : d.stateMatches(state, g.cond);
    }
  }
}
