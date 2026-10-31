#!/usr/bin/env node
// Writes the bench-check sheet of R-130 (T-B10-30): ten faults that are safe to build on a real Uno, each with the
// reading the model gives and an empty place for the reading from the bench.
//
//   node scripts/bench-check-sheet.mjs [--check]
//
// Builds every row headless, measures it with the simulated multimeter and writes tests/fixtures/bench-check/uno-10.json.
// A row that already holds a `real` result keeps it. `--check` simulates again and compares `simulated` with the committed
// file. Exit 0 when it is fine, 1 on a difference or a row that cannot be built, 2 on bad arguments.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { builtinRegistry } from '../src/parts/builtin.ts';
import { buildSimNetlist } from '../src/sim/netlist.ts';
import { createLiveAnalog, modelIdsOf, pinElementId } from '../src/sim/analog/live.ts';
import { readBoardPower } from '../src/sim/analog/rails.ts';
import { PWL_OPTIONS } from '../src/sim/analog/elements.ts';
import { solve } from '../src/sim/analog/solve.ts';
import { applyFaults } from '../src/sim/faults/apply.ts';
import { listCandidates } from '../src/sim/faults/generate.ts';
import { buildNetView } from '../src/sim/faults/netlist-view.ts';
import { faultToOps } from '../src/sim/faults/ops.ts';
import { createProbeTap } from '../src/sim/probe/tap.ts';
import { meterReading, meterSettings } from '../src/sim/probe/meter.ts';
import { loadRegistry } from '../src/sim/registry/entries.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CORPUS = join(root, 'tests', 'fixtures', 'fault-corpus');
export const FIXTURE = join(root, 'tests', 'fixtures', 'bench-check', 'uno-10.json');
const BOARD = 'brd_main';
const LOADING_OHMS = 10e6;
const OHM_UNITS = { 'Ω': 1, 'kΩ': 1e3, 'MΩ': 1e6 };

class SheetError extends Error {}

const led = { A: 'cmp_led1.A', K: 'cmp_led1.K' };

/**
 * The ten rows. `drive` lists the board pins the sketch holds high while the reading is taken; a wrong-pin-in-code row
 * drives the pin its fault moves the sketch to. `pick` finds a generator candidate on the project, `slot` is a corpus slot.
 */
