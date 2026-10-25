// Engine tests load a real built figure page in jsdom: cfbuild writes it to a temp file (public/figures is untouched),
// a test may swap the page's own item script for a fixture, and the page runs with the two browser APIs jsdom lacks
// stubbed. Nothing here draws pixels: tests read the engine through SL.bench / SL.drone and its report().
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = mkdtempSync(join(tmpdir(), 'cf-engine-'));
const built = new Map();

/** The page for figures/<item>.js, built once per test run. */
export function buildFigure(item) {
  if (!built.has(item)) {
    const out = join(OUT, item.replace('/', '__') + '.html');
    execFileSync('python3', ['-I', join(ROOT, 'figures/tools/cfbuild.py'), item, '--out', out], { cwd: ROOT, stdio: 'pipe' });
    built.set(item, readFileSync(out, 'utf8'));
  }
  return built.get(item);
}

/** The same page with its item script (the last one cfbuild inlines) replaced by `src`. */
export function swapItem(html, item, src) {
  const tag = `<script>/* figures/${item}.js */\n`;
  const at = html.lastIndexOf(tag);
  if (at < 0) throw new Error(`no item script for ${item}`);
  const end = html.indexOf('\n</script>', at);
  return html.slice(0, at) + tag + src + html.slice(end);
}

/** Runs a page; resolves once the engine has mounted. `path` is the page's URL path, `query` its ?query.
 *  With `host: true` the page runs embedded: its parent is a stand-in host that records what the bridge posts
 *  (`sent`), and `post(msg)` delivers a host-to-figure message the way the bridge accepts one (source, origin). */
export async function loadFigure(html, { path = '/figures/robotics/fixture.html', query = '', host = false } = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/getContext|not implemented/i.test(e.message)) errors.push(e.message); });
  const sent = [];
  const parent = { postMessage: (m) => sent.push(m) };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    url: `http://localhost${path}${query ? '?' + query : ''}`,
    beforeParse(w) {
      w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      w.HTMLCanvasElement.prototype.getContext = () => null;
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      if (host) w.parent = parent;
    },
  });
  const win = dom.window;
  for (let i = 0; i < 100 && !(win.SL && ((win.SL.bench && win.SL.bench.st) || (win.SL.drone && win.SL.drone.report && win.SL.drone.report()))); i++) {
    await new Promise((r) => setTimeout(r, 20));
  }
  const notes = () => (win.document.documentElement.dataset.errors || '').split(';').map((s) => s.trim()).filter(Boolean);
  const post = (msg) => {
    const ev = new win.Event('message');
    Object.defineProperties(ev, { data: { value: { source: 'iynk', v: 1, ...msg } }, origin: { value: win.location.origin }, source: { value: parent } });
    win.dispatchEvent(ev);
  };
  return { win, bench: win.SL && win.SL.bench, drone: win.SL && win.SL.drone, errors, notes, sent, post, close: () => win.close() };
}
