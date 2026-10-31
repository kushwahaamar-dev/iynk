// Runs the frozen figures/engine/bench-solve.js over the 79 lesson circuits and the 20 RS-08 circuits and writes what it
// computed to src/sim/analog/fixtures/legacy-golden.json, so the equivalence test needs neither jsdom nor python3.
// The solver file is patched in memory only (the two lines RS-08 used to expose its raw output); figures/ is never changed.
// Needs python3 (testkit builds the figure pages with figures/tools/cfbuild.py). `--check` regenerates and diffs.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFigure, loadFigure, swapItem } from '../figures/engine/testkit.mjs';
import { rs08Cases } from '../src/sim/analog/fixtures/rs08-cases.ts';

const ROOT = resolve(import.meta.dirname, '..');
const GOLDEN = resolve(ROOT, 'src/sim/analog/fixtures/legacy-golden.json');
const EXPECTED = { lesson: 79, rs08: 20 };

const UNO = 'boards/uno-r3';
const LESSON_ITEMS = ['boards/uno-r3', 'boards/uno-r4', 'boards/nano', 'boards/pico', 'boards/esp32-devkitc', 'boards/esp32-s3-devkitc-1', 'boards/nodemcu',
  'boards/microbit-v2', 'boards/nucleo-f401re', 'boards/pi4-pi5', 'boards/basys3', 'boards/de10-lite',
  'robotics/esp32-s3-build', 'robotics/pi5-ros2', 'robotics/transistor-switch', 'robotics/uno-r3-build'];

