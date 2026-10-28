// Measures the JavaScript a page downloads in its first seconds, chunk by chunk, and how long a click on a link takes.
//
//   node scripts/perf-prefetch.mjs <baseUrl> [--route /en] [--runs 3] [--click /en/boards] [--settle-ms 3000]
//
// Each run uses a fresh browser context. Script bytes are what the network transferred (encodedDataLength), counted
// from the navigation to --settle-ms after the load event. Chunks that contain CodeMirror are marked with *.
// With --click, the page is slowed to 4x CPU after the settle time and the first link whose href starts with the
// given path is clicked; the time to the new URL's first heading is printed. The tool only reads a server that is
// already running; it starts none.
import { pathToFileURL } from 'node:url';

const SLOW_CPU = 4;

/** Transferred script bytes of the network events: scripts only, nothing failed, nothing served from cache. */
export function sumScripts(events) {
  let bytes = 0;
  let count = 0;
  for (const e of events) {
    if (e.type !== 'Script' || e.failed || e.fromCache) continue;
    bytes += e.encodedDataLength;
    count += 1;
  }
  return { bytes, count };
}

function parseArgs(argv) {
  const opts = { baseUrl: undefined, route: '/en', runs: 3, click: undefined, settleMs: 3000 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--route') opts.route = argv[++i];
    else if (arg === '--runs') opts.runs = Number(argv[++i]);
    else if (arg === '--click') opts.click = argv[++i];
    else if (arg === '--settle-ms') opts.settleMs = Number(argv[++i]);
    else opts.baseUrl = arg;
  }
  const valid = opts.baseUrl && opts.route && Number.isInteger(opts.runs) && opts.runs > 0 && Number.isFinite(opts.settleMs);
  return valid ? opts : undefined;
}

async function measureRun(browser, opts) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  const requests = new Map();
  cdp.on('Network.requestWillBeSent', (e) => requests.set(e.requestId, { url: e.request.url, type: e.type, encodedDataLength: 0 }));
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

  await page.goto(new URL(opts.route, opts.baseUrl).href, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settleMs);

  const landing = [...requests.entries()].map(([requestId, r]) => ({ requestId, ...r }));
  const landingTotal = sumScripts(landing);
  const scripts = [];
  for (const { requestId, ...r } of landing) {
    if (r.type !== 'Script' || r.failed || r.fromCache) continue;
    let editor = false;
    try {
      const { body } = await cdp.send('Network.getResponseBody', { requestId });
      editor = body.includes('@codemirror') || body.includes('cm-editor');
    } catch {
      // A body the browser already dropped cannot be inspected; the chunk is listed unmarked.
    }
    scripts.push({ url: new URL(r.url).pathname, bytes: r.encodedDataLength, editor });
  }

  let clickMs;
  if (opts.click) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW_CPU });
    const link = page.locator(`a[href^="${opts.click}"]`).first();
    const started = Date.now();
    await link.click();
    await page.waitForURL((url) => url.pathname.startsWith(opts.click));
    await page.locator('h1').first().waitFor();
    clickMs = Date.now() - started;
  }

  await context.close();
  return { ...landingTotal, scripts, clickMs };
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) {
    console.error('usage: node scripts/perf-prefetch.mjs <baseUrl> [--route /en] [--runs 3] [--click /en/boards] [--settle-ms 3000]');
    return 2;
  }
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const runs = [];
    for (let i = 0; i < opts.runs; i++) runs.push(await measureRun(browser, opts));

    const typical = runs.find((r) => r.bytes === median(runs.map((x) => x.bytes))) ?? runs[0];
    console.log(`${opts.route}: ${typical.count} scripts, ${(typical.bytes / 1024).toFixed(1)} KB transferred (median of ${runs.length})`);
    for (const s of [...typical.scripts].sort((a, b) => b.bytes - a.bytes)) {
      console.log(`${String(s.bytes).padStart(9)} B  ${s.editor ? '*' : ' '} ${s.url}`);
    }
    if (opts.click) {
      const times = runs.map((r) => r.clickMs);
      console.log(`click ${opts.click} at ${SLOW_CPU}x CPU: median ${median(times)} ms (${times.join(', ')})`);
    }
    return 0;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
