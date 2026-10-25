import { describe, expect, it } from 'vitest';
import type { DroneId } from '@/content/ids';
import catalogueData from './__fixtures__/catalogues.json';
import goldenAData from './__fixtures__/golden-a.json';
import goldenBData from './__fixtures__/golden-b.json';
import {
  calc,
  designChecks,
  motorChordMm,
  verdicts,
  type CalcBattery,
  type CalcFixedPart,
  type CalcInput,
  type CalcMotor,
  type CalcProp,
  type CalcResult,
} from './calc';
import { calcModels } from './__fixtures__/models';

// The golden tables were read off the original site's own calc() for every battery x motor x prop of all
// 13 crafts; __fixtures__/extract.py turns the research notes into these JSON files.
//
// Appendix A (golden-a) was rounded twice on its way into the notes: the captured values carried one more
// decimal than the table prints (10.646 -> 10.65 -> 10.7, 0.4651 -> 0.465 -> 46 %, 282.502 -> 282.5 -> 282
// with round-half-even). Its rows therefore get half a unit of that extra decimal on top of the display
// rounding. The calc matrix (golden-b) was rounded once and is held to the display rounding alone.

type Catalogue = {
  batteries: Record<string, CalcBattery>;
  motors: Record<string, CalcMotor>;
  props: Record<string, CalcProp>;
  fixed: CalcFixedPart[];
};

const columns = {
  V: (r: CalcResult) => r.V,
  thrust: (r: CalcResult) => r.thrust,
  auw: (r: CalcResult) => r.auw,
  tw: (r: CalcResult) => r.tw,
  hoverThr: (r: CalcResult) => r.hoverThr,
  maxA: (r: CalcResult) => r.maxA,
  hoverA: (r: CalcResult) => r.hoverA,
  hoverMin: (r: CalcResult) => r.hoverMin,
  flyMin: (r: CalcResult) => r.flyMin,
  cruiseKmh: (r: CalcResult) => (r.cruise?.speed ?? NaN) * 3.6,
  stallKmh: (r: CalcResult) => (r.cruise?.stall ?? NaN) * 3.6,
  topKmh: (r: CalcResult) => (r.cruise?.top ?? NaN) * 3.6,
};
type Column = keyof typeof columns;

type GoldenRow = { batt: string; motor: string; prop: string; over: boolean; weak: boolean; cost: number[] } & {
  [K in Column]?: number;
};
type GoldenTable = {
  craft: DroneId;
  precision: { [K in Column]?: number };
  rows: GoldenRow[];
  /** Decimals the values were rounded to before the table rounded them again; see above. */
  capturedExtra?: number;
};

const catalogues = catalogueData as unknown as Record<DroneId, Catalogue>;
const goldenA = (goldenAData as unknown as GoldenTable[]).map((t) => ({ ...t, capturedExtra: 1 }));
const goldenB = goldenBData as unknown as GoldenTable[];

function input(craft: DroneId, batt: string, motor: string, prop: string): CalcInput {
  const c = catalogues[craft];
  const pick = <T>(options: Record<string, T>, key: string) => {
    const option = options[key];
    if (!option) throw new Error(`${craft}: no option ${key}`);
    return option;
  };
  return {
    model: calcModels[craft],
    fixed: c.fixed,
    battery: pick(c.batteries, batt),
    motor: pick(c.motors, motor),
    prop: pick(c.props, prop),
  };
}

function expectGolden(table: GoldenTable, row: GoldenRow) {
  const r = calc(input(table.craft, row.batt, row.motor, row.prop));
  for (const [column, digits] of Object.entries(table.precision) as [Column, number][]) {
    const want = row[column];
    if (want === undefined) continue;
    const got = columns[column](r);
    const captured = table.capturedExtra === undefined ? 0 : 0.5 * 10 ** -(digits + table.capturedExtra);
    const slack = 0.5 * 10 ** -digits + captured + 1e-9 * Math.abs(want);
    expect(Math.abs(got - want), `${column}: got ${got}, golden ${want}`).toBeLessThanOrEqual(slack);
  }
  expect({ over: r.over, weak: r.weak }).toEqual({ over: row.over, weak: row.weak });
  expect([r.cost.electrical, r.cost.mechanical, r.cost.total].map(Math.round)).toEqual(row.cost);
}

describe('golden tables', () => {
  it('cover every combination of all 13 crafts', () => {
    expect(goldenA.map((t) => t.craft)).toEqual(['quad5', 'whoop', 'cinewhoop', 'longrange']);
    expect(goldenB.map((t) => t.craft)).toEqual([
      'racer',
      'gpscam',
      'delivery',
      'agrihex',
      'wing',
      'vtol',
      'swarm',
      'tricopter',
      'octo',
    ]);
    expect(goldenA.reduce((n, t) => n + t.rows.length, 0)).toBe(108);
    expect(goldenB.reduce((n, t) => n + t.rows.length, 0)).toBe(234);
    for (const t of [...goldenA, ...goldenB]) {
      const c = catalogues[t.craft];
      const combos = Object.keys(c.batteries).length * Object.keys(c.motors).length * Object.keys(c.props).length;
      expect(t.rows.length, t.craft).toBe(combos);
      expect(new Set(t.rows.map((r) => `${r.batt}/${r.motor}/${r.prop}`)).size, t.craft).toBe(combos);
    }
  });

  for (const table of [...goldenA, ...goldenB]) {
    describe(table.craft, () => {
      it.each(table.rows.map((row) => [`${row.batt} / ${row.motor} / ${row.prop}`, row] as const))(
        '%s',
        (_, row) => expectGolden(table, row),
      );
    });
  }
});

