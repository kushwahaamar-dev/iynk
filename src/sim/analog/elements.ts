import type { DeviceState, Element, SolveOptions } from './types.ts';

// The constants of figures/engine/bench-solve.js, so the extracted solver reproduces its numbers.
// Callers read these; solve.ts and the stamps take them from the elements and options they are given.
export const PWL_COMPAT = {
  railOhms: 0.5,
  pinOhms: 25,
  rbeOhms: 2,
  rsatOhms: 0.01,
  gminSiemens: 1e-9,
  rounds: 40,
  motorPasses: 6,
  sliceMin: 1e-9,
  maxCondition: 1e15,
  minOhms: 1e-3,
  potMinOhms: 0.5,
  junctionMarginVolts: 1e-6,
  inverseMarginVolts: 1e-3,
  baseOffAmps: -1e-9,
  satMarginAmps: 1e-7,
  motorProbeVolts: 4,
  motorMinSiemens: 1e-3,
  motorFloorVolts: 0.3,
  motorSettle: 0.01,
  servoSiemens: 0.008 / 5,
  sensorQuiescentSiemens: 5e-5 / 5,
  sensorOutOhms: 20,
  sensorOutVolts: 0.75,
  sensorMinVolts: 2.7,
  sensorMaxVolts: 7,
} as const;

export const PWL_OPTIONS: SolveOptions = {
  mode: 'pwl',
  reltol: 1e-9,
  vabstol: 1e-6,
  iabstol: 1e-12,
  maxIter: PWL_COMPAT.rounds,
  gminSiemens: PWL_COMPAT.gminSiemens,
  homotopy: [],
};

// What the iteration remembers about one element. `high` is the level of a PIN or PWM element in the slice being
// solved and `gm` the conductance of a motor; the solver sets both before it stamps.
export interface PwlState { on: boolean; sat: boolean; inv: boolean; high: boolean; gm: number }

export const freshState = (gm = 0): PwlState => ({ on: false, sat: false, inv: false, high: false, gm });

export type NodeIndex = (node: number) => number;
export type NodeVolts = (node: number) => number;

// PNP transistors and PWM modes other than 'averaged' have no piecewise linear model here
export function isModelled(el: Element): boolean {
  if (el.kind === 'Q') return el.polarity === 'npn';
  if (el.kind === 'PWM') return el.mode === 'averaged';
  return true;
}

const siemens = (ohms: number) => 1 / Math.max(ohms, PWL_COMPAT.minOhms);

function conduct(A: Float64Array[], i: number, j: number, g: number): void {
  if (i >= 0) { A[i][i] += g; if (j >= 0) A[i][j] -= g; }
  if (j >= 0) { A[j][j] += g; if (i >= 0) A[j][i] -= g; }
}

// a branch from i to j carrying g * (Vi - Vj - v0): a conductance with a built-in drop
function branchSource(A: Float64Array[], b: Float64Array, i: number, j: number, g: number, v0: number): void {
  conduct(A, i, j, g);
  if (i >= 0) b[i] += g * v0;
  if (j >= 0) b[j] -= g * v0;
}

// a current gm * (Vc - Vx) - off from y to x
function controlled(A: Float64Array[], b: Float64Array, y: number, x: number, c: number, gm: number, off: number): void {
  if (y >= 0) { if (c >= 0) A[y][c] += gm; if (x >= 0) A[y][x] -= gm; b[y] += off; }
  if (x >= 0) { if (c >= 0) A[x][c] -= gm; A[x][x] += gm; b[x] -= off; }
}

export function stampElement(el: Element, A: Float64Array[], b: Float64Array, ix: NodeIndex, st: PwlState): void {
  switch (el.kind) {
    case 'R':
      conduct(A, ix(el.a), ix(el.b), siemens(el.ohms));
      break;
    case 'M':
      conduct(A, ix(el.a), ix(el.b), st.gm);
      break;
    case 'POT': {
      const x = Math.max(0, Math.min(1, el.position));
      conduct(A, ix(el.a), ix(el.wiper), 1 / Math.max(el.ohms * x, PWL_COMPAT.potMinOhms));
      conduct(A, ix(el.wiper), ix(el.b), 1 / Math.max(el.ohms * (1 - x), PWL_COMPAT.potMinOhms));
      break;
    }
    case 'V':
      branchSource(A, b, ix(el.a), ix(el.b), siemens(el.rSeriesOhms), el.volts);
      break;
    case 'PIN':
      if (el.level !== 'Z') branchSource(A, b, ix(el.a), -1, siemens(el.rOutOhms), st.high ? el.vHighVolts : 0);
      break;
    case 'PWM':
      branchSource(A, b, ix(el.a), -1, siemens(el.rOutOhms), st.high ? el.vHighVolts : 0);
      break;
    case 'D':
    case 'BZ':
      if (st.on) branchSource(A, b, ix(el.a), ix(el.b), siemens(el.rdOhms), el.vf);
      break;
    case 'SV':
      conduct(A, ix(el.vplus), ix(el.gnd), PWL_COMPAT.servoSiemens);
      break;
    case 'TS':
      conduct(A, ix(el.supplyPos), ix(el.supplyNeg), PWL_COMPAT.sensorQuiescentSiemens);
      if (st.on) branchSource(A, b, ix(el.out), ix(el.supplyNeg), 1 / PWL_COMPAT.sensorOutOhms, el.outVolts ?? PWL_COMPAT.sensorOutVolts);
      break;
    case 'Q': {
      if (!st.on) break;
      const y = ix(st.inv ? el.e : el.c), x = ix(st.inv ? el.c : el.e);
      const beta = st.inv ? el.hfr : el.hfe;
      const gb = 1 / PWL_COMPAT.rbeOhms;
      branchSource(A, b, ix(el.b), x, gb, el.vbe);
      if (st.sat) branchSource(A, b, y, x, 1 / PWL_COMPAT.rsatOhms, el.vcesat);
      else controlled(A, b, y, x, ix(el.b), beta * gb, beta * gb * el.vbe);
      break;
    }
  }
}

