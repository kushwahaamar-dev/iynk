#!/usr/bin/env node
// Route crawl (BUILD-PLAN §6 item 5): opens every prerendered page of a production build in Chromium at 390 x 844
// and reports, per page, the HTTP status, page and console errors, a not-found body served as 200, a missing-string
// error, and sideways scroll. A 404 counts as expected only when the item has no data module or no English prose
// yet (that is `npm run content:check`'s job); any other 404 or problem fails the crawl.
//
//   NEXT_DIST_DIR=.next-gate1 npx next start -H 127.0.0.1 -p 3420 &
//   node scripts/crawl-routes.mjs --base http://127.0.0.1:3420 --dist .next-gate1 [--out docs/verify/routes.md] [--only /es/]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const BASE = arg('base', 'http://127.0.0.1:3000');
const DIST = arg('dist', '.next');
const OUT = arg('out');
const ONLY = arg('only');
const WORKERS = Number(arg('workers', 6));

const LAB_DIR = { boards: 'boards', robotics: 'robotics', drones: 'drones' };
const LOCALES = ['en', 'es', 'fr', 'de', 'zh', 'hi'];
// Pages that answer 404 on purpose: the not-found page itself.
const BY_DESIGN = [/^\/[a-z]{2}\/not-found$/];
// Problems a later phase owns, listed so they are counted, not hidden. Anything else fails the crawl.
const KNOWN = [
  [/missing figure strings src\/i18n\/figures\/\w+\.json/, 'figure strings not translated yet (BUILD-PLAN phase 3)'],
  [/^404 \/figures\/robotics\//, 'bench figure not built yet (BUILD-PLAN phase 2)'],
  [/^404 \/[a-z]{2}\/boards\/pi4-pi5\b/, 'links to the pi4-pi5 board, not built yet (BUILD-PLAN phase 2)'],
];
const knownReason = (problem) => KNOWN.find(([re]) => re.test(problem))?.[1];

const manifest = JSON.parse(readFileSync(resolve(ROOT, DIST, 'prerender-manifest.json'), 'utf8'));
const routes = Object.keys(manifest.routes)
  .filter((p) => LOCALES.some((l) => p === `/${l}` || p.startsWith(`/${l}/`)))
  .filter((p) => !ONLY || p.includes(ONLY))
  .sort();

/** Why an item page may 404 today: no data module, or no English prose. Null when it should render. */
function notBuilt(path) {
  const m = /^\/[a-z]{2}\/(boards|robotics|drones)\/([^/]+)/.exec(path);
  if (!m) return null;
  const [, lab, id] = m;
  if (!existsSync(join(ROOT, 'src/content', LAB_DIR[lab], `${id}.ts`))) return `no data module (src/content/${lab}/${id}.ts)`;
  if (!existsSync(join(ROOT, 'src/i18n/content/en', lab, `${id}.json`))) return `no English prose (src/i18n/content/en/${lab}/${id}.json)`;
  return null;
}

async function visit(context, path) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => {
    // A failed load is reported with its URL by the response listener below.
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(`console: ${m.text().split('\n')[0].slice(0, 200)}`);
  });
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (res.status() >= 400 && url.pathname !== path) errors.push(`${res.status()} ${url.origin === new URL(BASE).origin ? url.pathname : url.href}`);
  });
  let status = 0;
  const problems = [];
  try {
    const res = await page.goto(BASE + path, { waitUntil: 'load', timeout: 45000 });
    status = res?.status() ?? 0;
    // Hydration and figure start-up errors arrive just after load.
    await page.waitForTimeout(800);
    if (status === 200) {
      const html = await page.content();
      if (html.includes('NEXT_HTTP_ERROR_FALLBACK')) problems.push('not-found body served as 200');
      if (html.includes('iynk i18n:')) problems.push('missing-string error in the page');
      const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (sw > cw + 1) problems.push(`sideways scroll at 390 px (${sw} > ${cw})`);
    }
  } catch (e) {
    problems.push(`load failed: ${e.message.split('\n')[0]}`);
  }
  await page.close();
  problems.push(...[...new Set(errors)]);
  return { path, status, problems };
}

const browser = await chromium.launch();
const queue = [...routes];
const results = [];
await Promise.all(
  Array.from({ length: WORKERS }, async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    for (let path = queue.shift(); path; path = queue.shift()) results.push(await visit(context, path));
    await context.close();
  }),
);
await browser.close();
results.sort((a, b) => a.path.localeCompare(b.path));

const ok = [];
const expected = [];
const known = [];
const failed = [];
for (const r of results) {
  const why = r.status === 404 ? (BY_DESIGN.some((re) => re.test(r.path)) ? 'by design' : notBuilt(r.path)) : null;
  if (r.status === 404 && why) expected.push({ ...r, why });
  else if (r.status === 200 && r.problems.length === 0) ok.push(r);
  else if (r.status === 200 && r.problems.every(knownReason)) known.push({ ...r, why: [...new Set(r.problems.map(knownReason))].join('; ') });
  else failed.push(r);
}

const lines = [
  `Route crawl of \`${DIST}\` at ${BASE}, ${new Date().toISOString()}, Chromium 390 x 844.`,
  '',
  `${results.length} pages: ${ok.length} clean, ${known.length} with known later-phase problems only, ${expected.length} expected 404, ${failed.length} failed.`,
  '',
];
if (failed.length) {
  lines.push('## Failed', '', '| Page | HTTP | Problems |', '|---|---|---|');
  for (const r of failed) lines.push(`| \`${r.path}\` | ${r.status} | ${r.problems.join('; ').replaceAll('|', '\\|') || 'unexpected status'} |`);
  lines.push('');
}
for (const [title, list] of [['Known problems a later phase owns (200)', known], ['Expected 404s', expected]]) {
  if (!list.length) continue;
  lines.push(`## ${title}`, '', '| Reason | Pages |', '|---|---|');
  for (const [why, rs] of Map.groupBy(list, (r) => r.why)) lines.push(`| ${why} | ${rs.length} |`);
  lines.push('');
}
const report = lines.join('\n');
if (OUT) writeFileSync(resolve(ROOT, OUT), report);
console.log(report);
process.exit(failed.length ? 1 : 0);
