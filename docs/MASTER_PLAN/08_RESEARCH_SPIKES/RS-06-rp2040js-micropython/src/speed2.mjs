import os from 'os';
import { makeSim, runUntil, py } from './harness.mjs';
import { hookFlash } from './flashhook.mjs';
const [uf2, mode] = process.argv.slice(2); // mode: plain | hook
const h = makeSim(uf2); const { mcu, sim, out } = h; const clk = sim.clock;
if (mode === 'hook') hookFlash(mcu);
runUntil(h, () => out.text.includes('>>> '), 60000);
const work = {
  'REPL idle 1000 sim ms': null,
  'time.sleep_ms(1000)': "import time\ntime.sleep_ms(1000)",
  'busy loop 100k iterations': "t=0\nfor i in range(100000):\n    t+=i",
};
const rows = [];
for (const [name, code] of Object.entries(work)) for (let rep = 0; rep < 3; rep++) {
  const s0 = clk.nanos, w0 = performance.now(), c0 = process.cpuUsage(), l = os.loadavg()[0];
  if (code === null) { const target = clk.nanos + 1000e6; runUntil(h, () => clk.nanos >= target, 2000); } else py(h, code, 60000);
  const wall = performance.now() - w0, cpu = process.cpuUsage(c0), s = (clk.nanos - s0) / 1e6;
  rows.push({ mode, name, rep, simMs: +s.toFixed(0), wallMs: +wall.toFixed(0), speedX: +(s / wall).toFixed(2), cpuPct: +(((cpu.user + cpu.system) / 1000) / wall * 100).toFixed(0), load: +l.toFixed(1) });
}
console.log(JSON.stringify(rows));
