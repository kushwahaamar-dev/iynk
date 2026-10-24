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
