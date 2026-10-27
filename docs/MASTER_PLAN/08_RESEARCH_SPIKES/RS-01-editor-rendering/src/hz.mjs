import { chromium } from 'playwright';
const b = await chromium.launch({ headless: false, args: ['--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'] }); const p = await b.newPage();
await p.goto('http://127.0.0.1:4517/'); 
console.log(b.version(), await p.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c.getExtension('WEBGL_debug_renderer_info'); return c.getParameter(e.UNMASKED_RENDERER_WEBGL); }));
console.log(await p.evaluate(() => new Promise(r => { const d = []; let l; const f = t => { if (l) d.push(t - l); l = t; d.length < 120 ? requestAnimationFrame(f) : r(d.slice(10).reduce((a, b) => a + b) / (d.length - 10)); }; requestAnimationFrame(f); })));
await b.close();
