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
