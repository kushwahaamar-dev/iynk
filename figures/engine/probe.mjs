#!/usr/bin/env node
// Figure probe: plays a robotics bench's content steps end to end against its built figure page, the way the lesson
// does. The page is built to a temp dir, served from localhost inside an iframe host, and driven only through the
// bridge (press / set / pause / resume). Every state report goes through the host's own advanceSteps, so a step
// counts exactly when the lesson would tick it.
//   node figures/engine/probe.mjs [bench-id]      (default esp32-s3-build)
// Fails on a step that never completes, a press id or choice the figure does not offer, a bridge error, a console
// error or any data-errors note on the page.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, normalize, resolve } from 'node:path';
import { createJiti } from 'jiti';
import { chromium } from 'playwright';

const ROOT = resolve(import.meta.dirname, '..', '..');
const BENCH = process.argv[2] || 'esp32-s3-build';
const jiti = createJiti(import.meta.url, { alias: { '@/': join(ROOT, 'src') + '/' } });
const { advanceSteps, emptySession, faultPresent } = await jiti.import(join(ROOT, 'src/lib/robotics/steps.ts'));
const content = await jiti.import(join(ROOT, `src/content/robotics/${BENCH}.ts`), { default: true });

const STEP_MS = 25000;
const failures = [];
const fail = (m) => { failures.push(m); console.log('  FAIL ' + m); };

// what a learner does beyond the step's own action: `after` runs once the action is sent, `fix` once a break is seen
const LEARNER = {
  'esp32-s3-build': {
    headers: { after: [{ type: 'press', id: 'place', choice: 'j3' }] },
    'break-r17': { fix: [{ type: 'set', state: { power: null } }, { type: 'press', id: 'place', choice: 'r17' }, { type: 'set', state: { power: 'uart' } }] },
    'download-mode': { after: [
      { type: 'set', state: { press: { id: 'SW1', down: true } } }, { type: 'set', state: { press: { id: 'SW2', down: true } } },
      { type: 'set', state: { press: { id: 'SW2', down: false } } }, { type: 'set', state: { press: { id: 'SW1', down: false } } }] },
  },
};
const REPAIR = { type: 'press', id: 'break', choice: 'repair' };
const fixFor = (step) => {
  const own = LEARNER[BENCH]?.[step.id]?.fix;
  if (own) return own;
  const power = step.done.power;
  return power ? [REPAIR, { type: 'set', state: { power } }] : [REPAIR];
};

