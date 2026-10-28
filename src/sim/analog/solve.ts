import { simDiag, type SolveDiagnostic } from '../core/diagnostic.ts';
import { deviceState, freshState, isModelled, measureElement, PWL_COMPAT, stampElement, updateState, type Measured, type PwlState } from './elements.ts';
import { UnionFind } from './graph.ts';
import { conditionEstimate, linsolve } from './linsolve.ts';
import type { DeviceState, Element, ElementId, SolveOptions, SolveResult } from './types.ts';

export interface PwmSlice { weight: number; high: (el: Element) => boolean }

export interface SolveInput {
  nodes: number;
  elements: Element[];
  ground: number;
  pwmSlices?: PwmSlice[];
  // the amps a motor takes at an average volt level; undefined keeps the motor at 1 / ohms (a stalled rotor)
  curve?: (elementId: ElementId, vAvg: number) => number | undefined;
}

// An AVR timer starts every period high, so the slices are the gaps between the sorted duties
export function pwmSlices(elements: Element[]): PwmSlice[] {
  const duties = [...new Set(elements.flatMap((el) => (el.kind === 'PWM' && el.duty > 0 && el.duty < 1 ? [el.duty] : [])))].sort((a, b) => a - b);
  const slices: PwmSlice[] = [];
  let from = 0;
  for (const duty of [...duties, 1]) {
    if (duty - from > PWL_COMPAT.sliceMin) {
      const start = from;
      slices.push({ weight: duty - from, high: (el) => el.kind === 'PWM' && el.duty > start });
    }
    from = duty;
  }
  return slices;
}

function nodesOf(el: Element): number[] {
  switch (el.kind) {
    case 'R': case 'M': case 'V': case 'D': case 'BZ': return [el.a, el.b];
    case 'POT': return [el.a, el.wiper, el.b];
    case 'PIN': case 'PWM': return [el.a];
    case 'Q': return [el.c, el.b, el.e];
    case 'SV': return [el.gnd, el.vplus, el.sig];
    case 'TS': return [el.supplyPos, el.supplyNeg, el.out];
  }
}

function ohmsOf(el: Element): number[] {
  switch (el.kind) {
    case 'R': case 'M': case 'POT': return [el.ohms];
    case 'V': return [el.rSeriesOhms];
    case 'PIN': case 'PWM': return [el.rOutOhms];
    case 'D': case 'BZ': return [el.rdOhms];
    default: return [];
  }
}

function validate(input: SolveInput, o: SolveOptions): void {
  const { nodes, ground, elements } = input;
  const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n < nodes;
  if (o.mode !== 'pwl') throw new RangeError(`solve: mode ${o.mode} is not available yet`);
  if (!Number.isInteger(o.maxIter) || o.maxIter < 1) throw new RangeError(`solve: maxIter must be a positive integer, got ${o.maxIter}`);
  if (!inRange(ground)) throw new RangeError(`solve: ground ${ground} is outside 0..${nodes - 1}`);
  for (const el of elements) {
    for (const n of nodesOf(el)) if (!inRange(n)) throw new RangeError(`solve: ${el.id} uses node ${n}, outside 0..${nodes - 1}`);
    for (const r of ohmsOf(el)) if (r < 0) throw new RangeError(`solve: ${el.id} has a negative resistance ${r}`);
  }
}

interface SliceResult {
  weight: number;
  x: Float64Array;
  iterations: number;
  converged: boolean;
  maxKclAmps: number;
  worstNode: number;
  condition: number;
  branch: Map<ElementId, Measured>;
}

interface Net {
  nodes: number;
  ground: number;
  els: Element[];
  // matrix row of a node, or -1 for ground
  ix: (node: number) => number;
  nodeOf: (row: number) => number;
}

function stamp(net: Net, states: PwlState[], gmin: number) {
  const n = net.nodes - 1;
  const A = Array.from({ length: n }, () => new Float64Array(n));
  const b = new Float64Array(n);
  for (let i = 0; i < n; i++) A[i][i] += gmin;
  net.els.forEach((el, k) => stampElement(el, A, b, net.ix, states[k]));
  return { A, b };
}

function solveSlice(net: Net, slice: PwmSlice, states: PwlState[], o: SolveOptions): SliceResult | { fault: number } {
  const n = net.nodes - 1;
  net.els.forEach((el, k) => {
    if (el.kind === 'PIN') states[k].high = el.level === 1;
    else if (el.kind === 'PWM') states[k].high = slice.high(el);
  });
  let x: Float64Array = new Float64Array(n);
  const volts = (node: number) => (node === net.ground ? 0 : x[net.ix(node)]);
  let iterations = 0;
  let changed = true;
  while (changed && iterations < o.maxIter) {
    iterations++;
    const { A, b } = stamp(net, states, o.gminSiemens);
    x = linsolve(A, b);
    const bad = x.findIndex(Number.isNaN);
    if (bad >= 0) return { fault: net.nodeOf(bad) };
    changed = false;
    net.els.forEach((el, k) => { if (updateState(el, states[k], volts)) changed = true; });
  }

  // the residual and conditioning of the final matrix, stamped with the device states the loop ended on
  const { A, b } = stamp(net, states, o.gminSiemens);
  let maxKclAmps = 0;
  let worstRow = -1;
  for (let i = 0; i < n; i++) {
    let sum = -b[i];
    for (let j = 0; j < n; j++) sum += A[i][j] * x[j];
    if (worstRow < 0 || Math.abs(sum) > maxKclAmps) { maxKclAmps = Math.abs(sum); worstRow = i; }
  }
  const full = new Float64Array(net.nodes);
  x.forEach((value, row) => { full[net.nodeOf(row)] = value; });
  const branch = new Map<ElementId, Measured>();
  net.els.forEach((el, k) => branch.set(el.id, measureElement(el, states[k], volts)));
  return {
    weight: slice.weight,
    x: full,
    iterations,
    converged: !changed,
    maxKclAmps,
    worstNode: worstRow < 0 ? net.ground : net.nodeOf(worstRow),
    condition: conditionEstimate(A),
    branch,
  };
}

