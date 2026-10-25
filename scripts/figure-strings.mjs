// Collects every English string the built figures translate with CF_T, so phase 3 can translate them all
// (src/i18n/figures/<lang>.json) and src/i18n/figure-strings.test.ts can check nothing is missing.
//
//   node scripts/figure-strings.mjs            writes src/i18n/figure-keys.json
//   node scripts/figure-strings.mjs --check    exits 1 when the built figures show a string that file lacks
//   node scripts/figure-strings.mjs --static   the same check on the sources alone, without a browser (--why lists
//                                              the properties and tables it follows)
//
// Two passes. In a browser, each page gets a dictionary that records every key CF_T looks up (core.js checks it
// with hasOwnProperty, so a Proxy sees each one and the figure keeps its English), then every control is pressed:
// see-through, labels, views, each button and each choice of each picker, twice over so later states show too.
// Then the sources are read for the text of states no press reaches (faults, refusals, logs): see fromSources.
import { createRequire } from 'node:module';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'src/i18n/figure-keys.json');
const KINDS = ['boards', 'robotics', 'modules', 'parts', 'drones'];
const quick = process.argv.includes('--static');
const check = quick || process.argv.includes('--check');
const failures = [];
const require = createRequire(join(ROOT, 'package.json'));
const { chromium } = require('playwright');
const acorn = require('acorn');

const pages = KINDS.flatMap((kind) =>
  readdirSync(join(ROOT, 'public/figures', kind))
    .filter((f) => f.endsWith('.html'))
    .map((f) => `${kind}/${f.slice(0, -5)}`),
);

// A key is something a translator can translate: it has letters, and it is not a number with a unit that a figure
// formats at run time ("7.4 V", "378 mA"), which CF_T passes through unchanged in every language.
const translatable = (s) => /\p{L}{2}/u.test(s) && !/^[\d.,\s·:/+-]*\d[\d.,\s]*(mA|A|V|W|Ω|kΩ|°C|rpm|Hz|kHz|%|s|ms|g|mm|cm|m)?$/u.test(s);

// A filled-in template ("Blink — already set" from "{label} — already set") is built from strings translated on their
// own, and the toast passes it through CF_T again, so it is not a key of its own. A template with almost no fixed
// text ("{id} · {n} mA") would swallow real keys, so it doesn't count.
function withoutFilledTemplates(keys) {
  const hole = /\{\w+\}/;
  const fixed = (t) => t.replace(/\{\w+\}/g, '').replace(/^[\s·:—\-,.()]+|[\s·:—\-,.()]+$/g, '').length;
  const templates = keys
    .filter((k) => hole.test(k) && fixed(k) >= 4)
    .map((t) => new RegExp('^' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\w+\\\}/g, '(.+?)') + '$', 's'));
  return keys.filter((k) => hole.test(k) || !templates.some((r) => r.test(k)));
}

