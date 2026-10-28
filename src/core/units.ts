import { LIMITS } from "./limits.ts";

/** The base units a file may store (component.schema.json `unit`). */
export const UNITS = [
  "V", "A", "ohm", "F", "H", "W", "Hz", "s", "degC", "C_per_W", "mm", "g",
  "N_m", "rad_per_s", "deg", "deg_per_s", "g0", "lux", "ratio", "percent", "1", "bit", "byte", "ppm",
] as const;

export type Unit = (typeof UNITS)[number];

/** Units that appear in the document model only, never in a component file (PDM 4.1). */
export const DOCUMENT_ONLY_UNITS = ["ms", "ns"] as const;

/** Rejects NaN and infinities, and turns -0 into 0. */
export function normaliseNumber(v: number): number {
  if (!Number.isFinite(v)) throw new RangeError(`not a finite number: ${v}`);
  return v === 0 ? 0 : v;
}

const roundTo = (v: number, scale: number): number => normaliseNumber(Math.round(v * scale) / scale);

/** Rounds a length to 0.001 mm. */
export const quantiseMm = (v: number): number => roundTo(v, 1000);

/** Rounds an angle to 0.01 degree. */
export const quantiseDeg = (v: number): number => roundTo(v, 100);

/** Rounds a time to 0.001 ms. */
export const quantiseMs = (v: number): number => roundTo(v, 1000);

/** Converts milliseconds to whole nanoseconds; a fraction of a nanosecond is rejected (PDM 4.1). */
export function msToNs(ms: number): number {
  const ns = normaliseNumber(ms) * 1e6;
  const whole = Math.round(ns);
  if (Math.abs(ns - whole) > 1e-6) throw new RangeError(`${ms} ms is not a whole number of nanoseconds`);
  return normaliseNumber(whole);
}

/** Converts nanoseconds to milliseconds. */
export const nsToMs = (ns: number): number => normaliseNumber(ns) / 1e6;

/** True when a layout coordinate is within plus or minus 1,000,000 mm. */
export const inLayoutRange = (v: number): boolean => Number.isFinite(v) && Math.abs(v) <= LIMITS.layoutAbsMm;