export const ROWS = [
  {
    id: 'bench-01-led-reversed',
    cause_id: 'led-reversed',
    project: 'prj_uno-r3-blink',
    pick: { generator: 'reverse-part', part: 'cmp_led1' },
    setup: 'Turn the LED round: anode to GND, cathode to the resistor. Let the sketch hold D13 high and read across the LED.',
    measure: { a: led.A, b: led.K, unit: 'V' },
    drive: [`${BOARD}.D13`],
  },
  {
    id: 'bench-02-open-connection',
    cause_id: 'open-connection',
    project: 'prj_uno-r3-plant',
    pick: { generator: 'open-wire', part: 'cmp_oled1', pin: 'VCC' },
    setup: 'Lift the VCC leg of the display module out of its breadboard hole. Power the Uno over USB.',
    measure: { a: 'cmp_oled1.VCC', b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-03-missing-ground',
    cause_id: 'missing-ground',
    project: 'prj_uno-r3-plant',
    pick: { generator: 'missing-ground', part: 'cmp_oled1', pin: 'GND' },
    setup: 'Lift the GND leg of the display module out of its breadboard hole. Power the Uno over USB.',
    measure: { a: 'cmp_oled1.VCC', b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-04-button-no-pulldown',
    cause_id: 'button-no-pulldown',
    project: 'slot-07-button-no-pulldown',
    slot: 7,
    setup: 'Remove the 10 kOhm pull-down from D2 and leave the button released. Read D2 against GND with a meter of 10 MOhm or more.',
    measure: { a: `${BOARD}.D2`, b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-05-i2c-missing-pullup',
    cause_id: 'i2c-missing-pullup',
    project: 'slot-11-i2c-missing-pullup',
    slot: 11,
    setup: 'Fit two 10 kOhm pull-ups from SDA and SCL but leave their other ends unconnected. Read SDA against GND while the bus is idle.',
    measure: { a: `${BOARD}.SDA`, b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-06-swapped-pins',
    cause_id: 'swapped-pins',
    project: 'prj_uno-r3-plant',
    pick: { generator: 'swap-pins' },
    setup: 'Exchange the SDA and SCL wires of the display module. Read the module SDA pin against GND while the bus is idle.',
    measure: { a: 'cmp_oled1.SDA', b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-07-wrong-value',
    cause_id: 'wrong-value',
    project: 'prj_uno-r3-blink',
    fault: {
      id: 'flt_bench_wrong-value_cmp-res1_ohms-10k',
      cause_id: 'wrong-value',
      symptom_ids: [],
      kind: 'wrong-value',
      target: { component: 'cmp_res1' },
      params: { parameter: 'ohms', value: 10000 },
      enabled: true,
    },
    setup: 'Fit a 10 kOhm resistor where the 220 Ohm resistor belongs. Power off and read the resistor with the ohm range.',
    measure: { a: 'cmp_res1.P1', b: 'cmp_res1.P2', unit: 'ohm' },
    drive: [],
  },
  {
    id: 'bench-08-part-not-powered',
    cause_id: 'part-not-powered',
    project: 'slot-06-part-not-powered',
    slot: 6,
    setup: 'Move the VCC of the 5 V distance module from the 5V pin to the 3V3 pin. Read the module VCC against GND.',
    measure: { a: 'cmp_us1.VCC', b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-09-wrong-pin-in-code',
    cause_id: 'wrong-pin-in-code',
    project: 'prj_uno-r3-blink',
    pick: { generator: 'wrong-pin-in-code' },
    setup: 'Change the pin number of the LED in the sketch to the one the fault names and upload it. Read D13 against GND.',
    measure: { a: `${BOARD}.D13`, b: 'ground', unit: 'V' },
    drive: [],
  },
  {
    id: 'bench-10-floating-input',
    cause_id: 'floating-input',
    project: 'slot-05-floating-input',
    slot: 5,
    setup: 'Lift the wiper wire of the potentiometer so A0 hangs in the air. Read A0 against GND with a meter of 10 MOhm or more.',
    measure: { a: `${BOARD}.A0`, b: 'ground', unit: 'V' },
    drive: [],
  },
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function projectOf(row) {
  const dir = row.slot === undefined ? 'clean' : 'broken';
  return readJson(join(CORPUS, dir, `${row.project}.project.json`));
}

function describeWith(registry) {
  return (id) => {
    const [ref = '', version = ''] = id.split('@');
    return registry.get(ref, version);
  };
}

/** The netlist keeps a setting that points at a project parameter as the pointer; the solver wants its value. */
function withParameters(net, doc) {
  const values = new Map(doc.parameters.map((p) => [p.id, p.value]));
  const resolved = (v) => (v !== null && typeof v === 'object' && 'param' in v ? (values.get(v.param) ?? v) : v);
  const parts = net.parts.map((part) => ({ ...part, params: Object.fromEntries(Object.entries(part.params).map(([k, v]) => [k, resolved(v)])) }));
  return { ...net, parts };
}

function ctxOf(view, registry) {
  const polePins = (part) => (view.descriptor(part)?.pins ?? []).filter((p) => p.polarity);
  return {
    partPins: (part) => (view.descriptor(part)?.pins ?? []).map((p) => ({ part, pin: p.id })),
    pinNet: (p) => view.pin(p.part, p.pin)?.net ?? null,
    boardPinsOn: (net) => view.pinsOn(net).filter((p) => view.isBoard(p.part)).map(({ part, pin }) => ({ part, pin })),
    isPolarised: (part) => polePins(part).length > 0,
    paramValue: (part, param) => {
      const v = view.param(part, param);
      return typeof v === 'number' ? v : undefined;
    },
    supplyParam: () => undefined,
    secondsToNs: (s) => Math.round(s * 1e9),
    ids: {
      resistor: `core.resistor@${registry.latest('core.resistor')?.version ?? ''}`,
      resistanceParam: 'ohms',
      polarPins: (part) => {
        const [a, b] = polePins(part);
        return a && b ? [a.id, b.id] : undefined;
      },
    },
  };
}

function faultOf(row, doc, view, sources) {
  if (row.fault) return row.fault;
  if (!row.pick) return undefined;
  const { generator, part, pin } = row.pick;
  const found = listCandidates(doc, view, sources).filter(
    (c) => c.generator === generator && (part === undefined || c.label.part === part) && (pin === undefined || c.label.pin === pin),
  );
  if (found.length === 0) throw new SheetError(`${row.id}: no ${generator} candidate on ${row.project}`);
  return found.sort((a, b) => (a.fault.id < b.fault.id ? -1 : 1))[0].fault;
}

/** A lifted leg is a pin on no net. The probe touching it sits on a net of its own, and the meter input (10 MOhm) is all that joins it to ground. */
function probeNet(net, ref, resistor) {
  if (ref === 'ground') return { net, id: net.ground };
  const [part, pin] = ref.split('.');
  const found = net.parts.find((p) => p.id === part)?.pins[pin];
  if (found === undefined) throw new SheetError(`${ref} is not a pin of the circuit`);
  if (found !== null) return { net, id: found };
  const id = `lifted:${ref}`;
  const parts = net.parts.map((p) => (p.id === part ? { ...p, pins: { ...p.pins, [pin]: id } } : p));
  const meter = { id: `meter:${ref}`, descriptor: resistor, params: { ohms: LOADING_OHMS }, pins: { P1: id, P2: net.ground }, kind: 'resistor' };
  return { net: { ...net, nets: [...net.nets, { id }], parts: [...parts, meter] }, id };
}

/** The board pins the sketch holds high: the row's own list, plus the pin a code-pin fault moves the sketch to. */
function drivenPins(row, ops) {
  const moved = ops.flatMap((op) => (op.kind === 'code-pin' ? [`${BOARD}.D${op.to}`] : []));
  return [...row.drive, ...moved];
}

export function simulate(row) {
  const registry = builtinRegistry();
  const describe = describeWith(registry);
  const doc = projectOf(row);
  const sources = Object.fromEntries(doc.sources.map((s) => [s.path, s.content]));
  const base = withParameters(buildSimNetlist(doc, registry).net, doc);
  const view = buildNetView(base, describe);
  const ctx = ctxOf(view, registry);
  const fault = faultOf(row, doc, view, sources);

  let net = base;
  let ops = [];
  if (fault) {
    const applied = applyFaults({ net: base, sources }, [fault], ctx, 0);
    if (!applied.ok) throw new SheetError(`${row.id}: ${applied.error.message}`);
    net = applied.value.net;
    const made = faultToOps(fault, ctx);
    if (!made.ok) throw new SheetError(`${row.id}: ${made.error.message}`);
    ops = made.value;
  }

  const red = probeNet(net, row.measure.a, ctx.ids.resistor);
  const black = probeNet(red.net, row.measure.b, ctx.ids.resistor);
  net = black.net;
  const boards = new Map(net.parts.filter((p) => p.kind === 'board').map((p) => [p.id, describe(p.descriptor)]));
  const live = createLiveAnalog({
    solve,
    registry: loadRegistry(),
    pins: (part) => (boards.has(part.id) ? { rOutOhms: 25, maxAmps: 0.04, vilFrac: 0.3, vihFrac: 0.6, logicVolts: 5, source: 'avr-typical' } : null),
    power: (part) => (boards.has(part.id) ? readBoardPower(boards.get(part.id)) : null),
  });
  const report = live.load(net, PWL_OPTIONS);
  live.apply(drivenPins(row, ops).map((ref) => {
    const [part, pin] = ref.split('.');
    return { kind: 'pin', element: pinElementId(part, pin), level: 1 };
  }));
  live.advanceTo(0);

  const modelOf = () => [...report.modelIds];
  const tap = createProbeTap({ analog: live, registry: loadRegistry(), modelOf });
  const spec = {
    id: 'bench',
    kind: 'multimeter',
    settings: { mode: row.measure.unit === 'ohm' ? 'resistance' : 'dc-volts', loading: true },
  };
  const probes = { red: red.id, black: black.id, element: null };
  const reading = meterReading(spec, tap, live, meterSettings(spec), probes);
  const scale = row.measure.unit === 'ohm' ? OHM_UNITS[reading.unit] : 1;
  if (typeof reading.value !== 'number' || scale === undefined) {
    throw new SheetError(`${row.id}: the meter gives ${JSON.stringify(reading.value)}, not a number`);
  }
  return {
    built: fault ? { how: row.fault ? 'fault-literal' : 'candidate', ref: fault.id } : { how: 'corpus-slot', ref: `slot-${String(row.slot).padStart(2, '0')}` },
    simulated: { value: reading.value * scale, tier: reading.tier, modelIds: [...reading.modelIds].sort() },
  };
}

const NO_RESULT = { value: null, photo: null, date: null, board: null };
const TOLERANCE = { relative: 0.1, volts: 0.1 };

const isComplete = (real) => real.value !== null && real.photo !== null && real.date !== null && real.board !== null;

/** Within 10 percent of the real reading, or within 0.1 V on a voltage. Amar may change both. */
export function matches(simulated, real, unit) {
  const slack = Math.max(TOLERANCE.relative * Math.abs(real), unit === 'V' ? TOLERANCE.volts : 0);
  return Math.abs(simulated - real) <= slack;
}

/** The row as the fixture stores it. A result that Amar already wrote stays, and `match` is worked out from it here. */
export function rowOf(row, previous) {
  const { built, simulated } = simulate(row);
  const real = previous?.real ?? NO_RESULT;
  return {
    id: row.id,
    cause_id: row.cause_id,
    built,
    setup: row.setup,
    measure: row.measure,
    simulated,
    real,
    match: isComplete(real) ? matches(simulated.value, real.value, row.measure.unit) : null,
    note: previous?.note ?? null,
  };
}

function build(previous) {
  const old = new Map((previous?.rows ?? []).map((r) => [r.id, r]));
  return { version: 1, board: 'uno-r3', rows: ROWS.map((row) => rowOf(row, old.get(row.id))) };
}

const text = (fixture) => `${JSON.stringify(fixture, null, 2)}\n`;

export async function main(argv) {
  if (argv.some((arg) => arg !== '--check')) {
    console.error('usage: node scripts/bench-check-sheet.mjs [--check]');
    return 2;
  }
  const previous = existsSync(FIXTURE) ? readJson(FIXTURE) : undefined;
  let fixture;
  try {
    fixture = build(previous);
  } catch (e) {
    if (!(e instanceof SheetError)) throw e;
    console.error(e.message);
    return 1;
  }
  if (argv.includes('--check')) {
    if (text(fixture) === (existsSync(FIXTURE) ? readFileSync(FIXTURE, 'utf8') : '')) return 0;
    console.error('tests/fixtures/bench-check/uno-10.json differs from a fresh simulation');
    return 1;
  }
  writeFileSync(FIXTURE, text(fixture));
  console.log(`wrote ${fixture.rows.length} rows`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
