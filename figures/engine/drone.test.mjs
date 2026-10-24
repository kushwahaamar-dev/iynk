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
