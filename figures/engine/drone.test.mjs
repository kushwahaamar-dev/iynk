import { afterEach, describe, expect, it } from 'vitest';
import { buildFigure, loadFigure } from './testkit.mjs';

let page;
afterEach(() => { page?.close(); page = null; });
const quad = () => loadFigure(buildFigure('drones/quad5'), { path: '/figures/drones/quad5.html' });

describe('drone craft hooks', () => {
  it('draws with the craft palette', async () => {
    page = await quad();
    const SD = page.drone;
    SD.api.render();
    expect(SD.G.pal).toBe('tomato');
    SD.api.st.pal = 'cobalt';
    SD.api.render();
    expect(SD.G.pal).toBe('cobalt');
    expect(page.notes()).toEqual([]);
  });

  it('reports passes and craft.report as one state.extra', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft(), resets = [];
    craft.report = () => ({ gpsSats: 7 });
    craft.reset = (st, why) => resets.push(why);
    expect(SD.report().extra).toEqual({ gpsSats: 7 });
    SD.api.pass('hover');
    expect(SD.report().extra).toEqual({ gpsSats: 7, hover: true });
    SD.actions.remove(SD.api.st, 'PROPS');
    expect(SD.report().extra).toEqual({ gpsSats: 7 });
    expect(resets).toEqual(['PROPS']);
    SD.api.pass('hover');
    SD.actions.strip(SD.api.st);
    expect(SD.report().extra.hover).toBeUndefined();
    expect(resets).toEqual(['PROPS', 'strip']);
  });

  it('a step that takes parts off clears the passes too; a step back to nothing is a strip', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft(), resets = [], n = craft.parts.length;
    craft.reset = (st, why) => resets.push(why);
    SD.actions.step(SD.api.st, n);
    resets.length = 0;
    SD.api.pass('hover');
    SD.actions.step(SD.api.st, n - 1);
    expect(SD.report().extra.hover).toBeUndefined();
    expect(resets).toEqual([craft.parts[n - 1].id]);
    SD.api.pass('hover');
    SD.actions.step(SD.api.st, 0);
    expect(SD.report().extra.hover).toBeUndefined();
    expect(resets.at(-1)).toBe('strip');
  });

  it('a craft rewords any engine message and log line by its key', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft(), st = SD.api.st, n = craft.parts.length;
    craft.messages = { plugNeeds: 'Solder the pigtail first', powered: 'Beep' };
    craft.logs = { plugged: 'pack in' };
    SD.actions.step(st, 0);
    SD.actions.plugIn(st);
    expect(st.msg).toBe('Solder the pigtail first');
    SD.actions.step(st, n);
    for (const pl of Object.values(st.placed)) pl.t = 1;   // the parts have landed
    SD.actions.plugIn(st);
    expect(st.msg).toBe('Beep');
    expect(st.log.lines).toContain('pack in');
  });

  it('notes a throwing craft.report once and keeps the passes', async () => {
    page = await quad();
    const SD = page.drone;
    SD.craft().report = () => { throw new Error('no gps'); };
    SD.api.pass('hover');
    expect(SD.report().extra).toEqual({ hover: true });
    SD.report();
    expect(page.notes().filter((n) => n.includes('no gps'))).toHaveLength(1);
  });
});

describe('motor and prop sizes', () => {
  it('a catalogue motor and prop may give their shaft, base and hub; without them the 5-inch sizes stay', async () => {
    page = await quad();
    const SD = page.drone, d = SD.craft().design, st = SD.api.st, art = () => page.win.document.getElementById('art').innerHTML;
    const mt = d.motors[st.design.motor], pr = d.props[st.design.prop];
    SD.api.render();
    const plain = art();
    Object.assign(mt, { shaft: [1, 3.4], base: 1.2 });
    pr.hub = [4, 2];
    SD.api.render();
    const small = art();
    expect(small).not.toBe(plain);
    delete mt.shaft; delete mt.base; delete pr.hub;
    SD.api.render();
    expect(art()).toBe(plain);
    expect(page.notes()).toEqual([]);
  });
});

