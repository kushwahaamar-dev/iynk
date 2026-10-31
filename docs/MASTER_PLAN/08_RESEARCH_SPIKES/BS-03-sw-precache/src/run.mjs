import { chromium, webkit } from 'playwright-core';
const BASE = 'http://localhost:47311';
const engines = { chromium, webkit };
const modes = process.argv[2].split(',');
const rt = process.argv[3] === 'rt';
const which = (process.argv[4] || 'chromium,webkit').split(',');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const en of which) {
  for (const mode of modes) {
    const browser = await engines[en].launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const online = new Set();
    page.on('request', (r) => { if (r.url().startsWith(BASE)) online.add(r.url().replace(BASE, '')); });
    await page.goto(BASE + '/en/about', { waitUntil: 'load' });
    await page.evaluate(async ({ mode, rt }) => {
      const reg = await navigator.serviceWorker.register('/sw-spike.js?mode=' + mode + (rt ? '&rt=1' : ''));
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    }, { mode, rt });
    online.clear();
    await page.reload({ waitUntil: 'load' });
    await sleep(2500);
    const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    const onlineReq = [...online];
    const cacheKeys = await page.evaluate(async () => { const out = {}; for (const n of await caches.keys()) out[n] = (await (await caches.open(n)).keys()).length; return out; });
    // offline reload
    await ctx.setOffline(true);
    const failed = [], miss = [];
    page.on('requestfailed', (r) => failed.push(r.url().replace(BASE, '') + ' ' + r.failure()?.errorText));
    page.on('response', (r) => { if (r.status() >= 400) miss.push(r.status() + ' ' + r.url().replace(BASE, '')); });
    let reloadErr = null, h1 = null, gotReqs = new Set();
    page.on('request', (r) => gotReqs.add(r.url().replace(BASE, '')));
    try { await page.reload({ waitUntil: 'load', timeout: 15000 }); await sleep(2500); h1 = await page.locator('h1').first().textContent({ timeout: 3000 }); } catch (e) { reloadErr = String(e).split('\n')[0]; }
    const notInOnlineSet = [...gotReqs].filter((u) => !onlineReq.includes(u));
    // is app interactive? marker for hydration: check React hydrated via a button count is hard; check for js errors instead
    const fonts = await page.evaluate(() => [...document.fonts].map((f) => f.status)).catch(() => []);
    console.log(JSON.stringify({ fonts: fonts.reduce((o, s) => ((o[s] = (o[s] || 0) + 1), o), {}), engine: en, mode, rt, controlled, onlineReqs: onlineReq.length, cacheKeys, reloadErr, h1, failed, miss, offlineReqs: gotReqs.size, notInOnlineSet }, null, 1));
    // soft nav test
    if (!reloadErr) {
      await page.evaluate(() => { window.__marker = 'same-doc'; });
      const links = await page.evaluate(() => [...document.querySelectorAll('a[href^="/en/"]')].map((a) => a.getAttribute('href')).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12));
      const res = {};
      for (const target of ['/en/boards', '/en/together']) {
        await page.goto(BASE + '/en/about', { waitUntil: 'load' }).catch(() => {});
        await sleep(1000);
        await page.evaluate(() => { window.__marker = 'same-doc'; });
        const a = page.locator(`a[href="${target}"]`).first();
        if (!(await a.count())) { res[target] = 'no link'; continue; }
        await a.click({ force: true }).catch((e) => { res[target] = 'click error ' + e; });
        await sleep(3000);
        const marker = await page.evaluate(() => window.__marker).catch(() => 'nav-lost');
        res[target] = { url: page.url().replace(BASE, ''), softNav: marker === 'same-doc', h1: await page.locator('h1').first().textContent({ timeout: 2000 }).catch(() => null) };
      }
      console.log('NAV', en, mode, rt, JSON.stringify(res), 'links', links.join(' '));
    }
    await ctx.setOffline(false);
    await browser.close();
  }
}