async function collect(browser, id) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${join(ROOT, 'public/figures', id)}.html?embed=0`);
  await page.waitForFunction(() => typeof CF_SETLOCALE === 'function' && typeof CF_UI !== 'undefined' && CF_UI !== null, null, { timeout: 20_000 });
  await page.evaluate(() => {
    window.__cfKeys = new Set();
    const keys = window.__cfKeys;
    CF_SETLOCALE('en', new Proxy({}, { getOwnPropertyDescriptor: (_, k) => void (typeof k === 'string' && keys.add(k)) }));
  });
  const press = async (selector) => {
    for (const el of await page.$$(selector)) {
      if (await el.isVisible()) await el.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(60);
    }
  };
  for (let round = 0; round < 2; round++) {
    await press('#xrb, #lblb');
    await press('.vset button');
    const buttons = await page.$$('#btns .act');
    for (let i = 0; i < buttons.length; i++) {
      const act = (await page.$$('#btns .act'))[i];
      if (!act) continue;
      await act.click({ timeout: 2_000 }).catch(() => {});
      await page.waitForTimeout(80);
      const n = (await page.$$('#btns .stepwrap.open .chip')).length;
      for (let c = 0; c < n; c++) {
        // A choice closes its picker, so reopen it for each one.
        if (c > 0) await (await page.$$('#btns .act'))[i]?.click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(60);
        const chip = (await page.$$('#btns .stepwrap.open .chip'))[c];
        if (chip) await chip.click({ timeout: 2_000 }).catch(() => {});
        await page.waitForTimeout(120);
      }
    }
  }
  const keys = await page.evaluate(() => [...window.__cfKeys]);
  await page.close();
  return { keys, errors };
}

// The static pass reads the figure sources with acorn and follows the text into T the way the engines do. Text is a
// literal passed to a translating call (CF_T, CF_L, T, say, flash, log: the drone engine's say(st, text) and
// log(st, text) take it second), the value of a property the engines translate (`T(p.name)` makes `name` one), or a
// value in a table they translate from (`say(MSG.live)`, `T(GROUP_NAMES[g])`, a craft's `messages`). Ternaries and
// `||` fallbacks are followed into each branch. The properties and tables are found in the engines and the core, then
// read in every figure.
const SAY = new Set(['CF_T', 'CF_L', 'T', 'say', 'flash', 'log']);
// Ids that a T() call falls back to (`T(def.name || q.prop)`), never text.
const NOT_TEXT = new Set(['id', 'key', 'kind', 'part', 'prop', 'state', 'status', 'color', 'type', 'mode', 'group', 'fault', 'power', 'rail', 'circuit', 'default', 't']);
const isIdent = (s) => !/\s/.test(s) && (/[.:_#/[\]]/.test(s) || /[a-z][A-Z]/.test(s));

function fromSources() {
  const files = ['figures/engine', 'figures/vendor/colorfigures', ...KINDS.map((k) => `figures/${k}`)].flatMap((dir) =>
    readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.js')).map((f) => `${dir}/${f}`),
  );
  const trees = new Map();
  for (const f of files) {
    try {
      trees.set(f, acorn.parse(readFileSync(join(ROOT, f), 'utf8'), { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, locations: true }));
    } catch (e) {
      failures.push(`${f}: can't parse (${e.message})`);
    }
  }
  const props = new Set(), tables = new Set(), tableProps = new Set(), found = new Map(), learned = [];
  const callee = (n) => (n.type === 'Identifier' ? n.name : n.type === 'MemberExpression' && !n.computed ? n.property.name : null);
  const textArg = (call) => {
    const [a, b] = call.arguments;
    const first = a && (a.type === 'Identifier' ? a.name === 'st' : a.type === 'MemberExpression' && !a.computed && a.property.name === 'st');
    return first ? b : a;
  };

  // Follow one text expression: keep its literals, learn the properties and tables it reads.
  const text = (n, file, learn) => {
    if (!n) return;
    if (n.type === 'Literal' && typeof n.value === 'string') return keep(n.value, file);
    if (n.type === 'TemplateLiteral' && !n.expressions.length) return keep(n.quasis[0].value.cooked, file);
    if (n.type === 'ConditionalExpression') return text(n.consequent, file, learn), text(n.alternate, file, learn);
    if (n.type === 'LogicalExpression') return text(n.left, file, learn), text(n.right, file, learn);
    if (n.type === 'CallExpression' && callee(n.callee) === 'String') return text(n.arguments[0], file, learn);
    if (n.type === 'CallExpression' && callee(n.callee) === 'reword') return text(n.arguments[0], file, learn), text(n.arguments[2], file, learn);
    if (n.type === 'ObjectExpression') return values(n, file);
    if (n.type !== 'MemberExpression') return;
    if (n.object.type === 'ObjectExpression') return values(n.object, file);
    if (learn) {
      if (n.object.type === 'Identifier' && /^[A-Z][A-Z_]+$/.test(n.object.name)) tables.add(n.object.name);
      if (n.computed && n.object.type === 'MemberExpression' && !n.object.computed) tableProps.add(n.object.property.name);
      if (!n.computed && !NOT_TEXT.has(n.property.name)) {
        if (n.object.type === 'Identifier' && /^[A-Z][A-Z_]+$/.test(n.object.name)) return;
        if (!props.has(n.property.name)) learned.push(`${n.property.name} <- ${file}:${n.loc.start.line}`);
        props.add(n.property.name);
      }
    }
  };
  const values = (table, file) => {
    if (table.type === 'ArrayExpression') for (const q of table.elements) text(q, file, false);
    else for (const q of table.properties) if (q.type === 'Property') text(q.value, file, false);
  };
  const keep = (s, file) => {
    if (isIdent(s)) return;
    if (!found.has(s)) found.set(s, new Set());
    found.get(s).add(file);
  };
  const propName = (q) => (q.key.type === 'Identifier' ? q.key.name : typeof q.key.value === 'string' ? q.key.value : null);

  const walk = (n, visit) => {
    if (!n || typeof n.type !== 'string') return;
    visit(n);
    for (const k in n) {
      if (k === 'loc' || k === 'start' || k === 'end') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
      else if (v && typeof v.type === 'string') walk(v, visit);
    }
  };
  const pass = (file, tree, learn) =>
    walk(tree, (n) => {
      if (n.type === 'CallExpression' && SAY.has(callee(n.callee))) text(textArg(n), file, learn);
      else if (n.type === 'Property' && !n.computed && !n.shorthand) {
        const name = propName(n);
        if (props.has(name)) text(n.value, file, learn);
        else if (tableProps.has(name) && /^(Object|Array)Expression$/.test(n.value.type)) values(n.value, file);
      } else if (n.type === 'AssignmentExpression' && n.left.type === 'MemberExpression' && !n.left.computed && props.has(n.left.property.name)) text(n.right, file, learn);
      else if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && tables.has(n.id.name)) {
        let init = n.init;
        while (init && init.type === 'AssignmentExpression') init = init.right;
        if (init && init.type === 'ObjectExpression') values(init, file);
      }
    });

  // Learn from the engines and the core until nothing new turns up, then read every figure.
  const engines = [...trees].filter(([f]) => f.startsWith('figures/engine/') || f.startsWith('figures/vendor/'));
  for (let size = -1; size !== props.size + tables.size + tableProps.size; ) {
    size = props.size + tables.size + tableProps.size;
    for (const [f, tree] of engines) pass(f, tree, true);
  }
  for (const [f, tree] of trees) pass(f, tree, false);
  // A helper that puts its first parameter in a text field (`ledCircuit = (title) => ({ title, ... })`) takes text first.
  const helpers = new Set();
  for (const [, tree] of trees)
    walk(tree, (n) => {
      if (n.type !== 'VariableDeclarator' || n.id.type !== 'Identifier' || n.init?.type !== 'ArrowFunctionExpression') return;
      let p0 = n.init.params[0];
      if (p0?.type === 'AssignmentPattern') p0 = p0.left;
      const body = n.init.body;
      if (p0?.type !== 'Identifier' || !props.has(p0.name) || body.type !== 'ObjectExpression') return;
      if (body.properties.some((q) => q.type === 'Property' && q.shorthand && q.key.name === p0.name)) helpers.add(n.id.name);
    });
  for (const [f, tree] of trees)
    walk(tree, (n) => {
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && helpers.has(n.callee.name)) text(n.arguments[0], f, false);
    });
  if (process.argv.includes('--why')) console.error(learned.join('\n') + `\ntext properties: ${[...props].sort().join(' ')}\ntables: ${[...tables].sort().join(' ')}\ntable properties: ${[...tableProps].sort().join(' ')}\nhelpers: ${[...helpers].sort().join(' ')}`);
  return found;
}

