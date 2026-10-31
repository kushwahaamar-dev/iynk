// usage: node run.mjs <chromium|webkit> <throttle> <protos,comma> <parts> <wires> [dpr] [interactions,comma]
import { chromium, webkit } from 'playwright';
import fs from 'fs'; import os from 'os';
const [browserName, thr, protoArg, nParts, nWires, dprArg = '1', actArg] = process.argv.slice(2);
const headed = process.env.HEADED === '1';
const browser = await (browserName === 'webkit' ? webkit : chromium).launch(headed ? { headless: false, args: ['--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling'] } : {});
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const out = [];
for (const proto of protoArg.split(',')) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: +dprArg });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('http://127.0.0.1:4517/');
  const info = await page.evaluate(([p, n, w]) => window.__mount(p, n, w), [proto, +nParts, +nWires]);
  let cdp = null;
  if (browserName === 'chromium' && +thr > 1) { cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: +thr }); }
  const names = actArg ? actArg.split(',') : await page.evaluate(() => window.__names);
  for (const name of names) {
    const load = os.loadavg()[0];
    const { deltas, js } = await page.evaluate(n => window.__run(n), name);
    const row = { browser: browserName, throttle: +thr, proto, parts: +nParts, wires: +nWires, dpr: +dprArg, interaction: name, frames: deltas.length,
      p50: q(deltas, .5), p95: q(deltas, .95), max: Math.max(...deltas), jsP50: q(js, .5), jsP95: q(js, .95), over20: deltas.filter(d => d > 20).length, over33: deltas.filter(d => d > 33.4).length, p99: q(deltas, .99), headed, load1m: +load.toFixed(2), ...info };
    out.push(row);
    console.log(`${browserName} ${thr}x ${proto} ${name}: p50 ${row.p50.toFixed(1)} p95 ${row.p95.toFixed(1)} max ${row.max.toFixed(1)} jsP95 ${row.jsP95.toFixed(2)} frames ${row.frames} nodes ${info.nodes} load ${row.load1m}`);
  }
  await ctx.close();
}
await browser.close();
const f = `results/${headed ? 'headed-' : ''}${browserName}-${thr}x-${nParts}p-dpr${dprArg}-${Date.now()}.json`;
fs.writeFileSync(f, JSON.stringify(out, null, 1)); console.log('wrote', f);
