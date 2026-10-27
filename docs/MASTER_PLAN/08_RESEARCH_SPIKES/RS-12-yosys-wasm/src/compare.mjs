// Drive the same input pattern into iynk's interpreter and DigitalJS (from Yosys WASM netlist); compare led per cycle.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { compileVerilog, SIM_CLOCK_HZ, getProfile } from '../build/iynk.mjs';
const require = createRequire(import.meta.url);
const { HeadlessCircuit } = require('digitaljs');
const { Vector3vl } = require('3vl');
const [lesson, djFile, ...stim] = process.argv.slice(2); // e.g. basys3-counter out/basys3-counter-cp.digitaljs.json
const board = lesson.startsWith('basys3') ? 'basys3' : 'de10-lite';
const N = +(process.env.N || 12000);
// per-cycle stimulus: btnC pressed for 3000 cycles from 100 and from 6000; btnU 10 cycles at 10000
const btnC = (t) => (t >= 100 && t < 3100) || (t >= 6000 && t < 9000) ? 1 : 0;
const btnU = (t) => (t >= 10000 && t < 10010) ? 1 : 0;
const HAS_BTN = lesson.endsWith('counter');
const src = readFileSync(`fixtures/${lesson}.v`, 'utf8');
const sim = compileVerilog(src, getProfile(board), {});
const t0 = performance.now();
const ref = [];
for (let t = 0; t < N; t++) {
  if (HAS_BTN) { sim.setInput('btnC', btnC(t)); sim.setInput('btnU', btnU(t)); }
  sim.run(1);
  ref.push(sim.outputs().led);
}
const iynkMs = performance.now() - t0;
// DigitalJS
const dj = JSON.parse(readFileSync(djFile, 'utf8'));
if (process.env.PATCH_INIT) for (const d of Object.values(dj.devices)) if (d.type === 'Dff' && d.initial === undefined) d.initial = '0'.repeat(d.bits); // manual workaround
const c = new HeadlessCircuit(dj);
const inp = (n) => c.findInputByNet(n);
const settle = async () => { let g = 0; while (c.hasPendingEvents && g++ < 10000) await c.updateGatesNext(); };
await settle();
const num = (v) => v.toBin(); // keep the bit string; x bits are undriven in the netlist
const out = c.findOutputByNet('led');
const got = [];
const t1 = performance.now();
let pending = 0;
for (let t = 0; t < N; t++) {
  if (HAS_BTN) { inp('btnC').setInput(Vector3vl.fromNumber(btnC(t), 1)); inp('btnU').setInput(Vector3vl.fromNumber(btnU(t), 1)); }
  inp('clk').setInput(Vector3vl.zeros(1)); await settle();
  inp('clk').setInput(Vector3vl.ones(1)); await settle();
  got.push(num(out.getOutput()));
}
const djMs = performance.now() - t1;
let diff = 0, first = -1, nulls = 0; const xBits = new Set(); const dots = [];
// compare bit by bit; an x bit in DigitalJS (undriven in the netlist) is reported, not counted as a mismatch
for (let t = 0; t < N; t++) {
  const g = got[t], r = ref[t].toString(2).padStart(g.length, '0');
  let bad = false;
  for (let b = 0; b < g.length; b++) { if (g[b] === 'x') { xBits.add(g.length - 1 - b); continue; } if (g[b] !== r[b]) bad = true; }
  if (bad) { diff++; if (first < 0) first = t; }
}
nulls = [...xBits].sort((a, b) => a - b).join(',');
const dist = (a) => [...new Set(a)].slice(0, 12);
console.log(JSON.stringify({ lesson, cycles: N, simClockHz: SIM_CLOCK_HZ, mismatches: diff, firstMismatch: first, xBitsInDigitalJS: nulls, iynkMs: Math.round(iynkMs), digitaljsMs: Math.round(djMs),
  iynkFinal: ref[N - 1], djFinal: got[N - 1], iynkDistinct: dist(ref), djDistinct: dist(got), sample: first >= 0 ? { t: first, iynk: ref[first], dj: got[first] } : null }));
c.shutdown();
