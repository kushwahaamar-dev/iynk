// Gate 3: figures in every language. For a sample of lab pages in es fr de zh hi (and en as the baseline), at a
// laptop and a phone size: wait for the figure, optionally send it a state through the bridge, then count text
// inside the figure that overflows its own box or the figure's viewport, read the figure's English-fallback
// warnings, and take a screenshot.
// Usage: node scripts/figure-langs.mjs <base url> <out dir> [--only quad5-sheet,a4988]
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, out] = process.argv.slice(2);
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(',') : null;
mkdirSync(join(out, 'shots'), { recursive: true });

const LANGS = ['en', 'es', 'fr', 'de', 'zh', 'hi'];
const PAGES = [
  { path: 'boards/uno-r3/blink' },
  { path: 'boards/basys3' },
  { path: 'boards/pi4-pi5' },
  { path: 'robotics/a4988' },
  { path: 'robotics/esp32-s3-build' },
  { path: 'robotics/pca9685' },
  { path: 'drones/quad5' },
  { path: 'drones/quad5', name: 'quad5-sheet', state: { sheet: 'wiring' } },
  { path: 'drones/octo', name: 'octo-sheet', state: { sheet: 'wiring' } },
  { path: 'drones/racer', name: 'racer-sheet', state: { sheet: 'wiring' } },
];
const SIZES = [{ name: 'laptop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }];

const inFigure = () => {
  const vw = innerWidth, problems = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.children.length || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
    const text = el.textContent.trim().slice(0, 60);
    if (el instanceof HTMLElement && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
      problems.push({ text, why: `clipped ${el.scrollWidth} > ${el.clientWidth}` });
    else if (r.right > vw + 1 || r.left < -1) problems.push({ text, why: `outside the figure (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})` });
  }
  return problems;
};

const browser = await chromium.launch();
const rows = [];
for (const size of SIZES) {
  const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
  for (const lang of LANGS) {
    for (const p of PAGES) {
      if (only && !only.some((o) => (p.name ?? p.path).includes(o))) continue;
      const page = await context.newPage();
      const notes = [];
      page.on('console', (m) => { if (/iynk i18n/.test(m.text())) notes.push(m.text().slice(0, 160)); });
      page.on('pageerror', (e) => notes.push('pageerror: ' + e.message.slice(0, 160)));
      const name = `${p.name ?? p.path.replace(/\//g, '-')}-${lang}-${size.name}`;
      try {
        await page.goto(`${base}/${lang}/${p.path}`, { waitUntil: 'networkidle', timeout: 60_000 });
        // the figure iframe loads lazily (and may remount), so look for it again until the figure is drawn
        const frame = page.locator('iframe:visible').first();
        await frame.scrollIntoViewIfNeeded();
        let fh = null, fr = null;
        for (let i = 0; i < 60 && !fr; i++) {
          fh = await frame.elementHandle();
          const f = await fh.contentFrame();
          if (f && (await f.evaluate(() => !!document.querySelector('#fig, #art')).catch(() => false))) fr = f;
          else await page.waitForTimeout(500);
        }
        if (!fr) throw new Error('the figure never drew');
        await fr.waitForFunction(() => !document.documentElement.classList.contains('cf-wait'), null, { timeout: 10_000 });
        if (p.state) {
          await page.evaluate((state) => {
            const f = [...document.querySelectorAll('iframe')].find((x) => x.offsetParent !== null);
            f.contentWindow.postMessage({ source: 'iynk', v: 1, type: 'set', state }, location.origin);
          }, p.state);
        }
        await page.waitForTimeout(1500);
        const problems = await fr.evaluate(inFigure);
        await fh.screenshot({ path: join(out, 'shots', `${name}.png`) });
        rows.push({ name, lang, size: size.name, problems, notes });
      } catch (e) {
        rows.push({ name, lang, size: size.name, problems: [], notes: [...notes, 'error: ' + e.message.split('\n')[0]] });
      }
      await page.close();
    }
  }
  await context.close();
}
await browser.close();

const lines = ['| Page | Overflowing text | Notes |', '|---|---|---|'];
for (const r of rows) {
  const over = r.problems.map((x) => `"${x.text}" (${x.why})`).join('; ');
  lines.push(`| ${r.name} | ${r.problems.length ? `${r.problems.length}: ${over}` : '0'} | ${r.notes.join('; ')} |`);
}
writeFileSync(join(out, 'lang-figs.md'), lines.join('\n') + '\n');
const bad = rows.filter((r) => r.problems.length || r.notes.length);
console.log(`lang-figs: ${rows.length} figure views, ${bad.length} with overflow or notes -> ${join(out, 'lang-figs.md')}`);
