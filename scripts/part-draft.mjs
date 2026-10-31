#!/usr/bin/env node
// Writes a descriptor skeleton from a figure file.
//
//   node scripts/part-draft.mjs <part|module> <legacy-id> [--out <dir>]
//
// Only what the figure states is filled in. Every other value is the literal string TODO, which `parts:check` and the
// per-descriptor gate refuse until a person replaces it from the fact sheet. Without --out the JSON goes to stdout.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractFigure } from './figure-extract.mjs';

// The src modules are .ts files in a package without "type": "module"; Node warns once per file.
const warn = process.emitWarning.bind(process);
process.emitWarning = (w, ...rest) => (String(w?.message ?? w).includes('Module type of') ? undefined : warn(w, ...rest));
const { pinIdFromLeg } = await import('../src/project/legacy-names.ts');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const USAGE = 'usage: node scripts/part-draft.mjs <part|module> <legacy-id> [--out <dir>]';
const TODO = 'TODO';
const todoText = { en: TODO };
const PIN_SPACING_MM = 2.54;

const ELEMENT_KINDS = [
  'wire', 'res', 'pot', 'button', 'led', 'diode', 'npn', 'motor', 'servo', 'stepper', 'sensor', 'buzzer', 'capacitor',
  'inductor', 'voltage_source', 'current_source', 'switch', 'pnp', 'mosfet_n', 'mosfet_p', 'zener', 'opamp', 'regulator_linear',
];
const TERMINALS = {
  res: ['a', 'b'],
  led: ['anode', 'cathode'],
  diode: ['anode', 'cathode'],
  button: ['a1', 'a2', 'b1', 'b2'],
  pot: ['a', 'wiper', 'b'],
};
const NPN_TERMINALS = { B: 'b', C: 'c', E: 'e' };

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[^A-Za-z0-9]+/g, '_').toLowerCase();
const isScalar = (v) => ['number', 'string', 'boolean'].includes(typeof v);

const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

