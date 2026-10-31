// usage: node run-yosys.mjs <file.v> [outdir]   -> prints one JSON line
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import os from 'node:os';
const t0 = performance.now();
const { runYosys } = await import('@yowasp/yosys');
const file = process.argv[2];
const outdir = process.argv[3] || 'out';
mkdirSync(outdir, { recursive: true });
const name = basename(file, '.v');
const src = readFileSync(file, 'utf8');
const script = 'read_verilog -sv in.v; hierarchy -auto-top; proc; opt; stat; write_json out.json';
const res = [];
let errText = '', stdout = '';
for (let i = 0; i < 2; i++) { // run 0 = cold (includes wasm compile), run 1 = warm
  errText = ''; stdout = '';
  const s = performance.now();
  let ok = true, files;
  try {
    files = await runYosys(['-p', script], { 'in.v': src }, {
      stdout: (b) => { stdout += b ? (typeof b === 'string' ? b : new TextDecoder().decode(b)) : ''; },
      stderr: (b) => { errText += b ? (typeof b === 'string' ? b : new TextDecoder().decode(b)) : ''; },
    });
  } catch (e) { ok = false; errText += '\nTHROW: ' + (e.message || e); }
  res.push({ ok, ms: Math.round(performance.now() - s), files });
  if (ok && i === 0 && files?.['out.json']) writeFileSync(`${outdir}/${name}.json`, files['out.json']);
}
const cells = /Number of cells:\s+(\d+)/.exec(stdout) || /(\d+)\s+cells/.exec(stdout);
const warn = [...(stdout + errText).matchAll(/Warning: (.*)/g)].map(m => m[1]).slice(0, 3);
console.log(JSON.stringify({ name, ok: res[0].ok, coldMs: res[0].ms, warmMs: res[1].ms, importMs: Math.round(t0 ? performance.now() - t0 - res[0].ms - res[1].ms : 0),
  rssMB: Math.round(process.memoryUsage().rss / 1048576), cells: cells ? +cells[1] : null, warn, err: res[0].ok ? '' : errText.slice(0, 600),
  load: os.loadavg()[0].toFixed(2) }));
