import { describe, expect, it } from 'vitest';
import type { DroneId } from '@/content/ids';
import { isOutOfRange } from '@/sim/flight/guards';
import catalogueData from './__fixtures__/catalogues.json';
import goldenAData from './__fixtures__/golden-a.json';
import goldenBData from './__fixtures__/golden-b.json';
import { calcModels } from './__fixtures__/models';
import { calc, calcChecked, CALC_RANGES, type CalcInput } from './calc';

type Pick = { batt: string; motor: string; prop: string };
type Table = { craft: DroneId; default: Pick; rows: Pick[] };
type Catalogue = {
  batteries: Record<string, CalcInput['battery']>;
  motors: Record<string, CalcInput['motor']>;
  props: Record<string, CalcInput['prop']>;
  fixed: CalcInput['fixed'];
};

const catalogues = catalogueData as unknown as Record<DroneId, Catalogue>;
const tables = [...(goldenAData as unknown as Table[]), ...(goldenBData as unknown as Table[])];

function input(craft: DroneId, p: Pick): CalcInput {
  const c = catalogues[craft];
  return { model: calcModels[craft], fixed: c.fixed, battery: c.batteries[p.batt]!, motor: c.motors[p.motor]!, prop: c.props[p.prop]! };
}

const defaults = tables.map((t) => input(t.craft, t.default));

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dotted paths of every number in the input, with `fixed[n]` for fixed parts. */
function numberPaths(o: object, prefix: string): string[] {
  return Object.entries(o).flatMap(([k, v]) => {
    const path = Array.isArray(o) ? `${prefix}[${k}]` : prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') return [path];
    return typeof v === 'object' && v !== null ? numberPaths(v, path) : [];
  });
}

function setPath(o: object, path: string, value: number) {
  const keys = path.split(/[.[\]]+/).filter(Boolean);
  let at = o as Record<string, unknown>;
  for (const k of keys.slice(0, -1)) at = at[k] as Record<string, unknown>;
  at[keys[keys.length - 1]!] = value;
}

describe('calcChecked', () => {
  it('equals calc on all 342 golden rows', () => {
    let rows = 0;
    for (const t of tables) {
      for (const row of t.rows) {
        const i = input(t.craft, row);
        expect(calcChecked(i), `${t.craft} ${row.batt} ${row.motor} ${row.prop}`).toEqual(calc(i));
        rows += 1;
      }
    }
    expect(rows).toBe(342);
  });

  it('names the field when a battery has no capacity', () => {
    const quad5 = defaults[0]!;
    const bad = calcChecked({ ...quad5, battery: { ...quad5.battery, mah: 0 } });
    expect(bad).toEqual({ error: 'out-of-range', field: 'battery.mah', value: 0, min: 0, max: 1_000_000 });
  });

  it('rejects a missing required field as NaN', () => {
    const i = structuredClone(defaults[0]!);
    delete (i.motor as Partial<CalcInput['motor']>).kv;
    expect(calcChecked(i)).toMatchObject({ field: 'motor.kv', value: NaN });
  });

  it('catches an all-zero weight at the result', () => {
    const i = structuredClone(defaults[0]!);
    i.fixed = i.fixed.map((p) => ({ ...p, g: 0 }));
    i.battery.g = 0;
    i.motor.g = 0;
    i.prop.g = 0;
    const bad = calcChecked(i);
    expect(isOutOfRange(bad) && bad.field.startsWith('result.')).toBe(true);
  });

  it('never returns a non-finite number (10,000 seeded inputs)', () => {
    const rand = mulberry32(0xd01e);
    const specials = [0, -1, NaN, Infinity, -Infinity, 1e308, 1e-308];
    let errors = 0;
    for (let n = 0; n < 10_000; n++) {
      const i = structuredClone(defaults[n % defaults.length]!);
      const paths = numberPaths(i, '');
      const changes = 1 + Math.floor(rand() * 3);
      for (let c = 0; c < changes; c++) {
        const path = paths[Math.floor(rand() * paths.length)]!;
        const range = CALC_RANGES[path.replace(/\[\d+\]/, '[]')];
        const inRange = range ? range.min + rand() * (range.max - range.min) : rand() * 100;
        setPath(i, path, rand() < 0.5 ? specials[Math.floor(rand() * specials.length)]! : inRange);
      }
      const r = calcChecked(i);
      if (isOutOfRange(r)) {
        errors += 1;
        expect(r.field.startsWith('result.') || paths.includes(r.field), r.field).toBe(true);
      } else {
        expect(Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))).toBe(true);
      }
    }
    expect(errors).toBeGreaterThan(0);
  });
});
