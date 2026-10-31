// Writes the ngspice answers the oracle test compares the solver to: the RS-08 hand circuits C01 to C05, C18 and C19 and the
// 60 seeded random resistor networks of RS-08. ngspice runs as eecircuit-engine 1.9.0 (WASM); CI never runs this, it reads the file.
// node scripts/gen-ngspice-fixtures.mjs --set linear --out <file> [--engine-dir <dir>/node_modules/eecircuit-engine] [--check]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rs08Cases } from '../src/sim/analog/fixtures/rs08-cases.ts';

const ROOT = resolve(import.meta.dirname, '..');
const ENGINE = 'eecircuit-engine@1.9.0';
const SOURCE = 'docs/MASTER_PLAN/08_RESEARCH_SPIKES/RS-08-mna-vs-ngspice';
const HAND = ['C01', 'C02', 'C03', 'C04', 'C05', 'C18', 'C19'];
const RAILS = { jack: { VIN: 8.3, '5V': 5, '3V3': 3.3 }, usb: { '5V': 4.95, '3V3': 3.3 } };
const RAIL_OHMS = 0.5, PIN_OHMS = 25, PIN_VOLTS = 5, PIN_MAX_AMPS = 0.04, GMIN = 1e-9;

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
if (flag('--set') !== 'linear') throw new Error('usage: node scripts/gen-ngspice-fixtures.mjs --set linear --out <file> [--engine-dir <dir>] [--check]');
const out = resolve(ROOT, flag('--out') ?? 'src/sim/analog/fixtures/ngspice/linear.json');
const engineDir = flag('--engine-dir') ?? resolve(createRequire(import.meta.url).resolve('eecircuit-engine/package.json'), '..');

// the RS-08 generator: seed 12345, the numerical-recipes LCG
function randomCases() {
  let seed = 12345;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const cases = [];
  for (let c = 0; c < 60; c++) {
    const free = 2 + Math.floor(rnd() * 5);
    const names = ['5V', 'D13', 'GND', ...Array.from({ length: free }, (_, i) => 'X' + i)];
    const used = Object.fromEntries(names.map((n) => [n, 0]));
    const parts = [];
    const count = 4 + Math.floor(rnd() * 9);
    for (let r = 0; r < count; r++) {
      for (let tries = 0; tries < 20; tries++) {
        const a = names[Math.floor(rnd() * names.length)], b = names[Math.floor(rnd() * names.length)];
        if (a === b || used[a] >= 3 || used[b] >= 3) continue;
        used[a]++; used[b]++;
        parts.push({ id: 'R' + (r + 1), k: 'R', n: [a, b], ohms: Math.round(10 ** (rnd() * 6) * 10) / 10 });
        break;
      }
    }
    cases.push({ id: 'X' + String(c).padStart(2, '0'), power: 'usb', pins: { D13: 1 }, parts });
  }
  return cases;
}

// resistors, rails behind 0.5 ohm and driven pins behind 25 ohm, in the solver's own element shapes
function describe(cs) {
  const names = ['GND'];
  const at = (n) => { let i = names.indexOf(n); if (i < 0) i = names.push(n) - 1; return i; };
  const elements = [];
  for (const p of cs.parts) {
    if (p.k === 'R') elements.push({ id: p.id, kind: 'R', a: at(p.n[0]), b: at(p.n[1]), ohms: p.ohms });
    else {
      elements.push({ id: p.id + '.top', kind: 'R', a: at(p.n[0]), b: at(p.n[1]), ohms: Math.max(p.ohms * p.pos, 0.5) });
      elements.push({ id: p.id + '.bot', kind: 'R', a: at(p.n[1]), b: at(p.n[2]), ohms: Math.max(p.ohms * (1 - p.pos), 0.5) });
    }
  }
  const rails = RAILS[cs.power];
  for (const [i, n] of names.entries()) {
    if (i === 0) continue;
    if (n in rails) elements.push({ id: 'src:' + n, kind: 'V', a: i, b: 0, volts: rails[n], rSeriesOhms: RAIL_OHMS });
    else if (/^D\d+$/.test(n) && cs.pins[n] != null) elements.push({ id: 'src:' + n, kind: 'PIN', a: i, level: cs.pins[n] ? 1 : 0, vHighVolts: PIN_VOLTS, rOutOhms: PIN_OHMS, maxAmps: PIN_MAX_AMPS });
  }
  return { nodes: names, elements };
}

const node = (names, i) => (i === 0 ? '0' : 'n_' + names[i].toLowerCase());
const num = (x) => Number(x).toPrecision(15);

function netlist(id, { nodes, elements }) {
  const L = [`* ${id}`];
  for (const el of elements) {
    const key = el.id.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (el.kind === 'R') L.push(`R_${key} ${node(nodes, el.a)} ${node(nodes, el.b)} ${num(el.ohms)}`);
    else {
      const volts = el.kind === 'V' ? el.volts : el.level ? el.vHighVolts : 0;
      const ohms = el.kind === 'V' ? el.rSeriesOhms : el.rOutOhms;
      L.push(`Vsrc_${key} s_${key} 0 ${num(volts)}`, `Rsrc_${key} s_${key} ${node(nodes, el.a)} ${num(ohms)}`);
    }
  }
  for (let i = 1; i < nodes.length; i++) L.push(`Rg_${i} ${node(nodes, i)} 0 ${num(1 / GMIN)}`);
  L.push('.options reltol=1e-9 abstol=1e-14 vntol=1e-9 itl1=500 gmin=1e-12', '.op', '.end');
  return L.join('\n');
}

const { Simulation } = await import(pathToFileURL(resolve(engineDir, 'dist/eecircuit-engine.mjs')).href);
const sim = new Simulation();
await sim.start();

async function record(id, group, cs) {
  const circuit = describe(cs);
  sim.setNetList(netlist(id, circuit));
  const result = await sim.runSim();
  const volts = Object.fromEntries(result.data.map((d) => [d.name.toLowerCase(), d.values[0]]));
  const expected = {};
  for (const name of circuit.nodes.slice(1)) expected[name] = volts['v(n_' + name.toLowerCase() + ')'];
  return { id, group, source: group === 'hand' ? `${SOURCE}/src/cases.mjs` : `${SOURCE}/src/extra.mjs`, revision: ENGINE, ...circuit, expected };
}

const circuits = [];
for (const id of HAND) circuits.push(await record(id, 'hand', rs08Cases.find((c) => c.id === id)));
for (const cs of randomCases()) circuits.push(await record(cs.id, 'random', cs));

const text = JSON.stringify({ source: SOURCE, engine: ENGINE, generatedBy: 'scripts/gen-ngspice-fixtures.mjs --set linear', circuits }, null, 1) + '\n';
if (args.includes('--check')) {
  if (readFileSync(out, 'utf8') !== text) { console.error(`${out} is out of date; regenerate it`); process.exit(1); }
  console.log(`${out} matches`);
} else {
  writeFileSync(out, text);
  console.log(`wrote ${circuits.length} circuits to ${out}`);
}
process.exit(0);