const PIN_OHMS = 25, RAIL_OHMS = 0.5;
const PART = { R: 'resistor', LED: 'led', D: 'diode-1n4007', TIP: 'tip120', Q22: 'npn-2n2222', MOT: 'dc-motor', POT: 'potentiometer' };
const BOARD = new Set(['GND', '5V', '3V3', 'VIN', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1']);
// the 2N2222's default pinout is E, B, C; the cases list base, collector, emitter
const legOrder = (kind, n) => (kind === 'Q22' ? [n[2], n[0], n[1]] : n);
const NOMINAL_RAILS = { jack: { VIN: 8.3, '5V': 5, '3V3': 3.3 }, usb: { USBVCC: 5, '5V': 4.95, '3V3': 3.3 } };

function patchedSolver() {
  const src = readFileSync(resolve(ROOT, 'figures/engine/bench-solve.js'), 'utf8');
  const edits = [
    ['  return { parts, byId, els, buttons, nets, gnd, roots };', '  return { parts, byId, els, buttons, nets, gnd, roots, R };'],
    ['out.volts[s.net] = rnd(Vavg(s.root), 100);\n  return out;', 'out.volts[s.net] = rnd(Vavg(s.root), 100);\n  out.raw = { res, nl, els, slices };\n  return out;'],
  ];
  return edits.reduce((text, [from, to]) => {
    if (text.split(from).length !== 2) throw new Error(`bench-solve.js changed: cannot patch ${JSON.stringify(from.slice(0, 40))}`);
    return text.replace(from, to);
  }, src);
}

function benchCircuit(cs) {
  const col = {};
  const rows = {};
  let next = 3;
  const nodes = new Set(cs.parts.flatMap((p) => p.n));
  for (const n of nodes) { col[n] = next; next += 2; rows[n] = 0; }
  const hole = (n) => {
    const row = 'abcde'[rows[n]++];
    if (!row) throw new Error(`strip full ${n}`);
    return row + col[n];
  };
  const wires = [...nodes].filter((n) => BOARD.has(n)).map((n) => ({ from: n, to: hole(n), color: 'red' }));
  const parts = cs.parts.map((p) => {
    const o = { id: p.id, part: PART[p.k], holes: legOrder(p.k, p.n).map(hole) };
    if (p.k === 'R') o.ohms = p.ohms;
    if (p.k === 'LED') o.color = p.color;
    if (p.k === 'MOT') { o.at = [150, 12]; o.load = p.load; }
    if (p.k === 'POT') { o.ohms = p.ohms; o.pos = p.pos; }
    return o;
  });
  return { breadboard: 'half', parts, wires };
}

async function rs08Page() {
  const body = rs08Cases.map((cs) => `    rs08_${cs.id}: ${JSON.stringify(benchCircuit(cs))},`).join('\n');
  const item = readFileSync(resolve(ROOT, 'figures/boards/uno-r3.js'), 'utf8').replace('  circuits: {', `  circuits: {\n${body}`);
  let html = swapItem(buildFigure(UNO), UNO, item);
  // the 2N2222 part exists in the repo but no figure includes it: add its script ahead of the TIP120's
  const q22 = readFileSync(resolve(ROOT, 'figures/parts/npn-2n2222.js'), 'utf8');
  const tag = '<script>/* figures/parts/tip120.js */';
  if (!html.includes(tag)) throw new Error('tip120 script tag not found');
  html = html.replace(tag, `<script>/* figures/parts/npn-2n2222.js */\n${q22}\n</script>\n${tag}`);
  return loadFigure(html, { path: '/figures/boards/uno-r3.html' });
}

// The motor gm of one run is only the settled one when the run starts from it, so repeat until a run leaves it unchanged.
function solveSettled(page, patched) {
  const B = page.bench;
  page.win.eval(patched);
  const pl = B.bbPlace();
  if (!pl) throw new Error('no placement');
  delete B.st.solverMem;
  let out;
  for (let i = 0; i < 12; i++) {
    delete B.st.burnt;
    const before = out && out.raw.els.filter((el) => el.k === 'M').map((el) => el.gm);
    out = B.solveCircuit(B.st, pl, 0);
    const motors = out.raw.els.filter((el) => el.k === 'M');
    if (!motors.length || (before && motors.every((el, k) => el.gm === before[k]))) return out;
  }
  throw new Error('motor conductance did not settle');
}

function rs08Setup(page, cs) {
  const B = page.bench;
  B.accept({ circuit: `rs08_${cs.id}`, power: cs.power, pins: cs.pins });
  B.advance(0.2);
  // the power model sags the rails and stops the pins once a circuit browns out: the first frame is solved at nominal rails
  if (B.st.ev.status !== 'running') {
    B.st.ev.status = 'running';
    delete B.st.sag;
    Object.assign(B.st.ev.rails, NOMINAL_RAILS[cs.power]);
    B.st.o = B.st.o || {};
    B.st.o.pins = { ...cs.pins };
  }
}

const motorI = (el, v) => {
  const model = el.def.model || {};
  const load = el.q.load || 'prop';
  if (el.e.brushless && el.e.polar && v < 0) return 0;
  if (typeof model.steady === 'function') return Math.abs(model.steady(Math.abs(v), load).i || 0);
  return Math.abs(v) / Math.max(+el.e.ohms || 10, 0.1);
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

function toElements(raw, B, node) {
  const { nl, els } = raw;
  const logic = B.md.def.logic || 5;
  const out = [];
  const meta = new Map();
  for (const s of nl.nets) {
    if (s.kind === 'rail') out.push({ id: `src:${s.net}`, kind: 'V', a: node(s.root), b: 0, volts: s.v, rSeriesOhms: RAIL_OHMS });
    else if (s.kind === 'pin' && s.level > 0 && s.level < 1) out.push({ id: `src:${s.net}`, kind: 'PWM', a: node(s.root), duty: s.level, hz: s.hz || 490, vHighVolts: logic, rOutOhms: PIN_OHMS, mode: 'averaged' });
    else if (s.kind === 'pin') out.push({ id: `src:${s.net}`, kind: 'PIN', a: node(s.root), level: s.level >= 1 ? 1 : 0, vHighVolts: logic, rOutOhms: PIN_OHMS, maxAmps: 0.04 });
  }
  for (const el of els) {
    const id = `e${el.n}:${el.key}`;
    const e = el.e;
    meta.set(el.n, id);
    switch (el.k) {
      case 'R': out.push({ id, kind: 'R', a: node(el.a), b: node(el.b), ohms: 1 / el.g }); break;
      case 'POT': out.push({ id, kind: 'POT', a: node(el.a), wiper: node(el.w), b: node(el.b), ohms: Math.max(+e.ohms || 1e4, 1), position: clamp01(+e.pos || 0) }); break;
      case 'D': out.push({ id, kind: 'D', a: node(el.a), b: node(el.b), modelId: el.led ? 'led' : 'diode', vf: el.vf, rdOhms: el.rd, maxAmps: el.imax }); break;
      case 'BZ': out.push({ id, kind: 'BZ', a: node(el.a), b: node(el.b), active: el.active, vf: el.vf, rdOhms: el.rd }); break;
      case 'Q': out.push({ id, kind: 'Q', c: node(el.nc), b: node(el.nb), e: node(el.ne), polarity: 'npn', modelId: 'npn', hfe: el.hfe, hfr: el.hfr, vbe: el.vbe, vcesat: el.vcesat }); break;
      case 'M': out.push({ id, kind: 'M', a: node(el.a), b: node(el.b), ohms: +e.ohms || 10 }); break;
      case 'SV': out.push({ id, kind: 'SV', gnd: node(el.gnd), vplus: node(el.vp), sig: node(el.sig) }); break;
      case 'TS': out.push({ id, kind: 'TS', supplyPos: node(el.sp), supplyNeg: node(el.sn), out: node(el.out), outVolts: el.vout }); break;
      default: throw new Error(`unknown element kind ${el.k}`);
    }
  }
  return { elements: out, ids: meta };
}

// What every element carried in one slice, with the old solver's own formulas for the quantities it did not report.
function sliceBranches(raw, res, slice, ids, logic) {
  const { nl, els } = raw;
  const V = (root) => (root === nl.gnd ? 0 : res.V.get(root) ?? 0);
  const branch = {};
  for (const s of nl.nets) {
    const high = s.kind === 'pin' && slice.high(s);
    if (s.kind === 'rail') branch[`src:${s.net}`] = { amps: (s.v - V(s.root)) / RAIL_OHMS, volts: V(s.root) };
    else if (s.kind === 'pin') branch[`src:${s.net}`] = { amps: ((high ? logic : 0) - V(s.root)) / PIN_OHMS, volts: V(s.root) };
  }
  for (const el of els) {
    const r = res.el[el.n];
    const vd = (a, b) => V(a) - V(b);
    let m;
    if (el.k === 'R') m = { amps: el.coil ? r.i : vd(el.a, el.b) * el.g, volts: vd(el.a, el.b) };
    else if (el.k === 'POT') m = { amps: el.g1 * vd(el.a, el.w), volts: vd(el.a, el.b) };
    else if (el.k === 'D' || el.k === 'BZ') m = { amps: r.i, volts: r.vd };
    else if (el.k === 'M') m = { amps: r.i, volts: r.v };
    else if (el.k === 'SV') m = { amps: r.vs * el.gs, volts: r.vs };
    else if (el.k === 'TS') m = { amps: r.vs * (+el.e.iq || 5e-5) / 5, volts: r.vs };
    else m = { amps: r.ic, volts: r.vce };
    branch[ids.get(el.n)] = m;
  }
  return branch;
}

function toGolden(id, source, B, out) {
  const { raw } = out;
  const { nl } = raw;
  const logic = B.md.def.logic || 5;
  const index = new Map(nl.roots.map((r, i) => [r, i + 1]));
  const node = (root) => (root === nl.gnd ? 0 : index.get(root));
  const { elements, ids } = toElements(raw, B, node);
  const pwmIds = new Map(nl.nets.filter((s) => s.kind === 'pin' && s.level > 0 && s.level < 1).map((s) => [s, `src:${s.net}`]));
  const motorGm = {};
  const motorCurves = {};
  for (const el of raw.els) {
    if (el.k !== 'M' || (el.q.load === 'stalled' && el.e.ohms)) continue;
    motorGm[ids.get(el.n)] = el.gm;
    motorCurves[ids.get(el.n)] = Array.from({ length: 281 }, (_, i) => [i / 20, motorI(el, i / 20)]);
  }
  return {
    id,
    source,
    nodes: nl.roots.length + 1,
    ground: 0,
    elements,
    pwmSlices: raw.slices.map((sl) => ({ weight: sl.w, highNets: [...pwmIds].filter(([s]) => sl.high(s)).map(([, name]) => name) })),
    motorGm,
    motorCurves,
    expected: {
      slices: raw.res.map((res, k) => ({
        weight: res.w,
        v: [0, ...nl.roots.map((r) => res.V.get(r))],
        branch: sliceBranches(raw, res, raw.slices[k], ids, logic),
      })),
    },
  };
}

async function generate() {
  const patched = patchedSolver();
  const circuits = [];
  const skipped = [];
  for (const item of LESSON_ITEMS) {
    const page = await loadFigure(buildFigure(item), { path: `/figures/${item}.html` });
    const B = page.bench;
    for (const key of Object.keys((B && B.md && B.md.circuits) || {})) {
      const id = `${item}#${key}`;
      try {
        B.accept({ circuit: key, power: B.md.power && B.md.power.default });
        B.advance(0.3);
        circuits.push(toGolden(id, 'lesson', B, solveSettled(page, patched)));
      } catch (err) { skipped.push(`${id}: ${err.message}`); }
    }
    page.close();
  }
  const page = await rs08Page();
  for (const cs of rs08Cases) {
    const id = `rs08/${cs.id}`;
    try {
      rs08Setup(page, cs);
      circuits.push(toGolden(id, 'rs08', page.bench, solveSettled(page, patched)));
    } catch (err) { skipped.push(`${id}: ${err.message}`); }
  }
  page.close();
  const count = (source) => circuits.filter((c) => c.source === source).length;
  if (skipped.length || count('lesson') !== EXPECTED.lesson || count('rs08') !== EXPECTED.rs08) {
    console.error(`golden circuits: ${count('lesson')} lesson of ${EXPECTED.lesson}, ${count('rs08')} rs08 of ${EXPECTED.rs08}`);
    for (const line of skipped) console.error(`  skipped ${line}`);
    process.exit(1);
  }
  return `[\n${circuits.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`;
}

const text = await generate();
if (process.argv.includes('--check')) {
  const same = text === readFileSync(GOLDEN, 'utf8');
  console.log(same ? 'legacy-golden.json is up to date' : 'legacy-golden.json differs from the old solver output');
  process.exit(same ? 0 : 1);
}
writeFileSync(GOLDEN, text);
console.log(`wrote ${GOLDEN} (${text.length} bytes)`);
process.exit(0);
