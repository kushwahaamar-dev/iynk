import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildFigure, loadFigure, swapItem } from './testkit.mjs';

// The circuit solver on the Uno R3's own lesson circuits (figures/boards/uno-r3.js), driven the way the host drives
// them: one set patch for circuit, power and pins, then the virtual clock.
const UNO = 'boards/uno-r3';
const unoPage = () => loadFigure(buildFigure(UNO), { path: '/figures/boards/uno-r3.html' });
// the Uno with one more circuit, for wiring the lessons don't have
const unoWith = (key, circuit) => {
  const src = readFileSync(resolve(import.meta.dirname, '..', 'boards', 'uno-r3.js'), 'utf8').replace('  circuits: {', `  circuits: {\n    ${key}: ${JSON.stringify(circuit)},`);
  return loadFigure(swapItem(buildFigure(UNO), UNO, src), { path: '/figures/boards/uno-r3.html' });
};

let page;
afterEach(() => { page?.close(); page = null; });
const run = (patch, secs = .4) => { page.bench.accept(patch); page.bench.advance(secs); return page.bench.report(); };

describe('LEDs (v1 behaviour kept)', () => {
  it('Blink: 220 Ω from D13 gives the textbook 12.2 mA', async () => {
    page = await unoPage();
    const r = run({ circuit: 'blink', power: 'usb', pins: { D13: 1 } });
    expect(r.meas.LED1).toMatchObject({ kind: 'led', state: 'ok', i_mA: 12.2, r: 220, net: 'D13' });
    expect(run({ pins: { D13: 0 } }).meas.LED1.state).toBe('off');
    expect(page.notes()).toEqual([]);
  });

  it('an unpowered circuit is open, and an LED straight on a pin burns and stays burnt', async () => {
    page = await unoPage();
    expect(run({ circuit: 'blink', power: null }).meas.LED1.state).toBe('open');
    page.close();
    page = await unoWith('nores', { breadboard: 'half', parts: [{ id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] }],
      wires: [{ from: 'IOH.5', to: 'a14', color: 'orange' }, { from: 'IOH.4', to: 'a15', color: 'black' }] });
    const r = run({ circuit: 'nores', power: 'usb', pins: { D13: 1 } });
    expect(r.meas.LED1.state).toBe('burnt');
    expect(run({ pins: { D13: 0 } }).meas.LED1.state).toBe('burnt');
  });

  it('an RGB LED reports each channel with its PWM duty', async () => {
    page = await unoPage();
    const ch = run({ circuit: 'rgb', power: 'usb', pins: { D9: 1, D10: .25, D11: 0 } }).meas.LED1.ch;
    expect(ch.R.i_mA).toBeCloseTo(12.2, 0);
    expect(ch.G.i_mA).toBeGreaterThan(1.5);
    expect(ch.G.i_mA).toBeLessThan(2.5);
    expect(ch.B.state).toBe('off');
  });
});

