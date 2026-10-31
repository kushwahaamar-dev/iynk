// Simulated speed of avr8js in a Web Worker and on the main thread, in Playwright Chromium (and WebKit) with CPU throttling.
// A tiny static server on port 43555 serves web/ and out/. Usage: node bench-browser.mjs [chromium|webkit]
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { chromium, webkit } from 'playwright';
const ROOT = process.env.RS03_DIR ?? process.cwd();
const type = process.argv[2] ?? 'chromium';
const SIM_S = Number(process.env.SIM_S ?? 10);
const mime = { '.js': 'text/javascript', '.html': 'text/html', '.hex': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = p.startsWith('/out/') ? `${ROOT}${p}` : `${ROOT}/web${p === '/' ? '/index.html' : p}`;
  if (!existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[f.slice(f.lastIndexOf('.'))] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(43555, '127.0.0.1', r));
const load = () => execSync('uptime').toString().match(/load averages?: ([\d.]+)/)[1];
const launchOpts = process.env.WEBKIT_EXE && type === 'webkit' ? { executablePath: process.env.WEBKIT_EXE } : {};
const browser = await (type === 'webkit' ? webkit : chromium).launch(launchOpts);
console.log(type, browser.version());
const results = [];
for (const rate of type === 'chromium' ? [1, 4, 6] : [1]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let cdp = null;
  if (type === 'chromium') {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  }
  await page.goto('http://127.0.0.1:43555/');
  for (const id of ['blink', 'motor', 'knob']) {
    for (const where of ['worker', 'main']) {
      const l = load();
      const r = await page.evaluate(async ({ id, where, SIM_S }) => {
        const hex = await (await fetch(`/out/${id}/${id}.ino.hex`)).text();
        const adc = [{ ms: 0, value: 620 }];
        if (where === 'worker') {
          const w = new Worker('/worker.js', { type: 'module' });
          const out = await new Promise((res, rej) => { w.onmessage = (e) => res(e.data); w.onerror = (e) => rej(e.message); w.postMessage({ hex, simSeconds: SIM_S, adc, listeners: true }); });
          w.terminate();
          return out;
        }
        const { createUno } = await import('/avr-core.bundle.js');
        const sim = createUno(hex, { adcScript: adc, pinEvents: true });
        const t0 = performance.now();
        for (let ms = 100; ms <= SIM_S * 1000; ms += 100) sim.runTo(ms);
        const wall = performance.now() - t0;
        return { wallMs: wall, simPerWall: SIM_S / (wall / 1000), events: sim.pinEvents.length, lines: sim.lines.length };
      }, { id, where, SIM_S });
      results.push({ browser: type, throttle: rate, sketch: id, where, simPerWall: +r.simPerWall.toFixed(2), wallMs: Math.round(r.wallMs), load1m: l });
    }
  }
  await ctx.close();
}
await browser.close();
server.close();
console.table(results);
console.log('JSON', JSON.stringify(results));
