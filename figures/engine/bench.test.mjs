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
