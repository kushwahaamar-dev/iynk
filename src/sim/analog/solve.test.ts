// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { PWL_COMPAT, PWL_OPTIONS } from './elements.ts';
import { pwmSlices, solve, type SolveInput } from './solve.ts';
import type { Element, ElementD } from './types.ts';

const rail = (id: string, a: number, volts: number, rSeriesOhms: number = PWL_COMPAT.railOhms): Element => ({ id, kind: 'V', a, b: 0, volts, rSeriesOhms });
const resistor = (id: string, a: number, b: number, ohms: number): Element => ({ id, kind: 'R', a, b, ohms });
const led = (id: string, a: number, b: number): ElementD => ({ id, kind: 'D', a, b, modelId: 'led', vf: 2, rdOhms: 0.5, maxAmps: 0.02 });
const diode = (id: string, a: number, b: number, rdOhms: number): Element => ({ id, kind: 'D', a, b, modelId: '1n4148', vf: 0.7, rdOhms, maxAmps: 1 });
const pin = (id: string, a: number, level: 0 | 1 | 'Z'): Element => ({ id, kind: 'PIN', a, level, vHighVolts: 5, rOutOhms: PWL_COMPAT.pinOhms, maxAmps: 0.04 });
const pwm = (id: string, a: number, duty: number): Element => ({ id, kind: 'PWM', a, duty, hz: 490, vHighVolts: 5, rOutOhms: PWL_COMPAT.pinOhms, mode: 'averaged' });
const npn = (id: string, c: number, b: number, e: number): Element => ({ id, kind: 'Q', c, b, e, polarity: 'npn', modelId: '2n2222', hfe: 100, hfr: 5, vbe: 0.7, vcesat: 0.2 });

const run = (nodes: number, elements: Element[], extra: Partial<SolveInput> = {}) => solve({ nodes, ground: 0, elements, ...extra }, PWL_OPTIONS);

// the three circuits below never settle: each device state is wrong for the voltages it produces
const flipNpn = (source: Element): Element[] => [source, led('D1', 2, 3), npn('Q1', 3, 2, 1), resistor('R1', 1, 2, 100)];
const diodeRing = (): Element[] => [
  rail('V2', 2, 3), rail('V1', 1, 5),
  diode('D0', 1, 3, 0.5), diode('D1', 1, 3, 0.5), diode('D2', 3, 2, 0.2), diode('D3', 1, 2, 0.2), diode('D4', 2, 3, 0.2),
];

describe('solve, linear circuits', () => {
  it('splits a 10k/10k divider from 5 V to 2.5 V', () => {
    // the rail's own 0.5 ohms are taken out of R1, and gmin is off, so the ratio is exact
    const input: SolveInput = { nodes: 3, ground: 0, elements: [rail('V1', 1, 5), resistor('R1', 1, 2, 9999.5), resistor('R2', 2, 0, 10000)] };
    const r = solve(input, { ...PWL_OPTIONS, gminSiemens: 0 });
    expect(r.converged).toBe(true);
    expect(r.strategy).toBe('direct');
    expect(Math.abs(r.v[2] - 2.5)).toBeLessThan(1e-9);
    expect(r.v[0]).toBe(0);
    expect(r.branch.R1.amps).toBeCloseTo(2.5 / 10000, 9);
    expect(r.residual.maxKclAmps).toBeLessThan(1e-9);
    expect(r.diagnostics).toEqual([]);
  });

  it('puts a pot wiper at its position', () => {
    const r = run(4, [rail('V1', 1, 5, 0), { id: 'P1', kind: 'POT', a: 1, wiper: 2, b: 0, ohms: 10000, position: 0.25 }]);
    expect(r.v[2]).toBeCloseTo(5 * 0.75, 4);
  });

  it('solves an empty circuit', () => {
    const r = run(1, []);
    expect(r.converged).toBe(true);
    expect(r.iterations).toBe(1);
    expect(Array.from(r.v)).toEqual([0]);
  });

  it('lets two sources on one node meet in the middle', () => {
    const r = run(2, [rail('V1', 1, 5), rail('V2', 1, 3)]);
    expect(r.converged).toBe(true);
    expect(r.v[1]).toBeCloseTo(4, 8);
  });
});

