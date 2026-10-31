import { makeSim, runUntil, py } from './harness.mjs';
const h = makeSim(process.argv[2]); const { mcu, sim, out } = h; const clk = sim.clock;
runUntil(h, () => out.text.includes('>>> '), 60000);
let wfe = 0, wfi = 0, ev = 0;
const core = mcu.core;
const ex = core.executeInstruction.bind(core);
let skipNs = 0, calls = 0, pcHist = new Map();
core.executeInstruction = () => { calls++; const pc = core.PC; if (calls % 50 === 0) pcHist.set(pc, (pcHist.get(pc) || 0) + 1); return ex(); };
const s0 = clk.nanos;
const target = clk.nanos + 200e6;
// manual loop to measure waiting share
let waitCount = 0, waitNs = 0;
while (clk.nanos < target) {
  if (core.waiting) { const n = clk.nanosToNextAlarm; waitCount++; waitNs += n; clk.tick(n); }
  else clk.tick(core.executeInstruction() * 8);
}
console.log({ simMs: (clk.nanos - s0) / 1e6, insns: calls, waitCount, waitedMs: waitNs / 1e6 });
console.log([...pcHist].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, c]) => '0x' + p.toString(16) + ':' + c));
