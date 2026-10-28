// Writes src/parts/data/breadboard.component.json, the half-size breadboard `core.breadboard-half`, from the geometry
// numbers of figures/engine/bench-bb.js:8-19 (columns 30, width 82.5 mm, height 54.5 mm) and :14-18 (row and rail
// heights, rail columns). The numbers are copied here on purpose: the figure file is frozen and is never imported.
// Pin ids and strip ids match src/project/holes.ts, which the converter uses for old documents.
// `node scripts/gen-breadboard.mjs` writes the file; `--check` fails when the committed file differs.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../src/parts/data/breadboard.component.json');

const COLS = 30;
const WIDTH = 82.5;
const HEIGHT = 54.5;
const PITCH = 2.54;
const ROW_Y = { j: 12.5, i: 15.04, h: 17.58, g: 20.12, f: 22.66, e: 30.28, d: 32.82, c: 35.36, b: 37.9, a: 40.44 };
const RAILS = [
  { id: 'RAIL_TP', y: 48.56 },
  { id: 'RAIL_TN', y: 51.1 },
  { id: 'RAIL_BP', y: 3.4 },
  { id: 'RAIL_BN', y: 5.94 },
];
const UPPER = ['a', 'b', 'c', 'd', 'e'];
const LOWER = ['f', 'g', 'h', 'i', 'j'];

const x0 = (WIDTH - (COLS - 1) * PITCH) / 2;
const colX = (c) => Math.round((x0 + (c - 1) * PITCH) * 100) / 100;
const railCols = [];
for (let k = 0; k < Math.floor((COLS * 5) / 6); k++) {
  const c = 2 + k + Math.floor(k / 5);
  if (c <= COLS) railCols.push(c);
}

const hole = (id, x, y) => ({ id, designator: id, type: 'passive', class: 'passive', position: { x, y } });
const pins = [];
const groups = [];
for (let c = 1; c <= COLS; c++) {
  for (const r of [...UPPER, ...LOWER]) pins.push(hole(`${r}${c}`, colX(c), ROW_Y[r]));
  groups.push({ id: `S${c}u`, kind: 'strip', pins: UPPER.map((r) => `${r}${c}`) });
  groups.push({ id: `S${c}l`, kind: 'strip', pins: LOWER.map((r) => `${r}${c}`) });
}
for (const rail of RAILS) {
  for (const c of railCols) pins.push(hole(`${rail.id}${c}`, colX(c), rail.y));
  groups.push({ id: rail.id, kind: 'strip', pins: railCols.map((c) => `${rail.id}${c}`) });
}

const text = (en) => ({ en });
const descriptor = {
  $schema: '../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/component.schema.json',
  schema: 'iynk.component/1',
  id: 'core.breadboard-half',
  version: '1.0.0',
  identity: {
    manufacturer: 'generic',
    model: 'Half-size breadboard',
    generic: true,
    refdes_prefix: 'BB',
    kind: 'mechanical',
    category: 'mechanical',
    description: {
      i18n_key: 'parts.breadboard-half.description',
      en: 'A half-size solderless breadboard: 30 columns of two five-hole strips and four power rails.',
    },
    legacy_ids: ['breadboard'],
    tags: ['breadboard', 'surface'],
  },
  sources: [
    {
      id: 'benchbb',
      kind: 'own-estimate',
      title: 'figures/engine/bench-bb.js: the half board geometry',
      publisher: 'iynk',
      reliability: 'unverified',
      note: 'Lines 8-19 give 30 columns, 82.5 by 54.5 mm, a 2.54 mm pitch, the row heights and the rail columns.',
    },
  ],
  pins,
  groups,
  ratings: {},
  dimensions: {
    package: 'half-size breadboard, 400 holes',
    body: { w: WIDTH, h: HEIGHT, d: 8.5 },
    accuracy: 0.3,
    source: { src: 'benchbb', loc: 'figures/engine/bench-bb.js:8-19' },
  },
  behaviour: {
    summary: text('Holes in one strip conduct to each other. The rails run the full length of the board.'),
    layers: [
      {
        id: 'strips',
        domain: 'analog',
        summary: text('A conductor. The strips are joined by the nets the document holds for each leg, not by a solver element.'),
        model: {
          kind: 'none',
          reason: text('The breadboard has no electrical behaviour of its own. Which holes are joined is the document netlist.'),
        },
      },
    ],
  },
  simulation: {
    tier: 'T1',
    status: 'modelled',
    what_it_models: [text('Each column half of five holes and each power rail is one conductor.')],
    not_modelled: [
      text('Contact resistance, stray capacitance between strips and the break in the middle of a real power rail.'),
    ],
    known_gaps: [
      {
        id: 'rail_gap',
        text: text('The rails are continuous here. Some half-size boards split them; this one is modelled as unbroken.'),
      },
    ],
    tests: [
      {
        id: 'strip_layout',
        kind: 'conformance',
        file: 'src/parts/breadboard-data.test.ts',
        state: 'present',
        note: 'Checks the hole count, the strips and that every hole is in exactly one strip.',
      },
    ],
  },
  software: { environments: [{ language: 'none' }] },
  visual: {
    breadboard: {
      figure: {
        kind: 'part',
        id: 'breadboard',
        path: 'public/figures/parts/breadboard.html',
        engine: 'colorfigures-bench',
      },
    },
    fallback: { renderer: 'generic-box', label: 'Breadboard', body_colour: '#e8e4da', show_pin_labels: false },
  },
  provenance: {
    license: 'LicenseRef-iynk-pending',
    attribution: [{ text: 'Drawing engine: Colorfigures, MIT license (figures/vendor/colorfigures/LICENSE).' }],
    authors: ['Amar Kushwaha'],
    origin: 'core',
    created: '2026-10-28',
    third_party_content: false,
    review: { status: 'unreviewed' },
    changelog: [
      {
        version: '1.0.0',
        date: '2026-10-28',
        note: 'First descriptor, generated from figures/engine/bench-bb.js.',
        behaviour_change: false,
      },
    ],
  },
};

const next = JSON.stringify(descriptor, null, 2) + '\n';
if (process.argv.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT, 'utf8');
  } catch {
    // a missing file counts as drift
  }
  if (current !== next) {
    console.error('src/parts/data/breadboard.component.json differs from scripts/gen-breadboard.mjs: run node scripts/gen-breadboard.mjs');
    process.exit(1);
  }
  console.log('breadboard.component.json is up to date');
} else {
  writeFileSync(OUT, next);
  console.log(`wrote ${pins.length} pins and ${groups.length} groups`);
}
