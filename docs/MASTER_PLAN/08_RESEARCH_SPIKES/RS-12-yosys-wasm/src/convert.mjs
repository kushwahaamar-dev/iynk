// yosys JSON -> DigitalJS JSON -> HeadlessCircuit construct, for every netlist
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { yosys2digitaljs } = require('yosys2digitaljs/core');
const { HeadlessCircuit } = require('digitaljs');
const rows = [];
for (const f of readdirSync('out').filter(f => f.endsWith('.djs.json')).sort()) {
  const name = f.replace('.djs.json', '');
  const row = { name };
  try {
    const t = performance.now();
    const dj = yosys2digitaljs(JSON.parse(readFileSync('out/' + f, 'utf8')), { propagation: 1000 });
    row.convMs = +(performance.now() - t).toFixed(1);
    row.devices = Object.keys(dj.devices).length;
    row.subcircuits = Object.keys(dj.subcircuits || {}).length;
    const kinds = {}; for (const d of Object.values(dj.devices)) kinds[d.type] = (kinds[d.type] || 0) + 1;
    row.kinds = kinds;
    writeFileSync(`out/${name}.digitaljs.json`, JSON.stringify(dj));
    try { const c = new HeadlessCircuit(dj); c.shutdown(); row.circuit = 'ok'; } catch (e) { row.circuit = 'ERR ' + e.message.slice(0, 200); }
    row.convert = 'ok';
  } catch (e) { row.convert = 'ERR ' + e.message.slice(0, 300); }
  rows.push(row);
}
for (const r of rows) console.log(JSON.stringify(r));
writeFileSync('logs/convert.json', JSON.stringify(rows, null, 1));