const where = new Map();
const add = (key, from) => {
  if (!translatable(key)) return;
  if (!where.has(key)) where.set(key, new Set());
  where.get(key).add(from);
};
const browser = quick ? null : await chromium.launch();
const queue = quick ? [] : [...pages];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (let id = queue.shift(); id; id = queue.shift()) {
    try {
      const { keys, errors } = await collect(browser, id);
      keys.forEach((k) => add(k, id));
      if (errors.length) failures.push(`${id}: page errors: ${errors.slice(0, 3).join(' | ')}`);
      process.stderr.write(`${id}: ${keys.length}\n`);
    } catch (e) {
      failures.push(`${id}: ${e.message.split('\n')[0]}`);
    }
  }
}));
await browser?.close();
const literals = fromSources();
for (const [key, files] of literals) for (const f of files) add(key, f);

// Only strings seen in a browser can be filled-in templates; a literal in the sources is a key whatever it looks like.
const kept = new Set([...withoutFilledTemplates([...where.keys()]), ...literals.keys()]);
const sorted = Object.fromEntries(
  [...where].filter(([k]) => kept.has(k)).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([k, v]) => [k, [...v].sort()]),
);
for (const f of failures) console.error(f);
if (check) {
  const known = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
  const missing = Object.keys(sorted).filter((k) => !(k in known));
  for (const k of missing.slice(0, process.argv.includes('--why') ? Infinity : 40)) console.error(`not in src/i18n/figure-keys.json: ${JSON.stringify(k)} (${sorted[k].join(', ')})`);
  console.log(`figure strings: ${Object.keys(sorted).length} found, ${missing.length} missing from figure-keys.json`);
  process.exit(missing.length || failures.length ? 1 : 0);
}
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n');
console.log(`figure strings: ${Object.keys(sorted).length} keys from ${pages.length} pages and the figure sources -> src/i18n/figure-keys.json`);
process.exit(failures.length ? 1 : 0);
