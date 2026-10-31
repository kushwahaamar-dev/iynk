import { checkAll, checkField, isOutOfRange, type OutOfRange } from './guards';
import { checkPack, ocvCell, packResistance, status, type PackSI } from './battery';
import { dutyForThrust, solveStatic, type Air, type Drive, type PackModel } from './propulsion';

export const USABLE_DEFAULT = 0.8;

const MAX_SECONDS = 7200;
const EXACT = { dt_s: 1, iters: 40 };
const FAST = { dt_s: 5, iters: 24 };
const MAH_PER_AMP_SECOND = 1 / 3.6;
const MAX_BAND = 0.9;

export function toPackModel(p: PackSI, idle_a: number): PackModel {
  return {
    open_v: (soc) => p.cells * ocvCell(p, soc),
    r_ohm: packResistance(p),
    idle_a,
  };
}

export interface EnduranceInput {
  drives: readonly Drive[];
  pack: PackSI;
  weight_n: number;
  thrustScale: number;
  currentScale: number;
  usable: number;
  idle_a: number;
  air: Air;
  fast?: boolean;
}

export interface EnduranceResult {
  seconds: number;
  stoppedBy: 'cutoff' | 'capacity' | 'cannot-hover';
  duty0: number;
  amps0: number;
  usedMah: number;
}

export function hoverEndurance(i: EnduranceInput): EnduranceResult | OutOfRange {
  const bad =
    checkAll([
      ['usable', i.usable, { min: 0, max: 1, minExclusive: true }],
      ['weight_n', i.weight_n, { min: 0, max: Infinity, minExclusive: true }],
      ['thrustScale', i.thrustScale, { min: 0, max: Infinity, minExclusive: true }],
      ['currentScale', i.currentScale, { min: 0, max: Infinity, minExclusive: true }],
      ['drives.length', i.drives.length, { min: 1, max: Infinity }],
    ]) ?? checkPack(i.pack);
  if (bad) return bad;

  const { dt_s, iters } = i.fast ? FAST : EXACT;
  const model = toPackModel(i.pack, i.idle_a);
  const target = i.weight_n / i.thrustScale;
  const budget = i.usable * i.pack.capacity_mah;
  let seconds = 0;
  let used = 0;
  let duty0 = 0;
  let amps0 = 0;

  const result = (stoppedBy: EnduranceResult['stoppedBy']): EnduranceResult => ({
    seconds,
    stoppedBy,
    duty0,
    amps0,
    usedMah: used,
  });

  while (seconds < MAX_SECONDS) {
    const soc = 1 - used / i.pack.capacity_mah;
    const duty = dutyForThrust(i.drives, soc, model, target, iters);
    if (duty === 'unreachable') return result('cannot-hover');
    const point = solveStatic(i.drives, duty, soc, model);
    if (isOutOfRange(point)) return point;
    const amps = point.i_pack * i.currentScale;
    if (seconds === 0) {
      duty0 = duty;
      amps0 = amps;
    }
    if (status(i.pack, soc, amps) === 'cut') return result('cutoff');
    used += amps * dt_s * MAH_PER_AMP_SECOND;
    seconds += dt_s;
    if (used >= budget) return result('capacity');
  }
  return result('capacity');
}

export interface EnduranceRange {
  low_s: number;
  typ_s: number;
  high_s: number;
  basis: 'fit-band' | 'no-fit';
}

export function enduranceRange(
  i: Omit<EnduranceInput, 'thrustScale' | 'currentScale'>,
  band: number | null,
): EnduranceRange | OutOfRange {
  if (band !== null) {
    const bad = checkField('band', band, { min: 0, max: MAX_BAND });
    if (bad) return bad;
  }
  const run = (thrustScale: number, currentScale: number) =>
    hoverEndurance({ ...i, thrustScale, currentScale });

  const typ = run(1, 1);
  if (isOutOfRange(typ)) return typ;
  if (band === null) {
    return { low_s: typ.seconds, typ_s: typ.seconds, high_s: typ.seconds, basis: 'no-fit' };
  }
  const low = run(1 - band, 1 + band);
  if (isOutOfRange(low)) return low;
  const high = run(1 + band, 1 - band);
  if (isOutOfRange(high)) return high;
  return { low_s: low.seconds, typ_s: typ.seconds, high_s: high.seconds, basis: 'fit-band' };
}
