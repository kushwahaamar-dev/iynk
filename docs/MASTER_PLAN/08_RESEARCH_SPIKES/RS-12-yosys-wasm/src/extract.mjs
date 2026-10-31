// Pull every Verilog lesson source out of the two board files (regex on the template literals).
import { readFileSync, writeFileSync } from 'node:fs';
const root = '/Users/amar/Codes/ak/simlab/src/content/boards/';
const out = [];
for (const board of ['basys3', 'de10-lite']) {
  const t = readFileSync(root + board + '.ts', 'utf8');
  const consts = {};
  for (const m of t.matchAll(/^const ([A-Z0-9_]+) = `([\s\S]*?)`;$/gm)) consts[m[1]] = m[2];
  // lessons: id, language verilog, code.source, params defaults
  for (const m of t.matchAll(/id: '([a-z0-9-]+)', n: \d+, level: '[a-z]+', language: 'verilog',\n\s*code: \{ source: ([A-Z0-9_]+),([^\n]*)\n\s*params: \[([^\n]*)\]/g)) {
    const [, id, name, codeRest, params] = m;
    const defs = {};
    for (const p of params.matchAll(/id: '(\w+)'[^}]*?default: (\d+)/g)) defs[p[1]] = p[2];
    let src = consts[name];
    if (!src) throw new Error('no const ' + name);
    src = src.replace(/\{\{t:[^}]+\}\}/g, 'text').replace(/\{\{p:(\w+)\}\}/g, (_, k) => defs[k]);
    const top = /top: '(\w+)'/.exec(codeRest)?.[1];
    out.push({ board, id, source: src, defs, top });
    writeFileSync(`fixtures/${board}-${id}.v`, src);
  }
}
// starter: the repo's empty program (lessons.test.ts EMPTY.verilog)
writeFileSync('fixtures/starter-empty.v', 'module top();\nendmodule\n');
writeFileSync('fixtures/index.json', JSON.stringify(out.map(({ source, ...r }) => r), null, 1));
console.log(out.length, 'lessons extracted'); console.log(out.map(o => o.board + '/' + o.id + ' top=' + o.top + ' ' + JSON.stringify(o.defs)).join('\n'));
