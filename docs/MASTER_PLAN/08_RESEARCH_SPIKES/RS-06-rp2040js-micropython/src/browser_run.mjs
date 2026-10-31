import http from 'http'; import fs from 'fs'; import path from 'path'; import os from 'os';
import { chromium, webkit } from 'playwright';
const root = path.resolve('www');
const srv = http.createServer((q, r) => { const f = path.join(root, q.url === '/' ? 'index.html' : q.url); if (!fs.existsSync(f)) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); r.end(fs.readFileSync(f)); });
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${srv.address().port}/`;
const rows = [];
for (const [bname, B] of [['chromium', chromium], ['webkit', webkit]]) {
  let br; try { br = await B.launch(); } catch (e) { rows.push({ browser: bname, error: e.message.split('\n')[0] }); continue; }
  for (const rate of (bname === 'chromium' ? [1, 4, 6] : [1])) {
    const ctx = await br.newContext(); const page = await ctx.newPage();
    await page.goto(url);
    if (rate > 1) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate }); }
    const load = os.loadavg()[0];
    const r = await page.evaluate(([u, ms]) => window.runSpike(u, ms), [url + 'fw.uf2', rate === 1 ? 1500 : 400]);
    rows.push({ browser: bname + ' ' + br.version(), throttle: rate, load: +load.toFixed(1), bootWallMs: +r.boot.wallMs.toFixed(0), bootSimMs: +r.boot.simMs.toFixed(1), idleSpeedX: +(r.idle.simMs / r.idle.wallMs).toFixed(2), blinkSpeedX: +(r.blink.simMs / r.blink.wallMs).toFixed(2), blinkToggles: r.blink.toggles });
    await ctx.close();
  }
  await br.close();
}
srv.close();
console.log(JSON.stringify(rows, null, 1));