function factSheet(kind, id) {
  const dir = join(root, 'docs', 'facts');
  const own = readdirSync(dir).find((f) => f.endsWith('.md') && squash(f.slice(0, -3)) === squash(id));
  const file = own ?? (kind === 'part' ? 'la-components.md' : null);
  if (!file) return null;
  const headings = readFileSync(join(dir, file), 'utf8')
    .split('\n')
    .filter((l) => /^#{1,3} /.test(l))
    .map((l) => l.replace(/^#+ /, ''));
  return { file: `docs/facts/${file}`, title: headings[0] ?? file, headings, own: Boolean(own) };
}

function sourcesFor(id, figurePath, sheet, def) {
  const out = [];
  if (sheet) {
    const names = new Set([String(def.name ?? id).toLowerCase(), id.toLowerCase()]);
    const mentions = sheet.own ? sheet.headings.slice(1) : sheet.headings.filter((h) => h.toLowerCase().split(/[^a-z0-9]+/).some((w) => names.has(w)));
    out.push({
      id: 'factsheet',
      kind: 'fact-sheet',
      title: sheet.title,
      publisher: 'iynk',
      reliability: TODO,
      note: `${sheet.file}. Sections: ${mentions.join('; ')}`.slice(0, 1000),
    });
  }
  out.push({ id: 'figurejs', kind: 'own-estimate', title: figurePath, publisher: 'iynk', reliability: 'unverified' });
  return out;
}
function pinsFor(kind, def) {
  const names =
    kind === 'part'
      ? def.legs ?? []
      : [...new Set((def.parts ?? []).filter((p) => p && (p.kind === 'male' || /-term$/.test(p.kind ?? '')) && Array.isArray(p.pins)).flatMap((p) => p.pins.filter((n) => typeof n === 'string')))];
  const pins = names.map((leg, i) => ({ id: pinIdFromLeg(leg), name: todoText, designator: leg, type: TODO, class: TODO, position: { x: Number((i * PIN_SPACING_MM).toFixed(2)), y: 0 } }));
  return pins.length > 0 ? pins : [{ id: TODO, name: todoText, designator: TODO, type: TODO, class: TODO, position: { x: 0, y: 0 } }];
}

function parametersFor(def) {
  return Object.entries(def.params ?? {}).map(([figureId, spec]) => {
    const id = snake(figureId);
    const name = def.paramNames?.[figureId] ? { en: def.paramNames[figureId] } : todoText;
    const first = def.defaults?.[figureId] ?? spec[0];
    if (spec.every((v) => typeof v === 'boolean')) return { id, name, kind: 'setting', type: 'boolean', default: first, affects: ['dc'] };
    if (spec.every((v) => typeof v === 'string')) return { id, name, kind: 'variant', type: 'enum', default: first, values: spec, affects: ['dc'] };
    const [min, max] = spec;
    return { id, name, kind: 'setting', type: 'number', default: first, min, max, unit: TODO, affects: ['dc'] };
  });
}

function defaultInstance(def) {
  const out = { id: 'U1', ...(def.defaults ?? {}) };
  for (const [id, spec] of Object.entries(def.params ?? {})) {
    if (!(id in out)) out[id] = spec[0];
  }
  return out;
}

function elecOf(def) {
  if (typeof def.elec !== 'function') return null;
  try {
    return def.elec(defaultInstance(def));
  } catch (e) {
    console.error(`elec() could not run with default parameters (${e.message}); no model layer is drafted`);
    return null;
  }
}

function literalParams(el) {
  const params = {};
  for (const [key, value] of Object.entries(el)) {
    if (key === 'type' || !isScalar(value)) continue;
    params[snake(key)] = { value, rationale: todoText, source: { src: 'figurejs', loc: TODO } };
  }
  return params;
}

function terminalsFor(el, legs) {
  const pinOf = (leg) => (typeof leg === 'number' ? legs[leg] : leg);
  if (el.type === 'npn' && el.pins) {
    const t = {};
    for (const [k, name] of Object.entries(NPN_TERMINALS)) if (el.pins[k] !== undefined && pinOf(el.pins[k]) !== undefined) t[name] = pinIdFromLeg(pinOf(el.pins[k]));
    if (Object.keys(t).length > 0) return t;
  }
  const names = TERMINALS[el.type];
  if (names && legs.length >= names.length) return Object.fromEntries(names.map((n, i) => [n, pinIdFromLeg(legs[i])]));
  return { todo: TODO };
}

function modelFor(elec, legs) {
  const kindOf = (el) => (ELEMENT_KINDS.includes(el.type) ? el.type : TODO);
  if (Array.isArray(elec) && elec.length > 1) {
    return {
      kind: 'subcircuit',
      instances: elec.map((el, i) => ({ id: `${el.type}${i + 1}`, element: kindOf(el), params: literalParams(el) })),
      nets: [{ id: 'todo', nodes: [`pin:${TODO}`, `pin:${TODO}`] }],
    };
  }
  const el = Array.isArray(elec) ? elec[0] : elec;
  return { kind: 'element', element: kindOf(el), terminals: terminalsFor(el, legs), params: literalParams(el) };
}

function faultsFor(def) {
  return (def.faults ?? []).map((f) => {
    const [legacy, label] = Array.isArray(f) ? f : [f];
    return {
      id: snake(legacy),
      kind: TODO,
      target: { pins: [TODO] },
      cause_id: TODO,
      symptom_ids: [TODO],
      legacy_id: legacy,
      description: label ? { en: label } : todoText,
    };
  });
}

function rendererFor(pinCount) {
  if (pinCount <= 2) return 'generic-two-lead';
  return pinCount <= 8 ? 'generic-dip' : 'generic-header-module';
}

function draft(kind, id, def, figurePath) {
  const pins = pinsFor(kind, def);
  const pinIds = pins.map((p) => p.id);
  const legs = def.legs ?? [];
  const elec = elecOf(def);
  const modelled = elec !== null && elec !== undefined && !(Array.isArray(elec) && elec.length === 0);
  const model = modelled ? modelFor(elec, legs) : { kind: 'none', reason: todoText };
  const solverRequires = model.kind === 'element' ? [model.element] : model.kind === 'subcircuit' ? [...new Set(model.instances.map((i) => i.element))] : [];
  const sheet = factSheet(kind, id);
  const out = {
    $schema: '../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/component.schema.json',
    schema: 'iynk.component/1',
    id: `core.${id}`,
    version: '1.0.0',
    identity: {
      manufacturer: TODO,
      model: def.name ?? id,
      generic: true,
      kind: kind === 'part' ? 'discrete' : 'module',
      category: TODO,
      description: todoText,
      legacy_ids: [id],
      tags: [],
    },
    sources: sourcesFor(id, figurePath, sheet, def),
    pins,
    ratings: {},
    parameters: parametersFor(def),
    behaviour: {
      summary: todoText,
      layers: [{ id: 'dc', domain: 'analog', reads: pinIds, summary: todoText, model }],
    },
    injectable_faults: faultsFor(def),
    simulation: {
      tier: modelled ? 'T1' : 'none',
      status: modelled ? 'partly-modelled' : 'not-modelled-yet',
      what_it_models: [todoText],
      not_modelled: [todoText],
      solver_requires: solverRequires,
      tests: modelled ? [{ id: 'todo', kind: 'conformance', file: TODO, state: 'to-write' }] : [],
    },
    software: { environments: [{ language: 'none' }] },
    visual: {
      ...(kind === 'part' && def.span
        ? {
            breadboard: {
              figure: { kind, id, path: `public/figures/parts/${id}.html`, engine: 'colorfigures-bench' },
              legs: pinIds,
              span: def.span,
            },
          }
        : {}),
      fallback: { renderer: rendererFor(pins.length), label: String(def.name ?? id).slice(0, 24), body_colour: TODO, show_pin_labels: true },
    },
    provenance: {
      license: TODO,
      attribution: [{ text: 'Drawing engine: Colorfigures, MIT license (figures/vendor/colorfigures/LICENSE).' }],
      authors: [TODO],
      origin: 'core',
      created: TODO,
      third_party_content: true,
      review: { status: 'unreviewed' },
      changelog: [{ version: '1.0.0', date: TODO, note: TODO, behaviour_change: false }],
    },
  };
  if (out.injectable_faults.length === 0) delete out.injectable_faults;
  if (out.parameters.length === 0) delete out.parameters;
  return out;
}

export function todoPaths(value, path = '', found = []) {
  if (typeof value === 'string') {
    if (value.includes(TODO)) found.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => todoPaths(v, `${path}/${i}`, found));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) todoPaths(v, `${path}/${k}`, found);
  }
  return found;
}

export async function draftFor(kind, id) {
  const folder = kind === 'part' ? 'parts' : 'modules';
  const file = `figures/${folder}/${id}.js`;
  if (!existsSync(join(root, file))) throw new Error(`no ${kind} figure at ${file}`);
  const found = await extractFigure(file);
  if (found.kind !== kind) throw new Error(`${file} registers a ${found.kind}, not a ${kind}`);
  return draft(kind, id, found.def, file);
}

async function main() {
  const args = process.argv.slice(2);
  let out;
  const rest = [];
  while (args.length > 0) {
    const arg = args.shift();
    if (arg === '--out') out = args.shift();
    else rest.push(arg);
  }
  const [kind, id] = rest;
  if (!['part', 'module'].includes(kind) || !id || rest.length !== 2 || out === '') {
    console.error(USAGE);
    process.exit(2);
  }
  let descriptor;
  try {
    descriptor = await draftFor(kind, id);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const text = `${JSON.stringify(descriptor, null, 2)}\n`;
  const todos = todoPaths(descriptor);
  if (out) {
    mkdirSync(out, { recursive: true });
    const target = join(out, `${id}.component.json`);
    writeFileSync(target, text);
    console.log(`wrote ${target}`);
    console.log(`${todos.length} TODO values to fill in:`);
    for (const p of todos) console.log(`  ${p}`);
  } else {
    process.stdout.write(text);
    console.error(`${todos.length} TODO values to fill in:`);
    for (const p of todos) console.error(`  ${p}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
