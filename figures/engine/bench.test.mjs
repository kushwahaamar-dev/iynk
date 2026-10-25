import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildFigure, loadFigure, swapItem } from './testkit.mjs';

const ESP = 'robotics/esp32-s3-build';
const espPage = (query = '') => loadFigure(buildFigure(ESP), { path: `/figures/robotics/${ESP.split('/')[1]}.html`, query });
const fixture = (id, src, query = '') =>
  loadFigure(swapItem(buildFigure(ESP), ESP, src), { path: `/figures/robotics/${id}.html`, query });

let page;
afterEach(() => { page?.close(); page = null; });

describe('bench over a board variant (B2)', () => {
  it('keeps the bench modes and tasks', async () => {
    page = await espPage();
    const B = page.bench;
    expect(Object.keys(B.md.modes)).toEqual(['blink', 'rainbow', 'wifi', 'deep-sleep']);
    expect(Object.keys(B.report().tasks)).toEqual(['awake', 'joining', 'wifi', 'asleep']);
    expect(B.md.byId.D6.led.net).toBe('GPIO38');
    expect(page.notes()).toEqual([]);
  });

  it('applies ?variant= to the base board before the merge', async () => {
    page = await espPage('variant=v1.0');
    const B = page.bench;
    expect(B.md.byId.D6.led.net).toBe('GPIO48');
    expect(Object.keys(B.md.modes)).toContain('wifi');
    expect(B.report().tasks).toHaveProperty('asleep');
  });
});

describe('missing:<part> faults (B3)', () => {
  it('stay in state.faults until the part is back', async () => {
    page = await espPage();
    const B = page.bench, A = B.actions;
    A.fault('missing:R17');
    let r = B.report();
    expect(r.faults).toEqual(['missing:R17']);
    expect(r.missing).toContain('R17');
    expect(r.power).toBe(null);
    A.restore('R17');
    expect(B.report().faults).toEqual([]);
  });

  it('are repaired by fault: null', async () => {
    page = await espPage();
    const B = page.bench;
    expect(B.accept({ fault: 'missing:R17' })).toBe(true);
    expect(B.accept({ fault: null, power: 'uart' })).toBe(true);
    const r = B.report();
    expect(r.faults).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.status).toBe('running');
  });

  it('come from ?fault= too', async () => {
    page = await espPage('fault=missing:R17');
    expect(page.bench.report().faults).toEqual(['missing:R17']);
  });

  it('are dropped by a rebuild', async () => {
    page = await espPage();
    const B = page.bench;
    B.actions.fault('missing:R17');
    B.accept({ build: 'assembled' });
    expect(B.report().faults).toEqual([]);
  });
});

describe('assembly', () => {
  it('places a whole group with one press, low before tall', async () => {
    page = await espPage();
    const B = page.bench, A = B.actions;
    B.accept({ power: null, build: 'bare' });
    expect(B.report().build).toBe('bare');
    A.pnp();
    B.advance(15);
    expect(B.report().build).toBe('reflowed');
    const low = B.md.parts.filter((p) => p.group === 'low' && !p.fixed).map((p) => p.id);
    expect(low.length).toBeGreaterThan(1);
    A.placeGroup('low');
    expect(B.report().missing.filter((id) => low.includes(id))).toEqual([]);
    A.solder();
    B.advance(10);
    expect(B.report().build).toBe('assembled');
  });

  it('offers the group chips and every part choice, each id once', async () => {
    page = await espPage();
    const ch = page.bench.choices();
    expect(ch.place).toEqual(expect.arrayContaining(['group-low', 'j1', 'j3']));
    expect(ch.break).toEqual(expect.arrayContaining(['missing-r17', 'repair']));
    for (const list of Object.values(ch)) if (list) expect(new Set(list).size).toBe(list.length);
  });

  it('notes duplicate button choices at mount', async () => {
    page = await fixture('fixture-dup', `
      SL.bench.bench({ id: 'fixture-dup', name: 'Dup', board: 'esp32-s3-devkitc-1', circuits: {}, circuit: null,
        modes: { a: { title: 'A', out: () => ({}) }, b: { title: 'B', out: () => ({}) } }, mode: 'a',
        faults: ['short:5V:GND', 'short-5v-gnd'] });`);
    expect(page.notes().join(' ')).toMatch(/button break: two choices have the id "short-5v-gnd"/);
  });
});

describe('boot strap', () => {
  it('enters download mode only with BOOT held through a reset', async () => {
    page = await espPage();
    const B = page.bench, A = B.actions;
    A.press('SW2', true); A.press('SW2', false);
    expect(B.report().boot).toBe(null);
    A.press('SW1', true); A.press('SW2', true); A.press('SW2', false); A.press('SW1', false);
    expect(B.report().boot).toBe('download');
    A.press('SW2', true); A.press('SW2', false);
    expect(B.report().boot).toBe(null);
  });
});

