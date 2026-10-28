// Compares a running local build with the baselines in budgets.json.
//
//   node scripts/perf-budget.mjs <baseUrl> [--record] [--runs 3] [--file budgets.json]
//
// <baseUrl> may also come from PERF_BASE_URL. The tool builds nothing and starts no server.
// Metrics: script bytes transferred on the landing page and on a lesson, main thread busy time while the landing
// page, a lesson and a bench sit idle, and the time from Run to the first serial line on Blink at 4x CPU.
// Each metric is the median of --runs runs. A metric fails when it grows more than 10 percent over its baseline.
// --record writes the measured numbers as the new baselines and keeps the proposed budgets already in the file.
// Exit 0: within tolerance (or recorded, or timings skipped on a busy machine). 1: a metric regressed.
// 2: bad arguments, or budgets.json is missing or unreadable.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { pathToFileURL } from 'node:url';
import { idlePercent } from './perf-idle.mjs';
import { sumScripts } from './perf-prefetch.mjs';

const TOLERANCE = 0.1;
const SETTLE_MS = 3000;
const IDLE_SETTLE_MS = 2000;
const IDLE_WINDOW_MS = 5000;
const SLOW_CPU = 4;
const LANDING = '/en';
const LESSON = '/en/boards/uno-r3/blink';
const BENCH = '/en/robotics/uno-r3-build';

const PROPOSED = {
  'landing.js.gzipTransferred': 400 * 1024,
  'lesson.js.gzipTransferred': 400 * 1024,
  'idle.landing.mainThreadPct': 5,
  'idle.lesson.mainThreadPct': 5,
  'idle.bench.mainThreadPct': 5,
  'run.blink.startMs.cpu4x': 4000,
};

const UNITS = {
  'landing.js.gzipTransferred': 'bytes',
  'lesson.js.gzipTransferred': 'bytes',
  'idle.landing.mainThreadPct': 'percent',
  'idle.lesson.mainThreadPct': 'percent',
  'idle.bench.mainThreadPct': 'percent',
  'run.blink.startMs.cpu4x': 'ms',
};

const TIMING = new Set(Object.keys(UNITS).filter((name) => UNITS[name] !== 'bytes'));

/**
 * @typedef {{ baseline: number, unit: string, proposedBudget: number | null, enforced: boolean }} Metric
 * @typedef {{ schema: number, recordedAt: string, node: string, machine: { cpus: number, load1: number }, metrics: Record<string, Metric> }} Budgets
 * @typedef {Record<string, number>} Measured
 * @typedef {{ metric: string, status: 'ok' | 'regressed' | 'missing' | 'new', baseline?: number, current?: number }} Finding
 */

/**
 * One finding per metric in the baselines, then one per measured metric that has no baseline.
 * A metric that was not measured is reported but does not fail: the timing metrics are skipped on a busy machine.
 * @param {Budgets} baseline
 * @param {Measured} current
 * @returns {Finding[]}
 */
export function compare(baseline, current, tolerance = TOLERANCE) {
  const findings = [];
  for (const [metric, { baseline: base }] of Object.entries(baseline.metrics)) {
    const value = current[metric];
    if (value === undefined) findings.push({ metric, status: 'missing', baseline: base });
    else findings.push({ metric, status: value > base * (1 + tolerance) ? 'regressed' : 'ok', baseline: base, current: value });
  }
  for (const [metric, value] of Object.entries(current)) {
    if (!(metric in baseline.metrics)) findings.push({ metric, status: 'new', current: value });
  }
  return findings;
}

const show = (value) => (value === undefined ? '-' : String(Math.round(value * 10) / 10));

