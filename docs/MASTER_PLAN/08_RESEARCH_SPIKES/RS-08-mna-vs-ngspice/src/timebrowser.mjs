// ms per solveCircuit() on the 20 circuits and the largest repo circuit, in Chromium (CPU throttle 1x, 4x, 6x) and WebKit.
import { writeFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { cases } from './cases.mjs';
import { makePage } from './real.mjs';
import { createRequire } from 'node:module';
import { buildFigure } from '/Users/amar/Codes/ak/simlab/figures/engine/testkit.mjs';
import { execSync } from 'node:child_process';
const ROOT = '/Users/amar/iynk-master-plan-scratch/spikes/RS-08';
const { html, page: jp } = await makePage(cases); jp.close();
const big = buildFigure('boards/uno-r3');   // the unmodified Uno page holds the largest repo circuit (stepper)
const N = 400;
const job = `async (arg) => {
  const B = SL.bench, out = {};
  for (const [key, power, pins] of arg.list) {
    B.accept({ circuit: key, power, pins }); B.advance(.2);
    const st = B.st, pl = B.bbPlace();
    for (let i = 0; i < 50; i++) B.solveCircuit(st, pl, 0);
    const t0 = performance.now(); for (let i = 0; i < arg.n; i++) B.solveCircuit(st, pl, 0); const t1 = performance.now();
    out[key] = (t1 - t0) / arg.n;
  }
  return out;
}`;
const res = {};
const load = async (p, h) => { await p.setContent(h, { waitUntil: 'load' }); await p.waitForFunction(() => window.SL && SL.bench && SL.bench.st, null, { timeout: 15000 }); };
for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
  const br = await type.launch();
  const rates = name === 'chromium' ? [1, 4, 6] : [1];
  for (const rate of rates) {
    const ctx = await br.newContext(); const pg = await ctx.newPage();
    pg.on('pageerror', e => console.log('pageerror', e.message.slice(0, 120)));
    let cdp = null; if (name === 'chromium') { cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate }); }
    const load1 = execSync('uptime').toString().trim().replace(/.*load averages?: /, '');
    await load(pg, html);
    const mine = await pg.evaluate(`(${job})(${JSON.stringify({ n: N, list: cases.map(c => ['rs08_' + c.id, c.power, c.pins]) })})`);
    const pg2 = await ctx.newPage(); pg2.on('pageerror', e => console.log('pageerror', e.message.slice(0, 120)));
    if (cdp) { const c2 = await ctx.newCDPSession(pg2); await c2.send('Emulation.setCPUThrottlingRate', { rate }); }
    await load(pg2, big);
    const lg = await pg2.evaluate(`(${job})(${JSON.stringify({ n: N, list: [['stepper', 'usb', {}]] })})`);
    res[`${name}-${rate}x`] = { load: load1, mine, stepper: lg.stepper };
    console.log(name, rate + 'x', 'load', load1, 'stepper ms', lg.stepper.toFixed(4), 'median of 20', Object.values(mine).sort((a, b) => a - b)[10].toFixed(4), 'max', Math.max(...Object.values(mine)).toFixed(4));
    await ctx.close();
  }
  console.log(name, (await br.version()));
  res[name + '-version'] = await br.version();
  await br.close();
}
writeFileSync(ROOT + '/timing-browser.json', JSON.stringify(res, null, 1));
process.exit(0);