function floatingNodes(net: Net): number[] {
  const uf = new UnionFind();
  const key = (node: number) => String(node);
  for (const el of net.els) {
    const wired = el.kind === 'SV' ? [el.gnd, el.vplus] : nodesOf(el);
    if ((el.kind === 'PIN' && el.level !== 'Z') || el.kind === 'PWM') wired.push(net.ground);
    for (const node of wired) uf.union(key(wired[0]), key(node));
  }
  const grounded = uf.find(key(net.ground));
  return Array.from({ length: net.nodes }, (_, node) => node).filter((node) => uf.find(key(node)) !== grounded);
}

const nodeRef = (node: number) => ({ net: String(node) });

const largest = (rs: SliceResult[]) => rs.reduce<SliceResult | null>((a, r) => (!a || r.maxKclAmps > a.maxKclAmps ? r : a), null);

export function solve(input: SolveInput, o: SolveOptions): SolveResult {
  validate(input, o);
  const { nodes, ground, curve } = input;
  const diagnostics: SolveDiagnostic[] = [];
  const els = input.elements.filter((el) => {
    if (isModelled(el)) return true;
    diagnostics.push(simDiag('not-modelled-yet', 'warning', { part: el.id }, { kind: el.kind }));
    return false;
  });
  const net: Net = {
    nodes,
    ground,
    els,
    ix: (node) => (node === ground ? -1 : node > ground ? node - 1 : node),
    nodeOf: (row) => (row >= ground ? row + 1 : row),
  };
  const states = els.map(() => freshState());
  const motors = els.flatMap((el, k) => (el.kind === 'M' ? [k] : []));
  for (const k of motors) {
    const el = els[k] as Extract<Element, { kind: 'M' }>;
    const amps = curve?.(el.id, PWL_COMPAT.motorProbeVolts);
    states[k].gm = amps === undefined ? 1 / Math.max(el.ohms, PWL_COMPAT.minOhms) : amps / PWL_COMPAT.motorProbeVolts || PWL_COMPAT.motorMinSiemens;
  }

  const slices = input.pwmSlices ?? pwmSlices(input.elements);
  let results: SliceResult[] = [];
  for (let pass = 0; pass < PWL_COMPAT.motorPasses; pass++) {
    for (const st of states) { st.on = false; st.sat = false; st.inv = false; }
    results = [];
    for (const slice of slices) {
      const r = solveSlice(net, slice, states, o);
      if ('fault' in r) {
        return {
          converged: false,
          iterations: o.maxIter,
          strategy: 'direct',
          v: new Float64Array(nodes),
          branch: {},
          state: {},
          residual: { maxKclAmps: NaN, worstNode: r.fault },
          diagnostics: [...diagnostics, simDiag('numeric-fault', 'error', nodeRef(r.fault), { node: r.fault })],
        };
      }
      results.push(r);
    }
    if (!curve) break;
    let moved = false;
    for (const k of motors) {
      const el = els[k];
      const vOn = Math.max(...results.map((r) => Math.abs(r.branch.get(el.id)!.volts)));
      const amps = curve(el.id, vOn);
      if (amps === undefined) continue;
      const gm = Math.max(PWL_COMPAT.motorMinSiemens, amps / Math.max(vOn, PWL_COMPAT.motorFloorVolts));
      if (Math.abs(gm - states[k].gm) > states[k].gm * PWL_COMPAT.motorSettle) { states[k].gm = gm; moved = true; }
    }
    if (!moved) break;
  }

  const v = new Float64Array(nodes);
  const branch: Record<ElementId, Measured> = {};
  for (const el of els) branch[el.id] = { amps: 0, volts: 0, watts: 0 };
  for (const r of results) {
    r.x.forEach((value, node) => { v[node] += r.weight * value; });
    for (const [id, m] of r.branch) {
      branch[id].amps += r.weight * m.amps;
      branch[id].volts += r.weight * m.volts;
      branch[id].watts += r.weight * m.watts;
    }
  }
  const state: Record<ElementId, DeviceState> = {};
  els.forEach((el, k) => {
    const s = deviceState(el, states[k]);
    if (s) state[el.id] = s;
  });

  const worst = largest(results);
  const stuck = largest(results.filter((r) => !r.converged));
  if (stuck) diagnostics.push(simDiag('no-convergence', 'error', nodeRef(stuck.worstNode), { node: stuck.worstNode, iterations: stuck.iterations }));
  const condition = Math.max(1, ...results.map((r) => r.condition));
  const illNode = (worst ?? { worstNode: ground }).worstNode;
  if (condition > PWL_COMPAT.maxCondition) diagnostics.push(simDiag('ill-conditioned', 'warning', nodeRef(illNode), { node: illNode, condition }));
  for (const node of floatingNodes(net)) diagnostics.push(simDiag('floating-node', 'warning', nodeRef(node), { node }));

  return {
    converged: stuck === null,
    iterations: Math.max(0, ...results.map((r) => r.iterations)),
    strategy: 'direct',
    v,
    branch,
    state,
    residual: { maxKclAmps: worst?.maxKclAmps ?? 0, worstNode: (stuck ?? worst)?.worstNode ?? ground },
    diagnostics,
  };
}
