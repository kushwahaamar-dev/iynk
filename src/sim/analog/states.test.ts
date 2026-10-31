// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadRegistry } from '../registry/entries.ts';
import { PWL_COMPAT, PWL_OPTIONS } from './elements.ts';
import { droopSource, createBrownout, isLimited, USB_LIMIT } from './rails.ts';
import { solve } from './solve.ts';
import { createStateTracker, FAILURE_IDS, roundSig } from './states.ts';
import type { Element } from './types.ts';

const data = import.meta.glob('../registry/data/*.json', { eager: true, import: 'default' });
const reg = loadRegistry(Object.values(data));
const pin = (a: number): Element => ({ id: 'pin:uno:D13', kind: 'PIN', a, level: 1, vHighVolts: 5, rOutOhms: PWL_COMPAT.pinOhms, maxAmps: 0.04 });
const led = (a: number): Element => ({ id: 'LED1', kind: 'D', a, b: 0, modelId: 'model:led.pwl@1', vf: 2, rdOhms: 0.5, maxAmps: 0.02 });
const resistor = (a: number, b: number, ohms: number): Element => ({ id: 'R1', kind: 'R', a, b, ohms });

function run(elements: Element[], nodes: number) {
  const result = solve({ nodes, ground: 0, elements }, PWL_OPTIONS);
  return createStateTracker(reg).step([{ result, elements }], 1e6);
}

describe('honest states', () => {
  it('burns an LED straight on a pin and says so with the computed current', () => {
    const states = run([pin(1), led(1)], 2);
    const burn = states.find((s) => s.kind === 'burn-out');
    expect(burn?.messageArgs).toEqual({ name: 'LED1', n: 120, imax: 20 });
    expect(burn?.evidence[0]).toMatchObject({ kind: 'branch-current', provenance: 'approximation', tier: 'T1', noteKey: 'fidelity.reading.outsideRange' });
    expect(burn?.evidence[0].value).toBeCloseTo(0.11765, 4);
    expect(states.some((s) => s.kind === 'over-current')).toBe(true);
  });

  it('leaves an LED behind 220 ohms alone', () => {
    expect(run([pin(1), resistor(1, 2, 220), led(2)], 3)).toEqual([]);
  });

  it('keeps a latched part latched until it is repaired', () => {
    const tracker = createStateTracker(reg);
    const elements = [pin(1), led(1)];
    const result = solve({ nodes: 2, ground: 0, elements }, PWL_OPTIONS);
    expect(tracker.step([{ result, elements }], 1e6).length).toBeGreaterThan(0);
    expect(tracker.step([{ result, elements }], 2e6)).toEqual([]);
    expect([...tracker.burnt()]).toEqual(['LED1']);
    tracker.repair('LED1');
    expect(tracker.burnt().size).toBe(0);
  });

  it('knows every failure id', () => {
    for (const id of FAILURE_IDS) expect(reg.get(id)).toBeDefined();
  });

  it('rounds to significant digits', () => {
    expect(roundSig(117.65, 2)).toBe(120);
    expect(roundSig(0, 2)).toBe(0);
    expect(roundSig(-0.0123, 1)).toBe(-0.01);
  });
});

describe('rails', () => {
  it('holds a source at its current limit', () => {
    const source: Element = { id: 'V1', kind: 'V', a: 1, b: 0, volts: 5, rSeriesOhms: 0.5, limit: USB_LIMIT };
    if (source.kind !== 'V' || !isLimited(source)) throw new Error('not limited');
    const amps = (ohms: number) => solve({ nodes: 2, ground: 0, elements: [{ ...source, rSeriesOhms: ohms }, resistor(1, 0, 1.4)] }, PWL_OPTIONS).branch.V1.amps;
    const ohms = droopSource(source, amps);
    expect(Math.abs(amps(ohms) - 0.5)).toBeLessThan(1e-6);
  });

  it('resets after a 20 ms dip but not after 5 ms', () => {
    const dip = (ms: number) => {
      const bo = createBrownout({ thresholdVolts: 2.7, hysteresisVolts: 0.1, minDwellNs: 10e6, resetNs: 50e6 });
      let state = 'ok';
      for (let t = 0; t <= ms; t++) state = bo.step(1, t * 1e6);
      return [state, bo.step(5, (ms + 1) * 1e6)];
    };
    expect(dip(5)).toEqual(['low', 'ok']);
    expect(dip(20)).toEqual(['reset', 'reset']);
  });
});
