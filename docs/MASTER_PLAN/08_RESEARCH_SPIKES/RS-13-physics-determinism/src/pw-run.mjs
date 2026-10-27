// usage: node pw-run.mjs <chromium|webkit> <throttle> <reps>   (root = spike scratch dir)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
const [name = 'chromium', throttle = '1', reps = '3'] = process.argv.slice(2);
const root = path.resolve(process.env.SPIKE_ROOT ?? process.cwd());
const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] ?? 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(43811, '127.0.0.1', r));
const browser = await (name === 'webkit' ? webkit : chromium).launch();
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', (m) => console.error('[console]', m.text()));
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  if (name === 'chromium' && Number(throttle) > 1) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
  }
  await page.goto('http://127.0.0.1:43811/src/page.html');
  await page.waitForFunction('window.ready === true', null, { timeout: 30000 });
  const out = await page.evaluate((n) => window.runAll(n), Number(reps));
  out.browser = name + ' ' + browser.version();
  out.throttle = Number(throttle);
  console.log(JSON.stringify(out));
} finally {
  await browser.close();
  server.close();
}
