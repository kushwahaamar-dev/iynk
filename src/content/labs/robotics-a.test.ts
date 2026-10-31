import { describe, expect, it } from 'vitest';
import type { Project } from '@/project/generated/types';
import { checkSet } from './check-set';

const files = import.meta.glob<unknown>('../../../content/projects/robotics/a/*.project.json', { eager: true, import: 'default' });

describe('robotics set a', () => {
  it('holds 6 benches and their 16 tasks', () => {
    checkSet(files, { benches: 6, tasks: 16 });
  });

  it('keeps the step and fault totals of the catalogue', () => {
    const benches = Object.values(files).map((file) => file as Project).filter((p) => p.meta.kind === 'bench');
    expect(benches.reduce((sum, p) => sum + (p.guide?.assembly?.length ?? 0), 0)).toBe(129);
    expect(benches.reduce((sum, p) => sum + (p.simulation?.faults?.length ?? 0), 0)).toBe(53);
  });
});
