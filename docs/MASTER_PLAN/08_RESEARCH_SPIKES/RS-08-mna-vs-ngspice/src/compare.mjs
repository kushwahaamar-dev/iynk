import { readFileSync, writeFileSync } from 'node:fs';
import { cases } from './cases.mjs';
import { makePage, solveCase } from './real.mjs';
import { netlist, run } from './spice.mjs';

const ROOT = '/Users/amar/iynk-master-plan-scratch/spikes/RS-08';
const patched = readFileSync(ROOT + '/bench-solve.patched.js', 'utf8');
const VFLOOR = 5e-3, IFLOOR = 5e-6, TOL = .02;
const { page } = await makePage(cases);

function spiceRead(cs, r) {
  const v = {}, c = {};
  const V = n => n === 'GND' ? 0 : r['v(n_' + n.toLowerCase() + ')'];
  for (const p of cs.parts) for (const n of p.n) if (n !== 'GND') v[n] = V(n);
  for (const p of cs.parts) {
    const id = p.id.toLowerCase();
    if (p.k === 'R') c[p.id] = (V(p.n[0]) - V(p.n[1])) / p.ohms;
    else if (p.k === 'LED' || p.k === 'D' || p.k === 'MOT') c[p.id] = r['i(vs_' + id + ')'];
    else if (p.k === 'TIP' || p.k === 'Q22') { c[p.id + '.ib'] = r['i(vsb_' + id + ')']; c[p.id + '.ic'] = r['i(vsc_' + id + ')']; }
    else if (p.k === 'POT') { c[p.id + '.top'] = (V(p.n[0]) - V(p.n[1])) / Math.max(p.ohms * p.pos, .5); c[p.id + '.bot'] = (V(p.n[1]) - V(p.n[2])) / Math.max(p.ohms * (1 - p.pos), .5); }
  }
  let load = 0; for (const [k, x] of Object.entries(r)) if (k.startsWith('i(vsrc_')) load += Math.max(0, -x);
  return { volts: v, cur: c, load };
}
const cmp = (sol, ref) => {
  const rows = [];
  const add = (kind, name, s, r) => {
    const floor = kind === 'V' ? VFLOOR : IFLOOR, d = Math.abs(s - r), rel = d / Math.max(Math.abs(r), 1e-12);
    rows.push({ kind, name, solver: s, spice: r, rel, ok: d <= Math.max(TOL * Math.abs(r), floor), small: Math.abs(r) < floor });
  };
  for (const k of Object.keys(ref.volts)) add('V', k, sol.volts[k], ref.volts[k]);
  for (const k of Object.keys(ref.cur)) add('I', k, sol.cur[k], ref.cur[k]);
  add('I', 'load', sol.load, ref.load);
  return rows;
};
const worst = rows => rows.filter(r => !r.small).reduce((m, r) => r.rel > m ? r.rel : m, 0);

const out = [];
for (const cs of cases) {
  const s = solveCase(page, cs, patched);
  const ctx = { rails: s.rails, logic: s.logic };
  const rec = { id: cs.id, title: cs.title, rails: s.rails, sagmA: s.sagmA, states: Object.fromEntries(Object.entries(s.meas).map(([k, m]) => [k, m.state])) };
  for (const mode of ['matched', 'realistic']) {
    const text = netlist(cs, ctx, mode);
    writeFileSync(`${ROOT}/netlists/${cs.id}-${mode}.cir`, text + '\n');
    const ref = spiceRead(cs, await run(text));
    for (const phase of ['warm', 'cold']) {
      const rows = cmp(s[phase], ref);
      rec[`${mode}_${phase}`] = { worst: worst(rows), pass: rows.every(r => r.ok), rows };
    }
  }
  // after the part has burnt (second frame with burnt flags kept)
  if (cs.id === 'C10') { const t = solveCase(page, cs, patched, { keepBurnt: true, warm: 1 }); rec.afterBurn = { cur: t.warm.cur, states: Object.fromEntries(Object.entries(t.meas).map(([k, m]) => [k, m.state])) }; }
  out.push(rec);
}
writeFileSync(ROOT + '/results.json', JSON.stringify(out, null, 1));
for (const r of out) console.log(r.id, 'matched warm', (r.matched_warm.worst * 100).toExponential(2) + '%', r.matched_warm.pass ? 'PASS' : 'FAIL', '| cold', (r.matched_cold.worst * 100).toExponential(2) + '%', r.matched_cold.pass ? 'PASS' : 'FAIL', '| realistic', (r.realistic_warm.worst * 100).toFixed(2) + '%', r.realistic_warm.pass ? 'PASS' : 'FAIL', JSON.stringify(r.states));
console.log('matched pass', out.filter(r => r.matched_warm.pass).length, 'realistic pass', out.filter(r => r.realistic_warm.pass).length);
process.exit(0);