const MAT = `
SL.bench.bench({
  id: 'fixture-mat', name: 'Mat fixture', board: 'esp32-s3-devkitc-1', view: 'board', circuits: {}, circuit: null,
  periph: [
    { id: 'BUDDY', board: 'esp32-s3-devkitc-1', at: [50, 0], step: 'buddy' },
    { id: 'LAMP', part: 'led', at: [50, 40], size: [8, 8], params: { color: 'green' }, step: 'lamp' },
  ],
  wires: [
    { from: 'BUDDY.GND', to: 'GND', color: 'black', step: 'buddy' },
    { from: 'LAMP.A', to: 'GPIO4', color: 'yellow', step: 'lamp' },
  ],
  matSteps: [{ id: 'buddy', label: 'Put the second board down' }, { id: 'lamp', label: 'Wire the lamp' }],
  power: {
    sources: { bench: { label: 'Bench supply', parts: ['BUDDY'], feeds: { VM: 7.4, VCC: 5 }, range: [7, 8] } },
    default: 'bench',
    rails: { LOGIC: { from: [{ rail: 'VCC', reg: 3.3, dropout: 0.2 }] } },
  },
  modes: { idle: { title: 'Idle', out: () => ({}) } }, mode: 'idle',
  model: (st, dt) => {
    st.spin = (st.spin || 0) + dt;
    const vm = st.ev.rails.VM || 0;
    return { readings: { motor: { volts: vm, turns: st.spin } }, status: vm > 7 ? 'motor running' : 'motor stopped' };
  },
});`;

describe('the mat', () => {
  it('feeds several rails from one supply and runs the model hook', async () => {
    page = await fixture('fixture-mat', MAT);
    const B = page.bench;
    let r = B.report();
    expect(r.power).toBe('bench');
    expect(r.rails).toMatchObject({ VM: 7.4, VCC: 5, LOGIC: 3.3 });
    expect(r.matStep).toBe('lamp');
    expect(r.benchStatus).toBe('motor running');
    expect(r.readings.motor.volts).toBe(7.4);
    B.advance(1);
    expect(B.report().readings.motor.turns).toBeCloseTo(1, 2);
    B.actions.fault('wrong-voltage:bench:3.7');
    r = B.report();
    expect(r.rails.VM).toBeCloseTo(3.7, 1);
    expect(r.rails.VCC).toBeCloseTo(2.5, 1);
    expect(r.benchStatus).toBe('motor stopped');
    expect(page.notes()).toEqual([]);
  });

  it('is set out one step at a time, never live, and the supply needs its board', async () => {
    page = await fixture('fixture-mat', MAT, 'mat=');
    const B = page.bench;
    let r = B.report();
    expect(r.matStep).toBe(null);
    expect(r.status).toBe('no-power');
    expect(r.why).toMatch(/BUDDY|second|missing/i);
    expect(B.accept({ power: null })).toBe(true);
    expect(B.accept({ matStep: 'lamp' })).toBe('mat step refused');
    expect(B.accept({ matStep: 'buddy' })).toBe(true);
    expect(B.accept({ matStep: 'lamp' })).toBe(true);
    expect(B.accept({ power: 'bench' })).toBe(true);
    r = B.report();
    expect(r.status).toBe('powered');
    expect(B.accept({ matStep: null })).toBe('mat step refused');
    expect(B.matSetup().items.map((it) => it.id)).toEqual(['BUDDY', 'LAMP']);
  });

  it('burns the declared part on reverse polarity', async () => {
    page = await fixture('fixture-mat', MAT.replace("feeds: { VM: 7.4, VCC: 5 }", "feeds: { VM: 7.4, VCC: 5 }, part: null").replace("rails: { LOGIC:", "rails: { VM: { burns: 'U1' }, LOGIC:"));
    const B = page.bench;
    B.actions.fault('reverse-polarity:bench');
    const r = B.report();
    expect(r.status).toBe('fault');
    expect(r.fault.part).toBe('U1');
  });

  it('notes a periph or wire it cannot draw', async () => {
    page = await fixture('fixture-mat', MAT.replace("to: 'GPIO4'", "to: 'NOPE.9'").replace("part: 'led'", "part: 'flux'"));
    page.bench.advance(0.1);
    const notes = page.notes().join(' ');
    expect(notes).toMatch(/periph LAMP: unknown part "flux"/);
    expect(notes).toMatch(/wire LAMP\.A-NOPE\.9: unknown end/);
    expect(notes).not.toMatch(/wire BUDDY/);
  });
});

describe('model hook errors', () => {
  it('are noted once and leave empty readings', async () => {
    page = await fixture('fixture-mat', MAT.replace('st.spin = (st.spin || 0) + dt;', "throw new Error('model broke');"));
    page.bench.advance(0.5);
    expect(page.notes().filter((n) => n.includes('model broke'))).toHaveLength(1);
    expect(page.bench.report().readings).toEqual({});
  });
});

