import fs from 'fs';
// usage: node table2.mjs <file-prefix> -> one row per proto x interaction, columns per throttle
const [prefix, ...only] = process.argv.slice(2);
const files = fs.readdirSync('results').filter(f => f.startsWith(prefix) && f.endsWith('.json'));
const rows = files.flatMap(f => JSON.parse(fs.readFileSync('results/' + f))).filter(r => r.parts === 500 && r.dpr === 1);
const protos = [...new Set(rows.map(r => r.proto))], acts = ['pan-1x', 'pan-fit', 'zoom', 'drag', 'hover'];
const thr = [...new Set(rows.map(r => r.throttle))].sort((a, b) => a - b);
console.log('| proto | interaction | ' + thr.map(t => `${t}x p50/p95/max (>33ms frames)`).join(' | ') + ' |\n|---|---|' + thr.map(() => '---').join('|') + '|');
for (const p of protos) for (const a of acts) {
  if (only.length && !only.includes(p)) continue;
  console.log(`| ${p} | ${a} | ` + thr.map(t => { const r = rows.find(r => r.proto === p && r.interaction === a && r.throttle === t); return r ? `${r.p50.toFixed(1)} / ${r.p95.toFixed(1)} / ${r.max.toFixed(1)} (${r.over33}/${r.frames})` : '-'; }).join(' | ') + ' |');
}
console.log('loads:', [...new Set(rows.map(r => r.load1m))].sort((a, b) => a - b).join(','));
