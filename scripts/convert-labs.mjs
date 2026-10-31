#!/usr/bin/env node
// Generates the lab template projects: robotics benches and tasks, and drone crafts (T-B13-15).
//
//   node scripts/convert-labs.mjs (--write | --check) [--set robotics-a|robotics-b|drones-a|drones-b] [--root <dir>]
//
// Converts the catalogue items of each set in memory and writes one <id>.project.json per project and the set's
// index.ts to content/projects/<lab>/<set>/. With `--check` it writes nothing and names every file whose bytes differ.
// A set folder that holds no project file yet is checked for its empty index.ts only. `--root` moves the output
// folder (the unit test uses it). Exit 0 when done (or when the files match), 1 on a failed conversion or a
// difference, 2 on bad arguments.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { stateHash } from '../src/project/hash.ts';
import { toCanonicalText } from '../src/project/normalize.ts';
import { validateText } from '../src/project/validate.ts';

const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = 'index.ts';
const SUFFIX = '.project.json';
const SOURCES = join(here, 'src', 'lib', 'drone', '__fixtures__', 'sources.json');
const TEXT_KEY = /^[a-z]+\.[A-Za-z0-9_.-]+$/;

/** The four sets in order; together they cover ROBOTICS_IDS and DRONE_IDS once. */
const SETS = {
  'robotics-a': { lab: 'robotics', folder: 'robotics/a', items: ['uno-r3-build', 'led-resistor', 'transistor-switch', 'esp32-s3-build', 'tb6612fng', 'l298n'] },
  'robotics-b': { lab: 'robotics', folder: 'robotics/b', items: ['a4988', 'pca9685', 'mpu6050', 'hc-sr04', 'qtr-8rc', 'lm2596', 'pi5-ros2'] },
  'drones-a': { lab: 'drone', folder: 'drones/a', items: ['quad5', 'whoop', 'cinewhoop', 'longrange', 'racer', 'gpscam', 'delivery'] },
  'drones-b': { lab: 'drone', folder: 'drones/b', items: ['agrihex', 'wing', 'vtol', 'swarm', 'tricopter', 'octo'] },
};

const projectId = (lab, id, child) => (lab === 'robotics' ? `prj_robotics-${id}${child ? `-${child}` : ''}` : `prj_drone-${id}`);

function parseArgs(argv) {
  const args = { mode: null, sets: Object.keys(SETS), root: join(here, 'content', 'projects') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--write' || argv[i] === '--check') args.mode = argv[i].slice(2);
    else if (argv[i] === '--set' && SETS[argv[i + 1]]) args.sets = [argv[++i]];
    else if (argv[i] === '--root' && argv[i + 1]) args.root = resolve(argv[++i]);
    else return null;
  }
  return args.mode ? args : null;
}

/** Fails when a set names an id the catalogue does not have, or when the four sets do not cover each list once. */
function validateSets(ids) {
  const problems = [];
  for (const [name, { lab, items }] of Object.entries(SETS)) {
    for (const id of items) if (!ids[lab].includes(id)) problems.push(`${name} lists ${id}, which is not a ${lab} item`);
  }
  for (const lab of Object.keys(ids)) {
    const listed = Object.values(SETS).filter((set) => set.lab === lab).flatMap((set) => set.items);
    for (const id of ids[lab]) if (listed.filter((x) => x === id).length !== 1) problems.push(`${lab}/${id} is not in exactly one set`);
  }
  return problems;
}

function fixtureSources() {
  if (!existsSync(SOURCES)) return [];
  return JSON.parse(readFileSync(SOURCES, 'utf8')).map(({ file, note, source, review }) => ({ id: file, note, source, review }));
}

/** The text keys a project shows as their own English text: the converter's mark of a key with no text. */
function unresolvedKeys(node, english, found = new Set()) {
  if (Array.isArray(node)) node.forEach((v) => unresolvedKeys(v, english, found));
  else if (node && typeof node === 'object') {
    if (typeof node.en === 'string' && TEXT_KEY.test(node.en) && english[node.en] === undefined) found.add(node.en);
    for (const v of Object.values(node)) unresolvedKeys(v, english, found);
  }
  return found;
}