describe('breadboard circuits', () => {
  it('note an unknown part instead of skipping it', async () => {
    page = await fixture('fixture-bb', `
      SL.bench.bench({ id: 'fixture-bb', name: 'BB', board: 'esp32-s3-devkitc-1', view: 'breadboard',
        circuit: { breadboard: 'half', parts: [{ id: 'X1', part: 'flux-capacitor', holes: ['e10', 'e12'] }], wires: [] } });`);
    page.bench.advance(0.1);
    const hits = page.notes().filter((n) => n.includes('unknown part "flux-capacitor"'));
    expect(hits).toEqual(['bench: circuit part X1: unknown part "flux-capacitor" (add // @cf use parts/flux-capacitor.js)']);
  });
});

const UNO = 'boards/uno-r3';
const unoPage = (query = '') => loadFigure(buildFigure(UNO), { path: '/figures/boards/uno-r3.html', query });

describe('one set patch: unplug, change the board, then plug in', () => {
  it('shows a missing part on a powered board', async () => {
    page = await unoPage();
    const B = page.bench;
    expect(B.accept({ power: 'usb', fault: 'missing:Y2' })).toBe(true);
    const r = B.report();
    expect(r).toMatchObject({ power: 'usb', status: 'powered', faults: ['missing:Y2'] });
    expect(r.missing).toEqual(['Y2']);
    expect(r.why).toMatch(/nothing runs/);
  });

  it('runs without the auto-reset cap, but refuses the upload', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'missing:C5' });
    expect(B.report().status).toBe('running');
    B.actions.upload('hello');
    expect(B.report().status).toBe('running');
    expect(B.st.msg).toMatch(/Upload failed/);
  });

  it('reports a backwards chip as reversed:<id> and burns it once powered', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'reversed:ZU4' });
    const r = B.report();
    expect(r.power).toBe('usb');
    expect(r.status).toBe('fault');
    expect(r.fault).toMatchObject({ id: 'reversed:ZU4', part: 'ZU4', kind: 'hot' });
    expect(r.faults).toEqual(['reversed:ZU4']);
  });

  it('pops a backwards cap only while its rail is live', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'reversed:PC2' });
    expect(B.report()).toMatchObject({ status: 'fault', fault: { id: 'reversed:PC2', kind: 'pop' } });
    B.accept({ power: 'usb', fault: 'reversed:PC1' });
    let r = B.report();
    expect(r.status).toBe('running');
    expect(r.faults).toEqual(['reversed:PC1']);
    B.accept({ power: 'jack' });
    r = B.report();
    expect(r).toMatchObject({ status: 'fault', fault: { id: 'reversed:PC1' } });
  });

  it('replaces the fault before, and fault: null turns parts back round', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'reversed:ZU4' });
    B.accept({ power: 'usb', fault: 'missing:Y2' });
    let r = B.report();
    expect(r.faults).toEqual(['missing:Y2']);
    expect(r.status).toBe('powered');
    B.accept({ fault: 'reversed:ZU4' });
    expect(B.report().power).toBe(null);
    B.accept({ fault: null, power: 'usb' });
    r = B.report();
    expect(r).toMatchObject({ faults: [], missing: [], status: 'running' });
  });

  it('unplugs before a rebuild', async () => {
    page = await unoPage();
    const B = page.bench;
    expect(B.accept({ power: null, build: 'bare' })).toBe(true);
    expect(B.report()).toMatchObject({ power: null, build: 'bare' });
  });

  it('keeps the sketch clock when the same cable is plugged in again', async () => {
    page = await unoPage();
    const B = page.bench;
    B.advance(1.5);
    const t = B.st.t;
    B.accept({ power: 'usb' });
    expect(B.st.t).toBeCloseTo(t, 5);
  });
});

