// The DigitalJS pass: yosys2digitaljs's own script (hierarchy, proc, opt, memory -nomap, wreduce, opt -full) -> JSON
// usage: node --experimental-wasm-exnref run-yosys-djs.mjs <file.v> [outdir] [chparam "NAME=val"]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename } from 'node:path';
import { runYosys } from '@yowasp/yosys';
const [file, outdir = 'out', cp] = process.argv.slice(2);
mkdirSync(outdir, { recursive: true });
const name = basename(file, '.v') + (cp ? '-cp' : '');
const chp = cp ? cp.split(',').map(kv => { const [k, v] = kv.split('='); return `chparam -set ${k} ${v} top`; }).join('; ') + '; ' : '';
const script = `read_verilog -sv in.v; setattr -mod -unset top; hierarchy -auto-top; ${chp}proc; opt; memory -nomap; wreduce -memx; opt -full; opt; ${process.env.EXTRA || ""}write_json out.json`;
let err = '';
const s = performance.now();
try {
  const files = await runYosys(['-p', script], { 'in.v': readFileSync(file, 'utf8') }, { stderr: (b) => { err += typeof b === 'string' ? b : new TextDecoder().decode(b ?? new Uint8Array()); } });
  writeFileSync(`${outdir}/${name}.djs.json`, files['out.json']);
  console.log(JSON.stringify({ name, ok: true, ms: Math.round(performance.now() - s) }));
} catch (e) { console.log(JSON.stringify({ name, ok: false, err: (err + e.message).slice(0, 500) })); }