// build into <tmp>/figures/robotics/<id>.html so the page sees the path it has in production
const dir = mkdtempSync(join(tmpdir(), 'cf-probe-'));
const pagePath = content.figure.page;
mkdirSync(join(dir, pagePath, '..'), { recursive: true });
execFileSync('python3', ['-I', join(ROOT, 'figures/tools/cfbuild.py'), `robotics/${BENCH}`, '--out', join(dir, pagePath)], { cwd: ROOT, stdio: 'pipe' });
writeFileSync(join(dir, 'host.html'), `<!doctype html><meta charset="utf-8"><title>probe host</title>
<iframe id="fr" src="${pagePath}?lang=en" style="width:900px;height:640px;border:0"></iframe><script>
window.msgs = [];
addEventListener('message', (e) => { if (e.source === fr.contentWindow && e.data && e.data.source === 'iynk-figure') msgs.push(e.data); });
fr.addEventListener('load', () => fr.contentWindow.postMessage({ source: 'iynk', v: 1, type: 'hello' }, location.origin));
window.cmd = (m) => fr.contentWindow.postMessage({ source: 'iynk', v: 1, ...m }, location.origin);
</script>`);
const server = createServer((req, res) => {
  const file = normalize(join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(readFileSync(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const t0 = Date.now();
try {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto(`${origin}/host.html`);
  await page.waitForFunction(() => msgs.some((m) => m.type === 'ready'), null, { timeout: 15000 });
  const frame = page.frames().find((f) => f.url().includes(pagePath));
  const ready = await page.evaluate(() => msgs.find((m) => m.type === 'ready'));

  // every press a step or fault sends must name a button and choice the figure offers
  const choices = await frame.evaluate(() => SL.bench.choices());
  const buttons = new Set(ready.buttons.map((b) => b.id));
  const learnerCmds = Object.values(LEARNER[BENCH] || {}).flatMap((l) => [...(l.after || []), ...(l.fix || [])]);
  const cmds = [...content.steps.map((s) => s.action), ...content.faults.map((f) => f.figure), ...learnerCmds, REPAIR];
  for (const a of cmds) {
    if (!a || a.type !== 'press') continue;
    if (!buttons.has(a.id)) fail(`press "${a.id}": no such button (has ${[...buttons].join(', ')})`);
    else if (a.choice != null && !(choices[a.id] || []).includes(a.choice)) fail(`press "${a.id}" choice "${a.choice}": not offered`);
  }

  let session = emptySession(content.steps), seenMsgs = 0, state = ready.state;
  const bridgeErrors = [];
  const pump = async () => {
    const all = await page.evaluate((n) => msgs.slice(n), seenMsgs);
    seenMsgs += all.length;
    for (const m of all) {
      if (m.type === 'error') bridgeErrors.push(m.message);
      if (m.type !== 'state' || !m.state) continue;
      state = m.state;
      session = advanceSteps(content.steps, content.faults, session, state).session;
    }
  };
  const send = async (c) => {
    if (c.type === 'press') await page.evaluate((m) => cmd({ type: 'press', id: m.id, choice: m.choice }), c);
    else if (c.type === 'set') await page.evaluate((m) => cmd({ type: 'set', state: m.state }), c);
    await page.waitForTimeout(60);
    await pump();
  };
  const until = async (ok, ms = STEP_MS) => {
    const end = Date.now() + ms;
    for (;;) { await pump(); if (ok()) return true; if (Date.now() > end) return false; await page.waitForTimeout(100); }
  };
  const clock = () => frame.evaluate(() => SL.bench.st.t);

  for (const step of content.steps) {
    const s0 = Date.now(), learner = LEARNER[BENCH]?.[step.id] || {};
    if (step.action) await send(step.action);
    for (const c of learner.after || []) await send(c);
    if (step.kind === 'break') {
      const fault = content.faults.find((f) => f.id === step.fault);
      if (!(await until(() => session[step.id].seen, 8000))) {
        fail(`${step.id}: fault ${step.fault} never showed (faults ${JSON.stringify(state?.faults)}, present ${fault && state ? faultPresent(fault, state) : '?'})`);
        break;
      }
      for (const c of fixFor(step)) await send(c);
    }
    if (!(await until(() => session[step.id].done))) {
      const want = Object.fromEntries(Object.keys(step.done).map((k) => [k, k.split('.').reduce((o, p) => o?.[p], state)]));
      fail(`${step.id}: not done after ${STEP_MS / 1000} s; wants ${JSON.stringify(step.done)}, has ${JSON.stringify(want)}, why ${state?.why}`);
      break;
    }
    console.log(`  ok ${step.id.padEnd(16)} ${((Date.now() - s0) / 1000).toFixed(1)} s`);

    // pause holds the figure's clock while a sketch runs; resume lets it go on
    if (step.id === 'upload-rainbow') {
      await page.evaluate(() => cmd({ type: 'pause' }));
      await page.waitForTimeout(100);
      const a = await clock();
      await page.waitForTimeout(600);
      const b = await clock();
      await page.evaluate(() => cmd({ type: 'resume' }));
      await page.waitForTimeout(600);
      const c = await clock();
      if (b !== a) fail(`pause: the clock moved ${(b - a).toFixed(3)} s while paused`);
      if (!(c > b + 0.3)) fail(`resume: the clock moved only ${(c - b).toFixed(3)} s in 0.6 s`);
      else console.log(`  ok pause/resume     held at ${a.toFixed(2)} s, then ran ${(c - b).toFixed(2)} s`);
    }
  }

  const done = content.steps.filter((s) => session[s.id].done).length;
  const notes = (await frame.evaluate(() => document.documentElement.dataset.errors || '')).split(';').map((s) => s.trim()).filter(Boolean);
  for (const e of bridgeErrors) fail('bridge error: ' + e);
  for (const e of consoleErrors) fail('console error: ' + e);
  for (const n of notes) fail('data-errors: ' + n);
  console.log(`\n${BENCH}: ${done}/${content.steps.length} steps done, ${bridgeErrors.length} bridge errors, ${consoleErrors.length} console errors, `
    + `${notes.length} data-errors, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} finally {
  await browser.close();
  server.close();
}
console.log(failures.length ? `PROBE FAIL (${failures.length})` : 'PROBE PASS');
process.exit(failures.length ? 1 : 0);
