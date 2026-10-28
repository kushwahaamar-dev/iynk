#!/usr/bin/env node
// Converts the catalogue items to projects (T-B2-20c).
//
//   node scripts/convert-catalogue.mjs [--out <dir>] [--only lab/id,lab/id] [--check]
//
// Writes <out>/<kind>/<id>.project.json, <out>/report.md and <out>/manifest.json. Exit 0 when no item failed,
// 1 when one failed or `--check` found a difference from src/project/convert/corpus.manifest.json, 2 on bad arguments.
// `--only` converts just those items and never combines with `--check`.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { convertAll, manifestOf, renderReport } from '../src/project/convert/index.ts';
import { PART_REFS } from '../src/project/convert/interfaces.ts';
import { toFileText } from '../src/project/normalize.ts';
import { builtinRegistry } from '../src/parts/builtin.ts';
import { interfaceOf } from '../src/parts/pins.ts';
import { listItems, loadItem, loadTexts } from './convert-io.mjs';
import { extractBench, extractBoardCircuits, extractBoardHeaders, extractPartLegs } from './figure-extract.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AT = '2026-01-01T00:00:00.000Z';
const MANIFEST = join(root, 'src', 'project', 'convert', 'corpus.manifest.json');

async function legsOfParts() {
  const legs = /** @type {Record<string, string[]>} */ ({});
  const dir = join(root, 'figures', 'parts');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    legs[file.replace(/\.js$/, '')] = await extractPartLegs(`figures/parts/${file}`);
  }
  return legs;
}

function descriptorsOfParts() {
  const registry = builtinRegistry();
  const descriptors = new Set(registry.list().map((summary) => summary.ref));
  const params = /** @type {Record<string, unknown[]>} */ ({});
  for (const [figurePart, { ref }] of Object.entries(PART_REFS)) {
    const descriptor = registry.latest(ref);
    if (descriptor) params[figurePart] = interfaceOf(descriptor).params ?? [];
  }
  return { descriptors, params };
}

/** Reads everything the converters need for these items (and the boards they run on) into lookups. */
export async function loadSources(wanted) {
  const items = new Map();
  const texts = new Map();
  const circuits = new Map();
  const headers = new Map();
  const benches = new Map();
  const key = (lab, id) => `${lab}/${id}`;

  const need = async (lab, id) => {
    if (items.has(key(lab, id))) return items.get(key(lab, id));
    const item = loadItem(lab, id);
    items.set(key(lab, id), item);
    texts.set(key(lab, id), loadTexts(lab, id));
    if (lab === 'board') {
      circuits.set(id, await extractBoardCircuits(id));
      headers.set(id, await extractBoardHeaders(id));
    } else if (lab === 'robotics') {
      benches.set(id, await extractBench(id));
      if (item.data.board !== null) await need('board', item.data.board);
      for (const task of item.data.tasks) await need('board', task.board);
    }
    return item;
  };

  for (const { lab, id } of wanted) await need(lab, id);
  const sources = {
    item: (lab, id) => items.get(key(lab, id)),
    texts: (lab, id) => texts.get(key(lab, id)),
    circuits: (id) => circuits.get(id),
    headers: (id) => headers.get(id),
    bench: (id) => benches.get(id),
  };
  const ctx = { at: AT, version: '0.1.0', headers: [], legs: await legsOfParts(), ...descriptorsOfParts() };
  return { items: wanted.map(({ lab, id }) => items.get(key(lab, id))), sources, ctx };
}

function parseArgs(argv) {
  const args = { out: join(root, '.corpus'), only: null, check: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) args.out = resolve(argv[++i]);
    else if (argv[i] === '--only' && argv[i + 1]) args.only = argv[++i].split(',').filter(Boolean);
    else if (argv[i] === '--check') args.check = true;
    else return null;
  }
  return args.check && args.only ? null : args;
}

function selected(only) {
  const all = listItems();
  if (!only) return all;
  return only.map((name) => {
    const found = all.find((i) => `${i.lab}/${i.id}` === name);
    if (!found) throw new Error(`${name} is not a catalogue item`);
    return found;
  });
}

function write(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function differences(fresh, committed) {
  const byId = (rows) => new Map(rows.map((row) => [row.id, JSON.stringify(row)]));
  const a = byId(fresh);
  const b = byId(committed);
  const out = [];
  for (const [id, row] of a) if (!b.has(id)) out.push(`${id} is new`);
  for (const [id, row] of b) {
    if (!a.has(id)) out.push(`${id} is gone`);
    else if (a.get(id) !== row) out.push(`${id} changed`);
  }
  return out;
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (!args) {
    console.error('usage: node scripts/convert-catalogue.mjs [--out <dir>] [--only lab/id,lab/id | --check]');
    return 2;
  }
  const { items, sources, ctx } = await loadSources(selected(args.only));
  const { projects, report } = convertAll(items, sources, ctx);
  const manifest = manifestOf(projects);

  for (const { id, kind, project } of projects) write(join(args.out, kind, `${id}.project.json`), toFileText(project));
  write(join(args.out, 'report.md'), renderReport(report));
  write(join(args.out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const { totals } = report;
  console.log(`${totals.items} items, ${totals.projects} projects: ${totals.whole} whole, ${totals.legacy} legacy, ${totals.failed} failed. Report: ${join(args.out, 'report.md')}`);
  if (totals.failed > 0) {
    for (const item of report.items.filter((i) => i.status === 'failed')) console.error(`failed: ${item.lab}/${item.id}`);
    return 1;
  }
  if (args.check) {
    let committed;
    try {
      committed = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    } catch (e) {
      console.error(`cannot read ${MANIFEST} (${e.message})`);
      return 1;
    }
    const changes = differences(manifest, committed);
    for (const change of changes) console.error(change);
    if (changes.length > 0) return 1;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
