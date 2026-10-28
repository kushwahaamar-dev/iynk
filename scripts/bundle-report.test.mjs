import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { routeFirstLoad } from './bundle-report.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'bundle-report.mjs');
const halve = (buffer) => buffer.length / 2;

let root;
let dist;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'bundle-report-'));
  dist = join(root, '.next-fixture');
  mkdirSync(join(dist, 'static/chunks'), { recursive: true });
  mkdirSync(join(dist, 'diagnostics'), { recursive: true });
  writeFileSync(join(dist, 'static/chunks/a.js'), 'a'.repeat(100));
  writeFileSync(join(dist, 'static/chunks/b.js'), 'b'.repeat(40));
  writeFileSync(join(dist, 'static/chunks/c.js'), 'c'.repeat(10));
  writeFileSync(
    join(dist, 'diagnostics/route-bundle-stats.json'),
    JSON.stringify([
      { route: '/', firstLoadUncompressedJsBytes: 110, firstLoadChunkPaths: ['.next-fixture/static/chunks/a.js', '.next-fixture/static/chunks/c.js'] },
      { route: '/lesson', firstLoadUncompressedJsBytes: 140, firstLoadChunkPaths: ['.next-fixture/static/chunks/a.js', '.next-fixture/static/chunks/b.js'] },
    ]),
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const stats = () => [
  { route: '/', firstLoadChunkPaths: ['.next-fixture/static/chunks/a.js', '.next-fixture/static/chunks/c.js'] },
  { route: '/lesson', firstLoadChunkPaths: ['.next-fixture/static/chunks/a.js', '.next-fixture/static/chunks/b.js'] },
];

describe('routeFirstLoad', () => {
  it('sums the raw and compressed size of each route\'s chunks', () => {
    expect(routeFirstLoad(stats(), dist, halve)).toEqual([
      { route: '/', chunks: 2, rawBytes: 110, gzipBytes: 55 },
      { route: '/lesson', chunks: 2, rawBytes: 140, gzipBytes: 70 },
    ]);
  });

  it('throws when a chunk file is missing', () => {
    const missing = [{ route: '/x', firstLoadChunkPaths: ['.next-fixture/static/chunks/none.js'] }];
    expect(() => routeFirstLoad(missing, dist, halve)).toThrow(/none\.js/);
  });
});

describe('CLI', () => {
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });

  it('prints JSON, biggest route first', () => {
    const result = run('--dist', dist, '--json');
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout).map((r) => r.route)).toEqual(['/lesson', '/']);
  });

  it('prints a table by default', () => {
    const result = run('--dist', dist);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^route\s+chunks\s+raw bytes\s+gzip bytes/);
  });

  it('exits 2 when there is no stats file or the flag is unknown', () => {
    expect(run('--dist', join(root, 'nope')).status).toBe(2);
    expect(run('--wat').status).toBe(2);
  });
});
