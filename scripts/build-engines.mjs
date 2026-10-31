#!/usr/bin/env node
// Engine build (FRONTEND_ARCHITECTURE 8.3): turns the pinned engine packages in node_modules into static files.
//
//   node scripts/build-engines.mjs [--check] [--only <id,id>] [--if-present] [--publish]
//
// Each src/sim-host/engines/*.manifest.json names an npm package (source.npm). With source.entry, the entry is
// bundled with esbuild into public/engines/<id>@<version>/<id>.js. Without it, the package's prebuilt gen/ files
// are copied as they are. public/engines/manifest.json lists every engine with the bytes and sha256 of its files.
// The committed manifests are never changed.
//
//   --check        exit 1 when a manifest's version or licence differs from the installed package
//   --only         build just these ids; a missing package is then an error
//   --if-present   skip an engine whose package is not installed and print SKIPPED <id>
//   --publish      refuse an engine whose licence is not reviewed (D-017)
//
// Does nothing on Vercel unless --only is given. IYNK_ENGINES_ROOT points the script at another tree (the tests do).
// Exit 0: done. 1: a check, a missing package or an unreviewed licence failed.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlib } from 'node:zlib';

const root = resolve(process.env.IYNK_ENGINES_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const manifestDir = join(root, 'src', 'sim-host', 'engines');
const outRoot = join(root, 'public', 'engines');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
const check = flag('--check');
const ifPresent = flag('--if-present');
const publish = flag('--publish');

if (process.env.VERCEL && !only) {
  console.log('engines: VERCEL is set, nothing to build');
  process.exit(0);
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const brotliBytes = (bytes) => brotliCompressSync(bytes, { params: { [zlib.BROTLI_PARAM_QUALITY]: 9 } }).length;
const KINDS = { '.js': 'js', '.wasm': 'wasm' };

function fail(message) {
  console.error(`engines: ${message}`);
  process.exit(1);
}

const manifests = readdirSync(manifestDir)
  .filter((f) => f.endsWith('.manifest.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(manifestDir, f), 'utf8')))
  .filter((m) => !only || only.includes(m.id));

for (const id of only ?? []) if (!manifests.some((m) => m.id === id)) fail(`no manifest for ${id}`);

function installed(m) {
  const file = join(root, 'node_modules', m.source.npm, 'package.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}

async function bundle(m) {
  const { build } = await import('esbuild');
  const result = await build({
    entryPoints: [join(root, 'node_modules', m.source.npm, m.source.entry)],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    minify: true,
    write: false,
    logLevel: 'silent',
  });
  return result.outputFiles[0].contents;
}

/** The files an engine ships: the bundled entry, or the package's gen/ files copied unchanged. */
async function engineFiles(m) {
  if (m.source.entry) return [{ name: `${m.id}.js`, bytes: await bundle(m), kind: 'js' }];
  const gen = join(root, 'node_modules', m.source.npm, 'gen');
  return readdirSync(gen)
    .sort()
    .map((name) => ({ name, bytes: readFileSync(join(gen, name)), kind: KINDS[extname(name)] ?? 'data' }));
}

const built = [];
for (const m of manifests) {
  const pkg = installed(m);
  const skippable = ifPresent && !only;
  if (!pkg) {
    if (skippable) {
      console.log(`SKIPPED ${m.id}`);
      continue;
    }
    fail(`${m.source.npm} is not installed`);
  }
  if (pkg.version !== m.version) fail(`${m.id} is pinned to ${m.version} but ${pkg.version} is installed`);
  if (pkg.license !== m.license.spdx) fail(`${m.id} declares ${m.license.spdx} but the package says ${pkg.license}`);
  if (publish && !m.license.reviewed) fail(`${m.id} has an unreviewed licence and cannot go into a published build`);
  built.push({ m });
}

if (check) {
  console.log(`engines: ${built.length} manifests match node_modules`);
  process.exit(0);
}

const manifestFile = join(outRoot, 'manifest.json');
const listed = new Map();
if (existsSync(manifestFile)) for (const e of JSON.parse(readFileSync(manifestFile, 'utf8')).engines) listed.set(e.id, e);

for (const { m } of built) {
  const dir = join(outRoot, `${m.id}@${m.version}`);
  const files = [];
  for (const { name, bytes, kind } of await engineFiles(m)) {
    const path = `${m.id}@${m.version}/${name}`;
    const file = join(outRoot, path);
    const hash = sha256(bytes);
    if (!existsSync(file) || sha256(readFileSync(file)) !== hash) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, bytes);
    }
    files.push({ path, sha256: hash, bytes: bytes.length, brotliBytes: brotliBytes(bytes), kind });
  }
  const entry = { ...m };
  delete entry.source;
  listed.set(m.id, { ...entry, files });
  console.log(`engines: ${m.id}@${m.version} ${files.reduce((sum, f) => sum + f.bytes, 0)} bytes in ${files.length} files`);
}

mkdirSync(outRoot, { recursive: true });
const json = JSON.stringify({ engines: [...listed.values()] }, null, 2) + '\n';
if (!existsSync(manifestFile) || readFileSync(manifestFile, 'utf8') !== json) writeFileSync(manifestFile, json);
