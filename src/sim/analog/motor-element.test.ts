// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PWL_OPTIONS } from './elements.ts';
import { solve } from './solve.ts';
import type { Element } from './types.ts';

const run = (elements: Element[]) => solve({ nodes: 3, ground: 0, elements }, PWL_OPTIONS);

// a 7.4 V pack with 0.2 ohm of its own, then a motor of 0.375 ohm
const pack = (): Element[] => [{ id: 'V1', kind: 'V', a: 1, b: 0, volts: 7.4, rSeriesOhms: 0.2 }];

describe('motor element', () => {
  it('keeps the legacy form a plain resistance', () => {
    const r = run([...pack(), { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 0.375 }]);
    expect(r.branch.M1.amps).toBeCloseTo(7.4 / (0.2 + 0.375), 3);
  });

  it('is the same as legacy when the emf is zero', () => {
    const legacy = run([...pack(), { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 0.375 }]);
    const emf = run([...pack(), { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 0.375, form: 'emf', emfV: 0 }]);
    expect(emf.branch.M1.amps).toBeCloseTo(legacy.branch.M1.amps, 6);
  });

  it('sags the pack by the current the back-EMF leaves', () => {
    const stall = run([...pack(), { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 0.375, form: 'emf', emfV: 0 }]);
    const spinning = run([...pack(), { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 0.375, form: 'emf', emfV: 5 }]);
    const amps = (7.4 - 5) / (0.2 + 0.375);
    expect(spinning.branch.M1.amps).toBeCloseTo(amps, 3);
    expect(spinning.v[1]).toBeCloseTo(7.4 - 0.2 * amps, 3);
    expect(spinning.v[1]).toBeGreaterThan(stall.v[1]);
  });
});
