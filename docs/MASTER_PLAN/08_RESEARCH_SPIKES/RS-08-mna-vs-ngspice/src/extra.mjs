// (1) 60 random resistor networks, solver against ngspice. (2) isolated Gaussian elimination scaling.
import { readFileSync, writeFileSync } from 'node:fs';
import { makePage, solveCase } from './real.mjs';
import { netlist, run } from './spice.mjs';
const ROOT = '/Users/amar/iynk-master-plan-scratch/spikes/RS-08';
const patched = readFileSync(ROOT + '/bench-solve.patched.js', 'utf8');
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
const cases = [];
for (let c = 0; c < 60; c++) {
  const nfree = 2 + Math.floor(rnd() * 5), names = ['5V', 'D13', 'GND', ...Array.from({ length: nfree }, (_, i) => 'X' + i)];
  const used = Object.fromEntries(names.map(n => [n, 0])); const parts = [];
  const nr = 4 + Math.floor(rnd() * 9);
  for (let r = 0; r < nr; r++) {
    for (let tries = 0; tries < 20; tries++) {
      const a = names[Math.floor(rnd() * names.length)], b = names[Math.floor(rnd() * names.length)];
      if (a === b || used[a] >= 3 || used[b] >= 3) continue;
      used[a]++; used[b]++; parts.push({ id: 'R' + (r + 1), k: 'R', n: [a, b], ohms: Math.round(10 ** (rnd() * 6) * 10) / 10 }); break;
    }
  }
  cases.push({ id: 'X' + String(c).padStart(2, '0'), title: 'random resistor network', power: 'usb', pins: { D13: 1 }, parts });
}
const { page } = await makePage(cases);
let worst = 0, bad = 0, n = 0, maxAbs = 0, nonzero = 0, maxRelAll = 0;
for (const cs of cases) {
  const s = solveCase(page, cs, patched), ref = await run(netlist(cs, { rails: s.rails, logic: s.logic }, 'matched'));
  for (const [k, v] of Object.entries(s.warm.volts)) {
    const r = ref['v(n_' + k.toLowerCase() + ')']; n++;
    const d = Math.abs(v - r); const rel = d / Math.max(Math.abs(r), 5e-3);
    if (d > Math.max(.02 * Math.abs(r), 5e-3)) { bad++; console.log('MISMATCH', cs.id, k, v, r); }
    worst = Math.max(worst, d <= 5e-3 ? 0 : rel); maxAbs = Math.max(maxAbs, d); if (Math.abs(r) > 1e-3) { nonzero++; maxRelAll = Math.max(maxRelAll, d / Math.abs(r)); }
  }
}
console.log('random networks: node voltages compared', n, 'mismatches over 2%', bad, 'worst rel err (above 5 mV)', worst, 'max abs diff V', maxAbs, 'nodes above 1 mV', nonzero, 'max rel diff on those', maxRelAll);
writeFileSync(ROOT + '/random-stress.json', JSON.stringify({ circuits: cases.length, compared: n, bad, worst, maxAbs, nonzero, maxRelAll }));
page.close();

// scaling of linsolve, copied from the file by regex so it is the exact code
const src = readFileSync(ROOT + '/bench-solve.orig.js', 'utf8');
const m = /function linsolve\(A, b\)\{[\s\S]*?\n\}\n/.exec(src);
const linsolve = new Function(m[0] + '; return linsolve;')();
for (const size of [14, 30, 60, 120, 240]) {
  const mk = () => { const A = Array.from({ length: size }, () => new Float64Array(size)), b = new Float64Array(size);
    for (let i = 0; i < size; i++) { A[i][i] = 1e-9; b[i] = rnd(); for (let k = 0; k < 3; k++) { const j = Math.floor(rnd() * size); if (j !== i) { const g = 1e-3 * (1 + rnd()); A[i][i] += g; A[j][j] += g; A[i][j] -= g; A[j][i] -= g; } } A[i][i] += 1e-3; }
    return [A, b]; };
  const reps = size > 100 ? 100 : 500; const sets = Array.from({ length: reps }, mk);
  const t0 = process.hrtime.bigint(); for (const [A, b] of sets) linsolve(A, b); const ms = Number(process.hrtime.bigint() - t0) / 1e6 / reps;
  console.log('linsolve n=' + size, ms.toFixed(4), 'ms per elimination');
}
process.exit(0);