describe('solve, junctions', () => {
  it('drives an LED from a pin through 220 ohms at the old 12.2 mA', () => {
    const r = run(3, [pin('P1', 1, 1), resistor('R1', 1, 2, 220), led('D1', 2, 0)]);
    expect(r.converged).toBe(true);
    expect(r.state.D1).toBe('on');
    expect(Math.round(r.branch.D1.amps * 10000) / 10).toBe(12.2);
  });

  it('keeps an LED off when its pin is low or the LED is reversed', () => {
    expect(run(3, [pin('P1', 1, 0), resistor('R1', 1, 2, 220), led('D1', 2, 0)]).state.D1).toBe('off');
    const reversed = run(3, [pin('P1', 1, 1), resistor('R1', 1, 2, 220), led('D1', 0, 2)]);
    expect(reversed.state.D1).toBe('off');
    expect(reversed.branch.D1.amps).toBe(0);
    expect(reversed.branch.D1.volts).toBeLessThan(-1);
  });

  it('reports a current far above 20 mA for an LED straight on a pin', () => {
    const r = run(2, [pin('P1', 1, 1), led('D1', 1, 0)]);
    expect(r.branch.D1.amps).toBeGreaterThan(0.1);
  });

  it('switches an NPN on from a base resistor and into saturation', () => {
    const r = run(4, [rail('V1', 1, 5), resistor('Rb', 1, 2, 4700), resistor('Rc', 1, 3, 1000), npn('Q1', 3, 2, 0)]);
    expect(r.converged).toBe(true);
    expect(r.state.Q1).toBe('sat');
    expect(r.v[3]).toBeCloseTo(0.2, 2);
  });

  it('keeps an NPN with an open base off', () => {
    const r = run(4, [rail('V1', 1, 5), resistor('Rc', 1, 3, 1000), npn('Q1', 3, 2, 0)]);
    expect(r.state.Q1).toBe('off');
    expect(r.branch.Q1.amps).toBe(0);
    expect(r.v[3]).toBeCloseTo(5, 2);
  });

  it('puts an NPN in the active region when the load stays above vcesat', () => {
    const r = run(4, [rail('V1', 1, 5), resistor('Rb', 1, 2, 100000), resistor('Rc', 1, 3, 100), npn('Q1', 3, 2, 0)]);
    expect(r.state.Q1).toBe('active');
    expect(r.branch.Q1.amps).toBeCloseTo(100 * r.branch.Rb.amps, 6);
  });
});

describe('solve, PWM', () => {
  const load = (el: Element) => [el, resistor('R1', 1, 0, 1000)];

  it('time-averages a PWM pin over its slices', () => {
    const r = run(2, load(pwm('W1', 1, 0.5)));
    expect(r.v[1]).toBeCloseTo(0.5 * 5 * 1000 / 1025, 6);
    expect(r.branch.W1.amps).toBeCloseTo(0.5 * 5 / 1025, 6);
  });

  it('uses one slice for a duty of exactly 0 or 1', () => {
    expect(pwmSlices([pwm('W1', 1, 0)])).toHaveLength(1);
    expect(pwmSlices([pwm('W1', 1, 1)])).toHaveLength(1);
    expect(run(2, load(pwm('W1', 1, 0))).v[1]).toBeCloseTo(0, 9);
    expect(run(2, load(pwm('W1', 1, 1))).v[1]).toBeCloseTo(5 * 1000 / 1025, 6);
  });

  it('cuts duties of 0.25 and 0.75 into three slices that weigh one', () => {
    const slices = pwmSlices([pwm('W1', 1, 0.25), pwm('W2', 2, 0.75)]);
    expect(slices.map((s) => s.weight)).toEqual([0.25, 0.5, 0.25]);
    const [first, middle, last] = slices;
    const w1 = pwm('W1', 1, 0.25), w2 = pwm('W2', 2, 0.75);
    expect([w1, w2].map((el) => first.high(el))).toEqual([true, true]);
    expect([w1, w2].map((el) => middle.high(el))).toEqual([false, true]);
    expect([w1, w2].map((el) => last.high(el))).toEqual([false, false]);
  });

  it('accepts slices from the caller', () => {
    const r = run(2, load(pwm('W1', 1, 0.5)), { pwmSlices: [{ weight: 1, high: () => true }] });
    expect(r.v[1]).toBeCloseTo(5 * 1000 / 1025, 6);
  });

  it('solves a PWM-driven LED slice by slice', () => {
    const r = run(3, [pwm('W1', 1, 0.25), resistor('R1', 1, 2, 220), led('D1', 2, 0)]);
    expect(r.branch.D1.amps).toBeCloseTo(0.25 * 0.0122, 3);
  });
});

describe('solve, motors', () => {
  const motor: Element = { id: 'M1', kind: 'M', a: 1, b: 0, ohms: 10 };

  it('uses 1 / ohms without a curve', () => {
    const r = run(2, [rail('V1', 1, 6, 0), motor]);
    expect(r.branch.M1.amps).toBeCloseTo(0.6, 3);
  });

  it('finds the conductance a current curve implies', () => {
    const r = run(2, [rail('V1', 1, 6, 0), motor], { curve: (_, v) => v / 20 });
    expect(r.branch.M1.amps).toBeCloseTo(0.3, 3);
  });

  it('keeps a stalled motor at 1 / ohms when the curve declines it', () => {
    const r = run(2, [rail('V1', 1, 6, 0), motor], { curve: () => undefined });
    expect(r.branch.M1.amps).toBeCloseTo(0.6, 3);
  });
});

