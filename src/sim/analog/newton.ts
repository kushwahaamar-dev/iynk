import { simDiag, type SolveDiagnostic } from '../core/diagnostic.ts';
import { NEWTON_DEVICES } from './devices/index.ts';
import { freshState, measureElement, PWL_COMPAT, stampElement, type Measured, type PwlState } from './elements.ts';
import { UnionFind } from './graph.ts';
import { conditionEstimate, linsolve } from './linsolve.ts';
import type { SolveInput } from './solve.ts';
import type { DeviceState, Element, ElementId, SolveResult } from './types.ts';

export interface NewtonOptions { reltol: number; vabstol: number; iabstol: number; maxIter: number; gmin: number }

export const SPICE_DEFAULTS: NewtonOptions = { reltol: 1e-3, vabstol: 1e-6, iabstol: 1e-12, maxIter: 100, gmin: 1e-12 };

export interface Limiter { pnj(vnew: number, vold: number, vt: number, vcrit: number): number }

/** What a device writes its linearisation into; nodes are circuit node numbers. */
export interface Stamper {
  conduct(a: number, b: number, siemens: number): void;
  // a constant current from a to b through the element
  current(a: number, b: number, amps: number): void;
  // the junction voltage each device used last iteration, by element id
  junctionVolts: Map<ElementId, number>;
}

const GMIN_START = 1e-2;
const SOURCE_STEPS = 10;
const DAMP_TRIES = 4;

const LINEAR: ReadonlySet<Element['kind']> = new Set(['R', 'M', 'POT', 'V', 'PIN', 'SV']);

// Newton step limiting for a p-n junction, after SPICE's pnjlim
function pnjlim(vnew: number, vold: number, vt: number, vcrit: number): number {
  if (vnew <= vcrit || Math.abs(vnew - vold) <= 2 * vt) return vnew;
  if (vold <= 0) return vt * Math.log(vnew / vt);
  const arg = (vnew - vold) / vt;
  return arg > 0 ? vold + vt * (2 + Math.log(arg - 2)) : vold - vt * (2 + Math.log(2 - arg));
}

const identity: Limiter = { pnj: (vnew) => vnew };

function trackingLimiter() {
  const lim = {
    limited: false,
    pnj(vnew: number, vold: number, vt: number, vcrit: number) {
      const v = pnjlim(vnew, vold, vt, vcrit);
      if (v !== vnew) lim.limited = true;
      return v;
    },
  };
  return lim;
}

interface Ctx {
  nodes: number;
  ground: number;
  els: Element[];
  states: PwlState[];
  o: NewtonOptions;
  ix: (node: number) => number;
  nodeOf: (row: number) => number;
}

function terminals(el: Element): number[] {
  switch (el.kind) {
    case 'R': case 'M': case 'V': case 'D': return [el.a, el.b];
    case 'POT': return [el.a, el.wiper, el.b];
    case 'PIN': return [el.a];
    case 'SV': return [el.gnd, el.vplus];
    default: return [];
  }
}

// nodes with no path to ground, with whether a junction sits on them
function floatingNodes(c: Ctx): { node: number; junction: boolean }[] {
  const uf = new UnionFind();
  const key = (node: number) => String(node);
  for (const el of c.els) {
    const wired = terminals(el);
    if (el.kind === 'PIN' && el.level !== 'Z') wired.push(c.ground);
    for (const node of wired) uf.union(key(wired[0]), key(node));
  }
  const grounded = uf.find(key(c.ground));
  const junctions = new Set(c.els.filter((el) => NEWTON_DEVICES.has(el.kind)).flatMap((el) => terminals(el).map((node) => uf.find(key(node)))));
  return Array.from({ length: c.nodes }, (_, node) => node)
    .filter((node) => uf.find(key(node)) !== grounded)
    .map((node) => ({ node, junction: junctions.has(uf.find(key(node))) }));
}

function conduct(A: Float64Array[], i: number, j: number, g: number): void {
  if (i >= 0) { A[i][i] += g; if (j >= 0) A[i][j] -= g; }
  if (j >= 0) { A[j][j] += g; if (i >= 0) A[j][i] -= g; }
}

function assemble(c: Ctx, x: Float64Array, gmin: number, lim: Limiter, junctionVolts: Map<ElementId, number>) {
  const n = c.nodes - 1;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) A[i][i] += gmin;
  const stamper: Stamper = {
    conduct: (p, q, g) => conduct(A, c.ix(p), c.ix(q), g),
    current: (p, q, amps) => {
      const i = c.ix(p), j = c.ix(q);
      if (i >= 0) b[i] -= amps;
      if (j >= 0) b[j] += amps;
    },
    junctionVolts,
  };
  c.els.forEach((el, k) => {
    const device = NEWTON_DEVICES.get(el.kind);
    if (device) device.stamp(el, x, stamper, lim);
    else stampElement(el, A, b, c.ix, c.states[k]);
  });
  return { A, b };
}

