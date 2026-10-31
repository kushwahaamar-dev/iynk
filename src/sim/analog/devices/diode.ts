import type { Limiter, Stamper } from '../newton.ts';
import type { DiodeParams, ElementD } from '../types.ts';
import type { NewtonDevice } from './index.ts';

export const VT_300K = 0.025852;

// above this exponent the curve continues as its tangent, as SPICE does
const EXP_LIMIT = 80;
const INNER_ITERATIONS = 300;

export type DiodeElement = ElementD & { junction: DiodeParams };

export function expo(arg: number): { value: number; slope: number } {
  const e = Math.exp(Math.min(arg, EXP_LIMIT));
  return { value: arg > EXP_LIMIT ? e * (1 + arg - EXP_LIMIT) : e, slope: e };
}

// current and slope of the junction alone at a junction voltage
function junction(p: DiodeParams, vd: number): { amps: number; siemens: number } {
  const nvt = p.n * VT_300K;
  const fwd = expo(vd / nvt);
  let amps = p.isAmps * (fwd.value - 1);
  let siemens = (p.isAmps * fwd.slope) / nvt;
  if (p.vbrVolts !== undefined) {
    const rev = expo(-(vd + p.vbrVolts) / nvt);
    amps -= p.isAmps * rev.value;
    siemens += (p.isAmps * rev.slope) / nvt;
  }
  return { amps, siemens };
}

// the junction voltage that leaves `v` across the junction and its series resistance; the residual is convex
// and increasing, so Newton from the terminal voltage walks in from the right
function junctionVolts(p: DiodeParams, v: number): number {
  if (p.rsOhms === 0) return v;
  let vd = v;
  for (let k = 0; k < INNER_ITERATIONS; k++) {
    const { amps, siemens } = junction(p, vd);
    const step = (vd + p.rsOhms * amps - v) / (1 + p.rsOhms * siemens);
    vd -= step;
    if (Math.abs(step) <= 1e-14 * Math.max(1, Math.abs(vd))) break;
  }
  return vd;
}

const vcrit = (p: DiodeParams) => p.n * VT_300K * Math.log((p.n * VT_300K) / (Math.SQRT2 * p.isAmps));

export const diodeDevice: NewtonDevice<DiodeElement> = {
  kind: 'D',
  validate(e) {
    const p = e.junction as DiodeParams | undefined;
    if (!p) return 'no Shockley parameters';
    if (!(p.isAmps > 0 && p.isAmps <= 1e-3)) return `isAmps ${p.isAmps} is outside (0, 1e-3]`;
    if (!(p.n >= 0.5 && p.n <= 5)) return `n ${p.n} is outside 0.5..5`;
    if (!(p.rsOhms >= 0 && p.rsOhms <= 1e3)) return `rsOhms ${p.rsOhms} is outside 0..1000`;
    if (p.vbrVolts !== undefined && !(p.vbrVolts > 0)) return `vbrVolts ${p.vbrVolts} is not positive`;
    return null;
  },
  stamp(e, x, s: Stamper, lim: Limiter) {
    const p = e.junction;
    const vdNew = junctionVolts(p, x[e.a] - x[e.b]);
    const vd = lim.pnj(vdNew, s.junctionVolts.get(e.id) ?? 0, p.n * VT_300K, vcrit(p));
    s.junctionVolts.set(e.id, vd);
    const { amps, siemens } = junction(p, vd);
    const g = siemens / (1 + p.rsOhms * siemens);
    s.conduct(e.a, e.b, g);
    s.current(e.a, e.b, amps - g * (vd + p.rsOhms * amps));
  },
  currents: (e, x) => [junction(e.junction, junctionVolts(e.junction, x[e.a] - x[e.b])).amps],
  measure(e, x) {
    const [amps] = diodeDevice.currents(e, x);
    const volts = x[e.a] - x[e.b];
    return { amps, volts, watts: amps * volts };
  },
};

// Is from one point on the curve: the datasheet current `ifAmps` at `vfVolts`
export function ledParamsFromDatasheet(p: { vfVolts: number; ifAmps: number; n: number; rsOhms: number }): DiodeParams {
  const isAmps = p.ifAmps / Math.exp((p.vfVolts - p.ifAmps * p.rsOhms) / (p.n * VT_300K));
  return { kind: 'shockley', isAmps, n: p.n, rsOhms: p.rsOhms };
}