describe('transistor, diode and motor (lesson 10)', () => {
  it('a full-on pin saturates the TIP120 and runs the motor near 4 V', async () => {
    page = await unoPage();
    const m = run({ circuit: 'motor', power: 'usb', pins: { D6: 1 } }).meas;
    expect(m.Q1).toMatchObject({ kind: 'npn', state: 'on' });
    expect(m.Q1.ib_mA).toBeCloseTo(3.6, 0);
    expect(m.Q1.vce).toBeGreaterThan(.8);
    expect(m.Q1.vce).toBeLessThan(1.1);
    expect(m.MOT1.state).toBe('ok');
    expect(m.MOT1.v).toBeGreaterThan(3.7);
    expect(m.MOT1.v).toBeLessThan(4.2);
    expect(m.MOT1.i_mA).toBeGreaterThan(150);
    expect(m.DIO1.state).toBe('block');
  });

  it('PWM halves the motor voltage and the flyback diode clamps', async () => {
    page = await unoPage();
    const m = run({ circuit: 'motor', power: 'usb', pins: { D6: .5 } }).meas;
    expect(m.MOT1.v).toBeGreaterThan(1.8);
    expect(m.MOT1.v).toBeLessThan(2.1);
    expect(m.DIO1.state).toBe('clamp');
    const off = run({ pins: { D6: 0 } }).meas;
    expect(off.Q1.state).toBe('off');
    expect(off.MOT1.state).toBe('off');
  });

  it('no flyback diode: the motor reports the spike', async () => {
    page = await unoWith('spike', { breadboard: 'half', parts: [
      { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b13'] },
      { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },
      { id: 'MOT1', part: 'dc-motor', at: [150, 12], holes: ['a20', 'a14'] }],
      wires: [{ from: 'D6', to: 'a9', color: 'orange' }, { from: 'IOH.4', to: 'a15', color: 'black' }, { from: 'POWER.5', to: 'e20', color: 'red' }] });
    expect(run({ circuit: 'spike', power: 'usb', pins: { D6: .5 } }).meas.MOT1.state).toBe('spike');
  });

  it('pin and motor swapped: the motor hangs on the base, and the TIP120 reports overdrive', async () => {
    page = await unoWith('swapped', { breadboard: 'half', parts: [
      { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b14'] },
      { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },
      { id: 'MOT1', part: 'dc-motor', at: [150, 12], holes: ['a20', 'a13'] }],
      wires: [{ from: 'D6', to: 'a9', color: 'orange' }, { from: 'IOH.4', to: 'a15', color: 'black' }, { from: 'POWER.5', to: 'e20', color: 'red' }] });
    const m = run({ circuit: 'swapped', power: 'usb', pins: { D6: 1 } }).meas;
    expect(m.Q1.state).toBe('overdrive');
    expect(m.Q1.ib_mA).toBeGreaterThan(120);
    expect(m.Q1.ib_mA).toBeGreaterThan(m.Q1.ic_mA);
    // the motor still turns, through the base-emitter junction, whatever the pin does
    expect(run({ pins: { D6: 0 } }).meas.MOT1.state).toBe('ok');
    // the right way round it is an ordinary switch again
    page.close();
    page = await unoPage();
    expect(run({ circuit: 'motor', power: 'usb', pins: { D6: 1 } }).meas.Q1.state).toBe('on');
  });

  it('a stalled motor draws more than USB gives: the board browns out', async () => {
    page = await unoPage();
    const r = run({ circuit: 'motor', power: 'usb', pins: { D6: 1 }, params: { MOT1: { load: 'stalled' } } }, 1);
    expect(r.status).toBe('brownout');
    expect(r.why).toMatch(/more than USB cable gives \(500 mA\)/);
    expect(run({ params: { MOT1: { load: 'prop' } } }, 1).status).toBe('running');
  });
});

describe('stepper on a ULN2003 board (lesson 13)', () => {
  it('a HIGH input sinks its output, and the coil on it carries about 80 mA', async () => {
    page = await unoPage();
    const m = run({ circuit: 'stepper', power: 'usb', pins: { D8: 1, D9: 1, D10: 0, D11: 0 } }).meas;
    expect(m.DRV1).toMatchObject({ kind: 'driver', state: 'on' });
    expect(m.DRV1.ch[1]).toMatchObject({ state: 'on', vce: 1 });
    expect(m.DRV1.ch[1].ib_mA).toBeCloseTo(1.3, 1);
    expect(m.DRV1.ch[1].ic_mA).toBeGreaterThan(70);
    expect(m.DRV1.ch[1].ic_mA).toBeLessThan(85);
    expect(m.DRV1.ch[3].state).toBe('off');
    expect(m.STP1).toMatchObject({ kind: 'stepper', state: 'ok', coils: { B: true, P: true, Y: false, O: false } });
    expect(m.STP1.i_mA).toBeCloseTo(m.DRV1.i_mA, -1);
    expect(page.notes()).toEqual([]);
  });

  it('the coils follow the pins, and with the driver gone the stepper reports nothing', async () => {
    page = await unoPage();
    expect(run({ circuit: 'stepper', power: 'usb', pins: { D8: 0, D9: 0, D10: 1, D11: 1 } }).meas.STP1.coils).toEqual({ B: false, P: false, Y: true, O: true });
    expect(run({ pins: { D8: 0, D9: 0, D10: 0, D11: 0 } }).meas.STP1).toMatchObject({ state: 'off', i_mA: 0 });
    expect(run({ fault: 'missing:DRV1', power: 'usb' }).meas.STP1).toBeUndefined();
    expect(page.notes()).toEqual([]);
  });
});

describe('inputs and sensors', () => {
  it('a potentiometer divides 5 V and A0 reads the wiper', async () => {
    page = await unoPage();
    let r = run({ circuit: 'knob', power: 'usb', pins: { D9: 0 } });
    expect(r.volts.A0).toBeCloseTo(2.5, 1);
    expect(r.meas.POT1).toMatchObject({ kind: 'pot', state: 'ok' });
    r = run({ params: { POT1: { pos: 1 } } });
    expect(r.volts.A0).toBeGreaterThan(4.8);
  });

  it('a push button pulls D2 up while pressed (also when the scene is pressed)', async () => {
    page = await unoPage();
    expect(run({ circuit: 'button', power: 'usb', view: 'breadboard' }).volts.D2).toBe(0);
    expect(run({ params: { BTN1: { pressed: 1 } } }).volts.D2).toBeGreaterThan(4.5);
    run({ params: { BTN1: { pressed: 0 } } });
    page.bench.bbPress('BTN1', true); page.bench.advance(.1);
    expect(page.bench.report().volts.D2).toBeGreaterThan(4.5);
    page.bench.bbPress('BTN1', false); page.bench.advance(.1);
    expect(page.bench.report().volts.D2).toBe(0);
  });

  it('the TMP36 drives A0 to 0.5 V + 10 mV per °C; the fan runs from the transistor', async () => {
    page = await unoPage();
    let r = run({ circuit: 'heat', power: 'usb', pins: { D6: 1 } });
    expect(r.volts.A0).toBeCloseTo(.72, 2);
    expect(r.meas.FAN1.state).toBe('ok');
    r = run({ params: { TMP1: { tempC: 33 } } });
    expect(r.volts.A0).toBeCloseTo(.83, 2);
  });

  it('a servo reads its pulse width from the SIG duty', async () => {
    page = await unoPage();
    const m = run({ circuit: 'servo', power: 'usb', pins: { D9: .075 } }, 1).meas.SRV1;
    expect(m).toMatchObject({ kind: 'servo', state: 'ok', us: 1500 });
    expect(m.angle).toBeGreaterThan(85);
    expect(m.angle).toBeLessThan(100);
    expect(run({ pins: { D9: 0 } }).meas.SRV1.state).toBe('off');
  });
});

describe('sound (tone() reaches the buzzer)', () => {
  it('set {tones} sounds the buzzer on that pin and the state reports it', async () => {
    page = await unoPage();
    let r = run({ circuit: 'sound', power: 'usb', tones: { D8: 440 } });
    expect(r.meas.BUZ1.f).toBe(440);
    expect(r.sound).toMatchObject({ part: 'BUZ1', hz: 440, how: 'tone' });
    r = run({ tones: {} });
    expect(r.sound).toBe(null);
    r = run({ pins: { D8: 1 } });
    expect(r.sound).toBe(null);
    expect(r.meas.BUZ1.v).toBeGreaterThan(4.5);
  });
});

describe('part pages', () => {
  it('pickers offer the part\'s own steps', async () => {
    page = await loadFigure(buildFigure('parts/piezo-buzzer'), { path: '/figures/parts/piezo-buzzer.html' });
    expect(page.bench.choices().freq).toEqual(['0', '262', '294', '330', '349', '392', '440', '494', '523', '1568', '2300', '4000']);
    expect(page.notes()).toEqual([]);
  });
});
