import { expect } from 'vitest';
import { stateHash } from '@/project/hash';
import { toFileText } from '@/project/normalize';
import { validateText, validateValue } from '@/project/validate';
import type { Project } from '@/project/generated/types';

const KINDS: Record<string, readonly string[]> = {
  'prj_robotics-': ['bench', 'challenge'],
  'prj_drone-': ['craft'],
};

/** What every generated lab project must satisfy; the four set tests call it with the files of their folder. */
export function checkSet(files: Record<string, unknown>, expected: { benches?: number; tasks?: number; crafts?: number }): void {
  const projects = Object.entries(files).map(([name, file]) => {
    const report = validateValue(file);
    expect(report.diagnostics.filter((d) => d.severity === 'error'), name).toEqual([]);
    const project = file as Project;
    expect(validateText(toFileText(project)).ok, name).toBe(true);
    expect(stateHash(project), name).toBe(stateHash(JSON.parse(toFileText(project)) as Project));

    const prefix = Object.keys(KINDS).find((p) => project.id.startsWith(p));
    expect(prefix, `${name} has an id of no lab`).toBeDefined();
    expect(KINDS[prefix!], name).toContain(project.meta.kind);
    expect(project.provenance.thirdParty?.length ?? 0, name).toBeGreaterThan(0);
    expect(project.license.spdx, name).toBe('LicenseRef-iynk-pending');
    return project;
  });

  const count = (kind: string) => projects.filter((p) => p.meta.kind === kind).length;
  expect({ benches: count('bench'), tasks: count('challenge'), crafts: count('craft') }).toEqual({
    benches: expected.benches ?? 0,
    tasks: expected.tasks ?? 0,
    crafts: expected.crafts ?? 0,
  });
}
