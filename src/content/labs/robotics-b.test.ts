import { describe, expect, it } from 'vitest';
import type { Project } from '@/project/generated/types';
import { checkSet } from './check-set';

const files = import.meta.glob<Project>('../../../content/projects/robotics/b/*.project.json', { eager: true, import: 'default' });

describe('robotics set B', () => {
  it('holds 7 benches and 15 tasks that validate', () => {
    checkSet(files, { benches: 7, tasks: 15 });
  });

  it('marks only pi5-ros2 as a concept bench', () => {
    const concept = Object.values(files)
      .filter((p) => p.meta.kind === 'bench')
      .filter((p) => (p.ext as Record<string, { concept?: boolean } | undefined> | undefined)?.['x-iynk-bench']?.concept === true)
      .map((p) => p.id);
    expect(concept).toEqual(['prj_robotics-pi5-ros2']);
  });
});
