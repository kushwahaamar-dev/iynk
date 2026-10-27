// Drives the real bench-solve.js inside the Uno R3 figure page (jsdom, read-only import of the repo's test kit),
// with the 20 circuits injected as extra lesson circuits. Returns raw node voltages and element currents.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFigure, loadFigure, swapItem } from '/Users/amar/Codes/ak/simlab/figures/engine/testkit.mjs';

const REPO = '/Users/amar/Codes/ak/simlab';
export const UNO = 'boards/uno-r3';
const PART = { R: 'resistor', LED: 'led', D: 'diode-1n4007', TIP: 'tip120', Q22: 'npn-2n2222', MOT: 'dc-motor', POT: 'potentiometer' };
const NLEGS = { R: 2, LED: 2, D: 2, TIP: 3, Q22: 3, MOT: 2, POT: 3 };
const BOARD = new Set(['GND', '5V', '3V3', 'VIN', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1']);
// Q22 default pinout EBC: legs are [E, B, C]; the case lists (b, c, e)
const legOrder = (k, n) => k === 'Q22' ? [n[2], n[0], n[1]] : n;

/** bench-solve circuit for one case: every free node is a breadboard column (strip a-e), board nets come in by wire. */
export function benchCircuit(cs) {
  const col = {}; let next = 3; const rows = {};
  const nodes = new Set(cs.parts.flatMap(p => p.n));
  for (const n of nodes) if (n !== undefined) { col[n] = next; next += 2; rows[n] = 0; }
  const hole = n => { const r = 'abcde'[rows[n]++]; if (!r) throw new Error('strip full ' + n); return r + col[n]; };
  const wires = [];
  for (const n of nodes) if (BOARD.has(n)) wires.push({ from: n, to: hole(n), color: 'red' });
  const parts = [];
  for (const p of cs.parts) {
    const o = { id: p.id, part: PART[p.k], holes: legOrder(p.k, p.n).map(hole) };
    if (p.k === 'R') o.ohms = p.ohms;
    if (p.k === 'LED') o.color = p.color;
    if (p.k === 'MOT') { o.at = [150, 12]; o.load = p.load; }
    if (p.k === 'POT') { o.ohms = p.ohms; o.pos = p.pos; }
    parts.push(o);
  }
  return { breadboard: 'half', parts, wires, col };
}

export async function makePage(cases) {
  const circuits = {};
  for (const cs of cases) { const { col, ...c } = benchCircuit(cs); circuits['rs08_' + cs.id] = c; }
  const body = Object.entries(circuits).map(([k, c]) => `    ${k}: ${JSON.stringify(c)},`).join('\n');
  const src = readFileSync(resolve(REPO, 'figures/boards/uno-r3.js'), 'utf8').replace('  circuits: {', `  circuits: {\n${body}`);
  let html = swapItem(buildFigure(UNO), UNO, src);
  // the 2N2222 part exists in the repo but no figure includes it: add its script ahead of the TIP120's
  const q22 = readFileSync(resolve(REPO, 'figures/parts/npn-2n2222.js'), 'utf8');
  const tag = '<script>/* figures/parts/tip120.js */';
  if (!html.includes(tag)) throw new Error('tip120 script tag not found');
  html = html.replace(tag, '<script>/* figures/parts/npn-2n2222.js */\n' + q22 + '\n</script>\n' + tag);
  return { html, page: await loadFigure(html, { path: '/figures/boards/uno-r3.html' }), circuits };
}

/** Solve one case on the patched copy of bench-solve.js (raw access) or the original (timing). */
const nominalRails = p => p === 'jack' ? { VIN: 8.3, '5V': 5, '3V3': 3.3 } : { USBVCC: 5, '5V': 4.95, '3V3': 3.3 };
export function solveCase(page, cs, patchedSrc, { warm = 6, keepBurnt = false } = {}) {
  const B = page.bench;
  B.accept({ circuit: 'rs08_' + cs.id, power: cs.power, pins: cs.pins });
  B.advance(.2);
  // the power model sags the rails and stops the pins once a circuit browns out; the brownout test wants the first
  // frame, at nominal rails
  const sagmA = B.st.sag ? B.st.sag.mA : null;
  if (B.st.ev.status !== 'running') { B.st.ev.status = 'running'; delete B.st.sag; Object.assign(B.st.ev.rails, nominalRails(cs.power)); B.st.o = B.st.o || {}; B.st.o.pins = { ...cs.pins }; }
  page.win.eval(patchedSrc);
  const col = benchCircuit(cs).col;
  const st = B.st, pl = B.bbPlace();
  const run = () => B.solveCircuit(st, pl, 0);
  if (!keepBurnt) delete st.burnt;
  delete st.solverMem;
  const cold = run();
  let r = cold;
  const coldRaw = snapshot(cold, cs, col, B);
  for (let i = 0; i < warm; i++) { if (!keepBurnt) delete st.burnt; r = run(); }
  const warmRaw = snapshot(r, cs, col, B);
  // after the part burns (second solve with burnt flags kept)
  return { sagmA, cold: coldRaw, warm: warmRaw, rails: { ...st.ev.rails }, logic: B.md.def.logic || 5, meas: r.meas, volts: r.volts, load: r.load, status: B.report().status };
}

function snapshot(out, cs, col, B) {
  const { res, nl, els } = out.raw;
  if (res.length !== 1) throw new Error('expected one slice, got ' + res.length);
  const V = res[0].V, R = nl.R;
  const vOf = n => {
    if (n === 'GND') return 0;
    const key = BOARD.has(n) ? 'N:' + B.pinOf(n).net : 'S' + col[n] + 'u';
    const root = R(key); return root === nl.gnd ? 0 : (V.get(root) ?? 0);
  };
  const volts = {};
  for (const p of cs.parts) for (const n of p.n) if (n !== 'GND') volts[n] = vOf(n);
  const cur = {};
  for (const p of cs.parts) {
    const e = els.filter(x => x.id === p.id);
    const r = e.map(x => res[0].el[x.n]);
    if (p.k === 'R') cur[p.id] = (vOf(p.n[0]) - vOf(p.n[1])) / p.ohms;
    else if (p.k === 'LED' || p.k === 'D') cur[p.id] = r[0].i;
    else if (p.k === 'TIP' || p.k === 'Q22') { cur[p.id + '.ib'] = r[0].ib; cur[p.id + '.ic'] = r[0].ic; }
    else if (p.k === 'MOT') cur[p.id] = r[0].i;
    else if (p.k === 'POT') { const x = e[0]; cur[p.id + '.top'] = x.g1 * (vOf(p.n[0]) - vOf(p.n[1])); cur[p.id + '.bot'] = x.g2 * (vOf(p.n[1]) - vOf(p.n[2])); }
  }
  // current drawn from the sources, the solver's own number for the brownout test
  return { volts, cur, load: res[0].load };
}
