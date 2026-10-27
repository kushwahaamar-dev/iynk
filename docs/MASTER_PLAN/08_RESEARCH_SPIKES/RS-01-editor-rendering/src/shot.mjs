import { chromium } from 'playwright';
const b = await chromium.launch(); 
for (const proto of ['svg-plain', 'canvas', 'react']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); await p.goto('http://127.0.0.1:4517/');
  await p.evaluate(pr => window.__mount(pr, 500, 1000), proto); await p.screenshot({ path: `unoout/shot-${proto}.png` }); await p.close();
}
await b.close();
