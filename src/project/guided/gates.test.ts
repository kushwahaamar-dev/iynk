// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deps, inputFor, NOW, projectWith } from './engine.testing.ts';
import type { GuideDeps } from './engine.ts';
import { evaluateGate } from './gates.ts';
import type { StepGate } from './plan.ts';
import { emptyRecord, withAnswer, withStep } from './record.ts';

const project = projectWith('delay(500);', 4);
const a = { c: 'led', p: 'A' };
const b = { c: 'res', p: '1' };
type GateBody = StepGate extends infer G ? (G extends StepGate ? Omit<G, 'step'> : never) : never;
const gate = (g: GateBody, step = 1): StepGate => ({ step, ...g }) as StepGate;
const run = (ok: boolean) => ({ tests: { t1: { c1: ok } }, at: NOW, tier: 'T1' as const });

describe('evaluateGate', () => {
  it('never flips a manual gate', () => {
    expect(evaluateGate(gate({ kind: 'manual' }), inputFor(project), deps)).toBe(false);
  });

  it('reads a check from the last run', () => {
    const g = gate({ kind: 'check', test: 't1', check: 'c1' });
    expect(evaluateGate(g, inputFor(project, { run: run(true) }), deps)).toBe(true);
    expect(evaluateGate(g, inputFor(project, { run: run(false) }), deps)).toBe(false);
    expect(evaluateGate(g, inputFor(project), deps)).toBe(false);
  });

  it('reads the edit rule', () => {
    expect(evaluateGate(gate({ kind: 'edit', source: 'main' }), inputFor(project), deps)).toBe(false);
  });

  it('compares a parameter with its default', () => {
    const g = gate({ kind: 'param', parameter: 'r1.ohms' });
    const at = (value: number): GuideDeps => ({ ...deps, paramValue: () => ({ value, default: 220 }) });
    expect(evaluateGate(g, inputFor(project), at(330))).toBe(true);
    expect(evaluateGate(g, inputFor(project), at(220))).toBe(false);
    expect(evaluateGate(g, inputFor(project), deps)).toBe(false);
  });

  it('asks the netlist for connected and apart', () => {
    const linked: GuideDeps = { ...deps, connected: () => true };
    const connected = gate({ kind: 'net', connected: [a, b] });
    const apart = gate({ kind: 'net', apart: [a, b] });
    expect(evaluateGate(connected, inputFor(project), linked)).toBe(true);
    expect(evaluateGate(connected, inputFor(project), deps)).toBe(false);
    expect(evaluateGate(apart, inputFor(project), deps)).toBe(true);
    expect(evaluateGate(apart, inputFor(project), linked)).toBe(false);
  });

  it('counts parts', () => {
    const g = gate({ kind: 'part', definition: 'led', min: 2 });
    expect(evaluateGate(g, inputFor(project), { ...deps, partCount: () => 2 })).toBe(true);
    expect(evaluateGate(g, inputFor(project), { ...deps, partCount: () => 1 })).toBe(false);
  });

  it('needs one recorded answer for a quiz', () => {
    const g = gate({ kind: 'quiz', quiz: 'q1' });
    const answered = withAnswer(emptyRecord('p', NOW), 'q1', 'a', 0, false, 1);
    expect(evaluateGate(g, inputFor(project, { record: answered }), deps)).toBe(true);
    expect(evaluateGate(g, inputFor(project), deps)).toBe(false);
  });

  it('follows faults on and off', () => {
    const injected = gate({ kind: 'fault', state: 'injected' }, 1);
    const cleared = gate({ kind: 'fault', state: 'cleared' }, 2);
    const plan = { ...inputFor(project).plan, gates: [injected, cleared] };
    const latched = withStep(emptyRecord('p', NOW), 1, 'gate', NOW);
    expect(evaluateGate(injected, inputFor(project, { activeFaults: ['f1'] }), deps)).toBe(true);
    expect(evaluateGate(injected, inputFor(project), deps)).toBe(false);
    expect(evaluateGate(cleared, inputFor(project, { plan, record: latched }), deps)).toBe(true);
    expect(evaluateGate(cleared, inputFor(project, { plan, record: latched, activeFaults: ['f1'] }), deps)).toBe(false);
    expect(evaluateGate(cleared, inputFor(project, { plan }), deps)).toBe(false);
  });

  it('matches the legacy figure state, or is blocked without one', () => {
    const g = gate({ kind: 'legacy-state', cond: { led: true } });
    expect(evaluateGate(g, inputFor(project), deps)).toBe('blocked');
    expect(evaluateGate(g, inputFor(project), { ...deps, legacyState: () => ({ led: true }) })).toBe(true);
    expect(evaluateGate(g, inputFor(project), { ...deps, legacyState: () => ({ led: false }) })).toBe(false);
  });
});
