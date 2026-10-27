// Runs the RS-13 scene (copied common.mjs and rapier-run.mjs) against the split artifact, Node only.
// Usage: node run-split-hash.mjs <rs13 src dir> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [rs13, out] = process.argv.slice(2);
globalThis.__IYNK_RAPIER_WASM__ = fs.readFileSync(path.join(out, 'rapier_wasm3d_bg.wasm'));
const RAPIER = (await import(pathToFileURL(path.resolve(out, 'rapier.split.mjs')).href)).default;
const { runRapier, initRapier } = await import(pathToFileURL(path.resolve(rs13, 'rapier-run.mjs')).href);
await initRapier(RAPIER);
const r = runRapier(RAPIER);
const res = { artifact: 'rapier.split.mjs + rapier_wasm3d_bg.wasm', finalHash: r.finalHash, hashes: r.hashes, nanWords: r.nanWords, expected: 'c6a8e92d6174bd66' };
res.match = res.finalHash === res.expected;
fs.writeFileSync(path.join(out, 'split-hash-node.json'), JSON.stringify(res, null, 2));
console.log(JSON.stringify(res));