describe('motor pose', () => {
  const near = (a, b) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 6));

  it('a craft banks and tilts a motor per frame through motorPose, and every motorFrame follows', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft(), mo = craft.motors[0];
    expect(SD.poseOf(mo)).toEqual({ tilt: 0, bank: 0 });
    craft.motorPose = (st, i) => (i === 0 ? { bank: 30 } : null);
    SD.api.render();
    expect(SD.poseOf(mo)).toEqual({ tilt: 0, bank: 30 });
    expect(SD.poseOf(craft.motors[1])).toEqual({ tilt: 0, bank: 0 });
    // + bank tips the top of the shaft to the left (+y)
    near(SD.motorFrame(mo, 0)(0, 0, 10), [mo.x, mo.y + 5, 10 * Math.cos(Math.PI / 6)]);
    // tilt first (90: a tractor, shaft to the nose), then bank about x leaves that shaft where it is
    craft.motorPose = (st, i) => (i === 0 ? { tilt: 90, bank: 30 } : null);
    SD.api.render();
    near(SD.motorFrame(mo, 0)(0, 0, 10), [mo.x + 10, mo.y, 0]);
    // a field that is not a number keeps the motor's own pose
    craft.motorPose = () => ({ tilt: '45', bank: null });
    SD.api.render();
    expect(SD.poseOf(mo)).toEqual({ tilt: 0, bank: 0 });
    expect(page.notes()).toEqual([]);
  });

  it('notes a throwing motorPose once and draws the listed pose', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft();
    craft.motorPose = () => { throw new Error('boom'); };
    SD.api.render();
    SD.api.render();
    expect(SD.poseOf(craft.motors[0])).toEqual({ tilt: 0, bank: 0 });
    expect(page.notes().filter((n) => n.includes('motorPose'))).toHaveLength(1);
  });

  it('craft.animating keeps the figure running, and settle waits for it', async () => {
    page = await quad();
    const SD = page.drone, craft = SD.craft(), st = SD.api.st, until = st.t + 0.25;
    craft.animating = (s) => s.t < until;
    SD.kick();
    await SD.settle();
    expect(st.t).toBeGreaterThanOrEqual(until);
    await expect(SD.settle()).resolves.toBeUndefined();
  });
});

describe('the wiring sheet fits its plate (DR U6)', () => {
  // a 633 x 475 laptop plate: the figure's button column, its switches, its stats panel and the zoom chip
  const column = Array.from({ length: 10 }, (_, i) => [12, 10 + 38 * i, i === 8 ? 222 : 160, 40 + 38 * i]);
  const top = [[422, 10, 621, 40], [520, 44, 621, 203], [533, 441, 631, 469]];
  const clear = (b, boxes) => boxes.every(([x0, y0, x1, y1]) => b.x + b.w <= x0 || x1 <= b.x || b.y + b.h <= y0 || y1 <= b.y);

  it('takes the whole frame when nothing sits over it, centred', async () => {
    page = await quad();
    const b = page.drone.sheetFit(633, 475, []);
    expect(b.w).toBeGreaterThan(633 * .95);
    expect(b.w / b.h).toBeCloseTo(2, 1);
    expect(b.x).toBeCloseTo((633 - b.w) / 2, 0);
    expect(b.y).toBeCloseTo((475 - b.h) / 2, 0);
  });

  it('keeps clear of the controls and still fills most of the plate', async () => {
    page = await quad();
    const SD = page.drone;
    const all = SD.sheetFit(633, 475, [...column, ...top]);
    expect(clear(all, [...column, ...top])).toBe(true);
    expect(all.w).toBeGreaterThan(633 * .6);
    // the host draws the buttons itself (chrome): only the switches, the stats and the zoom chip are left
    const bare = SD.sheetFit(633, 475, top);
    expect(clear(bare, top)).toBe(true);
    expect(bare.w).toBeGreaterThan(633 * .8);
  });

  it('draws the sheet into that box', async () => {
    page = await loadFigure(buildFigure('drones/quad5'), { path: '/figures/drones/quad5.html', query: 'sheet=wiring' });
    const doc = page.win.document, vb = doc.getElementById('fig').viewBox.baseVal;
    const want = page.drone.sheetFit(vb.width, vb.height, []);
    const r = doc.querySelector('#art rect');
    expect(+r.getAttribute('width')).toBeCloseTo(want.w, 0);
    expect(+r.getAttribute('x')).toBeCloseTo(want.x, 0);
    expect(page.notes()).toEqual([]);
  });
});

