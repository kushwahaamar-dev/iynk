import { describe, expect, it } from 'vitest';
import { compare, summarise } from './perf-budget.mjs';

const budgets = (metrics) => ({
  schema: 1,
  recordedAt: '2026-10-28T00:00:00.000Z',
  node: 'v24.8.0',
  machine: { cpus: 8, load1: 0.5 },
  metrics: Object.fromEntries(
    Object.entries(metrics).map(([name, baseline]) => [name, { baseline, unit: 'bytes', proposedBudget: null, enforced: false }]),
  ),
});

const base = budgets({ 'landing.js.gzipTransferred': 1000, 'lesson.js.gzipTransferred': 2000 });

describe('compare', () => {
  it('passes a metric 9 percent over its baseline', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 1090, 'lesson.js.gzipTransferred': 2000 });
    expect(findings.map((f) => f.status)).toEqual(['ok', 'ok']);
  });

  it('fails a metric 11 percent over its baseline and names it', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 1110, 'lesson.js.gzipTransferred': 2000 });
    expect(findings[0]).toMatchObject({ metric: 'landing.js.gzipTransferred', status: 'regressed', baseline: 1000, current: 1110 });
    expect(findings[1].status).toBe('ok');
  });

  it('reports a metric that was not measured', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 1000 });
    expect(findings[1]).toMatchObject({ metric: 'lesson.js.gzipTransferred', status: 'missing', baseline: 2000 });
  });

  it('reports a measured metric that has no baseline', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 1000, 'lesson.js.gzipTransferred': 2000, 'idle.bench.mainThreadPct': 3 });
    expect(findings[2]).toMatchObject({ metric: 'idle.bench.mainThreadPct', status: 'new', current: 3 });
  });

  it('passes an improvement', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 500, 'lesson.js.gzipTransferred': 1500 });
    expect(findings.map((f) => f.status)).toEqual(['ok', 'ok']);
  });

  it('takes the tolerance as an argument', () => {
    const findings = compare(base, { 'landing.js.gzipTransferred': 1090, 'lesson.js.gzipTransferred': 2000 }, 0.05);
    expect(findings[0].status).toBe('regressed');
  });
});

describe('summarise', () => {
  it('is ok when nothing regressed, even with missing and new metrics', () => {
    const { ok, lines } = summarise([
      { metric: 'a', status: 'ok', baseline: 1, current: 1 },
      { metric: 'b', status: 'missing', baseline: 2 },
      { metric: 'c', status: 'new', current: 3 },
    ]);
    expect(ok).toBe(true);
    expect(lines).toHaveLength(4);
  });

  it('is not ok when a metric regressed, and the table names it', () => {
    const { ok, lines } = summarise([{ metric: 'landing.js.gzipTransferred', status: 'regressed', baseline: 1000, current: 1500 }]);
    expect(ok).toBe(false);
    expect(lines.join('\n')).toMatch(/landing\.js\.gzipTransferred.*1000.*1500.*regressed/);
  });
});
