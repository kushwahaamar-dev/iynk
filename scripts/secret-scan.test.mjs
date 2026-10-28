import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { RULES, loadAllow, main, scanText } from './secret-scan.mjs';

const samples = {
  'google-api-key': 'AI' + 'za' + 'x'.repeat(35),
  'sk-key': 's' + 'k-' + 'a'.repeat(24),
  'github-token': 'gh' + 'p_' + 'A'.repeat(36),
  'aws-access-key': 'AK' + 'IA' + 'A'.repeat(16),
  'pem-private-key': '-----BEGIN ' + 'RSA PRIVATE' + ' KEY-----',
  'slack-token': 'xo' + 'xb-' + '1234567890-abcdef',
  'keypair-array': '[' + Array.from({ length: 64 }, (_, i) => i * 4).join(',') + ']',
  'postgres-url-password': 'post' + 'gres://app:hunter22@db.example.com:5432/app',
};

describe('scanText', () => {
  it('has a sample for every rule', () => {
    expect(Object.keys(samples).sort()).toEqual(RULES.map((r) => r.name).sort());
  });

  it.each(Object.entries(samples))('flags %s', (rule, sample) => {
    expect(scanText(`const x = "${sample}";`, 'a.ts')).toEqual([{ rule, line: 1, file: 'a.ts' }]);
  });

  it('reports the line number', () => {
    expect(scanText(`one\ntwo\n${samples['sk-key']}`)).toMatchObject([{ rule: 'sk-key', line: 3 }]);
  });

  it('ignores a 64 character hex hash, a 63 integer array and a localhost database', () => {
    expect(scanText('a'.repeat(64))).toEqual([]);
    expect(scanText('[' + Array.from({ length: 63 }, () => 7).join(',') + ']')).toEqual([]);
    expect(scanText('[' + Array.from({ length: 64 }, () => 300).join(',') + ']')).toEqual([]);
    expect(scanText('post' + 'gres://u:secret@localhost:5432/db')).toEqual([]);
  });

  it('scans a very long line in windows', () => {
    const line = 'x'.repeat(50_000) + samples['google-api-key'] + 'y'.repeat(30_000);
    expect(scanText(line)).toMatchObject([{ rule: 'google-api-key', line: 1 }]);
  });
});

describe('loadAllow', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-allow-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('rejects an entry without a reason', () => {
    const file = join(dir, 'bad.json');
    writeFileSync(file, JSON.stringify([{ rule: 'sk-key', path: 'a.md' }]));
    expect(() => loadAllow(file)).toThrow(/reason/);
  });

  it('loads the shipped list, every entry with a reason', () => {
    for (const e of loadAllow('scripts/secret-scan.allow.json')) {
      expect(e.reason.length).toBeGreaterThan(10);
    }
  });
});

describe('main on a temp repo', () => {
  const repo = mkdtempSync(join(tmpdir(), 'scan-repo-'));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
  const run = async (argv, allowList = []) => {
    const allowPath = join(repo, 'allow.json');
    writeFileSync(allowPath, JSON.stringify(allowList));
    const lines = [];
    const code = await main(argv, { cwd: repo, out: (s) => lines.push(s), allowPath });
    return { code, output: lines.join('\n') };
  };
  afterAll(() => rmSync(repo, { recursive: true, force: true }));

  git('init', '-q');
  git('config', 'user.email', 't@example.com');
  git('config', 'user.name', 't');
  writeFileSync(join(repo, 'clean.txt'), 'nothing here\n');
  git('add', '.');
  git('commit', '-qm', 'clean');
  const clean = git('rev-parse', 'HEAD');
  mkdirSync(join(repo, 'src'));
  writeFileSync(join(repo, 'src', 'cfg.txt'), `line one\nkey=${samples['google-api-key']}\n`);
  git('add', '.');
  git('commit', '-qm', 'plant');
  const planted = git('rev-parse', 'HEAD');
  git('rm', '-q', 'src/cfg.txt');
  git('commit', '-qm', 'remove');
  const removed = git('rev-parse', 'HEAD');

  it('fails the history scan after the shape is removed, naming rule, path, line and commit but not the key', async () => {
    const { code, output } = await run(['--history']);
    expect(code).toBe(1);
    expect(output).toContain(`google-api-key src/cfg.txt:2 ${planted.slice(0, 7)}`);
    expect(output).not.toContain(samples['google-api-key']);
    expect(output).toMatch(/scanned 3 commits, \d+ files, 1 hits \(0 allowed\)/);
  });

  it('fails a range that holds the planting commit and passes one that excludes it', async () => {
    expect((await run(['--diff', `${clean}..${planted}`])).code).toBe(1);
    expect((await run(['--diff', `${planted}..${removed}`])).code).toBe(0);
  });

  it('lets an allow entry silence exactly its rule and path', async () => {
    const entry = { rule: 'google-api-key', path: 'src/cfg.txt', reason: 'a test placeholder' };
    expect((await run(['--history'], [entry])).code).toBe(0);
    expect((await run(['--history'], [{ ...entry, rule: 'sk-key' }])).code).toBe(1);
    expect((await run(['--history'], [{ ...entry, path: 'other.txt' }])).code).toBe(1);
    expect((await run(['--history'], [{ ...entry, commit: removed.slice(0, 7) }])).code).toBe(1);
    expect((await run(['--history'], [{ ...entry, commit: planted.slice(0, 7) }])).code).toBe(0);
  });

  it('scans the tracked tree', async () => {
    writeFileSync(join(repo, 'now.txt'), `${samples['sk-key']}\n`);
    git('add', 'now.txt');
    const { code, output } = await run(['--tree']);
    expect(code).toBe(1);
    expect(output).toContain('sk-key now.txt:1');
    expect(output).not.toContain(samples['sk-key']);
  });

  it('exits 2 outside a git repo and on bad arguments', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'scan-none-'));
    const lines = [];
    expect(await main(['--history'], { cwd: outside, out: (s) => lines.push(s) })).toBe(2);
    rmSync(outside, { recursive: true, force: true });
    expect(await main(['--diff'], { cwd: repo, out: () => {} })).toBe(2);
  });
});