describe('Build it for me says what it did (DR U10)', () => {
  it('puts the parts on and marks the checks passed, and never claims the tests ran', async () => {
    page = await quad();
    const SD = page.drone, st = SD.api.st, n = SD.craft().parts.length;
    SD.actions.step(st, n - 1);
    await SD.settle();
    SD.actions.build(st);
    await SD.settle();
    const r = SD.report();
    expect(r.built).toBe(true);
    expect(r.test).toBeNull();
    expect(st.msg).toMatch(/^Built: /);
    expect(st.msg).toMatch(/not run/);
    expect(st.msg).not.toMatch(/smoke test|motor check|calibration done/);
    expect(st.log.lines.at(-1)).not.toMatch(/calibration done/);
  });
});

describe('accessibility (DR audit: axe nested-interactive)', () => {
  it('no pressable part sits inside an element whose children are presentational, after build, sheet and exploded', async () => {
    const { readFileSync } = await import('node:fs');
    const { createRequire } = await import('node:module');
    const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
    page = await quad();
    const SD = page.drone, st = SD.api.st, win = page.win;
    const nested = async () => {
      if (!win.axe) win.eval(axeSrc);
      const r = await win.axe.run(win.document, { runOnly: ['nested-interactive'] });
      return r.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
    };
    expect(await nested()).toEqual([]);
    SD.actions.build(st);
    await SD.settle();
    st.sheet = 'wiring'; SD.api.render();
    expect(await nested()).toEqual([]);
    st.sheet = null; SD.actions.explode(st, true);
    await SD.settle();
    expect(await nested()).toEqual([]);
  });
});

describe('advanceUntil steps simulated time', () => {
  const frozen = () => loadFigure(buildFigure('drones/octo'), { path: '/figures/drones/octo.html', frozenClock: true });
  const gear = async () => {
    page = await frozen();
    const SD = page.drone, st = SD.api.st;
    SD.actions.build(st);
    SD.advanceUntil(() => !st.test && !st.queue.length, 120);
    SD.actions.plugIn(st);
    SD.advanceUntil(() => !st.test && !st.queue.length, 120);
    SD.craft().buttons.find((b) => b.id === 'gear').onClick(SD.api);
    return { SD, st };
  };

  it('returns true and leaves no test running once the test is done', async () => {
    const { SD, st } = await gear();
    expect(SD.advanceUntil(() => !st.test, 120)).toBe(true);
    expect(st.test).toBeNull();
  });

  it('returns false without throwing when the time runs out first', async () => {
    const { SD, st } = await gear();
    expect(SD.advanceUntil(() => !st.test, 0.1)).toBe(false);
  });

  it('gives the same report for the same scenario', async () => {
    const first = await gear();
    first.SD.advanceUntil(() => !first.st.test, 120);
    const a = JSON.stringify(first.SD.report());
    page.close();
    const second = await gear();
    second.SD.advanceUntil(() => !second.st.test, 120);
    expect(JSON.stringify(second.SD.report())).toBe(a);
  });

  it('does not move time with a frozen clock while real time passes', async () => {
    page = await frozen();
    const st = page.drone.api.st, t = st.t;
    page.drone.actions.build(st);
    await new Promise((r) => setTimeout(r, 100));
    expect(st.t).toBe(t);
  });
});
