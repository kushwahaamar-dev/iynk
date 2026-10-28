import type { SimTime } from "../core/clock.ts";

const NS_PER_S = 1e9;

export interface Pwm {
  duty: number;
  hz: number;
}

export interface PwmEdge {
  at: SimTime;
  level: 0 | 1;
}

const steady = (pwm: Pwm): boolean => !(pwm.hz > 0) || pwm.duty <= 0 || pwm.duty >= 1;

const riseAt = (pwm: Pwm, k: number): SimTime => Math.floor((k * NS_PER_S) / pwm.hz);

const fallAt = (pwm: Pwm, k: number): SimTime => riseAt(pwm, k) + Math.round((pwm.duty * NS_PER_S) / pwm.hz);

/** The first cycle that can reach `a`: the cycle before the one that starts at or after it. */
const firstCycle = (pwm: Pwm, a: SimTime): number => Math.max(0, Math.floor((a * pwm.hz) / NS_PER_S) - 1);

/** Edges with `a <= at < b`: rising at `floor(k * 1e9 / hz)`, falling `round(duty * 1e9 / hz)` later. A steady signal has none. */
export function edgesBetween(pwm: Pwm, a: SimTime, b: SimTime): PwmEdge[] {
  const edges: PwmEdge[] = [];
  if (steady(pwm)) return edges;
  for (let k = firstCycle(pwm, a); riseAt(pwm, k) < b; k++) {
    const rise = riseAt(pwm, k);
    const fall = fallAt(pwm, k);
    if (rise >= a) edges.push({ at: rise, level: 1 });
    if (fall >= a && fall < b) edges.push({ at: fall, level: 0 });
  }
  return edges;
}

/** Fraction of `[a, b)` the signal spends high, counted from the same edges `edgesBetween` gives. */
export function averageDuty(pwm: Pwm, a: SimTime, b: SimTime): number {
  if (steady(pwm)) return Math.min(1, Math.max(0, pwm.duty));
  if (b <= a) return 0;
  let high = 0;
  for (let k = firstCycle(pwm, a); riseAt(pwm, k) < b; k++) {
    const from = Math.max(a, riseAt(pwm, k));
    const to = Math.min(b, fallAt(pwm, k));
    if (to > from) high += to - from;
  }
  return high / (b - a);
}
