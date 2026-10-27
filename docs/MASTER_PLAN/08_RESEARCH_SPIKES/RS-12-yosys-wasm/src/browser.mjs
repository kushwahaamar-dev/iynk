// load the page in Chromium (or WebKit), run a design, measure load+compile+run, renderer RSS; optional CPU throttle and bandwidth cap
import { chromium, webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'node:os';
const [engine = 'chromium', cpu = '1', mbps = '0', lesson = 'basys3-display'] = process.argv.slice(2);
const src = readFileSync(`fixtures/${lesson}.v`, 'utf8');
const psAll = () => execSync('ps -axo pid=,ppid=,rss=,command=').toString().trim().split('\n').map(l => { const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/); return m && { pid: +m[1], ppid: +m[2], rssMB: Math.round(+m[3] / 1024), cmd: m[4] }; }).filter(Boolean);
const before = new Set(psAll().map(r => r.pid));
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
let cdp = null;
if (engine === 'chromium') {
  cdp = await ctx.newCDPSession(page);
  if (+cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu });
  if (+mbps > 0) { await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 20, downloadThroughput: +mbps * 125000, uploadThroughput: 1e6 }); }
}
const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
let bytes = 0; page.on('response', async (r) => { try { const l = r.headers()['content-length']; bytes += +l || 0; } catch {} });
const load0 = Date.now();
await page.goto('http://127.0.0.1:8765/');
await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
const pageReadyMs = Date.now() - load0;
const t1 = Date.now();
const first = await page.evaluate((s) => window.runYosysTimed(s), src); // first run = fetch + compile wasm + elaborate
const firstRunWall = Date.now() - t1;
const second = await page.evaluate((s) => window.runYosysTimed(s), src);
const totalToFirstResultMs = Date.now() - load0;
let mem = null;
try { mem = await page.evaluate(() => performance.memory ? { jsHeapUsedMB: Math.round(performance.memory.usedJSHeapSize / 1048576), jsHeapTotalMB: Math.round(performance.memory.totalJSHeapSize / 1048576) } : null); } catch {}
// descendants of this browser's own process only (other spike lanes may run browsers too)
let rssMB = null;
try {
  const rows = psAll();
  // roots: new processes whose parent is not new (this script's browser launch); descendants follow
  const mine = new Set(rows.filter(r => !before.has(r.pid) && r.ppid === process.pid).map(r => r.pid)); let grew = true;
  while (grew) { grew = false; for (const r of rows) if (!mine.has(r.pid) && mine.has(r.ppid)) { mine.add(r.pid); grew = true; } }
  const my = rows.filter(r => mine.has(r.pid));
  const rend = my.filter(r => /--type=renderer|WebContent|Web Content/i.test(r.cmd));
  rssMB = { rendererMax: Math.max(0, ...rend.map(r => r.rssMB)), allMySum: my.reduce((a, r) => a + r.rssMB, 0), nProcs: my.length };
} catch (e) { rssMB = String(e); }
console.log(JSON.stringify({ engine, version: browser.version(), cpuThrottle: +cpu, mbps: +mbps, lesson, pageReadyMs, firstRun: first, firstRunWall, secondRunMs: second.ms, totalToFirstResultMs, mem, rss: rssMB, errs: errs.slice(0, 3), load: os.loadavg()[0].toFixed(2) }));
await browser.close();
