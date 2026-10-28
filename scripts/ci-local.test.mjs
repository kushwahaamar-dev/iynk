import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(root, 'scripts/ci-local.sh');
const workflowPath = join(root, '.github/workflows/ci.yml');

const STEPS = ['content', 'typecheck', 'lint', 'ui', 'no-only', 'copy', 'provenance', 'relay-deps', 'unit', 'relay', 'build', 'e2e', 'secrets', 'audit'];

describe('scripts/ci-local.sh', () => {
  it('lists the fourteen steps in order', () => {
    const out = execFileSync('bash', [script, '--list'], { cwd: root, encoding: 'utf8' });
    expect(out.trim().split('\n')).toEqual(STEPS);
  });

  it('is valid bash', () => {
    expect(() => execFileSync('bash', ['-n', script])).not.toThrow();
  });

  it('rejects an unknown step and names the valid ones', () => {
    const run = spawnSync('bash', [script, '--only', 'nosuchstep'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('nosuchstep');
    expect(run.stderr).toContain(STEPS.join(' '));
  });

  it('no-only passes on a tree with no focused test', () => {
    const run = spawnSync('bash', [script, '--only', 'no-only'], { cwd: root, encoding: 'utf8' });
    expect(run.status).toBe(0);
  });

  it('no-only fails and names a file holding a focused test', () => {
    const fixture = join(root, 'scripts/.only-fixture.tmp.mjs');
    writeFileSync(fixture, `${['it', 'only'].join('.')}()\n`);
    try {
      const run = spawnSync('bash', [script, '--only', 'no-only'], { cwd: root, encoding: 'utf8' });
      expect(run.status).toBe(1);
      expect(run.stdout).toContain('.only-fixture.tmp.mjs');
    } finally {
      rmSync(fixture, { force: true });
    }
  });
});

describe('.github/workflows/ci.yml', () => {
  const text = readFileSync(workflowPath, 'utf8');

  it('runs the script and needs no secret or write access', () => {
    expect(text).toContain('scripts/ci-local.sh');
    expect(text).not.toContain('secrets.');
    expect(text).not.toContain('write');
  });

  it('parses as YAML', () => {
    const json = execFileSync('python3', ['-I', '-c', 'import sys, json, yaml; print(json.dumps(yaml.safe_load(sys.stdin)))'], {
      input: text,
      encoding: 'utf8',
    });
    const workflow = JSON.parse(json);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.check['timeout-minutes']).toBe(45);
  });
});