const hasJunction = (el: Element) => el.kind === 'D' || (el.kind === 'BZ' && el.active);

// Moves one element's state to agree with the node voltages, with the old solver's margins. True when it moved.
export function updateState(el: Element, st: PwlState, v: NodeVolts): boolean {
  const m = PWL_COMPAT;
  if (hasJunction(el)) {
    const e = el as Extract<Element, { kind: 'D' | 'BZ' }>;
    const vd = v(e.a) - v(e.b);
    if (!st.on && vd > e.vf + m.junctionMarginVolts) { st.on = true; return true; }
    if (st.on && vd < e.vf - m.junctionMarginVolts) { st.on = false; return true; }
    return false;
  }
  if (el.kind === 'TS') {
    const vs = v(el.supplyPos) - v(el.supplyNeg);
    const supplied = vs >= m.sensorMinVolts && vs <= m.sensorMaxVolts;
    if (supplied === st.on) return false;
    st.on = supplied;
    return true;
  }
  if (el.kind !== 'Q') return false;
  if (!st.on) {
    let changed = false;
    // which end acts as the emitter is read with the junction off: the lower of collector and emitter
    const inv = v(el.e) > v(el.c) + m.inverseMarginVolts;
    if (inv !== st.inv) { st.inv = inv; changed = true; }
    if (v(el.b) - v(inv ? el.c : el.e) > el.vbe + m.junctionMarginVolts) { st.on = true; st.sat = false; changed = true; }
    return changed;
  }
  const y = st.inv ? el.e : el.c, x = st.inv ? el.c : el.e;
  const beta = st.inv ? el.hfr : el.hfe;
  const ib = (v(el.b) - v(x) - el.vbe) / m.rbeOhms;
  if (ib < m.baseOffAmps) { st.on = false; st.sat = false; return true; }
  if (!st.sat) {
    if (v(y) - v(x) < el.vcesat - m.junctionMarginVolts) { st.sat = true; return true; }
    return false;
  }
  if ((v(y) - v(x) - el.vcesat) / m.rsatOhms > beta * ib + m.satMarginAmps) { st.sat = false; return true; }
  return false;
}

export function deviceState(el: Element, st: PwlState): DeviceState | null {
  if (el.kind === 'PIN') return el.level === 'Z' ? 'open' : null;
  if (el.kind === 'Q') return !st.on ? 'off' : st.sat ? 'sat' : 'active';
  if (hasJunction(el) || el.kind === 'TS') return st.on ? 'on' : 'off';
  return null;
}

export interface Measured { amps: number; volts: number; watts: number }

const measured = (amps: number, volts: number, watts = amps * volts): Measured => ({ amps, volts, watts });

// What an element carries at the given node voltages: amps through it, volts across it, watts it dissipates
// (or, for a source, delivers).
export function measureElement(el: Element, st: PwlState, v: NodeVolts): Measured {
  switch (el.kind) {
    case 'R': {
      const vd = v(el.a) - v(el.b);
      return measured(vd * siemens(el.ohms), vd);
    }
    case 'M': {
      const vd = v(el.a) - v(el.b);
      return measured(vd * st.gm, vd);
    }
    case 'POT': {
      const x = Math.max(0, Math.min(1, el.position));
      const g1 = 1 / Math.max(el.ohms * x, PWL_COMPAT.potMinOhms), g2 = 1 / Math.max(el.ohms * (1 - x), PWL_COMPAT.potMinOhms);
      const v1 = v(el.a) - v(el.wiper), v2 = v(el.wiper) - v(el.b);
      return measured(v1 * g1, v(el.a) - v(el.b), g1 * v1 * v1 + g2 * v2 * v2);
    }
    case 'V': {
      const vd = v(el.a) - v(el.b);
      return measured((el.volts - vd) * siemens(el.rSeriesOhms), vd);
    }
    case 'PIN':
    case 'PWM': {
      if (el.kind === 'PIN' && el.level === 'Z') return measured(0, v(el.a));
      return measured(((st.high ? el.vHighVolts : 0) - v(el.a)) * siemens(el.rOutOhms), v(el.a));
    }
    case 'D':
    case 'BZ': {
      const vd = v(el.a) - v(el.b);
      return measured(st.on ? (vd - el.vf) * siemens(el.rdOhms) : 0, vd);
    }
    case 'SV': {
      const vs = v(el.vplus) - v(el.gnd);
      return measured(vs * PWL_COMPAT.servoSiemens, vs);
    }
    case 'TS': {
      const vs = v(el.supplyPos) - v(el.supplyNeg);
      return measured(vs * PWL_COMPAT.sensorQuiescentSiemens, vs);
    }
    case 'Q': {
      const vce = v(el.c) - v(el.e);
      if (!st.on) return measured(0, vce, 0);
      const y = st.inv ? el.e : el.c, x = st.inv ? el.c : el.e;
      const beta = st.inv ? el.hfr : el.hfe;
      const ib = Math.max(0, (v(el.b) - v(x) - el.vbe) / PWL_COMPAT.rbeOhms);
      const ic = st.sat ? Math.max(0, (v(y) - v(x) - el.vcesat) / PWL_COMPAT.rsatOhms) : beta * ib;
      return measured(ic, vce, ic * Math.abs(vce) + ib * el.vbe);
    }
    case 'MOS':
      return measured(0, v(el.d) - v(el.s), 0);
  }
}
