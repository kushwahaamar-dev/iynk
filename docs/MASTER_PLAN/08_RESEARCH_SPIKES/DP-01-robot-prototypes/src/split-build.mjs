// Derives the split form of @dimforge/rapier3d-deterministic-compat from the published npm files.
// Usage: node split-build.mjs <package dist dir> <out dir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const [dist, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const src = fs.readFileSync(path.join(dist, 'rapier.mjs'), 'utf8');
const wasm = fs.readFileSync(path.join(dist, 'rapier_wasm3d_bg.wasm'));
const open = src.indexOf('.toByteArray("AGFzbQ');
if (open < 0 || src.indexOf('.toByteArray("AGFzbQ', open + 1) >= 0) throw new Error('expected exactly one embedded wasm literal');
const callStart = src.lastIndexOf('oC', open); // the decoder object name in this build
const litStart = open + '.toByteArray("'.length;
const litEnd = src.indexOf('")', litStart);
const b64 = src.slice(litStart, litEnd);
if (!Buffer.from(b64, 'base64').equals(wasm)) throw new Error('embedded wasm differs from rapier_wasm3d_bg.wasm');
const callEnd = litEnd + 2;
const replacement = '(globalThis.__IYNK_RAPIER_WASM__ ?? new URL("rapier_wasm3d_bg.wasm", import.meta.url))';
const js = src.slice(0, callStart) + replacement + src.slice(callEnd);
fs.writeFileSync(path.join(out, 'rapier.split.mjs'), js);
fs.writeFileSync(path.join(out, 'rapier_wasm3d_bg.wasm'), wasm);
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const br = (b) => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length;
const jsb = Buffer.from(js);
const rep = {
  replaced: src.slice(callStart, callStart + 20) + '...',
  files: {
    'rapier.split.mjs': { raw: jsb.length, brotli11: br(jsb), sha256: sha(jsb) },
    'rapier_wasm3d_bg.wasm': { raw: wasm.length, brotli11: br(wasm), sha256: sha(wasm) },
  },
};
rep.total = { raw: jsb.length + wasm.length, brotli11_sum: rep.files['rapier.split.mjs'].brotli11 + rep.files['rapier_wasm3d_bg.wasm'].brotli11 };
fs.writeFileSync(path.join(out, 'split-build.json'), JSON.stringify(rep, null, 2));
console.log(JSON.stringify(rep, null, 2));
