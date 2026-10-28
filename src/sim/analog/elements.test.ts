// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deviceState, freshState, isModelled, measureElement, PWL_COMPAT, stampElement, updateState, type PwlState } from './elements.ts';
import type { Element } from './types.ts';

// three nodes 0..2 map to rows 0..2; node 3 is ground
const ix = (node: number) => (node === 3 ? -1 : node);

function stampOf(el: Element, st: PwlState = freshState()) {
  const A = Array.from({ length: 3 }, () => new Float64Array(3));
  const b = new Float64Array(3);
  stampElement(el, A, b, ix, st);
  return { A: A.map((row) => Array.from(row)), b: Array.from(b) };
}

function expectStamp(got: ReturnType<typeof stampOf>, A: number[][], b: number[]) {
  A.forEach((row, i) => row.forEach((value, j) => expect(got.A[i][j]).toBeCloseTo(value, 12)));
  b.forEach((value, i) => expect(got.b[i]).toBeCloseTo(value, 12));
}

const on = (extra: Partial<PwlState> = {}): PwlState => ({ ...freshState(), on: true, ...extra });

describe('stampElement', () => {
  it('stamps a resistor as a conductance between two rows', () => {
    expectStamp(stampOf({ id: 'R1', kind: 'R', a: 0, b: 1, ohms: 100 }), [[0.01, -0.01, 0], [-0.01, 0.01, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps only the diagonal when one end is ground', () => {
    expectStamp(stampOf({ id: 'R1', kind: 'R', a: 2, b: 3, ohms: 50 }), [[0, 0, 0], [0, 0, 0], [0, 0, 0.02]], [0, 0, 0]);
  });

  it('floors a zero resistance at minOhms', () => {
    expect(stampOf({ id: 'R1', kind: 'R', a: 0, b: 3, ohms: 0 }).A[0][0]).toBeCloseTo(1 / PWL_COMPAT.minOhms, 6);
  });

  it('stamps a pot as two segments around the wiper', () => {
    const g1 = 1 / 250, g2 = 1 / 750;
    expectStamp(
      stampOf({ id: 'P1', kind: 'POT', a: 0, wiper: 1, b: 2, ohms: 1000, position: 0.25 }),
      [[g1, -g1, 0], [-g1, g1 + g2, -g2], [0, -g2, g2]],
      [0, 0, 0],
    );
  });

  it('stamps a rail as a Norton source with its series resistance', () => {
    expectStamp(stampOf({ id: 'V1', kind: 'V', a: 0, b: 3, volts: 5, rSeriesOhms: 0.5 }), [[2, 0, 0], [0, 0, 0], [0, 0, 0]], [10, 0, 0]);
  });

  it('stamps a pin high through its driver and low as a plain pull-down', () => {
    const pin: Element = { id: 'P1', kind: 'PIN', a: 1, level: 1, vHighVolts: 5, rOutOhms: 25, maxAmps: 0.04 };
    expectStamp(stampOf(pin, { ...freshState(), high: true }), [[0, 0, 0], [0, 0.04, 0], [0, 0, 0]], [0, 0.2, 0]);
    expectStamp(stampOf({ ...pin, level: 0 }), [[0, 0, 0], [0, 0.04, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps nothing for a pin that is an input', () => {
    expectStamp(stampOf({ id: 'P1', kind: 'PIN', a: 1, level: 'Z', vHighVolts: 5, rOutOhms: 25, maxAmps: 0.04 }), [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps a PWM element by the level of the slice', () => {
    const pwm: Element = { id: 'W1', kind: 'PWM', a: 0, duty: 0.5, hz: 490, vHighVolts: 5, rOutOhms: 25, mode: 'averaged' };
    expectStamp(stampOf(pwm, { ...freshState(), high: true }), [[0.04, 0, 0], [0, 0, 0], [0, 0, 0]], [0.2, 0, 0]);
    expectStamp(stampOf(pwm), [[0.04, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps a diode only while it is on, with its drop built in', () => {
    const d: Element = { id: 'D1', kind: 'D', a: 0, b: 1, modelId: 'led', vf: 2, rdOhms: 0.5, maxAmps: 0.02 };
    expectStamp(stampOf(d), [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 0, 0]);
    expectStamp(stampOf(d, on()), [[2, -2, 0], [-2, 2, 0], [0, 0, 0]], [4, -4, 0]);
  });

  it('stamps an active buzzer like a diode and a passive one not at all', () => {
    const bz: Element = { id: 'B1', kind: 'BZ', a: 0, b: 1, active: true, vf: 0.05, rdOhms: 100 };
    expectStamp(stampOf(bz, on()), [[0.01, -0.01, 0], [-0.01, 0.01, 0], [0, 0, 0]], [0.0005, -0.0005, 0]);
    expectStamp(stampOf({ ...bz, active: false }), [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps a motor as the conductance the solver gives it', () => {
    expectStamp(stampOf({ id: 'M1', kind: 'M', a: 0, b: 1, ohms: 10 }, { ...freshState(), gm: 0.2 }), [[0.2, -0.2, 0], [-0.2, 0.2, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps a servo as the idle load between its supply and ground pins', () => {
    const g = PWL_COMPAT.servoSiemens;
    expectStamp(stampOf({ id: 'S1', kind: 'SV', gnd: 0, vplus: 1, sig: 2 }), [[g, -g, 0], [-g, g, 0], [0, 0, 0]], [0, 0, 0]);
  });

  it('stamps a sensor supply, and its output only while it is supplied', () => {
    const ts: Element = { id: 'T1', kind: 'TS', supplyPos: 0, supplyNeg: 1, out: 2 };
    const q = PWL_COMPAT.sensorQuiescentSiemens;
    expectStamp(stampOf(ts), [[q, -q, 0], [-q, q, 0], [0, 0, 0]], [0, 0, 0]);
    const go = 1 / PWL_COMPAT.sensorOutOhms, v0 = PWL_COMPAT.sensorOutVolts;
    expectStamp(stampOf(ts, on()), [[q, -q, 0], [-q, q + go, -go], [0, -go, go]], [0, -go * v0, go * v0]);
  });

  it('stamps an active transistor as a base diode plus a base-controlled collector current', () => {
    const q: Element = { id: 'Q1', kind: 'Q', c: 0, b: 1, e: 2, polarity: 'npn', modelId: 'npn', hfe: 100, hfr: 5, vbe: 0.7, vcesat: 0.2 };
    expectStamp(stampOf(q), [[0, 0, 0], [0, 0, 0], [0, 0, 0]], [0, 0, 0]);
    expectStamp(stampOf(q, on()), [[0, 50, -50], [0, 0.5, -0.5], [0, -50.5, 50.5]], [35, 0.35, -35.35]);
  });

  it('stamps a saturated transistor as a collector-emitter source of vcesat', () => {
    const q: Element = { id: 'Q1', kind: 'Q', c: 0, b: 1, e: 2, polarity: 'npn', modelId: 'npn', hfe: 100, hfr: 5, vbe: 0.7, vcesat: 0.2 };
    expectStamp(stampOf(q, on({ sat: true })), [[100, 0, -100], [0, 0.5, -0.5], [-100, -0.5, 100.5]], [20, 0.35, -20.35]);
  });

  it('swaps collector and emitter and uses hfr for an inverted transistor', () => {
    const q: Element = { id: 'Q1', kind: 'Q', c: 0, b: 1, e: 2, polarity: 'npn', modelId: 'npn', hfe: 100, hfr: 5, vbe: 0.7, vcesat: 0.2 };
    expectStamp(stampOf(q, on({ inv: true })), [[3, -3, 0], [-0.5, 0.5, 0], [-2.5, 2.5, 0]], [-2.1, 0.35, 1.75]);
  });
});

const diode: Element = { id: 'D1', kind: 'D', a: 0, b: 1, modelId: 'led', vf: 2, rdOhms: 0.5, maxAmps: 0.02 };
const npn: Element = { id: 'Q1', kind: 'Q', c: 0, b: 1, e: 2, polarity: 'npn', modelId: 'npn', hfe: 100, hfr: 5, vbe: 0.7, vcesat: 0.2 };
const volts = (...v: number[]) => (node: number) => v[node];

describe('updateState', () => {
  it('turns a diode on above vf plus the margin and off below vf minus it', () => {
    const st = freshState();
    expect(updateState(diode, st, volts(2.0000005, 0))).toBe(false);
    expect(updateState(diode, st, volts(2.001, 0))).toBe(true);
    expect(st.on).toBe(true);
    expect(updateState(diode, st, volts(1.9999995, 0))).toBe(false);
    expect(updateState(diode, st, volts(1.99, 0))).toBe(true);
    expect(st.on).toBe(false);
  });

  it('turns a transistor on when the base is a vbe above the emitter', () => {
    const st = freshState();
    expect(updateState(npn, st, volts(5, 0.7, 0))).toBe(false);
    expect(updateState(npn, st, volts(5, 0.8, 0))).toBe(true);
    expect(st).toMatchObject({ on: true, sat: false, inv: false });
  });

  it('reads an inverted transistor when the emitter is the higher end', () => {
    const st = freshState();
    expect(updateState(npn, st, volts(0, 0, 3))).toBe(true);
    expect(st.inv).toBe(true);
  });

  it('saturates when the collector drops under vcesat and leaves saturation when the load can supply more', () => {
    const st = on();
    expect(updateState(npn, st, volts(0.1, 1.5, 0))).toBe(true);
    expect(st.sat).toBe(true);
    expect(updateState(npn, st, volts(0.1, 1.5, 0))).toBe(false);
    expect(updateState(npn, st, volts(5, 1.0, 0))).toBe(true);
    expect(st.sat).toBe(false);
  });

  it('turns a transistor off when the base current goes negative', () => {
    const st = on();
    expect(updateState(npn, st, volts(5, 0.2, 0))).toBe(true);
    expect(st.on).toBe(false);
  });

  it('turns a sensor on inside its supply window only', () => {
    const ts: Element = { id: 'T1', kind: 'TS', supplyPos: 0, supplyNeg: 1, out: 2 };
    const st = freshState();
    expect(updateState(ts, st, volts(5, 0, 0))).toBe(true);
    expect(st.on).toBe(true);
    expect(updateState(ts, st, volts(8, 0, 0))).toBe(true);
    expect(st.on).toBe(false);
  });

  it('never moves a resistor, a passive buzzer or a source', () => {
    const st = freshState();
    expect(updateState({ id: 'R1', kind: 'R', a: 0, b: 1, ohms: 1 }, st, volts(5, 0))).toBe(false);
    expect(updateState({ id: 'B1', kind: 'BZ', a: 0, b: 1, active: false, vf: 0, rdOhms: 1 }, st, volts(5, 0))).toBe(false);
  });
});

describe('measureElement and deviceState', () => {
  it('measures a resistor', () => {
    const m = measureElement({ id: 'R1', kind: 'R', a: 0, b: 1, ohms: 100 }, freshState(), volts(5, 3));
    expect(m.amps).toBeCloseTo(0.02, 12);
    expect(m.volts).toBe(2);
    expect(m.watts).toBeCloseTo(0.04, 12);
  });

  it('measures an LED current only while it is on', () => {
    expect(measureElement(diode, freshState(), volts(1, 0)).amps).toBe(0);
    expect(measureElement(diode, on(), volts(2.5, 0)).amps).toBeCloseTo(1, 12);
    expect(deviceState(diode, on())).toBe('on');
    expect(deviceState(diode, freshState())).toBe('off');
  });

  it('measures an active transistor as beta times the base current', () => {
    const m = measureElement(npn, on(), volts(3, 1.7, 0));
    expect(m.amps).toBeCloseTo(100 * 0.5, 12);
    expect(deviceState(npn, on())).toBe('active');
    expect(deviceState(npn, on({ sat: true }))).toBe('sat');
    expect(deviceState(npn, freshState())).toBe('off');
  });

  it('reports a pin that is an input as open and keeps no state for plain parts', () => {
    expect(deviceState({ id: 'P1', kind: 'PIN', a: 0, level: 'Z', vHighVolts: 5, rOutOhms: 25, maxAmps: 0.04 }, freshState())).toBe('open');
    expect(deviceState({ id: 'R1', kind: 'R', a: 0, b: 1, ohms: 1 }, freshState())).toBeNull();
  });
});

describe('isModelled', () => {
  it('rejects PNP transistors and PWM modes other than averaged', () => {
    expect(isModelled(npn)).toBe(true);
    expect(isModelled({ ...npn, polarity: 'pnp' })).toBe(false);
    const pwm: Element = { id: 'W1', kind: 'PWM', a: 0, duty: 0.5, hz: 490, vHighVolts: 5, rOutOhms: 25, mode: 'averaged' };
    expect(isModelled(pwm)).toBe(true);
    expect(isModelled({ ...pwm, mode: 'edge' })).toBe(false);
  });
});
