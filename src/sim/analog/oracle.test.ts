// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PWL_OPTIONS } from './elements.ts';
import fixture from './fixtures/ngspice/linear.json';
import { solve } from './solve.ts';
import type { Element } from './types.ts';

interface Circuit {
  id: string;
  group: 'hand' | 'random';
  source: string;
  revision: string;
  nodes: string[];
  elements: Element[];
  expected: Record<string, number>;
}

const circuits = fixture.circuits as unknown as Circuit[];
const REL = 1e-6;
const FLOOR_VOLTS = 1e-3;
const regenerate = 'node scripts/gen-ngspice-fixtures.mjs --set linear --out src/sim/analog/fixtures/ngspice/linear.json';

// Returns the worst relative error of one circuit and every node that is off by more than REL
function compare(c: Circuit): { worst: number; failures: string[] } {
  const r = solve({ nodes: c.nodes.length, ground: 0, elements: c.elements }, PWL_OPTIONS);
  const failures: string[] = [];
  let worst = 0;
  if (!r.converged) failures.push(`${c.id}: did not converge`);
  c.nodes.forEach((name, i) => {
    if (i === 0) return;
    const want = c.expected[name];
    const got = r.v[i];
    const rel = Math.abs(got - want) / Math.max(Math.abs(want), FLOOR_VOLTS);
    worst = Math.max(worst, rel);
    if (!(rel <= REL)) failures.push(`${c.id} ${name}: solver ${got}, ngspice ${want}, relative error ${rel.toExponential(3)}`);
  });
  return { worst, failures };
}

describe('solver against recorded ngspice output (SA-03)', () => {
  it('has the committed fixture', () => {
    expect(circuits.length, `fixture missing or short; regenerate with: ${regenerate}`).toBeGreaterThan(0);
    expect(circuits.filter((c) => c.group === 'hand')).toHaveLength(7);
    expect(circuits.filter((c) => c.group === 'random')).toHaveLength(60);
    for (const c of circuits) {
      expect(c.source, c.id).toBeTruthy();
      expect(c.revision, c.id).toBeTruthy();
    }
  });

  it.each(['C01', 'C02', 'C03', 'C04', 'C05', 'C18', 'C19'])('matches ngspice on %s', (id) => {
    const c = circuits.find((x) => x.id === id)!;
    expect(c, id).toBeDefined();
    expect(compare(c).failures).toEqual([]);
  });

  it('matches ngspice on the 60 random resistor networks', () => {
    const failures: string[] = [];
    for (const c of circuits.filter((x) => x.group === 'random')) failures.push(...compare(c).failures);
    expect(failures).toEqual([]);
  });

  it('prints the worst relative error per set', () => {
    for (const group of ['hand', 'random'] as const) {
      const worst = Math.max(...circuits.filter((c) => c.group === group).map((c) => compare(c).worst));
      console.log(`SA-03 ${group}: worst relative error ${worst.toExponential(3)} against ${fixture.engine} (floor ${FLOOR_VOLTS} V)`);
      expect(worst).toBeLessThanOrEqual(REL);
    }
  });

  it('names the circuit when a resistor is wrong', () => {
    const c = structuredClone(circuits.find((x) => x.id === 'C01')!);
    const r = c.elements.find((e) => e.kind === 'R')!;
    if (r.kind === 'R') r.ohms *= 1.01;
    const { failures } = compare(c);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0]).toContain('C01');
  });
});
