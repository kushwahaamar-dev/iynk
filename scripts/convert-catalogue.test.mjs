// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadItem } from './convert-io.mjs';
import { stateHash } from '../src/project/hash.ts';
import { validateText } from '../src/project/validate.ts';

const ONLY = 'board/uno-r3,robotics/l298n,drone/quad5';
const script = new URL('./convert-catalogue.mjs', import.meta.url).pathname;

let dirs = [];
let first;
let result;

const run = (args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const filesOf = (dir) =>
  readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith('.project.json'))
    .sort();
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'corpus-'));
  dirs.push(dir);
  return dir;
};

beforeAll(() => {
  first = temp();
  result = run(['--only', ONLY, '--out', first]);
});

afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

describe('convert-catalogue on three items', () => {
  it('exits 0 and writes the report and the manifest', () => {
    expect(result.status).toBe(0);
    expect(readFileSync(join(first, 'report.md'), 'utf8')).toContain('| Items | 3 |');
    const manifest = JSON.parse(readFileSync(join(first, 'manifest.json'), 'utf8'));
    expect(manifest).toHaveLength(filesOf(first).length);
  });

  it('writes 1 + lessons + 1 + tasks + 1 project files', () => {
    const lessons = loadItem('board', 'uno-r3').data.lessons.length;
    const tasks = loadItem('robotics', 'l298n').data.tasks.length;
    expect(filesOf(first)).toHaveLength(1 + lessons + 1 + tasks + 1);
  });

  it('writes projects that pass validateText and round-trip to the manifest hash', () => {
    const manifest = new Map(JSON.parse(readFileSync(join(first, 'manifest.json'), 'utf8')).map((m) => [m.id, m]));
    for (const file of filesOf(first)) {
      const text = readFileSync(join(first, file), 'utf8');
      const report = validateText(text);
      expect(report.errors, file).toBe(0);
      expect(report.warnings, file).toBe(0);
      expect(stateHash(report.doc), file).toBe(manifest.get(report.doc.id).stateHash);
    }
  });

  it('gives identical bytes when run twice', () => {
    const second = temp();
    expect(run(['--only', ONLY, '--out', second]).status).toBe(0);
    const files = [...filesOf(first), 'report.md', 'manifest.json'];
    expect(filesOf(second)).toEqual(filesOf(first));
    for (const file of files) expect(readFileSync(join(second, file), 'utf8'), file).toBe(readFileSync(join(first, file), 'utf8'));
  });

  it('rejects --only with --check and an unknown flag', () => {
    expect(run(['--only', ONLY, '--check']).status).toBe(2);
    expect(run(['--nope']).status).toBe(2);
  });
});
