#!/usr/bin/env node
// Writes the ten Studio starters (T-B4-16) and one `blink` starter per other board (T-B5-01 on) from the converted catalogue.
//
//   node scripts/gen-starters.mjs [--check]
//
// Reads .corpus/manifest.json, so run `npm run corpus` first. Each starter is one project in
// src/studio/starters/<id>.project.json, in canonical text, with any hidden solution left out. `--check` builds them in
// memory and exits 1 when a file differs, 2 when the corpus is missing.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toCanonicalText } from '../src/project/normalize.ts';
import { blankProject } from '../src/project/blank.ts';
import { builtinRegistry } from '../src/parts/builtin.ts';
import { newUnoProject } from '../src/studio/templates.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = join(root, '.corpus');
const OUT = join(root, 'src', 'studio', 'starters');
const AT = '2026-01-01T00:00:00.000Z';
const ACTOR = 'usr_local';

// Starter id -> converted lesson. The serial echo has no lesson: its sketch is below.
const FROM_CORPUS = {
  blink: 'prj_uno-r3-blink',
  button: 'prj_uno-r3-button',
  knob: 'prj_uno-r3-knob',
  rgb: 'prj_uno-r3-rgb',
  sound: 'prj_uno-r3-sound',
  plant: 'prj_uno-r3-plant',
  board: 'prj_uno-r3-board',
  light: 'prj_uno-r3-light',
  distance: 'prj_uno-r3-distance',
};

// Board id -> converted `blink` lesson. These are the starters of the boards other than the Uno, one per board.
const BOARD_STARTERS = {
  nano: 'prj_nano-blink',
  'uno-r4': 'prj_uno-r4-blink',
  'esp32-devkitc': 'prj_esp32-devkitc-blink',
  'esp32-s3-devkitc-1': 'prj_esp32-s3-devkitc-1-blink',
  nodemcu: 'prj_nodemcu-blink',
  pico: 'prj_pico-blink',
  'microbit-v2': 'prj_microbit-v2-blink',
  'nucleo-f401re': 'prj_nucleo-f401re-blink',
  'pi4-pi5': 'prj_pi4-pi5-blink',
  basys3: 'prj_basys3-blink',
  'de10-lite': 'prj_de10-lite-blink',
};

const ECHO = `void setup() {
  Serial.begin(9600);
  Serial.println("Type a message and it comes back.");
}

void loop() {
  while (Serial.available() > 0) {
    char c = Serial.read();
    Serial.print(c);
  }
}
`;

function fromCorpus(id) {
  const manifest = JSON.parse(readFileSync(join(CORPUS, 'manifest.json'), 'utf8'));
  const entry = manifest.find((e) => e.id === id);
  if (!entry) throw new Error(`${id} is not in .corpus/manifest.json`);
  const project = JSON.parse(readFileSync(join(CORPUS, entry.kind, `${id}.project.json`), 'utf8'));
  if (project.ext) {
    delete project.ext['x-iynk-solution'];
    if (Object.keys(project.ext).length === 0) delete project.ext;
  }
  return project;
}

function serialEcho() {
  const blank = blankProject({ board: 'uno', title: 'Serial echo', locale: 'en', actor: ACTOR, now: AT, id: 'prj_starter-serial-echo' });
  blank.meta.description = 'Send text to the Uno over the serial monitor and watch it come back.';
  blank.sources[0].content = ECHO;
  let n = 0;
  const rnd = { bytes: (count) => Uint8Array.from({ length: count }, () => (n = (n * 31 + 7) % 251)) };
  return newUnoProject(blank, { registry: builtinRegistry(), rnd });
}

export function build() {
  const starters = { 'serial-echo': serialEcho() };
  for (const [id, source] of Object.entries(FROM_CORPUS)) starters[id] = fromCorpus(source);
  for (const [board, source] of Object.entries(BOARD_STARTERS)) {
    const project = fromCorpus(source);
    project.meta.kind = 'template';
    project.provenance.origin = { kind: 'template', template: `${board}-blink` };
    starters[board] = project;
  }
  return Object.fromEntries(Object.entries(starters).map(([id, project]) => [id, `${toCanonicalText(project)}\n`]));
}

export function main(argv) {
  const check = argv.includes('--check');
  if (argv.some((a) => a !== '--check')) {
    console.error('usage: node scripts/gen-starters.mjs [--check]');
    return 2;
  }
  if (!existsSync(join(CORPUS, 'manifest.json'))) {
    console.error('.corpus/manifest.json is missing. Run npm run corpus first.');
    return 2;
  }
  const files = build();
  let different = 0;
  mkdirSync(OUT, { recursive: true });
  for (const [id, text] of Object.entries(files)) {
    const path = join(OUT, `${id}.project.json`);
    if (check) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== text) {
        console.error(`${path} differs from the converted catalogue`);
        different++;
      }
    } else {
      writeFileSync(path, text);
    }
  }
  if (!check) console.log(`${Object.keys(files).length} starters written to ${OUT}`);
  return different > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  process.exitCode = main(process.argv.slice(2));
}
