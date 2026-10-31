import { checkField, type OutOfRange } from './guards';

export const CLEARANCE_MM = 5;
/** Props at heights this far apart do not touch. An iynk assumption, shown in the check. */
export const Z_CLEAR_MM = 10;

const COAXIAL_MM = 1;

export interface RotorDisc {
  id: string;
  x_mm: number;
  y_mm: number;
  z_mm: number;
  r_mm: number;
}

export interface ClashPair {
  a: string;
  b: string;
  centre_mm: number;
  needed_mm: number;
  short_mm: number;
  kind: 'adjacent' | 'coaxial';
}

export interface ClashResult {
  pairs: ClashPair[];
  worst: ClashPair | null;
}

/** Every pair of rotor discs that overlap, with the centre distance, the distance needed and the shortfall. */
export function propClash(discs: readonly RotorDisc[], clearance_mm: number = CLEARANCE_MM): ClashResult | OutOfRange {
  for (const [i, disc] of discs.entries()) {
    const bad = checkField(`discs[${i}].r_mm`, disc.r_mm, { min: 0, max: Infinity, minExclusive: true });
    if (bad) return bad;
  }
  const pairs: ClashPair[] = [];
  let worst: ClashPair | null = null;
  for (let i = 0; i < discs.length; i++) {
    for (let j = i + 1; j < discs.length; j++) {
      const p = discs[i], q = discs[j];
      if (Math.abs(p.z_mm - q.z_mm) >= Z_CLEAR_MM) continue;
      const centre_mm = Math.hypot(p.x_mm - q.x_mm, p.y_mm - q.y_mm);
      const needed_mm = p.r_mm + q.r_mm + clearance_mm;
      if (centre_mm >= needed_mm) continue;
      const pair: ClashPair = {
        a: p.id,
        b: q.id,
        centre_mm,
        needed_mm,
        short_mm: needed_mm - centre_mm,
        kind: centre_mm < COAXIAL_MM ? 'coaxial' : 'adjacent',
      };
      pairs.push(pair);
      if (!worst || pair.short_mm > worst.short_mm) worst = pair;
    }
  }
  return { pairs, worst };
}