const expand = (c: Ctx, rows: Float64Array) => {
  const full = new Float64Array(c.nodes);
  rows.forEach((value, row) => { full[c.nodeOf(row)] = value; });
  return full;
};

// KCL at x with every device linearised exactly there; `within` is true when every row balances to the tolerances
function residualOf(c: Ctx, x: Float64Array, gmin: number) {
  const { A, b } = assemble(c, x, gmin, identity, new Map());
  const volts = Float64Array.from({ length: A.length }, (_, row) => x[c.nodeOf(row)]);
  let maxAmps = 0;
  let worstRow = -1;
  let within = true;
  A.forEach((line, i) => {
    let sum = -b[i];
    let scale = Math.abs(b[i]);
    line.forEach((a, j) => { sum += a * volts[j]; scale += Math.abs(a * volts[j]); });
    if (worstRow < 0 || Math.abs(sum) > maxAmps) { maxAmps = Math.abs(sum); worstRow = i; }
    if (Math.abs(sum) > c.o.reltol * scale + c.o.iabstol) within = false;
  });
  return { maxAmps, worstRow, within, condition: conditionEstimate(A) };
}

function stepSettled(c: Ctx, x: Float64Array, next: Float64Array): boolean {
  const { reltol, vabstol, iabstol } = c.o;
  for (let node = 0; node < c.nodes; node++) {
    if (Math.abs(next[node] - x[node]) > reltol * Math.max(Math.abs(next[node]), Math.abs(x[node])) + vabstol) return false;
  }
  return c.els.every((el) => {
    const device = NEWTON_DEVICES.get(el.kind);
    if (!device) return true;
    const before = device.currents(el, x), after = device.currents(el, next);
    return after.every((amps, k) => Math.abs(amps - before[k]) <= reltol * Math.max(Math.abs(amps), Math.abs(before[k])) + iabstol);
  });
}

interface Run { x: Float64Array; iterations: number; converged: boolean; damped: boolean; fault: number | null }

function run(c: Ctx, x0: Float64Array, gmin: number, junctionVolts: Map<ElementId, number>): Run {
  let x = x0;
  let norm = residualOf(c, x, gmin).maxAmps;
  let damped = false;
  for (let iterations = 1; iterations <= c.o.maxIter; iterations++) {
    const lim = trackingLimiter();
    const { A, b } = assemble(c, x, gmin, lim, junctionVolts);
    const full = expand(c, linsolve(A, b));
    const bad = full.findIndex((v) => !Number.isFinite(v));
    if (bad >= 0) return { x, iterations, converged: false, damped, fault: bad };
    if (lim.limited || !stepSettled(c, x, full)) {
      let next = full;
      let nextNorm = residualOf(c, next, gmin).maxAmps;
      for (let tries = 0; tries < DAMP_TRIES && nextNorm > norm; tries++) {
        next = next.map((v, node) => x[node] + 0.5 * (v - x[node]));
        nextNorm = residualOf(c, next, gmin).maxAmps;
        damped = true;
      }
      x = next;
      norm = nextNorm;
      continue;
    }
    x = full;
    const res = residualOf(c, x, gmin);
    if (res.within) return { x, iterations, converged: true, damped, fault: null };
    norm = res.maxAmps;
  }
  return { x, iterations: c.o.maxIter, converged: false, damped, fault: null };
}

function gminStepping(c: Ctx, x0: Float64Array): Run {
  const junctionVolts = new Map<ElementId, number>();
  let x = x0;
  let iterations = 0;
  for (let gmin = Math.max(GMIN_START, c.o.gmin); ; gmin = Math.max(gmin / 10, c.o.gmin)) {
    const r = run(c, x, gmin, junctionVolts);
    iterations += r.iterations;
    x = r.x;
    if (!r.converged || gmin === c.o.gmin) return { ...r, iterations };
  }
}

function sourceStepping(c: Ctx, x0: Float64Array): Run {
  const junctionVolts = new Map<ElementId, number>();
  let x = x0;
  let iterations = 0;
  let r: Run = { x, iterations, converged: true, damped: false, fault: null };
  for (let step = 1; step <= SOURCE_STEPS; step++) {
    const scale = step / SOURCE_STEPS;
    const scaled = c.els.map((el) => (el.kind === 'V' ? { ...el, volts: el.volts * scale } : el.kind === 'PIN' ? { ...el, vHighVolts: el.vHighVolts * scale } : el));
    r = run({ ...c, els: scaled }, x, c.o.gmin, junctionVolts);
    iterations += r.iterations;
    x = r.x;
    if (!r.converged) break;
  }
  return { ...r, iterations };
}

