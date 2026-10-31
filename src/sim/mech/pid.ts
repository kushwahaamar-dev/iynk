import type { StepMetrics } from "../../core/robot-report.ts";

export interface PidConfig {
  kp: number;
  ki: number;
  kd: number;
  tS: number;
  tfS: number;
  iMax: number;
  uMin: number;
  uMax: number;
}

export interface Pid {
  step(setpoint: number, measurement: number): number;
  reset(): void;
  state(): { i: number; dFilt: number; lastY: number };
}

export const RISE_LOW = 0.1;
export const RISE_HIGH = 0.9;
export const SETTLE_BAND = 0.02;

export function createPid(c: PidConfig): Pid {
  if (!(c.tS > 0)) throw new RangeError("tS must be positive");
  if (!(c.tfS >= 0)) throw new RangeError("tfS must not be negative");
  const a = c.tS / (c.tS + c.tfS);
  let i = 0;
  let dFilt = 0;
  let lastY = 0;
  let primed = false;

  return {
    step(setpoint, measurement) {
      if (!primed) {
        lastY = measurement;
        primed = true;
      }
      const e = setpoint - measurement;
      dFilt += a * ((lastY - measurement) / c.tS - dFilt);
      lastY = measurement;
      const p = c.kp * e;
      const d = c.kd * dFilt;
      const iNext = Math.min(c.iMax, Math.max(-c.iMax, i + c.ki * c.tS * e));
      const raw = p + iNext + d;
      const winding = (raw > c.uMax && e > 0) || (raw < c.uMin && e < 0);
      if (!winding) i = iNext;
      return Math.min(c.uMax, Math.max(c.uMin, p + i + d));
    },
    reset() {
      i = 0;
      dFilt = 0;
      lastY = 0;
      primed = false;
    },
    state: () => ({ i, dFilt, lastY }),
  };
}

function crossing(t: number[], y: number[], level: number, rising: boolean): number | null {
  for (let k = 1; k < y.length; k++) {
    const hit = rising ? y[k] >= level : y[k] <= level;
    if (!hit) continue;
    const span = y[k] - y[k - 1];
    return t[k - 1] + (span === 0 ? 0 : ((level - y[k - 1]) / span) * (t[k] - t[k - 1]));
  }
  return null;
}

export function stepMetrics(t: number[], y: number[], setpoint: number): StepMetrics {
  const n = Math.min(t.length, y.length);
  if (n === 0) return { riseNs: null, overshootPct: 0, settleNs: null, steadyError: 0 };
  const y0 = y[0];
  const steadyError = setpoint - y[n - 1];
  const size = setpoint - y0;
  if (n < 2 || size === 0) return { riseNs: null, overshootPct: 0, settleNs: null, steadyError };

  const up = size > 0;
  const lo = crossing(t, y, y0 + RISE_LOW * size, up);
  const hi = crossing(t, y, y0 + RISE_HIGH * size, up);
  const riseNs = lo !== null && hi !== null ? hi - lo : null;

  let peak = y0;
  for (let k = 1; k < n; k++) if (up ? y[k] > peak : y[k] < peak) peak = y[k];
  const overshootPct = setpoint === 0 ? 0 : Math.max(0, ((peak - setpoint) / Math.abs(setpoint)) * 100 * (up ? 1 : -1));

  const band = SETTLE_BAND * Math.abs(size);
  let lastOutside = -1;
  for (let k = 0; k < n; k++) if (Math.abs(y[k] - setpoint) > band) lastOutside = k;
  const settleNs = lastOutside === n - 1 ? null : t[lastOutside + 1] - t[0];

  return { riseNs, overshootPct, settleNs, steadyError };
}
