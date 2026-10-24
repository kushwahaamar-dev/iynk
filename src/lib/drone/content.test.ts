import { describe, expect, it } from 'vitest';
import { DRONE_IDS, type DroneId } from '../../content/ids';
import { AVAILABLE, loadDrone } from '../../content/index.generated';
import type { DroneDesign } from '../../content/schema';
import catalogueData from './__fixtures__/catalogues.json';
import goldenAData from './__fixtures__/golden-a.json';
import goldenBData from './__fixtures__/golden-b.json';
import { calcModels } from './__fixtures__/models';
import { calc } from './calc';
import { designInput, isDesignPick } from './design';

// Every craft's content file (src/content/drones/<id>.ts) must carry the original's catalogue and constants,
// so the Drone Lab shows the golden numbers. A craft whose file is not written yet shows up as a todo.

type Option = Record<string, number | string | boolean>;
type Catalogue = {
  batteries: Record<string, Option>;
  motors: Record<string, Option>;
  props: Record<string, Option>;
  fixed: { id: string; g: number; price: number; category: string }[];
};
type Pick = { batt: string; motor: string; prop: string };

const catalogues = catalogueData as unknown as Record<DroneId, Catalogue>;
const defaults = Object.fromEntries(
  [...goldenAData, ...goldenBData].map((t) => [t.craft, t.default as Pick]),
) as Record<DroneId, Pick>;

const CALC_FIELDS = {
  batteries: ['cells', 'mah', 'g', 'price'],
  motors: ['kv', 'g', 'price', 'sz', 'maxCells', 'big'],
  props: ['pf', 'eff', 'g', 'price', 'r'],
} as const;

function calcFields(option: Option, fields: readonly string[]) {
  return Object.fromEntries(fields.filter((f) => f in option).map((f) => [f, option[f]]));
}

function picks(c: Catalogue): Pick[] {
  return Object.keys(c.batteries).flatMap((batt) =>
    Object.keys(c.motors).flatMap((motor) => Object.keys(c.props).map((prop) => ({ batt, motor, prop }))),
  );
}

/** Half a unit of the last written decimal, plus one more decimal for values rounded twice. */
function slack(value: number) {
  const decimals = (String(value).split('.')[1] ?? '').length;
  return 0.55 * 10 ** -decimals + 1e-9 * Math.abs(value);
}

function checkDesign(id: DroneId, design: DroneDesign) {
  const c = catalogues[id];
  expect(design.model).toEqual(calcModels[id]);
  expect(design.default).toEqual(defaults[id]);
  for (const kind of ['batteries', 'motors', 'props'] as const) {
    const options = kind === 'batteries' ? design.batts : design[kind];
    expect(Object.keys(options).sort(), kind).toEqual(Object.keys(c[kind]).sort());
    for (const [key, option] of Object.entries(c[kind])) {
      expect(options[key], `${kind} ${key}`).toMatchObject(calcFields(option, CALC_FIELDS[kind]));
    }
  }
  expect(design.fixed.map(({ id: part, g, price, category }) => ({ id: part, g, price, category }))).toEqual(c.fixed);

  for (const pick of picks(c)) {
    expect(isDesignPick(design, pick)).toBe(true);
    const oracle = calc({
      model: calcModels[id],
      fixed: c.fixed as DroneDesign['fixed'],
      battery: c.batteries[pick.batt] as unknown as DroneDesign['batts'][string],
      motor: c.motors[pick.motor] as unknown as DroneDesign['motors'][string],
      prop: c.props[pick.prop] as unknown as DroneDesign['props'][string],
    });
    const got = calc(designInput(design, pick));
    for (const key of ['thrust', 'auw', 'tw', 'hoverThr', 'hoverA', 'hoverMin', 'flyMin', 'maxA'] as const) {
      expect(got[key], `${pick.batt} / ${pick.motor} / ${pick.prop} ${key}`).toBeCloseTo(oracle[key], 9);
    }
    expect([got.over, got.weak, got.cost]).toEqual([oracle.over, oracle.weak, oracle.cost]);
  }

  for (const row of design.golden) {
    expectNear(calc(designInput(design, row.pick)), row.expect, `golden ${JSON.stringify(row.pick)}`);
  }
}

/** Numbers within the precision they were written with, nested objects field by field, the rest equal. */
function expectNear(got: unknown, want: unknown, path: string) {
  if (typeof want === 'number' && typeof got === 'number') {
    expect(Math.abs(got - want), path).toBeLessThanOrEqual(slack(want));
  } else if (want && typeof want === 'object' && got && typeof got === 'object') {
    for (const [key, value] of Object.entries(want)) {
      expectNear((got as Record<string, unknown>)[key], value, `${path}.${key}`);
    }
  } else {
    expect(got, path).toEqual(want);
  }
}

describe('drone content agrees with the original calculator data', () => {
  for (const id of DRONE_IDS) {
    if (!AVAILABLE.drone.includes(id)) {
      it.todo(`${id}: content file not written yet`);
      continue;
    }
    it(id, async () => {
      const content = await loadDrone(id);
      expect(content).not.toBeNull();
      checkDesign(id, content!.design);
    });
  }
});

describe('the original default builds', () => {
  it.each(DRONE_IDS.map((id) => [id] as const))('%s is neither over-spun nor weak', (id) => {
    const c = catalogues[id];
    const pick = defaults[id];
    const r = calc({
      model: calcModels[id],
      fixed: c.fixed as DroneDesign['fixed'],
      battery: c.batteries[pick.batt] as unknown as DroneDesign['batts'][string],
      motor: c.motors[pick.motor] as unknown as DroneDesign['motors'][string],
      prop: c.props[pick.prop] as unknown as DroneDesign['props'][string],
    });
    expect({ over: r.over, weak: r.weak }).toEqual({ over: false, weak: false });
  });
});