const nodeRef = (node: number) => ({ net: String(node) });

function failure(nodes: number, iterations: number, worstNode: number, diagnostics: SolveDiagnostic[]): SolveResult {
  return {
    converged: false,
    iterations,
    strategy: 'direct',
    v: new Float64Array(nodes),
    branch: {},
    state: {},
    residual: { maxKclAmps: NaN, worstNode },
    diagnostics,
  };
}

export function newtonSolve(g: SolveInput, options: Partial<NewtonOptions> = {}, warm?: Float64Array): SolveResult {
  const o = { ...SPICE_DEFAULTS, ...options };
  const { nodes, ground } = g;
  const diagnostics: SolveDiagnostic[] = [];
  const els = g.elements.filter((el) => {
    if (LINEAR.has(el.kind) || NEWTON_DEVICES.has(el.kind)) return true;
    diagnostics.push(simDiag('not-modelled-yet', 'warning', { part: el.id }, { kind: el.kind }));
    return false;
  });
  for (const el of els) {
    const reason = NEWTON_DEVICES.get(el.kind)?.validate(el);
    if (reason) diagnostics.push(simDiag('invalid-device-params', 'error', { part: el.id }, { reason }));
  }
  if (diagnostics.some((d) => d.id === 'invalid-device-params')) return failure(nodes, 0, ground, diagnostics);

  const c: Ctx = {
    nodes,
    ground,
    els,
    states: els.map((el) => {
      const st = freshState(el.kind === 'M' ? 1 / Math.max(el.ohms, PWL_COMPAT.minOhms) : 0);
      st.high = el.kind === 'PIN' && el.level === 1;
      return st;
    }),
    o,
    ix: (node) => (node === ground ? -1 : node > ground ? node - 1 : node),
    nodeOf: (row) => (row >= ground ? row + 1 : row),
  };

  const floating = floatingNodes(c);
  for (const { node } of floating) diagnostics.push(simDiag('floating-node', 'warning', nodeRef(node), { node }));
  const stranded = floating.find((f) => f.junction);
  if (stranded) {
    diagnostics.push(simDiag('no-convergence', 'error', nodeRef(stranded.node), { node: stranded.node, iterations: 0 }));
    return failure(nodes, 0, stranded.node, diagnostics);
  }

  const start = new Float64Array(nodes);
  if (warm?.length === nodes) start.set(warm);
  start[ground] = 0;

  let r = run(c, start, o.gmin, new Map());
  let strategy: SolveResult['strategy'] = r.damped ? 'damped' : 'direct';
  let iterations = r.iterations;
  if (!r.converged && r.fault === null) {
    r = gminStepping(c, start);
    strategy = 'gmin-stepping';
    iterations += r.iterations;
  }
  if (!r.converged && r.fault === null) {
    r = sourceStepping(c, start);
    strategy = 'source-stepping';
    iterations += r.iterations;
  }
  if (r.fault !== null) {
    return failure(nodes, iterations, r.fault, [...diagnostics, simDiag('numeric-fault', 'error', nodeRef(r.fault), { node: r.fault })]);
  }

  const x = r.x;
  const volts = (node: number) => x[node];
  const res = residualOf(c, x, o.gmin);
  const worstNode = res.worstRow < 0 ? ground : c.nodeOf(res.worstRow);
  const branch: Record<ElementId, Measured> = {};
  const state: Record<ElementId, DeviceState> = {};
  c.els.forEach((el, k) => {
    const device = NEWTON_DEVICES.get(el.kind);
    if (device && el.kind === 'D') {
      const [amps] = device.currents(el, x);
      const across = x[el.a] - x[el.b];
      branch[el.id] = { amps, volts: across, watts: amps * across };
    } else {
      branch[el.id] = measureElement(el, c.states[k], volts);
      if (el.kind === 'PIN' && el.level === 'Z') state[el.id] = 'open';
    }
  });
  if (!r.converged) diagnostics.push(simDiag('no-convergence', 'error', nodeRef(worstNode), { node: worstNode, iterations }));
  if (res.condition > PWL_COMPAT.maxCondition) diagnostics.push(simDiag('ill-conditioned', 'warning', nodeRef(worstNode), { node: worstNode, condition: res.condition }));

  return {
    converged: r.converged,
    iterations,
    strategy,
    v: x,
    branch,
    state,
    residual: { maxKclAmps: res.maxAmps, worstNode },
    diagnostics,
  };
}
