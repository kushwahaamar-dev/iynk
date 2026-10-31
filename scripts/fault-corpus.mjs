#!/usr/bin/env node
// Builds the fault corpus the rule gate runs on (T-B10-06).
//
//   node scripts/fault-corpus.mjs [--check]
//
// Converts the catalogue, keeps the Uno circuits that are meant to work as tests/fixtures/fault-corpus/clean/, applies
// the operations of broken.spec.json to a clean base to write broken/, and writes MANIFEST.json. `--check` builds in
// memory and compares with the committed files. Exit 0 when it is fine, 1 on a difference or a bad spec, 2 on bad arguments.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { convertAll } from '../src/project/convert/index.ts';
import { applyBatch } from '../src/project/apply/index.ts';
import { stateHash } from '../src/project/hash.ts';
import { netlist } from '../src/project/netlist.ts';
import { toFileText } from '../src/project/normalize.ts';
import { validateText } from '../src/project/validate.ts';
import { builtinRegistry } from '../src/parts/builtin.ts';
import { isCoreCauseId } from '../src/sim/faults/cause-ids.ts';
import { listItems } from './convert-io.mjs';
import { loadSources } from './convert-catalogue.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(root, 'tests', 'fixtures', 'fault-corpus');
const SPEC = join(DIR, 'broken.spec.json');
const AT = '2026-01-01T00:00:00.000Z';
const UNO_BOARDS = new Set(['core.uno-r3', 'core.uno-r4']);
const CLEAN_KINDS = new Set(['lesson', 'task']);
const RULE_ID = /^(rule|code|solve):[a-z0-9-]+@[0-9]+$/;
const SLOTS = 20;

class CorpusError extends Error {}

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function partRefs(project) {
  const refs = [...project.boards, ...project.components].map((part) => part.definition.ref);
  return [...new Set(refs)].sort(byText);
}

function isMeantToWork({ kind, project }) {
  return (
    CLEAN_KINDS.has(kind) &&
    UNO_BOARDS.has(project.boards[0]?.definition.ref) &&
    project.nets.length > 0 &&
    project.simulation.faults.length === 0
  );
}

async function cleanProjects() {
  const { items, sources, ctx } = await loadSources(listItems());
  const { projects } = convertAll(items, sources, ctx);
  return projects.filter(isMeantToWork).sort((a, b) => byText(a.id, b.id));
}

function problems(project) {
  const report = validateText(toFileText(project));
  const errors = report.diagnostics.filter((d) => d.severity === 'error');
  return errors.slice(0, 3).map((d) => `${d.code} ${d.message}`);
}

function breakProject(entry, base) {
  const label = `slot ${entry.slot}`;
  const applied = applyBatch(base, entry.ops, { author: { actor: 'usr_iynk', kind: 'import' }, at: AT });
  if (!applied.ok) throw new CorpusError(`${label}: ${applied.reject.code}: ${applied.reject.message}`);
  const broken = { ...applied.state, revision: base.revision };
  const bad = problems(broken);
  if (bad.length > 0) throw new CorpusError(`${label}: the broken project does not validate: ${bad.join('; ')}`);
  if (stateHash(broken) === stateHash(base)) throw new CorpusError(`${label}: the operations change nothing`);
  return broken;
}

function checkSpec(spec) {
  const slots = spec.map((entry) => entry.slot).sort((a, b) => a - b);
  if (slots.length !== SLOTS || slots.some((slot, i) => slot !== i + 1)) {
    throw new CorpusError(`broken.spec.json must hold slots 1 to ${SLOTS} once each`);
  }
  for (const entry of spec) {
    if (!isCoreCauseId(entry.expectedCauseId)) throw new CorpusError(`slot ${entry.slot}: ${entry.expectedCauseId} is not a cause id`);
    if (!RULE_ID.test(entry.expectedRule)) throw new CorpusError(`slot ${entry.slot}: ${entry.expectedRule} is not a rule id`);
  }
}

const slotFile = (entry) => `broken/slot-${String(entry.slot).padStart(2, '0')}-${entry.expectedCauseId}.project.json`;

/** Every file of the corpus as `relative path -> text`, plus the counts the script prints. */
export async function build(spec) {
  checkSpec(spec);
  const registry = builtinRegistry();
  const described = new Set(registry.list().map((summary) => summary.ref));
  const clean = await cleanProjects();
  const files = new Map();
  const manifest = { version: 1, cleanCount: clean.length, clean: [], broken: [] };

  for (const { id, kind, item, project } of clean) {
    const file = `clean/${id}.project.json`;
    const parts = partRefs(project);
    files.set(file, toFileText(project));
    manifest.clean.push({ file, source: `${kind}:${item}`, parts, described: parts.every((ref) => described.has(ref)) });
  }

  const cleanById = new Map(clean.map((c) => [c.id, c.project]));
  for (const entry of [...spec].sort((a, b) => a.slot - b.slot)) {
    const base = cleanById.get(entry.base);
    if (!base) throw new CorpusError(`slot ${entry.slot}: ${entry.base} is not a clean file`);
    const broken = breakProject(entry, base);
    netlist(broken);
    const file = slotFile(entry);
    files.set(file, toFileText(broken));
    manifest.broken.push({
      file,
      base: `clean/${entry.base}.project.json`,
      ops: entry.ops,
      expectedCauseId: entry.expectedCauseId,
      expectedRule: entry.expectedRule,
      slot: entry.slot,
    });
  }

  files.set('MANIFEST.json', `${JSON.stringify(manifest, null, 2)}\n`);
  return { files, manifest };
}

function onDisk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(DIR, join(entry.parentPath, entry.name)));
}

function committedFiles() {
  return [...onDisk(join(DIR, 'clean')), ...onDisk(join(DIR, 'broken')), 'MANIFEST.json'];
}

function differences(files) {
  const out = [];
  for (const [file, text] of files) {
    const path = join(DIR, file);
    if (!existsSync(path)) out.push(`${file} is missing`);
    else if (readFileSync(path, 'utf8') !== text) out.push(`${file} differs`);
  }
  for (const file of committedFiles()) if (!files.has(file) && existsSync(join(DIR, file))) out.push(`${file} is not in a fresh build`);
  return out;
}

function write(files) {
  rmSync(join(DIR, 'clean'), { recursive: true, force: true });
  rmSync(join(DIR, 'broken'), { recursive: true, force: true });
  for (const [file, text] of files) {
    const path = join(DIR, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
}

export async function main(argv) {
  if (argv.some((arg) => arg !== '--check')) {
    console.error('usage: node scripts/fault-corpus.mjs [--check]');
    return 2;
  }
  let built;
  try {
    built = await build(JSON.parse(readFileSync(SPEC, 'utf8')));
  } catch (e) {
    if (!(e instanceof CorpusError)) throw e;
    console.error(e.message);
    return 1;
  }
  const { files, manifest } = built;
  console.log(`clean=${manifest.cleanCount} described=${manifest.clean.filter((c) => c.described).length} broken=${manifest.broken.length}`);

  if (argv.includes('--check')) {
    const changes = differences(files);
    for (const change of changes) console.error(change);
    return changes.length > 0 ? 1 : 0;
  }
  write(files);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
