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
