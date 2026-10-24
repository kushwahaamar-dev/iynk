import { describe, expect, it } from 'vitest';
import type { DroneDesign } from '../../content/schema';
import catalogueData from './__fixtures__/catalogues.json';
import { calcModels } from './__fixtures__/models';
import { calc } from './calc';
import { designInput, evaluateDesign, isDesignPick } from './design';

const quad5 = catalogueData.quad5;
const withLabels = <T extends { name: string }>(options: Record<string, T>) =>
  Object.fromEntries(Object.entries(options).map(([key, { name, ...rest }]) => [key, { ...rest, label: name }]));

const design = {
  model: calcModels.quad5,
  fixed: quad5.fixed.map((p) => ({ ...p, name: `fixed.${p.id}` })),
  batts: withLabels(quad5.batteries),
  motors: withLabels(quad5.motors),
  props: withLabels(quad5.props),
  default: { batt: '6s1100', motor: '2306-1750', prop: '5x4.3x3' },
  golden: [],
} as unknown as DroneDesign;

describe('designInput', () => {
  it('builds the calculator input from a pick', () => {
    const input = designInput(design, design.default);
    expect(input.battery).toMatchObject({ cells: 6, mah: 1100, g: 178 });
    expect(input.motor).toMatchObject({ kv: 1750 });
    expect(input.prop).toMatchObject({ pf: 1, eff: 1 });
    expect(Math.round(calc(input).auw)).toBe(514);
  });

  it('rejects picks that name no option, including inherited keys', () => {
    expect(isDesignPick(design, { batt: '6s1100', motor: '2306-1750' })).toBe(false);
    expect(isDesignPick(design, { batt: '9s9999', motor: '2306-1750', prop: '5x4.3x3' })).toBe(false);
    expect(isDesignPick(design, { batt: 'toString', motor: '2306-1750', prop: '5x4.3x3' })).toBe(false);
    expect(() => designInput(design, { batt: '6s1100', motor: 'nope', prop: '5x4.3x3' })).toThrow(/Unknown design pick/);
  });

  it('evaluates a build with its checks', () => {
    const { result, checks } = evaluateDesign(design, { batt: '6s1800', motor: '2306-2450', prop: '5x5x3' });
    expect(result.over).toBe(true);
    expect(checks[0]).toEqual({ code: 'over-spin', kv: 2450, cells: 6 });
  });
});
