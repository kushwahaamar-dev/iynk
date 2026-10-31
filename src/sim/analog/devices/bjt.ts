import type { Limiter, Stamper } from '../newton.ts';
import type { BjtParams, ElementQ } from '../types.ts';
import { expo, VT_300K } from './diode.ts';
import type { NewtonDevice } from './index.ts';

const GMIN = 1e-12;
const INNER_ITERATIONS = 300;
const BACKTRACKS = 30;
// a junction this far forward biased counts as conducting when naming the region
const CONDUCTING_VOLTS = 0.4;

export type BjtElement = ElementQ & { params: BjtParams };

type Pair = readonly [number, number];
// row-major 2x2
type Mat = readonly [number, number, number, number];

interface Operating {
  ib: number;
  ic: number;
  // derivatives of (ib, ic) with respect to the internal junction voltages (u, w)
  jac: Mat;
}

const nfvtOf = (p: BjtParams) => (p.nf ?? 1) * VT_300K;

function operating(p: BjtParams, u: number, w: number): Operating {
  const nfvt = nfvtOf(p);
  const fwd = expo(u / nfvt);
  const rev = expo(w / VT_300K);
  const iF = p.isAmps * (fwd.value - 1);
  const iR = p.isAmps * (rev.value - 1);
  const gF = (p.isAmps * fwd.slope) / nfvt;
  const gR = (p.isAmps * rev.slope) / VT_300K;
  const vce = u - w;
  const early = p.vafVolts === undefined ? 1 : 1 + Math.max(vce, 0) / p.vafVolts;
  const dEarly = p.vafVolts === undefined || vce <= 0 ? 0 : 1 / p.vafVolts;
  return {
    ib: iF / p.bf + iR / p.br + GMIN * (u + w),
    ic: iF * early - iR * (1 + 1 / p.br) - GMIN * w,
    jac: [
      gF / p.bf + GMIN,
      gR / p.br + GMIN,
      gF * early + iF * dEarly,
      -iF * dEarly - gR * (1 + 1 / p.br) - GMIN,
    ],
  };
}

// the terminal voltages (vb - ve, vb - vc) at which the junctions sit at (u, w): the series resistances add their drops
function drivesOf(p: BjtParams, u: number, w: number, o: Operating): Pair {
  const rb = p.rbOhms ?? 0, re = p.reOhms ?? 0, rc = p.rcOhms ?? 0;
  return [u + (rb + re) * o.ib + re * o.ic, w + rb * o.ib - rc * o.ic];
}

function invert(m: Mat): Mat {
  const det = m[0] * m[3] - m[1] * m[2];
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det];
}

function multiply(a: Mat, b: Mat): Mat {
  return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
}

// I + R * jac, with R the resistance matrix taking (ib, ic) to the drops on (p, q)
function loaded(p: BjtParams, jac: Mat): Mat {
  const rb = p.rbOhms ?? 0, re = p.reOhms ?? 0, rc = p.rcOhms ?? 0;
  const r: Mat = [rb + re, re, rb, -rc];
  const rj = multiply(r, jac);
  return [1 + rj[0], rj[1], rj[2], 1 + rj[3]];
}

const hasSeries = (p: BjtParams) => (p.rbOhms ?? 0) + (p.reOhms ?? 0) + (p.rcOhms ?? 0) > 0;

// the junction voltages that leave (pv, qv) across the terminals and the series resistances; Newton on both, backtracking on the residual
function internalVolts(p: BjtParams, pv: number, qv: number): Pair {
  if (!hasSeries(p)) return [pv, qv];
  const miss = (u: number, w: number): Pair => {
    const [dp, dq] = drivesOf(p, u, w, operating(p, u, w));
    return [dp - pv, dq - qv];
  };
  let u = pv, w = qv;
  let [r1, r2] = miss(u, w);
  for (let k = 0; k < INNER_ITERATIONS; k++) {
    const m = loaded(p, operating(p, u, w).jac);
    const inv = invert(m);
    const du = inv[0] * r1 + inv[1] * r2;
    const dw = inv[2] * r1 + inv[3] * r2;
    if (Math.abs(du) <= 1e-14 * Math.max(1, Math.abs(u)) && Math.abs(dw) <= 1e-14 * Math.max(1, Math.abs(w))) break;
    let scale = 1;
    let next: Pair = [u - du, w - dw];
    let miss2 = miss(next[0], next[1]);
    for (let tries = 0; tries < BACKTRACKS && Math.hypot(...miss2) > Math.hypot(r1, r2); tries++) {
      scale /= 2;
      next = [u - scale * du, w - scale * dw];
      miss2 = miss(next[0], next[1]);
    }
    [u, w] = next;
    [r1, r2] = miss2;
  }
  return [u, w];
}