/** @param {Finding[]} findings */
export function summarise(findings) {
  const width = Math.max(6, ...findings.map((f) => f.metric.length));
  const lines = [`${'metric'.padEnd(width)}  ${'baseline'.padStart(10)}  ${'current'.padStart(10)}  result`];
  for (const f of findings) {
    lines.push(`${f.metric.padEnd(width)}  ${show(f.baseline).padStart(10)}  ${show(f.current).padStart(10)}  ${f.status}`);
  }
  return { ok: findings.every((f) => f.status !== 'regressed'), lines };
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function scriptBytes(browser, url) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const requests = new Map();
    cdp.on('Network.requestWillBeSent', (e) => requests.set(e.requestId, { type: e.type, encodedDataLength: 0 }));
    cdp.on('Network.responseReceived', (e) => {
      const r = requests.get(e.requestId);
      if (r) r.fromCache = Boolean(e.response.fromDiskCache || e.response.fromServiceWorker);
    });
    cdp.on('Network.loadingFinished', (e) => {
      const r = requests.get(e.requestId);
      if (r) r.encodedDataLength = e.encodedDataLength;
    });
    cdp.on('Network.loadingFailed', (e) => {
      const r = requests.get(e.requestId);
      if (r) r.failed = true;
    });
    const response = await page.goto(url, { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
    await page.waitForTimeout(SETTLE_MS);
    return sumScripts([...requests.values()]).bytes;
  } finally {
    await context.close();
  }
}

async function idleBusy(browser, url) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const response = await page.goto(url, { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
    await page.waitForTimeout(IDLE_SETTLE_MS);
    const first = await cdp.send('Performance.getMetrics');
    await page.waitForTimeout(IDLE_WINDOW_MS);
    return idlePercent(first, await cdp.send('Performance.getMetrics'));
  } finally {
    await context.close();
  }
}

async function runStartMs(browser, url) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const response = await page.goto(url, { waitUntil: 'load' });
    if (!response?.ok()) throw new Error(`${url} answered ${response?.status()}`);
    await page.locator('main .cm-content').waitFor({ timeout: 30_000 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW_CPU });
    const started = Date.now();
    await page.getByTestId('run-button').click();
    await page.locator('[data-testid="serial-lines"] > div').first().waitFor({ timeout: 60_000 });
    return Date.now() - started;
  } finally {
    await context.close();
  }
}

async function measureAll(baseUrl, runs, includeTimings) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const at = (route) => new URL(route, baseUrl).href;
  const medianOf = async (measure) => {
    const values = [];
    for (let i = 0; i < runs; i++) values.push(await measure());
    return median(values);
  };
  try {
    const measured = {
      'landing.js.gzipTransferred': await medianOf(() => scriptBytes(browser, at(LANDING))),
      'lesson.js.gzipTransferred': await medianOf(() => scriptBytes(browser, at(LESSON))),
    };
    if (includeTimings) {
      measured['idle.landing.mainThreadPct'] = await medianOf(() => idleBusy(browser, at(LANDING)));
      measured['idle.lesson.mainThreadPct'] = await medianOf(() => idleBusy(browser, at(LESSON)));
      measured['idle.bench.mainThreadPct'] = await medianOf(() => idleBusy(browser, at(BENCH)));
      measured['run.blink.startMs.cpu4x'] = await medianOf(() => runStartMs(browser, at(LESSON)));
    }
    return measured;
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const opts = { baseUrl: process.env.PERF_BASE_URL, record: false, runs: 3, file: 'budgets.json' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--record') opts.record = true;
    else if (argv[i] === '--runs') opts.runs = Number(argv[++i]);
    else if (argv[i] === '--file') opts.file = argv[++i];
    else opts.baseUrl = argv[i];
  }
  return opts.baseUrl && Number.isInteger(opts.runs) && opts.runs > 0 && opts.file ? opts : undefined;
}

function recorded(measured, previous, load1) {
  const metrics = {};
  for (const [name, baseline] of Object.entries(measured)) {
    const prior = previous?.metrics[name];
    metrics[name] = {
      baseline: Math.round(baseline * 10) / 10,
      unit: UNITS[name],
      proposedBudget: prior ? prior.proposedBudget : PROPOSED[name],
      enforced: prior?.enforced ?? false,
    };
  }
  return {
    schema: 1,
    recordedAt: new Date().toISOString(),
    node: process.version,
    machine: { cpus: cpus().length, load1 },
    metrics,
  };
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) {
    console.error('usage: node scripts/perf-budget.mjs <baseUrl> [--record] [--runs 3] [--file budgets.json]');
    return 2;
  }
  let previous;
  if (existsSync(opts.file)) {
    try {
      previous = JSON.parse(readFileSync(opts.file, 'utf8'));
    } catch (error) {
      console.error(`perf-budget: cannot read ${opts.file}: ${error.message}`);
      return 2;
    }
  } else if (!opts.record) {
    console.error(`perf-budget: ${opts.file} not found. Record the baselines first: node scripts/perf-budget.mjs <baseUrl> --record`);
    return 2;
  }

  const load1 = Math.round(loadavg()[0] * 100) / 100;
  const noisy = load1 > cpus().length;
  if (noisy) console.log(`noisy: load ${load1} is above ${cpus().length} CPUs, result not trusted`);
  const measured = await measureAll(opts.baseUrl, opts.runs, opts.record || !noisy);

  if (opts.record) {
    writeFileSync(opts.file, `${JSON.stringify(recorded(measured, previous, load1), null, 2)}\n`);
    console.log(`recorded ${Object.keys(measured).length} baselines in ${opts.file}`);
    return 0;
  }
  const { ok, lines } = summarise(compare(previous, measured));
  console.log(lines.join('\n'));
  if (noisy) console.log(`skipped on a busy machine: ${[...TIMING].join(', ')}`);
  return ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
