export interface OutOfRange {
  error: 'out-of-range';
  field: string;
  value: number;
  min: number;
  max: number;
}

export interface Range {
  min: number;
  max: number;
  integer?: boolean;
  /** The value must be greater than `min`, not equal to it. */
  minExclusive?: boolean;
}

export const isOutOfRange = (x: unknown): x is OutOfRange =>
  typeof x === 'object' && x !== null && (x as { error?: unknown }).error === 'out-of-range';

/** Null when `value` is a finite number inside the range; a string or undefined is reported as NaN. */
export function checkField(field: string, value: unknown, r: Range): OutOfRange | null {
  const v = typeof value === 'number' ? value : NaN;
  const inside = r.minExclusive ? v > r.min : v >= r.min;
  if (inside && v <= r.max && (!r.integer || Number.isInteger(v))) return null;
  return { error: 'out-of-range', field, value: v, min: r.min, max: r.max };
}

export function checkAll(fields: ReadonlyArray<readonly [string, unknown, Range]>): OutOfRange | null {
  for (const [field, value, range] of fields) {
    const bad = checkField(field, value, range);
    if (bad) return bad;
  }
  return null;
}

/** Walks objects and arrays and reports the first number that is NaN or infinite, at its dotted path. */
export function firstNonFinite(path: string, o: object): OutOfRange | null {
  for (const [key, value] of Object.entries(o)) {
    const at = `${path}.${key}`;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return { error: 'out-of-range', field: at, value, min: -Number.MAX_VALUE, max: Number.MAX_VALUE };
      }
    } else if (typeof value === 'object' && value !== null) {
      const bad = firstNonFinite(at, value);
      if (bad) return bad;
    }
  }
  return null;
}