/** Collector and base current of the intrinsic transistor at a base-emitter and collector-emitter voltage, in the device's own polarity. */
export function icVce(p: BjtParams, vbe: number, vce: number): { ic: number; ib: number } {
  const { ic, ib } = operating(p, vbe, vbe - vce);
  return { ic, ib };
}

const signOf = (e: BjtElement) => (e.polarity === 'npn' ? 1 : -1);

// the terminal drives (vb - ve, vb - vc) in the device's own polarity
function drives(e: BjtElement, x: Float64Array): Pair {
  const s = signOf(e);
  return [s * (x[e.b] - x[e.e]), s * (x[e.b] - x[e.c])];
}

const vcrit = (nvt: number, isAmps: number) => nvt * Math.log(nvt / (Math.SQRT2 * isAmps));

export const bjtDevice: NewtonDevice<BjtElement> = {
  kind: 'Q',
  validate(e) {
    const p = e.params as BjtParams | undefined;
    if (!p) return 'no Gummel-Poon parameters';
    if (!(p.isAmps >= 1e-18 && p.isAmps <= 1e-9)) return `isAmps ${p.isAmps} is outside 1e-18..1e-9`;
    if (!(p.bf >= 5 && p.bf <= 2000)) return `bf ${p.bf} is outside 5..2000`;
    if (!(p.br >= 0.01 && p.br <= 100)) return `br ${p.br} is outside 0.01..100`;
    if (p.nf !== undefined && !(p.nf >= 0.5 && p.nf <= 5)) return `nf ${p.nf} is outside 0.5..5`;
    if (p.vafVolts !== undefined && !(p.vafVolts >= 10 && p.vafVolts <= 1000)) return `vafVolts ${p.vafVolts} is outside 10..1000`;
    for (const [name, ohms] of [['rbOhms', p.rbOhms], ['reOhms', p.reOhms], ['rcOhms', p.rcOhms]] as const) {
      if (ohms !== undefined && !(ohms >= 0 && ohms <= 1e3)) return `${name} ${ohms} is outside 0..1000`;
    }
    return null;
  },
  stamp(e, x, s: Stamper, lim: Limiter) {
    const p = e.params;
    const [pv, qv] = drives(e, x);
    const [uNew, wNew] = internalVolts(p, pv, qv);
    const keyBe = `${e.id}#be`, keyBc = `${e.id}#bc`;
    const nfvt = nfvtOf(p);
    const u = lim.pnj(uNew, s.junctionVolts.get(keyBe) ?? 0, nfvt, vcrit(nfvt, p.isAmps));
    const w = lim.pnj(wNew, s.junctionVolts.get(keyBc) ?? 0, VT_300K, vcrit(VT_300K, p.isAmps));
    s.junctionVolts.set(keyBe, u);
    s.junctionVolts.set(keyBc, w);

    const o = operating(p, u, w);
    const [p0, q0] = drivesOf(p, u, w, o);
    // d(ib, ic) / d(p, q) once the series resistances are folded in
    const d = multiply(o.jac, invert(loaded(p, o.jac)));
    const sign = signOf(e);
    // ib leaves the base and ic the collector; both return through the emitter
    s.transconduct(e.b, e.e, e.b, e.e, d[0]);
    s.transconduct(e.b, e.e, e.b, e.c, d[1]);
    s.current(e.b, e.e, sign * (o.ib - d[0] * p0 - d[1] * q0));
    s.transconduct(e.c, e.e, e.b, e.e, d[2]);
    s.transconduct(e.c, e.e, e.b, e.c, d[3]);
    s.current(e.c, e.e, sign * (o.ic - d[2] * p0 - d[3] * q0));
  },
  currents(e, x) {
    const [u, w] = internalVolts(e.params, ...drives(e, x));
    const { ib, ic } = operating(e.params, u, w);
    const sign = signOf(e);
    return [sign * ic, sign * ib];
  },
  measure(e, x) {
    const [u, w] = internalVolts(e.params, ...drives(e, x));
    const [ic, ib] = bjtDevice.currents(e, x);
    const vce = x[e.c] - x[e.e];
    const emitter = u > CONDUCTING_VOLTS;
    const collector = w > CONDUCTING_VOLTS;
    const state = emitter && collector ? 'sat' : emitter || collector ? 'active' : 'off';
    return { amps: ic, volts: vce, watts: ic * vce + ib * (x[e.b] - x[e.e]), state };
  },
};