describe('solve, convergence', () => {
  it('ends an NPN loop that flips each round with no-convergence and the worst node', () => {
    const r = run(4, flipNpn(rail('V1', 1, 5)));
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(PWL_COMPAT.rounds);
    expect(r.strategy).toBe('direct');
    const d = r.diagnostics.find((x) => x.id === 'no-convergence');
    expect(d).toMatchObject({ severity: 'error', text_key: 'diag.no-convergence', ref: { net: String(r.residual.worstNode) }, args: { node: r.residual.worstNode } });
    expect(r.residual.maxKclAmps).toBeGreaterThan(1);
    expect(r.residual.worstNode).toBeGreaterThan(0);
  });

  it('ends a diode ring between two sources that disagree with no-convergence', () => {
    const r = run(4, diodeRing());
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(PWL_COMPAT.rounds);
    expect(r.diagnostics.map((d) => d.id)).toEqual(['no-convergence']);
    expect(r.diagnostics[0].args?.node).toBe(r.residual.worstNode);
  });

  it('fails when only one PWM slice flips', () => {
    const r = run(4, flipNpn(pwm('W1', 1, 0.5)));
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(PWL_COMPAT.rounds);
    expect(r.diagnostics.map((d) => d.id)).toEqual(['no-convergence']);
  });

  it('stops after the rounds it is given', () => {
    const r = solve({ nodes: 4, ground: 0, elements: flipNpn(rail('V1', 1, 5)) }, { ...PWL_OPTIONS, maxIter: 7 });
    expect(r.iterations).toBe(7);
    expect(r.converged).toBe(false);
  });

  it('reports a node nothing reaches as floating and solves it to 0 V', () => {
    const r = run(4, [rail('V1', 1, 5, 0), resistor('R1', 1, 0, 100), resistor('R2', 2, 3, 100)]);
    expect(r.converged).toBe(true);
    expect(r.diagnostics.filter((d) => d.id === 'floating-node').map((d) => d.args?.node)).toEqual([2, 3]);
    expect(r.v[2]).toBe(0);
  });

  it('reports every node of a circuit with no path to ground', () => {
    const r = run(3, [{ id: 'V1', kind: 'V', a: 1, b: 2, volts: 5, rSeriesOhms: 0.5 }]);
    expect(r.diagnostics.map((d) => d.id)).toEqual(['floating-node', 'floating-node']);
  });

  it('raises ill-conditioned when the matrix spans more than 1e15', () => {
    const r = solve({ nodes: 3, ground: 0, elements: [resistor('R1', 1, 0, 1)] }, { ...PWL_OPTIONS, gminSiemens: 1e-16 });
    expect(r.diagnostics.map((d) => d.id)).toContain('ill-conditioned');
  });

  it('solves the rest and reports a PNP and an edge PWM as not modelled yet', () => {
    const pnp = { ...npn('Q2', 3, 2, 0), polarity: 'pnp' } as Element;
    const edge = { ...pwm('W2', 1, 0.5), mode: 'edge' } as Element;
    const r = run(4, [rail('V1', 1, 5, 0), resistor('R1', 1, 0, 100), pnp, edge]);
    expect(r.converged).toBe(true);
    expect(r.branch.R1.amps).toBeCloseTo(0.05, 5);
    expect(r.diagnostics.filter((d) => d.id === 'not-modelled-yet').map((d) => d.ref.part)).toEqual(['Q2', 'W2']);
    expect(r.branch.Q2).toBeUndefined();
  });

  it('halts with numeric-fault on NaN', () => {
    const r = run(3, [rail('V1', 1, 5, 0), resistor('R1', 1, 2, NaN), resistor('R2', 2, 0, 100)]);
    expect(r.converged).toBe(false);
    expect(r.diagnostics.map((d) => d.id)).toEqual(['numeric-fault']);
    expect(r.diagnostics[0].severity).toBe('error');
  });
});

describe('solve, validation', () => {
  it('throws a RangeError for a node outside the circuit', () => {
    expect(() => run(2, [resistor('R1', 1, 2, 100)])).toThrow(RangeError);
    expect(() => run(2, [resistor('R1', 1, -1, 100)])).toThrow(RangeError);
    expect(() => run(2, [resistor('R1', 1, 0.5, 100)])).toThrow(RangeError);
    expect(() => solve({ nodes: 2, ground: 2, elements: [] }, PWL_OPTIONS)).toThrow(RangeError);
  });

  it('throws a RangeError for a negative resistance', () => {
    expect(() => run(2, [resistor('R1', 1, 0, -5)])).toThrow(RangeError);
    expect(() => run(2, [{ ...led('D1', 1, 0), rdOhms: -1 }])).toThrow(RangeError);
  });

  it('throws a RangeError for options it cannot run', () => {
    expect(() => solve({ nodes: 2, ground: 0, elements: [] }, { ...PWL_OPTIONS, mode: 'spice' as 'pwl' })).toThrow(RangeError);
    expect(() => solve({ nodes: 2, ground: 0, elements: [] }, { ...PWL_OPTIONS, maxIter: 0 })).toThrow(RangeError);
  });
});
