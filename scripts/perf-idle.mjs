// Measures how busy the main thread is while a page sits idle, in percent of one core.
//
//   node scripts/perf-idle.mjs <baseUrl> --route <path> [--route <path> ...] [--cpu 1|4] [--seconds 5]
//
// Prints one line per route: idle <route> cpu=<n> mainThreadPct=<x>
// Needs Playwright Chromium and a server that already listens on <baseUrl>.
import { pathToFileURL } from 'node:url';

const SETTLE_MS = 2000;

const metric = (sample, name) => sample.metrics.find((m) => m.name === name)?.value;

// a and b are CDP Performance.getMetrics results taken in that order: { metrics: [{ name, value }] }
export function idlePercent(a, b) {
  const busy = metric(b, 'TaskDuration') - metric(a, 'TaskDuration');
  const wall = metric(b, 'Timestamp') - metric(a, 'Timestamp');
  if (!Number.isFinite(busy) || !Number.isFinite(wall)) throw new Error('samples lack TaskDuration or Timestamp');
  if (busy < 0) throw new Error('TaskDuration went backwards');
  if (wall <= 0) return 0;
  return (busy / wall) * 100;
}

function parseArgs(argv) {
  const opts = { baseUrl: undefined, routes: [], cpu: 1, seconds: 5 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--route') opts.routes.push(argv[++i]);
    else if (argv[i] === '--cpu') opts.cpu = Number(argv[++i]);
    else if (argv[i] === '--seconds') opts.seconds = Number(argv[++i]);
    else opts.baseUrl = argv[i];
  }
  const ok = opts.baseUrl && opts.routes.length > 0 && [1, 4].includes(opts.cpu) && opts.seconds > 0;
  return ok ? opts : undefined;
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) {
    console.error('usage: node scripts/perf-idle.mjs <baseUrl> --route <path> [--route <path> ...] [--cpu 1|4] [--seconds 5]');
    return 2;
  }
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    for (const route of opts.routes) {
      const context = await browser.newContext();
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      if (opts.cpu !== 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: opts.cpu });
      await page.goto(new URL(route, opts.baseUrl).href, { waitUntil: 'load' });
      await page.waitForTimeout(SETTLE_MS);
      const first = await cdp.send('Performance.getMetrics');
      await page.waitForTimeout(opts.seconds * 1000);
      const second = await cdp.send('Performance.getMetrics');
      console.log(`idle ${route} cpu=${opts.cpu} mainThreadPct=${idlePercent(first, second).toFixed(1)}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
