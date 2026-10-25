// Builds public/figures/flight/range.html: one self-contained page (inline CSS and JS, no network).
// The standalone demo embeds the 5-inch gate race as the flight registry builds it from quad5's content
// (src/lib/flight/registry.ts), with the collision solids src/lib/flight/world.ts computes, so the page draws
// the same geometry the sim flies against.
// Run: node figures/flight/build.mjs
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const src = join(root, 'src');
const out = join(root, 'public/figures/flight/range.html');

// transpile the modules the demo needs into a temp tree laid out like src/, fixing the import specifiers
// ("./math" and "@/content/ids" become relative .mjs paths; type-only imports vanish in the transpile)
const tmp = mkdtempSync(join(tmpdir(), 'iynk-range-'));
const mods = ['lib/flight/math', 'lib/flight/world', 'lib/flight/types', 'lib/flight/route', 'lib/flight/registry', 'content/ids', 'content/drones/quad5'];
for (const m of mods) {
  const code = readFileSync(join(src, m + '.ts'), 'utf8');
  const js = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const fixed = js.replace(/from (["'])((?:\.\.?|@)\/[^"']+)\1/g, (_, q, spec) => {
    if (!spec.startsWith('@/')) return `from ${q}${spec}.mjs${q}`;
    let rel = relative(dirname(join(tmp, m)), join(tmp, spec.slice(2)));
    if (!rel.startsWith('.')) rel = './' + rel;
    return `from ${q}${rel}.mjs${q}`;
  });
  mkdirSync(dirname(join(tmp, m + '.mjs')), { recursive: true });
  writeFileSync(join(tmp, m + '.mjs'), fixed);
}
const { buildSolids } = await import(pathToFileURL(join(tmp, 'lib/flight/world.mjs')).href);
const { flightOf } = await import(pathToFileURL(join(tmp, 'lib/flight/registry.mjs')).href);
const { default: quad5 } = await import(pathToFileURL(join(tmp, 'content/drones/quad5.mjs')).href);
rmSync(tmp, { recursive: true, force: true });

const { craft, courses } = flightOf(quad5);
const race = courses.find((c) => c.kind === 'gates');
const demo = {
  course: race,
  solids: buildSolids(race),
  craft: { fov: craft.fov, camTilt: craft.camTilt, fpvProps: !!craft.fpvProps, fpvLevel: !!craft.fpvLevel, look: craft.look },
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
