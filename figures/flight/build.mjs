// Builds public/figures/flight/range.html: one self-contained page (inline CSS and JS, no network).
// The standalone demo embeds the 5-inch course and the collision solids computed by
// src/lib/flight/world.ts, so the page draws the same geometry the sim flies against.
// Run: node figures/flight/build.mjs
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const lib = join(root, 'src/lib/flight');
const out = join(root, 'public/figures/flight/range.html');

// transpile the data modules the demo needs into a temp folder, fixing the import extensions
const tmp = mkdtempSync(join(tmpdir(), 'simlab-range-'));
const mods = ['math', 'world', 'types', 'courses/quad5', 'crafts/quad5'];
for (const m of mods) {
  const src = readFileSync(join(lib, m + '.ts'), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const fixed = js.replace(/from "(\.\.?\/[^"]+)"/g, 'from "$1.mjs"');
  mkdirSync(dirname(join(tmp, m + '.mjs')), { recursive: true });
  writeFileSync(join(tmp, m + '.mjs'), fixed);
}
const { buildSolids } = await import(pathToFileURL(join(tmp, 'world.mjs')).href);
const { quad5Course } = await import(pathToFileURL(join(tmp, 'courses/quad5.mjs')).href);
const { quad5Craft } = await import(pathToFileURL(join(tmp, 'crafts/quad5.mjs')).href);
rmSync(tmp, { recursive: true, force: true });

const demo = {
  course: quad5Course,
  solids: buildSolids(quad5Course),
  craft: { fov: quad5Craft.fov, camTilt: quad5Craft.camTilt, fpvProps: !!quad5Craft.fpvProps, fpvLevel: !!quad5Craft.fpvLevel, look: quad5Craft.look },
};

const parts = ['ink.js', 'geo.js', 'iso.js', 'fpv.js', 'main.js'].map((f) => readFileSync(join(here, 'src', f), 'utf8'));
const css = readFileSync(join(here, 'range.css'), 'utf8');
const html = readFileSync(join(here, 'range.template.html'), 'utf8')
  .replace('/*CSS*/', () => css)
  .replace('/*DEMO*/', () => JSON.stringify(demo))
  .replace('/*JS*/', () => parts.join('\n'));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log('wrote', out, (html.length / 1024).toFixed(1) + ' KiB');
