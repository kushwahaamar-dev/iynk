import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTables, tablesText } from './build-lesson-faults.mjs';

const GROUPS = ['arduino', 'esp', 'other', 'fpga'];

const lessonTemplateIds = () =>
  GROUPS.flatMap((group) => {
    const text = readFileSync(join(process.cwd(), 'content', 'projects', 'boards', group, 'index.ts'), 'utf8');
    return [...text.matchAll(/id: "(prj_[^"]+)",[\s\S]*?kind: "(lesson|tour)"/g)].filter((m) => m[2] === 'lesson').map((m) => m[1]);
  });

describe('build-lesson-faults', () => {
  const tables = buildTables();

  it('gives the same tables twice', () => {
    expect(tablesText(buildTables())).toBe(tablesText(tables));
  });

  it('holds every lesson template', () => {
    expect(Object.keys(tables.lessons).sort()).toEqual(lessonTemplateIds().sort());
    expect(Object.keys(tables.lessons)).toHaveLength(71);
  });

  it('keeps each own list inside its board', () => {
    for (const [id, { own }] of Object.entries(tables.lessons)) {
      const board = Object.keys(tables.boards)
        .filter((b) => id.startsWith(`prj_${b}-`))
        .sort((a, b) => b.length - a.length)[0];
      for (const failure of own) expect(tables.boards[board]).toContain(failure);
    }
  });
});