describe('uno-r3 power tree', () => {
  it('folds back only the 3V3 regulator on a 3V3 short', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'short:3V3:GND' });
    const r = B.report();
    expect(r.rails['3V3']).toBe(0);
    expect(r.rails['5V']).toBeGreaterThan(4.5);
    expect(r.status).toBe('running');
    expect(r.why).toMatch(/LP2985/);
    expect(r.leds.ON).toBe(1);
  });

  it('trips everything on a 5V short', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'short:5V:GND' });
    const r = B.report();
    expect(Object.values(r.rails).every((v) => v === 0)).toBe(true);
    expect(r.status).toBe('no-power');
  });

  it('burns the regulator, not the chip, on a reversed VIN pin', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'vin', fault: 'reverse-polarity:vin' });
    expect(B.report()).toMatchObject({ status: 'fault', fault: { part: 'U1' } });
    B.accept({ power: 'jack', fault: 'reverse-polarity:jack' });
    const r = B.report();
    expect(r.status).toBe('no-power');
    expect(r.why).toMatch(/blocks it/);
  });

  it('refuses an upload while the 328P cannot run', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'missing:Y2' });
    B.actions.upload('hello');
    expect(B.st.up).toBe(null);
    expect(B.st.msg).toMatch(/Upload failed: .*resonator/);
  });

  it('labels its listed faults in Break it', async () => {
    page = await unoPage();
    const labels = Object.fromEntries(page.bench.faultChoices());
    expect(labels['short:5V:GND']).toBe('Short from 5V to GND');
    expect(labels['short:3V3:GND']).toBe('Short from 3V3 to GND');
  });

  it('places every SMD part and reflows in about 3 s', async () => {
    page = await unoPage();
    const B = page.bench, A = B.actions;
    B.accept({ power: null, build: 'bare' });
    A.pnp();
    expect(B.st.reflowT).toBeGreaterThan(-3.2);
    B.advance(4.5);
    expect(B.report().build).toBe('reflowed');
  });
});

