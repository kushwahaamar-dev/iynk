import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { findLeaks } from './check-studio-chunks.mjs';

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-studio-chunks.mjs');
const chunk = (name) => `.next-fixture/static/chunks/${name}`;

let root;
let dist;

const writeStats = (rows) => writeFileSync(join(dist, 'diagnostics/route-bundle-stats.json'), JSON.stringify(rows));
const rows = (home, boards, studio) => [
  { route: '/[lang]', firstLoadChunkPaths: home },
  { route: '/[lang]/boards', firstLoadChunkPaths: boards },
  { route: '/[lang]/studio', firstLoadChunkPaths: studio },
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'check-studio-chunks-'));
  dist = join(root, '.next-fixture');
  mkdirSync(join(dist, 'static/chunks'), { recursive: true });
  mkdirSync(join(dist, 'diagnostics'), { recursive: true });
  writeFileSync(join(dist, 'static/chunks/clean.js'), 'console.log("loader");');
  writeFileSync(join(dist, 'static/chunks/dirty.js'), 'svg.setAttribute("data-iynk-renderer","")');
  writeFileSync(join(dist, 'static/chunks/editor.js'), 'el.className="cm-scroller"');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('findLeaks', () => {
  it('reports nothing for clean chunks', () => {
    expect(findLeaks(rows([chunk('clean.js')], [chunk('clean.js')], [chunk('clean.js')]), dist)).toEqual([]);
  });

  it('names the route, chunk and marker of a leak', () => {
    expect(findLeaks(rows([chunk('clean.js')], [chunk('clean.js')], [chunk('clean.js'), chunk('dirty.js')]), dist)).toEqual([
      { route: '/[lang]/studio', chunk: chunk('dirty.js'), marker: 'data-iynk-renderer' },
    ]);
  });

  it('allows the code editor on the studio route only', () => {
    expect(findLeaks(rows([chunk('clean.js')], [chunk('clean.js')], [chunk('editor.js')]), dist)).toEqual([]);
    expect(findLeaks(rows([chunk('editor.js')], [chunk('clean.js')], [chunk('clean.js')]), dist)).toHaveLength(1);
  });

  it('throws when a checked route is missing', () => {
    expect(() => findLeaks([], dist)).toThrow(/not in the stats file/);
  });
});

describe('check-studio-chunks', () => {
  const run = () => spawnSync(process.execPath, [script, '--dist', dist], { encoding: 'utf8' });

  it('exits 0 for clean chunks', () => {
    writeStats(rows([chunk('clean.js')], [chunk('clean.js')], [chunk('clean.js')]));
    expect(run().status).toBe(0);
  });

  it('exits 1 and names the chunk when a marker is found', () => {
    writeStats(rows([chunk('dirty.js')], [chunk('clean.js')], [chunk('clean.js')]));
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('dirty.js');
  });

  it('exits 2 when the stats file is missing', () => {
    expect(spawnSync(process.execPath, [script, '--dist', join(root, 'nope')], { encoding: 'utf8' }).status).toBe(2);
  });
});
