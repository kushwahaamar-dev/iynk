// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PWL_OPTIONS } from './elements.ts';
import golden from './fixtures/legacy-golden.json';
import { compareSolution, curveFromTable, gmOf, REL_TOLERANCE, toSolveInput, type GoldenCircuit } from './legacy-adapter.ts';
import { pwmSlices, solve } from './solve.ts';

const circuits = golden as unknown as GoldenCircuit[];

describe('solver equivalence with the old bench solver (SA-02)', () => {
  it('holds 79 lesson circuits and the 20 RS-08 circuits', () => {
    expect(circuits).toHaveLength(99);
    expect(circuits.filter((c) => c.source === 'lesson')).toHaveLength(79);
    expect(circuits.filter((c) => c.source === 'rs08')).toHaveLength(20);
    expect(new Set(circuits.map((c) => c.id)).size).toBe(99);
  });

  it('reproduces every node voltage and branch current within 1e-9 relative', () => {
    let worst = { id: '', rel: 0, where: '' };
    const failures: string[] = [];
    for (const g of circuits) {
      const r = solve(toSolveInput(g), PWL_OPTIONS);
      const c = compareSolution(g, r);
      failures.push(...c.failures);
      if (!r.converged) failures.push(`${g.id}: did not converge`);
      if (c.worstRel >= worst.rel) worst = { id: g.id, rel: c.worstRel, where: c.worstWhere };
    }
    console.log(`SA-02: 99 circuits, worst relative difference ${worst.rel.toExponential(3)} at ${worst.id} ${worst.where}`);
    expect(failures).toEqual([]);
    expect(worst.rel).toBeLessThanOrEqual(REL_TOLERANCE);
  });

  it('slices the PWM duties the way the old solver did', () => {
    for (const g of circuits) {
      const own = pwmSlices(g.elements).map((s) => s.weight);
      expect(own, g.id).toEqual(g.pwmSlices.map((s) => s.weight));
    }
  });

  it('finds the old motor conductance with its own 6-pass loop', () => {
    const withMotors = circuits.filter((g) => Object.keys(g.motorGm).length > 0);
    expect(withMotors.length).toBeGreaterThan(0);
    for (const g of withMotors) {
      const r = solve({ ...toSolveInput(g), curve: curveFromTable(g) }, PWL_OPTIONS);
      for (const [id, gm] of Object.entries(g.motorGm)) {
        expect(Math.abs(gmOf(r, id) - gm) / gm, `${g.id} ${id}`).toBeLessThan(0.01);
      }
    }
  });

  it('names the circuit when a golden voltage is off by 1e-6', () => {
    const g = circuits.find((c) => c.id.startsWith('rs08/C01'))!;
    const tampered: GoldenCircuit = structuredClone(g);
    tampered.expected.slices[0].v[2] += 1e-6;
    const c = compareSolution(tampered, solve(toSolveInput(tampered), PWL_OPTIONS));
    expect(c.failures.length).toBeGreaterThan(0);
    expect(c.failures[0]).toContain('rs08/C01');
  });
});
