#!/usr/bin/env node
// Physics engine build (ROBOTICS 16.1): derives the split form of the pinned Rapier package into
// public/engines/rapier@<version>/ and lists it in public/engines/manifest.json.
//
//   node scripts/build-physics.mjs [--check]
//
// The package ships one JS file with the WASM embedded as base64. The split form swaps that literal for a URL (or
// globalThis.__IYNK_RAPIER_WASM__) so the WASM travels as its own file. The pins live in
// src/sim-host/engines/physics/rapier.manifest.json, outside the glob of build-engines.mjs.
//
//   --check   compare the files already in public/engines with the pins and write nothing
//
// Exit 0: done. 1: a BuildError (its code is printed).

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlib } from 'node:zlib';

export const PIN = {
  npm: '@dimforge/rapier3d-deterministic-compat',
  version: '0.21.0',
  integrity: 'sha512-n7JuU62Obljlgq+OeH2DHhTmRSjRzwuJPl54tS9pFIzVQyvXsO5CH+a5KkIRBtnFWDbg1Zicv9BulG0jfBAopA==',
  gitHead: 'b716d375efc0201003f0cd9ef7168eee0b62c177',
  wasmSha256: '4e9890fd2df60072f9db06a33e4030221249c1b3687b722b2388c21f09e97551',
};

const WASM_LITERAL = /[A-Za-z_$][\w$]*\.toByteArray\("(AGFzbQ[^"]*)"\)/g;
const REPLACEMENT = '(globalThis.__IYNK_RAPIER_WASM__ ?? new URL("rapier_wasm3d_bg.wasm", import.meta.url))';
const KINDS = { 'rapier.split.mjs': 'js', 'rapier_wasm3d_bg.wasm': 'wasm', LICENSE: 'data' };

export class BuildError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BuildError';
    this.code = code;
  }
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const brotliBytes = (bytes) =>
  brotliCompressSync(bytes, { params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_SIZE_HINT]: bytes.length } }).length;

/** Swaps the embedded WASM literal of rapier.mjs for a URL and returns the two files. */
export function deriveSplit(rapierMjs, wasm) {
  const matches = [...rapierMjs.matchAll(WASM_LITERAL)];
  if (matches.length === 0) throw new BuildError('no-call', 'rapier.mjs has no embedded wasm literal');
  if (matches.length > 1) throw new BuildError('two-calls', `rapier.mjs has ${matches.length} embedded wasm literals`);
  const [call, base64] = matches[0];
  if (!Buffer.from(base64, 'base64').equals(wasm)) {
    throw new BuildError('wasm-mismatch', 'the embedded wasm differs from rapier_wasm3d_bg.wasm');
  }
  const at = matches[0].index;
  return { js: rapierMjs.slice(0, at) + REPLACEMENT + rapierMjs.slice(at + call.length), wasm };
}

function checkIntegrity(root) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
  const locked = lock.packages?.[`node_modules/${PIN.npm}`]?.integrity;
  if (locked !== PIN.integrity) {
    throw new BuildError('integrity', `package-lock.json has ${locked ?? 'no entry'} for ${PIN.npm}, expected ${PIN.integrity}`);
  }
}

function describeFile(dir, name) {
  const bytes = readFileSync(join(dir, name));
  return { name, bytes, entry: { path: `rapier@${PIN.version}/${name}`, sha256: sha256(bytes), bytes: bytes.length, brotliBytes: brotliBytes(bytes), kind: KINDS[name] } };
}

function checkPins(manifest, files) {
  const hashes = { 'rapier.split.mjs': manifest.pins.jsSha256, 'rapier_wasm3d_bg.wasm': manifest.pins.wasmSha256 };
  for (const [name, pinned] of Object.entries(hashes)) {
    const actual = files.find((f) => f.name === name).entry.sha256;
    if (actual !== pinned) throw new BuildError('pin-mismatch', `${name} is ${actual}, the pin says ${pinned || 'nothing'}`);
  }
}

const writeJson = (file, value) => {
  const json = JSON.stringify(value, null, 2) + '\n';
  if (!existsSync(file) || readFileSync(file, 'utf8') !== json) writeFileSync(file, json);
};

export async function buildPhysics({ root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), check = false } = {}) {
  const manifestFile = join(root, 'src', 'sim-host', 'engines', 'physics', 'rapier.manifest.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  const engines = join(root, 'public', 'engines');
  const outDir = join(engines, `rapier@${PIN.version}`);

  if (check) {
    const files = Object.keys(KINDS).map((name) => describeFile(outDir, name));
    checkPins(manifest, files);
    return summary(files, manifest);
  }

  checkIntegrity(root);
  const dist = join(root, 'node_modules', PIN.npm, 'dist');
  const wasm = readFileSync(join(dist, 'rapier_wasm3d_bg.wasm'));
  if (sha256(wasm) !== PIN.wasmSha256) throw new BuildError('wasm-mismatch', `rapier_wasm3d_bg.wasm is ${sha256(wasm)}, the pin says ${PIN.wasmSha256}`);
  const derived = deriveSplit(readFileSync(join(dist, 'rapier.mjs'), 'utf8'), wasm);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'rapier.split.mjs'), derived.js);
  writeFileSync(join(outDir, 'rapier_wasm3d_bg.wasm'), derived.wasm);
  copyFileSync(join(root, 'node_modules', PIN.npm, 'LICENSE'), join(outDir, 'LICENSE'));
  const files = Object.keys(KINDS).map((name) => describeFile(outDir, name));
  checkPins(manifest, files);

  const result = summary(files, manifest);
  const entries = files.map((f) => f.entry);
  writeJson(manifestFile, { ...manifest, files: entries, budget: { ...manifest.budget, rawBytes: entries.reduce((n, e) => n + e.bytes, 0) } });

  const listFile = join(engines, 'manifest.json');
  const listed = existsSync(listFile) ? JSON.parse(readFileSync(listFile, 'utf8')).engines : [];
  const { pins: _pins, form: _form, ...entry } = JSON.parse(readFileSync(manifestFile, 'utf8'));
  writeJson(listFile, { engines: [...listed.filter((e) => e.id !== entry.id), entry] });
  return result;
}

function summary(files, manifest) {
  const totalBrotli = files.filter((f) => f.entry.kind !== 'data').reduce((n, f) => n + f.entry.brotliBytes, 0);
  if (totalBrotli > manifest.budget.wireBytes) {
    throw new BuildError('size', `${totalBrotli} B brotli is over the budget of ${manifest.budget.wireBytes} B`);
  }
  return { files: files.map((f) => f.entry), totalBrotli };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { files, totalBrotli } = await buildPhysics({ check: process.argv.includes('--check') });
    for (const f of files) console.log(`${f.path}  raw ${f.bytes}  brotli ${f.brotliBytes}  sha256 ${f.sha256}`);
    console.log(`physics: total ${totalBrotli} B brotli`);
  } catch (error) {
    if (!(error instanceof BuildError)) throw error;
    console.error(`physics: ${error.code}: ${error.message}`);
    process.exit(1);
  }
}