async function convertSets(names, log) {
  const { loadSources } = await import('./convert-catalogue.mjs');
  const { convertBench } = await import('../src/project/convert/bench.ts');
  const { convertCraft } = await import('../src/project/convert/craft.ts');
  const { convertPracticeTask } = await import('../src/project/convert/practice.ts');
  const { legacyCause } = await import('../src/content/faults/legacy-map.ts');

  const wanted = names.flatMap((name) => SETS[name].items.map((id) => ({ lab: SETS[name].lab, id })));
  const { items, sources, ctx } = await loadSources(wanted);
  const base = { ...ctx, causeOf: legacyCause, projectId, fixtureSources: fixtureSources() };
  const boardOf = (id) => sources.item('board', id);
  const converted = new Map(names.map((name) => [name, []]));
  let failed = false;

  names.forEach((name) => {
    SETS[name].items.forEach((id, position) => {
      const item = items.find((i) => i.lab === SETS[name].lab && i.id === id);
      const texts = sources.texts(item.lab, id);
      const results = [];
      if (item.lab === 'robotics') {
        const figure = sources.bench(id);
        const board = item.data.board === null ? null : boardOf(item.data.board);
        results.push({ kind: 'bench', order: 0, board: item.data.board, result: convertBench(item, texts, figure, { ...base, headers: [], board }) });
        item.data.tasks.forEach((task, i) => {
          const circuits = { ...sources.circuits(task.board), ...figure.circuits };
          const taskCtx = { ...base, headers: sources.headers(task.board) };
          results.push({ kind: 'task', order: i + 1, board: task.board, result: convertPracticeTask(item, task.id, texts, boardOf(task.board), circuits, taskCtx) });
        });
      } else {
        results.push({ kind: 'craft', order: position, board: null, result: convertCraft(item, texts, base) });
      }
      for (const row of results) {
        const { project } = row.result;
        const text = `${toCanonicalText(project)}\n`;
        const report = validateText(text);
        const problems = report.diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code} ${d.path}: ${d.message}`);
        for (const key of unresolvedKeys(project, texts.en)) problems.push(`the text key ${key} has no English text`);
        for (const problem of problems.slice(0, 5)) console.error(`${project.id}: ${problem}`);
        if (problems.length > 0) failed = true;
        const codes = {};
        for (const r of row.result.report) codes[r.code] = (codes[r.code] ?? 0) + 1;
        log(project.id, text, project, codes);
        converted.get(name).push({ ...row, item, text });
      }
    });
  });
  return failed ? null : converted;
}

const localized = (text) => (typeof text === 'string' ? { en: text } : text);

function entryOf({ kind, order, board, item, result: { project } }) {
  const { guide } = project;
  const catalogue = project.provenance.origin.catalogue;
  const steps = guide?.steps ?? guide?.assembly ?? [];
  return {
    id: project.id,
    title: localized(guide?.title ?? project.meta.title),
    lab: item.lab,
    kind,
    bench: kind === 'task' ? item.id : null,
    board,
    order,
    stepCount: steps.length,
    catalogue: { lab: catalogue.lab, id: catalogue.id, child: catalogue.child ?? null },
  };
}

function indexText(entries) {
  const imports = ["import type { LabTemplateEntry } from '../../index';"];
  if (entries.length > 0) imports.unshift("import type { Project } from '@/project/generated/types';");
  const rows = entries.map((entry) => {
    const fields = Object.entries(entry).map(([key, value]) => `    ${key}: ${JSON.stringify(value)},`);
    const load = `() => import(${JSON.stringify(`./${entry.id}${SUFFIX}`)}).then((m) => m.default as unknown as Project)`;
    return `  {\n${fields.join('\n')}\n    load: ${load},\n  },`;
  });
  return [
    '// Generated by scripts/convert-labs.mjs. Do not edit; run `node scripts/convert-labs.mjs --write`.',
    ...imports,
    '',
    `export const TEMPLATES: readonly LabTemplateEntry[] = [${rows.length > 0 ? `\n${rows.join('\n')}\n` : ''}];`,
    '',
  ].join('\n');
}

function filesOf(rows) {
  const files = new Map(rows.map((row) => [`${row.result.project.id}${SUFFIX}`, row.text]));
  files.set(INDEX, indexText(rows.map(entryOf)));
  return files;
}

function onDisk(dir) {
  if (!existsSync(dir)) return new Map();
  const names = readdirSync(dir).filter((name) => name === INDEX || name.endsWith(SUFFIX));
  return new Map(names.map((name) => [name, readFileSync(join(dir, name), 'utf8')]));
}

function differences(expected, found) {
  const out = [];
  for (const [name, text] of expected) {
    if (!found.has(name)) out.push(`${name} is missing`);
    else if (found.get(name) !== text) out.push(`${name} differs`);
  }
  for (const name of found.keys()) if (!expected.has(name)) out.push(`${name} is not generated`);
  return out;
}

function write(dir, expected) {
  mkdirSync(dir, { recursive: true });
  for (const name of onDisk(dir).keys()) if (!expected.has(name)) rmSync(join(dir, name));
  for (const [name, text] of expected) writeFileSync(join(dir, name), text);
}

export async function main(argv) {
  const args = parseArgs(argv);
  if (!args) {
    console.error('usage: node scripts/convert-labs.mjs (--write | --check) [--set robotics-a|robotics-b|drones-a|drones-b] [--root <dir>]');
    return 2;
  }
  const { ROBOTICS_IDS, DRONE_IDS } = await import('../src/content/ids.ts');
  const problems = validateSets({ robotics: ROBOTICS_IDS, drone: DRONE_IDS });
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    return 1;
  }

  const folder = (name) => join(args.root, SETS[name].folder);
  const writing = args.mode === 'write';
  const generated = writing ? args.sets : args.sets.filter((name) => [...onDisk(folder(name)).keys()].some((file) => file !== INDEX));
  const log = (id, text, project, codes) => {
    const counts = Object.entries(codes).map(([code, n]) => `${code} ${n}`).join(', ');
    console.log(`${id}${SUFFIX} ${Buffer.byteLength(text)} bytes ${stateHash(project).slice(0, 12)}${counts ? ` (${counts})` : ''}`);
  };
  const converted = generated.length > 0 ? await convertSets(generated, log) : new Map();
  if (!converted) return 1;

  let status = 0;
  for (const name of args.sets) {
    const expected = filesOf(converted.get(name) ?? []);
    if (writing) {
      write(folder(name), expected);
      console.log(`${name}: ${expected.size - 1} projects`);
    } else {
      const changes = differences(expected, onDisk(folder(name)));
      for (const change of changes) console.error(`content/projects/${SETS[name].folder}/${change}`);
      if (changes.length > 0) status = 1;
    }
  }
  return status;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
