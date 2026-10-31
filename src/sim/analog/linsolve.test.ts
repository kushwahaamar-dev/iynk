// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { rng } from '../../core/prng.ts';
import { conditionEstimate, linsolve } from './linsolve.ts';

const rows = (m: number[][]) => m.map((r) => Float64Array.from(r));

const source = readFileSync(resolve(import.meta.dirname, '../../../figures/engine/bench-solve.js'), 'utf8');
const body = /function linsolve\(A, b\)\{[\s\S]*?\n\}\n/.exec(source)?.[0];
if (!body) throw new Error('linsolve not found in figures/engine/bench-solve.js');
const oldLinsolve = new Function(`${body}\nreturn linsolve;`)() as (A: Float64Array[], b: Float64Array) => Float64Array;

function randomSystem(n: number, r: ReturnType<typeof rng>) {
  const A = Array.from({ length: n }, () => Float64Array.from({ length: n }, () => r.float() * 2 - 1));
  for (let i = 0; i < n; i++) A[i][i] += n;
  const b = Float64Array.from({ length: n }, () => r.float() * 10 - 5);
  return { A, b };
}

const clone = (A: Float64Array[]) => A.map((row) => Float64Array.from(row));

// Doolittle LU with partial pivoting, written independently of the solver under test
function referenceSolve(A0: Float64Array[], b0: Float64Array): Float64Array {
  const n = b0.length;
  const a = A0.map((row) => Array.from(row));
  const perm = Array.from({ length: n }, (_, i) => i);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
    [a[k], a[p]] = [a[p], a[k]];
    [perm[k], perm[p]] = [perm[p], perm[k]];
    for (let i = k + 1; i < n; i++) {
      a[i][k] /= a[k][k];
      for (let j = k + 1; j < n; j++) a[i][j] -= a[i][k] * a[k][j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    y[i] = b0[perm[i]];
    for (let j = 0; j < i; j++) y[i] -= a[i][j] * y[j];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = y[i];
    for (let j = i + 1; j < n; j++) x[i] -= a[i][j] * x[j];
    x[i] /= a[i][i];
  }
  return x;
}

describe('linsolve', () => {
  it('solves the identity', () => {
    const x = linsolve(rows([[1, 0], [0, 1]]), Float64Array.from([3, -4]));
    expect(Array.from(x)).toEqual([3, -4]);
  });

  it('solves a 1 by 1 system and an empty one', () => {
    expect(Array.from(linsolve(rows([[4]]), Float64Array.from([2])))).toEqual([0.5]);
    expect(linsolve([], new Float64Array(0)).length).toBe(0);
  });

  it('solves a 3 by 3 system with a known solution', () => {
    const x = linsolve(rows([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]), Float64Array.from([8, -11, -3]));
    expect(x[0]).toBeCloseTo(2, 12);
    expect(x[1]).toBeCloseTo(3, 12);
    expect(x[2]).toBeCloseTo(-1, 12);
  });

  it('solves a node nothing reaches to 0 V', () => {
    const x = linsolve(rows([[2, 0], [0, 0]]), Float64Array.from([4, 7]));
    expect(Array.from(x)).toEqual([2, 0]);
  });

  it('mutates its inputs like the original', () => {
    const A = rows([[0, 1], [1, 0]]);
    const b = Float64Array.from([2, 3]);
    linsolve(A, b);
    expect(Array.from(A[0])).toEqual([1, 0]);
    expect(Array.from(b)).toEqual([3, 2]);
  });

  it('rejects mismatched sizes', () => {
    expect(() => linsolve(rows([[1]]), new Float64Array(2))).toThrow(RangeError);
  });

  it('passes NaN through', () => {
    const x = linsolve(rows([[1]]), Float64Array.from([NaN]));
    expect(x[0]).toBeNaN();
  });

  it('agrees with an independent LU on 200 random systems', () => {
    const r = rng(16, 'linsolve-test');
    for (let i = 0; i < 200; i++) {
      const { A, b } = randomSystem(2 + (i % 40), r);
      const want = referenceSolve(A, b);
      const got = linsolve(clone(A), Float64Array.from(b));
      for (let k = 0; k < want.length; k++) {
        expect(Math.abs(got[k] - want[k])).toBeLessThanOrEqual(1e-12 * Math.max(Math.abs(want[k]), 1e-12));
      }
    }
  });

  it('equals the old function bit for bit on 50 systems', () => {
    const r = rng(17, 'linsolve-test');
    for (let i = 0; i < 50; i++) {
      const { A, b } = randomSystem(i === 0 ? 40 : 1 + (i % 30), r);
      const want = oldLinsolve(clone(A), Float64Array.from(b));
      const got = linsolve(clone(A), Float64Array.from(b));
      expect(Array.from(got)).toEqual(Array.from(want));
    }
  });
});

describe('conditionEstimate', () => {
  it('is 1 for the identity and for an empty matrix', () => {
    expect(conditionEstimate(rows([[1, 0], [0, 1]]))).toBe(1);
    expect(conditionEstimate([])).toBe(1);
  });

  it('divides the largest entry by the smallest diagonal', () => {
    expect(conditionEstimate(rows([[1e-3, 5], [5, 2]]))).toBe(5000);
  });

  it('is infinite with a zero diagonal entry', () => {
    expect(conditionEstimate(rows([[1, 0], [0, 0]]))).toBe(Infinity);
  });
});
