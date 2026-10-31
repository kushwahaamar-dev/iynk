// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isEdited } from './edit.ts';
import { deps, inputFor, NOW, ownEdit, planFor, projectWith } from './engine.testing.ts';
import { emptyRecord, withEdited } from './record.ts';

const starter = projectWith('delay(500);');
const history = (ops: { revision: number; actor: string; kind: string }[]) => ({ startRevision: 1, localActor: 'me', ops });

describe('isEdited', () => {
  it('is false with no ops', () => {
    expect(isEdited(inputFor(starter), deps)).toBe(false);
  });

  it('is false when the edit only adds a comment', () => {
    const project = projectWith('delay(500); // slow');
    expect(isEdited(inputFor(project, { plan: planFor(starter), history: history([ownEdit]) }), deps)).toBe(false);
  });

  it('is true for a changed delay', () => {
    const project = projectWith('delay(200);');
    expect(isEdited(inputFor(project, { plan: planFor(starter), history: history([ownEdit]) }), deps)).toBe(true);
  });

  it('is false after the edit is undone', () => {
    expect(isEdited(inputFor(starter, { history: history([ownEdit]) }), deps)).toBe(false);
  });

  it('stays true once latched, even if the edit is undone', () => {
    const record = withEdited(emptyRecord('prj_blink', NOW), NOW);
    expect(isEdited(inputFor(starter, { record, history: history([ownEdit]) }), deps)).toBe(true);
  });

  it('is true for a stamped record with a compacted history', () => {
    const record = withEdited(emptyRecord('prj_blink', NOW), NOW);
    expect(isEdited(inputFor(starter, { record }), deps)).toBe(true);
  });

  it('is false for a remote actor', () => {
    const project = projectWith('delay(200);');
    const remote = { ...ownEdit, actor: 'them' };
    expect(isEdited(inputFor(project, { plan: planFor(starter), history: history([remote]) }), deps)).toBe(false);
  });

  it('is false for ops that are not edits', () => {
    const project = projectWith('delay(200);');
    const restore = { ...ownEdit, kind: 'project.restore' };
    expect(isEdited(inputFor(project, { plan: planFor(starter), history: history([restore]) }), deps)).toBe(false);
  });

  it('is true for a param.set that changes the substance', () => {
    const project = { ...projectWith('delay(500);'), components: [{ id: 'r1', params: { ohms: 330 } }] } as never;
    const op = { ...ownEdit, kind: 'param.set' };
    expect(isEdited(inputFor(project, { plan: planFor(starter), history: history([op]) }), deps)).toBe(true);
  });

  it('is false when the plan has no starter hash', () => {
    const project = projectWith('delay(200);');
    const plan = { ...planFor(starter), starterSubstanceHash: undefined };
    expect(isEdited(inputFor(project, { plan, history: history([ownEdit]) }), deps)).toBe(false);
  });
});