describe('model hook outputs', () => {
  it('feeds stats, meas, report keys, flow and accent', async () => {
    page = await fixture('fixture-mat', MAT.replace(
      "return { readings: { motor: { volts: vm, turns: st.spin } }, status: vm > 7 ? 'motor running' : 'motor stopped' };",
      "return { readings: { motor: { volts: vm } }, status: 'ok', stats: [['Motor', vm], ['Dir', 'forward']], meas: { MOTA: { state: 'ok', i_mA: 120 } },"
        + " report: { levels: { AIN1: 1, AIN2: 0 }, faults: ['nope'] }, flow: { VM: true }, accent: ['LAMP'] };"));
    const B = page.bench;
    const r = B.report();
    expect(r.meas.MOTA).toEqual({ state: 'ok', i_mA: 120 });
    expect(r.levels).toEqual({ AIN1: 1, AIN2: 0 });
    expect(r.faults).toEqual([]);
    expect(page.notes().join(' ')).toMatch(/report key "faults" is the engine's own/);
    expect(B.st.flow).toEqual({ VM: true });
    expect(B.st.accent).toEqual(['LAMP']);
    expect(B.st.modelStats).toEqual([['Motor', 7.4], ['Dir', 'forward']]);
  });
});

const STRAPS = `
SL.bench.bench({ id: 'fixture-strap', name: 'Straps', board: 'esp32-s3-devkitc-1', view: 'board', circuits: {}, circuit: null,
  modes: { hello: { title: 'Hello', banner: 'ready', out: (st, t) => ({ GPIO38: t % 1 < .5 ? 1 : 0 }), serial: (k) => 'tick ' + k } }, mode: 'hello',
  faults: ['short:IO0:GND', 'short:DL:GND'],
  straps: [
    { fault: 'short:IO0:GND', boot: 'rom', halts: true, msg: 'IO0 low at reset: ROM boot', fix: 'Free IO0 and press RESET' },
    { fault: 'short:DL:GND', boot: 'download', blocks: ['upload', 'serial'], msg: 'DL low at reset: the bridge is gone' },
  ] });`;

describe('boot straps', () => {
  it('latch a halting strap at the restart and keep it until the next one', async () => {
    page = await fixture('fixture-strap', STRAPS);
    const B = page.bench;
    B.accept({ power: 'uart', fault: 'short:IO0:GND' });
    let r = B.report();
    expect(r).toMatchObject({ status: 'fault', boot: 'rom', fault: { id: 'short:IO0:GND', kind: 'boot', msg: 'IO0 low at reset: ROM boot' } });
    expect(r.faults).toContain('short:IO0:GND');
    expect(r.leds.D6 || 0).toBe(0);
    B.accept({ fault: null });
    expect(B.report().status).toBe('fault');
    B.accept({ press: { id: 'SW2', down: true } }); B.accept({ press: { id: 'SW2', down: false } });
    r = B.report();
    expect(r.status).toBe('running');
    expect(r.boot).toBe(null);
  });

  it('keep the sketch running but block uploads and serial', async () => {
    page = await fixture('fixture-strap', STRAPS);
    const B = page.bench;
    B.accept({ power: 'uart', fault: 'short:DL:GND' });
    const n = B.st.serial ? B.st.serial.n : 0;
    B.advance(2.2);
    const r = B.report();
    expect(r).toMatchObject({ status: 'running', boot: 'download' });
    expect(B.st.serial ? B.st.serial.n : 0).toBe(n);
    B.actions.upload('hello');
    expect(B.st.up).toBe(null);
    expect(B.st.msg).toBe('DL low at reset: the bridge is gone');
    expect(page.notes()).toEqual([]);
  });

  it('come from ?fault= at mount', async () => {
    page = await fixture('fixture-strap', STRAPS, 'fault=short:IO0:GND');
    expect(page.bench.report()).toMatchObject({ status: 'fault', boot: 'rom' });
  });
});

describe('a dead MCU rail', () => {
  it('is no power, not a brown-out', async () => {
    page = await unoPage();
    const B = page.bench;
    B.accept({ power: 'jack', fault: 'missing:U1' });
    const r = B.report();
    expect(r.rails['5V']).toBe(0);
    expect(r.status).toBe('no-power');
    expect(r.leds.ON).toBe(0);
  });
});

const TSW = 'robotics/transistor-switch';
const tswPage = (query = '') => loadFigure(buildFigure(TSW), { path: '/figures/robotics/transistor-switch.html', query });
const ids = (c) => c.parts.map((p) => p.id);
const hasWire = (c, a, b) => c.wires.some((w) => (w.from === a && w.to === b) || (w.from === b && w.to === a));

describe('circuit faults', () => {
  it('a listed fault redraws the breadboard: part left out, turned round, wire cut, part moved', async () => {
    page = await tswPage();
    const B = page.bench;
    const base = B.circuitNow();
    expect(ids(base)).toContain('D1');
    B.accept({ fault: 'no-flyback' });
    expect(ids(B.circuitNow())).not.toContain('D1');
    expect(B.report().faults).toEqual(['no-flyback']);
    B.accept({ fault: 'flyback-reversed' });
    expect(B.circuitNow().parts.find((p) => p.id === 'D1').holes).toEqual(['b16', 'b12']);
    B.accept({ fault: 'no-ground' });
    expect(hasWire(base, 'J1.4', 'T-3')).toBe(true);
    expect(hasWire(B.circuitNow(), 'J1.4', 'T-3')).toBe(false);
    B.accept({ fault: 'no-base-resistor' });
    expect(ids(B.circuitNow())).not.toContain('R1');
    expect(hasWire(B.circuitNow(), 'c7', 'c11')).toBe(true);
    B.accept({ fault: 'motor-on-pin' });
    expect(B.circuitNow().parts.find((p) => p.id === 'M1').holes).toEqual(['d7', 'T-9']);
    B.accept({ fault: null });
    expect(B.circuitNow()).toBe(base);
    expect(page.notes()).toEqual([]);
  });

  it('missing:<id> and reversed:<id> act on a circuit part the board does not have', async () => {
    page = await tswPage();
    const B = page.bench;
    B.actions.fault('missing:R2');
    expect(ids(B.circuitNow())).not.toContain('R2');
    expect(B.report().faults).toEqual(['missing:R2']);
    expect(B.st.meas.R2).toBeUndefined();
    // a part with its own `reversed` param turns round through it; the board's D1 stays a board fault
    B.actions.fault('reversed:Q1');
    expect(B.circuitNow().parts.find((p) => p.id === 'Q1').reversed).toBe(true);
    B.actions.fault('missing:D1');
    expect(ids(B.circuitNow())).toContain('D1');
    expect(B.report().missing).toContain('D1');
    B.actions.fault(null);
    expect(ids(B.circuitNow())).toEqual(ids(B.md.circuits[B.st.circuit]));
    expect(B.report().faults).toEqual([]);
  });

  it('come from ?fault= at mount', async () => {
    page = await tswPage('fault=battery-reversed');
    expect(page.bench.circuitNow().parts.find((p) => p.id === 'BT1').holes).toEqual(['T-28', 'T+26']);
    expect(page.notes()).toEqual([]);
  });
});

describe('input controls', () => {
  const mbPage = () => loadFigure(buildFigure('boards/microbit-v2'), { path: '/figures/boards/microbit-v2.html' });

  it('report the level each input net reads, and press from the host by net or by part id', async () => {
    page = await mbPage();
    const B = page.bench;
    expect(B.report().inputs).toEqual({ P5: 1, P11: 1, P201: 1 });
    B.actions.press('SW2', true);
    expect(B.report().inputs.P5).toBe(0);
    expect(B.report().controls.SW2).toBe(1);
    B.actions.press('SW2', false);
    expect(B.report().inputs.P5).toBe(1);
    expect(B.accept({ inputs: { P11: 0 } })).toBe(true);
    expect(B.report().controls.SW3).toBe(1);
    expect(B.accept({ inputs: { SW3: 0 } })).toBe(true);
    expect(B.report().inputs.P11).toBe(1);
    expect(B.accept({ inputs: { P99: 1 } })).toBe('unknown input P99');
    expect(page.notes()).toEqual([]);
  });

  it('leave the report alone on a board without them', async () => {
    page = await espPage();
    expect(page.bench.report()).not.toHaveProperty('inputs');
  });
});

describe('a cold joint on a header pin', () => {
  it('cuts what plugs into the pin, not the on-board LED on its net', async () => {
    page = await loadFigure(buildFigure('boards/nucleo-f401re'), { path: '/figures/boards/nucleo-f401re.html' });
    const B = page.bench;
    B.accept({ power: 'usb' });
    const sample = () => Array.from({ length: 40 }, (_, i) => { B.st.t = B.st.on = i * 0.11; const o = B.outputs(); return [o.leds.LD2, o.pins.D13 || 0]; });
    const clean = sample();
    expect(clean.some(([led]) => led > 0.5)).toBe(true);
    B.accept({ fault: 'cold:CN5.6' });
    const cold = sample();
    expect(cold.map(([led]) => led)).toEqual(clean.map(([led]) => led));
    expect(cold.some(([, pin], i) => pin !== clean[i][1])).toBe(true);
    expect(page.notes()).toEqual([]);
  });
});

describe('lesson props', () => {
  const unoPage = () => loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html' });
  const art = (page) => page.win.document.getElementById('art').innerHTML;

  it('stand on the mat as pressable parts, outside the circuit, and take their params', async () => {
    page = await unoPage();
    const B = page.bench;
    expect(B.accept({ view: 'breadboard', circuit: 'distance' })).toBe(true);
    expect(art(page)).toContain('data-act="part" data-id="OBST"');
    expect(B.st.meas.OBST).toBeUndefined();
    B.accept({ params: { OBST: { kind: 'ball', value: 120 } } });
    expect(B.st.cparams.OBST).toEqual({ kind: 'ball', value: 120 });
    B.accept({ params: { OBST: { kind: 'piano', value: 9999 } } });
    expect(B.st.cparams.OBST).toEqual({ kind: 'ball', value: 120 });
    B.accept({ select: 'OBST' });
    expect(B.report().selected).toBe('OBST');
    for (const circuit of ['light', 'heat', 'plant', 'force', 'parking']) {
      B.accept({ circuit });
      for (const q of B.circuitNow().props) expect(art(page)).toContain(`data-id="${q.id}"`);
    }
    expect(page.notes()).toEqual([]);
  });
});

describe('circuit params from the host', () => {
  it('a patch with nothing the part takes leaves a burnt part burnt; a real change replaces it', async () => {
    page = await loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html' });
    const B = page.bench;
    B.accept({ view: 'breadboard', circuit: 'blink', power: 'usb', params: { RES1: { ohms: 1 } } });
    B.advance(1.5);
    expect(B.st.meas.LED1.state).toBe('burnt');
    B.accept({ params: { LED1: { value: 300 }, RES1: { ohms: 220 } } });
    B.advance(1.5);
    expect(B.st.meas.LED1.state).toBe('burnt');
    B.accept({ params: { LED1: { color: 'green' } } });
    B.advance(1.5);
    expect(B.st.meas.LED1.state).toBe('ok');
  });
});

describe('the generic brown-out break', () => {
  const UNO = 'boards/uno-r3';
  const unoSrc = () => readFileSync(resolve(import.meta.dirname, '..', 'boards', 'uno-r3.js'), 'utf8');
  const unoWith = (power) => loadFigure(swapItem(buildFigure(UNO), UNO, unoSrc().replace('\n  power: {', `\n  power: { brownout: ${JSON.stringify(power)},`)), { path: '/figures/boards/uno-r3.html' });
  const labels = (B) => B.faultChoices().filter(([id]) => id === 'brownout').map(([, l]) => l);

  it('is offered with power.mcu, renamed by power.brownout, and left out with brownout: false', async () => {
    page = await loadFigure(buildFigure(UNO), { path: '/figures/boards/uno-r3.html' });
    expect(labels(page.bench)).toEqual(['Motor on the 5 V pin (brown-out)']);
    page.close();
    page = await unoWith('Sag the input');
    expect(labels(page.bench)).toEqual(['Sag the input']);
    page.close();
    page = await unoWith(false);
    const B = page.bench;
    expect(labels(B)).toEqual([]);
    B.accept({ power: 'usb', fault: 'brownout' });
    B.advance(1);
    expect(B.report().faults).toEqual([]);
    expect(B.report().status).toBe('running');
    expect(page.notes()).toEqual([]);
  });

  it("is a bench's own when it lists brownout itself (the LED trainer's supply limit), with no MCU", async () => {
    page = await loadFigure(buildFigure('robotics/led-resistor'), { path: '/figures/robotics/led-resistor.html' });
    const B = page.bench;
    expect(B.faultChoices().filter(([id]) => id === 'brownout').map(([, label]) => label)).toEqual(['Supply current limit at 10 mA']);
    B.accept({ power: 'bench', fault: 'brownout' });
    B.advance(1);
    expect(B.report().faults).toContain('brownout');
    expect(page.notes()).toEqual([]);
  });
});

describe('board power and controls (P2-fpga)', () => {
  const unoEdit = (...pairs) => loadFigure(swapItem(buildFigure('boards/uno-r3'), 'boards/uno-r3', pairs.reduce((src, [a, b]) => {
    if (!src.includes(a)) throw new Error(`uno-r3.js has no ${a}`);
    return src.replace(a, b);
  }, readFileSync(resolve(import.meta.dirname, '..', 'boards', 'uno-r3.js'), 'utf8'))), { path: '/figures/boards/uno-r3.html' });
  const USB_FEED = "{ rail: 'USBVCC', via: ['T1', 'U5'], drop: .05, offIf: ['VIN', '>', 6.6] }";

  it('onlyIf on a feed: a power switch gates the rail', async () => {
    page = await unoEdit([USB_FEED, USB_FEED.replace(' }', ", onlyIf: ['ctl:RESET', '==', 0] }")]);
    const B = page.bench;
    B.accept({ power: 'usb' }); B.advance(.5);
    expect(B.st.ev.rails['5V']).toBeGreaterThan(4.9);
    B.actions.press('RESET', true); B.advance(.1);
    expect(B.st.ev.rails['5V']).toBe(0);
    expect(B.report().status).toBe('no-power');
    B.actions.press('RESET', false); B.advance(2);
    expect(B.report().status).toBe('running');
    expect(page.notes()).toEqual([]);
  });

  it('a slide control starts at its control.start', async () => {
    const src = readFileSync(resolve(import.meta.dirname, '..', 'boards', 'basys3.js'), 'utf8');
    const from = "control: { type: 'slide', action: 'input'";
    expect(src).toContain(from);
    page = await loadFigure(swapItem(buildFigure('boards/basys3'), 'boards/basys3', src.replace(from, "control: { type: 'slide', start: 1, action: 'input'")), { path: '/figures/boards/basys3.html' });
    const slides = page.bench.md.parts.filter((p) => p.control && p.control.type === 'slide');
    expect(slides.length).toBeGreaterThan(4);
    expect(slides.every((p) => page.bench.st.ctl[p.id] === 1)).toBe(true);
    expect(page.bench.report().inputs.SW0).toBe(1);
  });

  it('a victim that fails short takes its rail and the rails it feeds down', async () => {
    page = await loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html' });
    page.bench.accept({ power: 'pin5', fault: 'wrong-voltage:pin5:9' }); page.bench.advance(.3);
    expect(page.bench.report().status).toBe('fault');
    expect(page.bench.st.ev.rails['5V']).toBeGreaterThan(8);
    page.close();
    page = await unoEdit(["{ src: 'pin5' }], max: 6 }", "{ src: 'pin5' }], max: 6, victim: { part: 'U5', fails: 'short' } }"]);
    const B = page.bench;
    B.accept({ power: 'pin5', fault: 'wrong-voltage:pin5:9' }); B.advance(.3);
    expect(B.report().status).toBe('fault');
    expect(B.st.ev.fault.part).toBe('U5');
    expect(B.st.ev.rails['5V']).toBe(0);
    expect(B.st.ev.rails['3V3']).toBe(0);
  });

  it('bootNeeds: a part only the power-up start reads; an upload runs without it until the next power cycle', async () => {
    page = await unoEdit(["needs: ['ZU4', 'SK1', 'Y2', 'RN1'] }", "needs: ['ZU4', 'SK1', 'Y2', 'RN1'], bootNeeds: ['RN2'] }"]);
    const B = page.bench;
    B.accept({ power: 'usb', fault: 'missing:RN2' }); B.advance(.5);
    expect(B.report().status).toBe('powered');
    expect(B.st.ev.why).toMatch(/nothing loads at power-up/);
    B.actions.upload('fast'); B.advance(3);
    expect(B.report().status).toBe('running');
    B.accept({ power: null }); B.accept({ power: 'usb' }); B.advance(.5);
    expect(B.report().status).toBe('powered');
  });

  it('rs on a header: a wire on its pins meets the net through the board resistor', async () => {
    page = await unoEdit(["{ id: 'IOH', kind: 'female',", "{ id: 'IOH', kind: 'female', rs: 200,"]);
    const B = page.bench;
    B.accept({ view: 'breadboard', circuit: 'blink', power: 'usb', pins: { D13: 1 } }); B.advance(.4);
    const led = B.report().meas.LED1;
    expect(led).toMatchObject({ state: 'ok', r: 420 });
    expect(led.i_mA).toBeGreaterThan(6);
    expect(led.i_mA).toBeLessThan(7.5);
    expect(page.notes()).toEqual([]);
  });

  it('many switches fold into one picker that still presses ctl-<id>; cold joints are listed once, a control and an LED first', async () => {
    page = await loadFigure(buildFigure('boards/basys3'), { path: '/figures/boards/basys3.html' });
    const B = page.bench, doc = page.win.document, btn = (id) => doc.querySelector(`#btns .act[data-id="${id}"]`);
    expect(btn('ctl-sw0')).toBeNull();
    expect(doc.querySelectorAll('#btns .act').length).toBeLessThan(16);
    btn('ctl-slide').click();
    const chip = [...doc.querySelectorAll('#btns .chip')].find((c) => c.dataset.id === 'ctl-sw0');
    const was = B.st.ctl.SW0 || 0;
    chip.click();
    expect(B.st.ctl.SW0 || 0).not.toBe(was);
    // the hidden ctl-sw0 a host or a content step presses
    const kept = doc.querySelector('#ctlkeep .act[data-id="ctl-sw0"]');
    expect(kept.closest('[hidden]')).not.toBeNull();
    kept.click();
    expect(B.st.ctl.SW0 || 0).toBe(was);
    const ids = B.faultChoices().map(([id]) => id).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
    page.close();
    page = await loadFigure(buildFigure('boards/de10-lite'), { path: '/figures/boards/de10-lite.html' });
    const cold = page.bench.faultChoices().map(([id]) => id).filter((id) => id && id.startsWith('cold:')).map((id) => page.bench.md.byId[id.slice(5)]);
    expect(cold.some((p) => p && p.control)).toBe(true);
    expect(cold.some((p) => p && p.led)).toBe(true);
  });
});

describe('uploads and fault labels (sweep)', () => {
  it('upload.also: an upload goes over a second port', async () => {
    page = await loadFigure(buildFigure('boards/esp32-s3-devkitc-1'), { path: '/figures/boards/esp32-s3-devkitc-1.html' });
    const B = page.bench, other = Object.keys(B.md.modes).find((k) => k !== B.st.mode && !B.md.modes[k].instant);
    expect(B.md.power.upload.also).toEqual(['usb']);
    B.accept({ power: 'usb' }); B.advance(2);
    B.actions.upload(other);
    expect(B.st.up).toBe(other);
    B.advance((B.st.upDur || 3) + .5);
    expect(B.st.mode).toBe(other);
    B.accept({ power: 'pin5' }); B.advance(2);
    B.actions.upload(B.st.mode === other ? Object.keys(B.md.modes)[0] : other);
    expect(B.st.up).toBeNull();
  });

  it('labels a gpio5v fault in Break it', async () => {
    page = await loadFigure(buildFigure('boards/esp32-s3-devkitc-1'), { path: '/figures/boards/esp32-s3-devkitc-1.html' });
    const label = page.bench.faultChoices().find(([id]) => id === 'gpio5v:GPIO4')[1];
    expect(label).toBe('5 V into GPIO4 (a 3.3 V pin)');
  });
});

describe('a supply that drops out restarts the program (sweep)', () => {
  const lines = (B, seconds) => {
    const out = [];
    let n = B.st.serial ? B.st.serial.n : 0;
    for (let i = 0; i < seconds * 30; i++) {
      B.advance(1 / 30);
      if (B.st.serial && B.st.serial.n !== n) { n = B.st.serial.n; out.push(B.st.serial.line); }
    }
    return out;
  };

  it('a brown-out resets the ESP32-S3: its brown-out line, the ROM banner, the sketch from the start', async () => {
    page = await loadFigure(buildFigure('robotics/esp32-s3-build'), { path: '/figures/robotics/esp32-s3-build.html' });
    const B = page.bench;
    B.accept({ power: 'uart' }); B.advance(3);
    expect(B.st.t).toBeGreaterThan(2);
    B.accept({ fault: 'brownout' });
    const seen = lines(B, 6);
    const i = seen.indexOf('Brownout detector was triggered');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(seen[i + 1]).toMatch(/^ESP-ROM/);
    expect(seen).toContain('blink #0');
    expect(page.notes()).toEqual([]);
  });

  it('a cold joint on the supply connector restarts the sketch each time it comes back', async () => {
    page = await loadFigure(buildFigure('robotics/esp32-s3-build'), { path: '/figures/robotics/esp32-s3-build.html' });
    const B = page.bench;
    B.accept({ power: 'uart', fault: 'cold:J2' });
    const seen = lines(B, 8);
    expect(seen.filter((l) => l === 'blink #0').length).toBeGreaterThan(1);
    expect(B.st.on).toBeGreaterThan(7);
  });

  it('the bench drives the RGB LED on the variant\'s data line', async () => {
    page = await loadFigure(buildFigure('robotics/esp32-s3-build'), { path: '/figures/robotics/esp32-s3-build.html', query: 'variant=v1.0' });
    const B = page.bench;
    B.accept({ power: 'uart' }); B.advance(.3);
    expect(B.md.byId.D6.led.net).toBe('GPIO48');
    expect(B.st.o.pins.GPIO48).toBeGreaterThan(0);
    expect(B.st.o.pins.GPIO38).toBeUndefined();
  });
});
