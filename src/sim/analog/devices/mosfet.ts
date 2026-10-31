import type { Stamper } from '../newton.ts';
import type { DeviceState, ElementMos, MosParams } from '../types.ts';
import type { NewtonDevice } from './index.ts';

// the switch model ramps between off and on over this much gate overdrive, centred on the threshold
const SWITCH_WINDOW_VOLTS = 0.1;

export type MosElement = ElementMos & { params: MosParams };

interface Channel { amps: number; gm: number; gds: number }

// drain current with the drain at or above the source, and its slopes in vgs and vds
function forward(p: MosParams, vgs: number, vds: number): Channel {
  const vov = vgs - p.vthVolts;
  if (p.kind === 'switch') {
    const gOn = 1 / p.rdsOnOhms, gOff = 1 / p.rOffOhms;
    const t = Math.min(Math.max(vov / SWITCH_WINDOW_VOLTS + 0.5, 0), 1);
    const g = gOff + (gOn - gOff) * t * t * (3 - 2 * t);
    const dg = t > 0 && t < 1 ? ((gOn - gOff) * 6 * t * (1 - t)) / SWITCH_WINDOW_VOLTS : 0;
    return { amps: g * vds, gm: dg * vds, gds: g };
  }
  if (vov <= 0) return { amps: 0, gm: 0, gds: 0 };
  const clm = 1 + p.lambdaPerV * vds;
  if (vds < vov) {
    const shape = vov * vds - (vds * vds) / 2;
    return { amps: p.kpAmpsPerV2 * shape * clm, gm: p.kpAmpsPerV2 * vds * clm, gds: p.kpAmpsPerV2 * ((vov - vds) * clm + shape * p.lambdaPerV) };
  }
  const sat = (p.kpAmpsPerV2 / 2) * vov * vov;
  return { amps: sat * clm, gm: p.kpAmpsPerV2 * vov * clm, gds: sat * p.lambdaPerV };
}

// the channel is symmetric: with the drain below the source the two swap roles
function channel(p: MosParams, vgs: number, vds: number): Channel {
  if (vds >= 0) return forward(p, vgs, vds);
  const r = forward(p, vgs - vds, -vds);
  return { amps: -r.amps, gm: -r.gm, gds: r.gm + r.gds };
}

const signOf = (e: MosElement) => (e.polarity === 'n' ? 1 : -1);

function biases(e: MosElement, x: Float64Array) {
  const sign = signOf(e);
  return { sign, vgs: sign * (x[e.g] - x[e.s]), vds: sign * (x[e.d] - x[e.s]) };
}

function region(p: MosParams, vgs: number, vds: number): DeviceState {
  const vov = vgs - p.vthVolts;
  if (vov <= 0) return 'off';
  return p.kind === 'level1' && Math.abs(vds) >= vov ? 'active' : 'on';
}

export const mosDevice: NewtonDevice<MosElement> = {
  kind: 'MOS',
  validate(e) {
    const p = e.params as MosParams | undefined;
    if (!p) return 'no MOSFET parameters';
    if (!(p.vthVolts >= -10 && p.vthVolts <= 10)) return `vthVolts ${p.vthVolts} is outside -10..10`;
    if (p.kind === 'switch') {
      if (!(p.rdsOnOhms > 0 && p.rdsOnOhms <= 1e6)) return `rdsOnOhms ${p.rdsOnOhms} is outside (0, 1e6]`;
      if (!(p.rOffOhms > p.rdsOnOhms && p.rOffOhms <= 1e15)) return `rOffOhms ${p.rOffOhms} is not above rdsOnOhms and up to 1e15`;
      return null;
    }
    if (!(p.kpAmpsPerV2 >= 1e-6 && p.kpAmpsPerV2 <= 1e3)) return `kpAmpsPerV2 ${p.kpAmpsPerV2} is outside 1e-6..1e3`;
    if (!(p.lambdaPerV >= 0 && p.lambdaPerV <= 1)) return `lambdaPerV ${p.lambdaPerV} is outside 0..1`;
    return null;
  },
  stamp(e, x, s: Stamper) {
    const { sign, vgs, vds } = biases(e, x);
    const { amps, gm, gds } = channel(e.params, vgs, vds);
    s.transconduct(e.d, e.s, e.g, e.s, gm);
    s.conduct(e.d, e.s, gds);
    s.current(e.d, e.s, sign * amps - gm * (x[e.g] - x[e.s]) - gds * (x[e.d] - x[e.s]));
  },
  currents(e, x) {
    const { sign, vgs, vds } = biases(e, x);
    return [sign * channel(e.params, vgs, vds).amps];
  },
  measure(e, x) {
    const { vgs, vds } = biases(e, x);
    const [amps] = mosDevice.currents(e, x);
    const volts = x[e.d] - x[e.s];
    return { amps, volts, watts: amps * volts, state: region(e.params, vgs, vds) };
  },
};
