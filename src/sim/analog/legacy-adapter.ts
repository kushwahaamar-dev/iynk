import type { PwmSlice, SolveInput } from './solve.ts';
import type { Element, ElementId, SolveResult } from './types.ts';

export interface GoldenBranch { amps: number; volts: number }

export interface GoldenCircuit {
  id: string;
  source: 'lesson' | 'rs08';
  nodes: number;
  ground: number;
  elements: Element[];
  pwmSlices: Array<{ weight: number; highNets: string[] }>;
  // the conductance the old motor loop settled on, for each motor it iterated
  motorGm: Record<string, number>;
  // the amps the motor takes at 0, 0.05, ... 14 volts, as (volts, amps)
  motorCurves: Record<string, Array<[number, number]>>;
  expected: { slices: Array<{ weight: number; v: number[]; branch: Record<string, GoldenBranch> }> };
}

export const REL_TOLERANCE = 1e-9;
export const ABS_FLOOR = 1e-12;

// Motors get the conductance the old solver settled on: the amps it implies are gm * volts, with the old loop's 0.3 V floor
export function toSolveInput(g: GoldenCircuit): SolveInput {
  const pwmSlices: PwmSlice[] = g.pwmSlices.map((s) => ({ weight: s.weight, high: (el) => s.highNets.includes(el.id) }));
  return {
    nodes: g.nodes,
    ground: g.ground,
    elements: g.elements,
    pwmSlices,
    curve: (id: ElementId, volts: number) => (id in g.motorGm ? g.motorGm[id] * Math.max(volts, 0.3) : undefined),
  };
}

// The same hook driven by the amps the old motor model gave at each voltage, so the solver's own loop finds the gm
export function curveFromTable(g: GoldenCircuit): NonNullable<SolveInput['curve']> {
  return (id, volts) => {
    const table = g.motorCurves[id];
    if (!table) return undefined;
    const at = Math.min(Math.max(volts, 0) * 20, table.length - 1);
    const lo = Math.floor(at);
    const hi = Math.min(lo + 1, table.length - 1);
    return table[lo][1] + (table[hi][1] - table[lo][1]) * (at - lo);
  };
}

export function gmOf(r: SolveResult, id: ElementId): number {
  const b = r.branch[id];
  return b.amps / b.volts;
}

const relDiff = (got: number, want: number) => {
  const d = Math.abs(got - want);
  return d <= ABS_FLOOR ? 0 : d / Math.max(Math.abs(got), Math.abs(want));
};

export function compareSolution(g: GoldenCircuit, r: SolveResult): { worstRel: number; worstWhere: string; failures: string[] } {
  const want = { v: new Array<number>(g.nodes).fill(0), branch: {} as Record<string, GoldenBranch> };
  for (const s of g.expected.slices) {
    s.v.forEach((value, node) => { want.v[node] += s.weight * value; });
    for (const [id, b] of Object.entries(s.branch)) {
      const sum = (want.branch[id] ??= { amps: 0, volts: 0 });
      sum.amps += s.weight * b.amps;
      sum.volts += s.weight * b.volts;
    }
  }
  let worstRel = 0;
  let worstWhere = '';
  const failures: string[] = [];
  const check = (where: string, got: number, expected: number) => {
    const rel = relDiff(got, expected);
    if (rel > worstRel) { worstRel = rel; worstWhere = where; }
    if (!(rel <= REL_TOLERANCE)) failures.push(`${g.id} ${where}: got ${got}, expected ${expected}`);
  };
  want.v.forEach((value, node) => check(`v[${node}]`, r.v[node], value));
  for (const [id, b] of Object.entries(want.branch)) {
    const got = r.branch[id];
    if (!got) { failures.push(`${g.id} ${id}: missing from the result`); continue; }
    check(`${id}.amps`, got.amps, b.amps);
    check(`${id}.volts`, got.volts, b.volts);
  }
  return { worstRel, worstWhere, failures };
}