describe('worked defaults from the research notes', () => {
  it('quad5 6s1100 / 2306-1750 / 5x4.3x3', () => {
    const r = calc(input('quad5', '6s1100', '2306-1750', '5x4.3x3'));
    expect(Math.round(r.auw)).toBe(514);
    expect(r.tw.toFixed(1)).toBe('12.5');
    expect(Math.round(r.hoverThr * 100)).toBe(28);
    expect(Math.round(r.maxA)).toBe(144);
    expect(r.cost).toEqual({ electrical: 287, mechanical: 59, total: 346 });
  });

  it('wing 4s2200 / 2212-1400 / 8x6: cruise, stall and top speed', () => {
    const r = calc(input('wing', '4s2200', '2212-1400', '8x6'));
    expect(r.cruise?.minSpeed).toBeCloseTo(9.36, 2);
    expect(Math.round((r.cruise?.stall ?? 0) * 3.6)).toBe(28);
    expect(Math.round((r.cruise?.speed ?? 0) * 3.6)).toBe(52);
    expect(Math.round((r.cruise?.top ?? 0) * 3.6)).toBe(146);
    expect(r.cruise?.dragN).toBeCloseTo(1.35, 2);
    expect(Math.round(r.hoverMin)).toBe(31);
  });

  it('vtol 4s2p-li / 2810-1000 / 9x5: hover on the motors, cruise on the wing', () => {
    const r = calc(input('vtol', '4s2p-li', '2810-1000', '9x5'));
    expect(r.thrust).toBeCloseTo(1490, -1);
    expect(r.hoverA).toBeCloseTo(15.3, 1);
    expect(r.cruise?.amps).toBeCloseTo(5.1, 1);
    expect(Math.round(r.flyMin)).toBe(76);
  });

  it('caps the VTOL thrust at 2600 g when a racing motor over-spins the 9" props', () => {
    const r = calc(input('vtol', '6s-4000', '2306-2400', '9x5'));
    expect(r.over).toBe(true);
    expect(r.thrust).toBe(2600);
  });
});

describe('design checks', () => {
  const codes = (craft: DroneId, b: string, m: string, p: string) =>
    designChecks(input(craft, b, m, p)).map((c) => c.code);

  it('flags the over-spin and thrust-to-weight verdicts the original showed', () => {
    expect(codes('racer', '6s1000', '2207-2500', '5x4.8x3')).toContain('over-spin');
    expect(codes('racer', '4s1300', '2207-1950', '5x4.8x3')).toContain('weak');
    expect(verdicts(calc(input('racer', '4s1300', '2207-2500', '5x4.8x3')))).toEqual(['ok']);
  });

  it('says a craft with less thrust than weight cannot hover, instead of only "weak"', () => {
    const r = calc(input('octo', '6s16000', '6010-130', '1855'));
    expect(r.tw).toBeLessThan(1);
    const list = codes('octo', '6s16000', '6010-130', '1855');
    expect(list).toContain('cannot-hover');
    expect(list).not.toContain('weak');
    expect(list).not.toContain('hover-high');
  });

  it('warns when hover needs more than 60 % throttle', () => {
    const r = calc(input('delivery', '6s10000', '4114-400', '15x5.5'));
    expect(r.hoverThr).toBeGreaterThan(0.6);
    expect(codes('delivery', '6s10000', '4114-400', '15x5.5')).toContain('hover-high');
    expect(codes('quad5', '6s1100', '2306-1750', '5x4.3x3')).not.toContain('hover-high');
  });

  it('takes a model’s own hover limit in place of the 60 % one', () => {
    const base = input('delivery', '6s10000', '4114-400', '15x5.5');
    const { hoverThr } = calc(base);
    const at = (hoverLimit: number) => designChecks({ ...base, model: { ...base.model, hoverLimit } }).map((c) => c.code);
    expect(at(hoverThr + 0.01)).not.toContain('hover-high');
    expect(at(hoverThr - 0.01)).toContain('hover-high');
  });

  it('compares full-throttle current with the Li-ion pack and with the ESC rating', () => {
    expect(codes('longrange', '6s1p4000', '2807-1700', '7.5x3.7x2')).toContain('battery-overcurrent');
    expect(codes('longrange', '6s1800', '2807-1300', '7.5x3.7x2')).not.toContain('battery-overcurrent');
    const racer = calc(input('racer', '4s1300', '2306-2700', '5x4.8x3'));
    expect(racer.maxA / 4).toBeGreaterThan(55);
    expect(codes('racer', '4s1300', '2306-2700', '5x4.8x3')).toContain('esc-overcurrent');
    expect(codes('racer', '4s1300', '2207-2500', '5x4.8x3')).not.toContain('esc-overcurrent');
    expect(codes('quad5', '6s1100', '2306-1750', '5x4.3x3')).not.toContain('esc-overcurrent');
  });

  it('catches 22" props hitting each other on the octocopter', () => {
    expect(motorChordMm(calcModels.octo)).toBeCloseTo(520.4, 1);
    expect(codes('octo', '12s16000', '6010-170', '2255')).toContain('prop-clash');
    expect(codes('octo', '12s16000', '6010-170', '2055')).not.toContain('prop-clash');
  });

  it('notes a tail-heavy wing and never applies hover checks to it', () => {
    const list = codes('wing', '3s1300', '2212-1400', '8x6');
    expect(list).toContain('tail-heavy');
    expect(list).not.toContain('hover-high');
    expect(list).not.toContain('cannot-hover');
  });

  it('orders the checks most serious first', () => {
    const checks = designChecks(input('octo', '6s16000', '6010-130', '2255')).map((c) => c.code);
    expect(checks.slice(0, 2)).toEqual(['cannot-hover', 'prop-clash']);
  });
});
