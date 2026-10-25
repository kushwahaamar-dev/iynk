// The bridge (figures/engine/embed.js) as a host drives it: a stand-in parent window, messages in, messages out.
import { afterEach, describe, expect, it } from 'vitest';
import { buildFigure, loadFigure } from './testkit.mjs';

let page;
afterEach(() => { page?.close(); page = null; });
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const last = (type) => page.sent.filter((m) => m.type === type).at(-1);
const uno = () => loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html', query: 'view=power', host: true });
const shown = (id) => {
  const b = page.win.document.querySelector(`#btns .act[data-id="${id}"]`);
  return page.win.getComputedStyle(b.closest('.stepwrap')).display !== 'none';
};

describe('chrome: the host hides the figure buttons it draws itself', () => {
  it('hides the named buttons, lists them as hidden in ready, and shows them all again', async () => {
    page = await uno();
    await tick();
    const ids = last('ready').buttons.map((b) => b.id);
    expect(ids).toEqual(expect.arrayContaining(['power', 'upload', 'break', 'view', 'strip']));
    page.post({ type: 'chrome', hide: ['power', 'break', 'view'] });
    expect(shown('power')).toBe(false);
    expect(shown('break')).toBe(false);
    expect(shown('strip')).toBe(true);
    page.post({ type: 'hello' });
    await tick();
    const listed = last('ready').buttons;
    expect(listed.map((b) => b.id)).toEqual(ids);
    expect(listed.filter((b) => b.hidden).map((b) => b.id)).toEqual(['power', 'break', 'view']);
    // See-through and Labels stay
    expect(page.win.getComputedStyle(page.win.document.getElementById('xrb')).display).not.toBe('none');
    page.post({ type: 'chrome', hide: [] });
    expect(ids.every(shown)).toBe(true);
    page.post({ type: 'hello' });
    await tick();
    expect(last('ready').buttons.some((b) => b.hidden)).toBe(false);
    expect(page.sent.filter((m) => m.type === 'error')).toEqual([]);
  });

  it('a hidden button is still pressed by id, its picker too', async () => {
    page = await uno();
    page.post({ type: 'chrome', hide: ['power', 'break'] });
    page.post({ type: 'press', id: 'power', choice: 'usb' });
    expect(page.bench.report().power).toBe('usb');
    page.post({ type: 'press', id: 'break', choice: 'repair' });
    expect(page.sent.filter((m) => m.type === 'error')).toEqual([]);
    expect(shown('power')).toBe(false);
  });

  it('refuses ids it has no button for, and anything that is not a list of ids', async () => {
    page = await uno();
    page.post({ type: 'chrome', hide: ['power', 'xr', 'nope'] });
    expect(shown('power')).toBe(false);
    expect(last('error').message).toMatch(/chrome: no button "xr", "nope"/);
    page.post({ type: 'chrome', hide: 'power' });
    expect(last('error').message).toMatch(/chrome: hide must be a list of button ids/);
    expect(shown('power')).toBe(false);
  });
});

describe('ready', () => {
  it('gives a button labelled from a template its English label filled in', async () => {
    page = await uno();
    await tick();
    const reset = last('ready').buttons.find((b) => b.id === 'ctl-reset');
    expect(reset).toMatchObject({ en: 'Press RESET', label: 'Press RESET' });
  });
});
