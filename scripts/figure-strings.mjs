// Collects every English string the built figures translate with CF_T, so phase 3 can translate them all
// (src/i18n/figures/<lang>.json) and src/i18n/figure-strings.test.ts can check nothing is missing.
//
//   node scripts/figure-strings.mjs            writes src/i18n/figure-keys.json
//   node scripts/figure-strings.mjs --check    exits 1 when the built figures show a string that file lacks
//
// Two passes. In a browser, each page gets a dictionary that records every key CF_T looks up (core.js checks it
// with hasOwnProperty, so a Proxy sees each one and the figure keeps its English), then every control is pressed:
// see-through, labels, views, each button and each choice of each picker, twice over so later states show too.
// In the sources, every literal passed to CF_T, CF_L or the engines' T() is added, for states no press reaches.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/i18n/figure-keys.json');
const KINDS = ['boards', 'robotics', 'modules', 'parts', 'drones'];
const check = process.argv.includes('--check');
const { chromium } = createRequire(join(ROOT, 'package.json'))('playwright');

const pages = KINDS.flatMap((kind) =>
  readdirSync(join(ROOT, 'public/figures', kind))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `${kind}/${f.slice(0, -5)}`),
);

// A key is something a translator can translate: it has letters, and it is not a number with a unit that a figure
// formats at run time ("7.4 V", "378 mA"), which CF_T passes through unchanged in every language.
const translatable = (s) => /\p{L}{2}/u.test(s) && !/^[\d.,\s·:/+-]*\d[\d.,\s]*(mA|A|V|W|Ω|kΩ|°C|rpm|Hz|kHz|%|s|ms|g|mm|cm|m)?$/u.test(s);

// A filled-in template ("Blink — already set" from "{label} — already set") is built from strings translated on their
// own, and the toast passes it through CF_T again, so it is not a key of its own. A template with almost no fixed
// text ("{id} · {n} mA") would swallow real keys, so it doesn't count.
function withoutFilledTemplates(keys) {
  const hole = /\{\w+\}/;
  const fixed = (t) => t.replace(/\{\w+\}/g, '').replace(/^[\s·:—\-,.()]+|[\s·:—\-,.()]+$/g, '').length;
  const templates = keys
    .filter((k) => hole.test(k) && fixed(k) >= 4)
    .map((t) => new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '(.+?)') + '$', 's'));
  return keys.filter((k) => hole.test(k) || !templates.some((r) => r.test(k)));
}

async function collect(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${join(ROOT, 'public/figures', id)}.html?embed=0`);
  await page.waitForFunction(() => typeof CF_SETLOCALE === 'function' && typeof CF_UI !== 'undefined' && CF_UI !== null, null, { timeout: 20_000 });
  await page.evaluate(() => {
    window.__cfKeys = new Set();
    const keys = window.__cfKeys;
    CF_SETLOCALE('en', new Proxy({}, { getOwnPropertyDescriptor: (_, k) => void (typeof k === 'string' && keys.add(k)) }));
  });
  const press = async (selector) => {
    for (const el of await page.$$(selector)) {
      if (await el.isVisible()) await el.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(60);
    }
  };
  for (let round = 0; round < 2; round++) {
    await press('#xrb, #lblb');
    await press('.vset button');
    const buttons = await page.$$('#btns .act');
    for (let i = 0; i < buttons.length; i++) {
      const act = (await page.$$('#btns .act'))[i];
      if (!act) continue;
      await act.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(80);
      const n = (await page.$$('#btns .stepwrap.open .chip')).length;
      for (let c = 0; c < n; c++) {
        // A choice closes its picker, so reopen it for each one.
        if (c > 0) await (await page.$$('#btns .act'))[i]?.click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(60);
        const chip = (await page.$$('#btns .stepwrap.open .chip'))[c];
        if (chip) await chip.click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(120);
      }
    }
  }
  const keys = await page.evaluate(() => [...window.__cfKeys]);
  await page.close();
  return { keys, errors };
}

function fromSources() {
  const found = new Map();
  const dirs = ['figures/engine', 'figures/vendor/colorfigures', ...KINDS.map((k) => `figures/${k}`)];
  const call = /\b(?:CF_T|CF_L|T)\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/g;
  for (const dir of dirs) {
    for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js'))) {
      const src = readFileSync(join(ROOT, dir, f), 'utf8');
      for (const m of src.matchAll(call)) {
        if (m[1] === '`' && m[2].includes('${')) continue;
        const s = m[2].replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
        if (!found.has(s)) found.set(s, new Set());
        found.get(s).add(`${dir}/${f}`);
      }
    }
  }
  return found;
}

const browser = await chromium.launch();
const where = new Map();
const add = (key, from) => {
  if (!translatable(key)) return;
  if (!where.has(key)) where.set(key, new Set());
  where.get(key).add(from);
};
const failures = [];
const queue = [...pages];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let id = queue.shift(); id; id = queue.shift()) {
    try {
      const { keys, errors } = await collect(browser, id);
      keys.forEach((k) => add(k, id));
      if (errors.length) failures.push(`${id}: page errors: ${errors.slice(0, 3).join(' | ')}`);
      process.stderr.write(`${id}: ${keys.length}\n`);
    } catch (e) {
      failures.push(`${id}: ${e.message.split('\n')[0]}`);
    }
  }
}));
await browser.close();
for (const [key, files] of fromSources()) for (const f of files) add(key, f);

const kept = new Set(withoutFilledTemplates([...where.keys()]));
const sorted = Object.fromEntries(
  [...where].filter(([k]) => kept.has(k)).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => [k, [...v].sort()]),
);
for (const f of failures) console.error(f);
if (check) {
  const known = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const missing = Object.keys(sorted).filter((k) => !(k in known));
  for (const k of missing.slice(0, 40)) console.error(`not in src/i18n/figure-keys.json: ${JSON.stringify(k)} (${sorted[k].join(', ')})`);
  console.log(`figure strings: ${Object.keys(sorted).length} found, ${missing.length} missing from figure-keys.json`);
  process.exit(missing.length || failures.length ? 1 : 0);
}
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`figure strings: ${Object.keys(sorted).length} keys from ${pages.length} pages and the figure sources -> src/i18n/figure-keys.json`);
process.exit(failures.length ? 1 : 0);
