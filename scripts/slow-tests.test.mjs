import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { slowTests } from './slow-tests.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'slow-tests.mjs');

const report = (...assertionResults) => ({ testResults: [{ name: '/repo/a.test.ts', assertionResults }] });
const test = (fullName, duration, status = 'passed') => ({ fullName, duration, status });

describe('slowTests', () => {
  it('returns only the tests over the limit, slowest first', () => {
    const slow = slowTests(report(test('fast', 100), test('slow', 21_000), test('slower', 30_000), test('edge', 20_000)));
    expect(slow).toEqual([
      { file: '/repo/a.test.ts', name: 'slower', ms: 30_000 },
      { file: '/repo/a.test.ts', name: 'slow', ms: 21_000 },
    ]);
  });

  it('ignores skipped tests and tests with no duration', () => {
    const slow = slowTests(report(test('skipped', 40_000, 'skipped'), { fullName: 'todo', status: 'pending' }));
    expect(slow).toEqual([]);
  });

  it('takes the limit as an argument', () => {
    expect(slowTests(report(test('a', 600)), 500)).toHaveLength(1);
  });
});

describe('scripts/slow-tests.mjs', () => {
  let dir;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'slow-tests-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  const run = (...args) => spawnSync('node', [script, ...args], { encoding: 'utf8' });
  const write = (name, data) => {
    const path = join(dir, name);
    writeFileSync(path, JSON.stringify(data));
    return path;
  };

  it('exits 1 and names a test over 20 s', () => {
    const result = run(write('slow.json', report(test('takes forever', 21_000))));
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('takes forever');
    expect(result.stdout).toContain('21.0 s');
  });

  it('exits 0 when no test is over the limit', () => {
    const result = run(write('fast.json', report(test('quick', 50))));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no test over 20 s');
  });

  it('exits 2 and names a missing path', () => {
    const missing = join(dir, 'missing.json');
    const result = run(missing);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(missing);
  });
});
