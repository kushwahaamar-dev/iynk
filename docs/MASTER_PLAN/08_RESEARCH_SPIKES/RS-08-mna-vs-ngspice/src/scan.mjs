// Every lesson circuit in the repo: size (nodes, elements) and solve time on the unmodified solver.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildFigure, loadFigure } from '/Users/amar/Codes/ak/simlab/figures/engine/testkit.mjs';
const ROOT = '/Users/amar/iynk-master-plan-scratch/spikes/RS-08';
const orig = readFileSync(ROOT + '/bench-solve.orig.js', 'utf8'), patched = readFileSync(ROOT + '/bench-solve.patched.js', 'utf8');
const items = ['boards/uno-r3', 'boards/uno-r4', 'boards/nano', 'boards/pico', 'boards/esp32-devkitc', 'boards/esp32-s3-devkitc-1', 'boards/nodemcu', 'boards/microbit-v2', 'boards/nucleo-f401re', 'boards/pi4-pi5', 'boards/basys3', 'boards/de10-lite',
  'robotics/esp32-s3-build', 'robotics/pi5-ros2', 'robotics/transistor-switch', 'robotics/uno-r3-build'];
const N = +process.env.N || 200;
const rows = [];
for (const item of items) {
  let page;
  try { page = await loadFigure(buildFigure(item), { path: `/figures/${item}.html` }); } catch (e) { console.log(item, 'LOAD ERR', e.message.slice(0, 100)); continue; }
  const B = page.bench; if (!B || !B.md || !B.md.circuits) { console.log(item, 'no circuits'); page.close(); continue; }
  for (const key of Object.keys(B.md.circuits)) {
    try {
      B.accept({ circuit: key, power: B.md.power && B.md.power.default });
      B.advance(.3);
      page.win.eval(patched);
      const pl = B.bbPlace(); if (!pl) { console.log(item, key, 'no placement'); continue; }
      const o = B.solveCircuit(B.st, pl, 0);
      const nodes = o.raw.nl.roots.length, els = o.raw.els.length, parts = (pl.c.parts || []).length;
      page.win.eval(orig);
      for (let i = 0; i < 30; i++) B.solveCircuit(B.st, pl, 0);
      const t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) B.solveCircuit(B.st, pl, 0);
      const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
      rows.push({ item, key, parts, nodes, els, ms });
    } catch (e) { console.log(item, key, 'ERR', e.message.slice(0, 120)); }
  }
  page.close();
}
rows.sort((a, b) => b.nodes - a.nodes || b.els - a.els);
writeFileSync(ROOT + '/scan.json', JSON.stringify(rows, null, 1));
console.table(rows.slice(0, 12));
console.log('count', rows.length, 'median ms', rows.map(r => r.ms).sort((a, b) => a - b)[rows.length >> 1], 'max ms', Math.max(...rows.map(r => r.ms)));
process.exit(0);
