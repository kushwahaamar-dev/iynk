// Robotics Bench Fig. 07: the Pololu A4988 carrier driving a NEMA 17 stepper from a 2S LiPo, stepped by a Nano, with a
// pocket multimeter on the current-limit pot. Facts: docs/facts/a4988.md (Allegro A4988 datasheet: current limit,
// microstep table, step timing, thermal shutdown, UVLO; Pololu #1182: geometry, R068 sense resistors, RST floating,
// the 100 µF on VMOT, no reverse protection, "connecting or disconnecting a stepper motor while the driver is powered
// can destroy the driver"; the SY42STH38-1684A motor) and docs/research/robotics-bench-b.md §2 (the original figure).
// Fixed here: the 1/16-step sketch steps at 625 µs half periods (a quarter turn a second), not 150 µs (just over a
// turn a second); the limit is set with a meter on the pot before anything turns.
// The figure (figures/modules/a4988.js + figures/robotics/a4988.js) owns geometry, build groups, the power tree, the
// Nano's sketches and the current-limit and heat model; this module owns the text, the code, the steps, the checks
// and the current model. Part ids, mode ids, the supply key and fault ids are shared with the figure and must match.

import type { BuildStep, FailureMode, RoboticsContent } from '@/content/schema';

const HEAD = `// {{t:modes.code.title}}
const int STEP = 3, DIR = 4;           // {{t:modes.code.pins}}
const int MS1 = 5, MS2 = 6, MS3 = 7;   // {{t:modes.code.ms}}

// {{t:modes.code.pulses}}
void pulses(long n, int halfUs) {
  for (long i = 0; i < n; i++) {
    digitalWrite(STEP, HIGH); delayMicroseconds(halfUs);
    digitalWrite(STEP, LOW); delayMicroseconds(halfUs);
  }
}
`;

const setup = (ms: [string, string, string], note: string) => `
void setup() {
  for (int p = 3; p <= 7; p++) pinMode(p, OUTPUT);
  Serial.begin(9600);
  digitalWrite(MS1, ${ms[0]}); digitalWrite(MS2, ${ms[1]}); digitalWrite(MS3, ${ms[2]});   // {{t:modes.code.${note}}}
  digitalWrite(DIR, HIGH);
  delay(1);                     // {{t:modes.code.wake}}
`;

const HOLD = HEAD + setup(['LOW', 'LOW', 'LOW'], 'full') + `  Serial.println("hold: coils on, no steps");   // {{t:modes.code.hold}}
}

void loop() {
}
`;

// each stepping sketch: n pulses at a half period, a line, a pause
const stepping = (ms: [string, string, string], note: string, n: number, halfUs: number, line: string, pause: number) =>
  HEAD + setup(ms, note) + `}

void loop() {
  pulses(${n}, ${halfUs});
  Serial.println("${line}");${pause ? `
  delay(${pause});` : ''}
}
`;

const FULL = stepping(['LOW', 'LOW', 'LOW'], 'full', 200, 2500, 'full step: 200 steps = 1 turn', 1000);
const HALF = stepping(['HIGH', 'LOW', 'LOW'], 'half', 400, 2500, 'half step: 400 steps = 1 turn', 1000);
const MICRO = stepping(['HIGH', 'HIGH', 'HIGH'], 'micro', 3200, 625, '1/16 step: 3200 steps = 1 turn', 0);

const BACK_STARTER = `// {{t:tasks.turn-and-back.code.goal}}
const int STEP = 3, DIR = 4;

void setup() {
  pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT);
  Serial.begin(9600);
  digitalWrite(DIR, HIGH);
  // {{t:tasks.turn-and-back.code.start}}
  for (int i = 0; i < 100; i++) {
    digitalWrite(STEP, HIGH); delayMicroseconds(2500);
    digitalWrite(STEP, LOW); delayMicroseconds(2500);
  }
}

void loop() {
}
`;

const BACK_SOLUTION = `const int STEP = 3, DIR = 4;

void steps(int n) {
  for (int i = 0; i < n; i++) {
    digitalWrite(STEP, HIGH); delayMicroseconds(2500);
    digitalWrite(STEP, LOW); delayMicroseconds(2500);
  }
}

void setup() {
  pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT);
  Serial.begin(9600);
  digitalWrite(DIR, HIGH);
  steps(200);
  Serial.println("one turn");
  delay(500);
  digitalWrite(DIR, LOW);
  steps(200);
  Serial.println("home");
}

void loop() {
}
`;

const QUARTER_STARTER = `// {{t:tasks.quarter-turn.code.goal}}
const int STEP = 3, DIR = 4;
const int MS1 = 5, MS2 = 6, MS3 = 7;

void setup() {
  pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT);
  pinMode(MS1, OUTPUT); pinMode(MS2, OUTPUT); pinMode(MS3, OUTPUT);
  Serial.begin(9600);
  digitalWrite(DIR, HIGH);
}

void loop() {
  // {{t:tasks.quarter-turn.code.fast}}
  digitalWrite(STEP, HIGH); delayMicroseconds(150);
  digitalWrite(STEP, LOW); delayMicroseconds(150);
}
`;

const QUARTER_SOLUTION = `const int STEP = 3, DIR = 4;
const int MS1 = 5, MS2 = 6, MS3 = 7;

void setup() {
  pinMode(STEP, OUTPUT); pinMode(DIR, OUTPUT);
  pinMode(MS1, OUTPUT); pinMode(MS2, OUTPUT); pinMode(MS3, OUTPUT);
  Serial.begin(9600);
  digitalWrite(MS1, HIGH); digitalWrite(MS2, HIGH); digitalWrite(MS3, HIGH);
  digitalWrite(DIR, HIGH);
}

void loop() {
  for (int i = 0; i < 3200; i++) {
    digitalWrite(STEP, HIGH); delayMicroseconds(625);
    digitalWrite(STEP, LOW); delayMicroseconds(625);
  }
  Serial.println("1 turn");
}
`;

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('reverse-polarity', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'reverse-polarity:bench',
    { power: 'off', halts: true, damages: ['U1', 'CB'], extraMa: 5000 }),
  fault('cap-reversed', 'reversed-part', { by: 'reverse-part', part: 'CB' }, 'reversed:CB',
    { power: 'off', halts: true, damages: ['CB'], extraMa: 2000 }),
  fault('no-link', 'missing-part', { by: 'remove-part', part: 'LINK' }, 'missing:LINK',
    { power: 'on', halts: true }),
  fault('tired-pack', 'brownout', { by: 'power-input', input: 'bench', volts: 7.4 }, 'wrong-voltage:bench:7.4',
    { power: 'on', halts: false, pins: { OUT1A: 'noisy', OUT1B: 'noisy', OUT2A: 'noisy', OUT2B: 'noisy' } }),
  fault('coils-mixed', 'config', { by: 'wiring', part: 'nema17', from: 'GRN', to: 'RED' }, 'coils-mixed',
    { power: 'on', halts: false, pins: { OUT1A: 'noisy', OUT2A: 'noisy' } }),
  fault('limit-too-high', 'thermal', { by: 'setting', key: 'vref', value: 0.914 }, 'limit-too-high',
    { power: 'on', halts: false, extraMa: 500 }),
  fault('unplug-live', 'wrong-voltage', { by: 'wiring', part: 'nema17', from: 'BLK', to: '2B' }, 'unplug-live',
    { power: 'on', halts: true, damages: ['U1'] }),
];

const text = (id: string, refusal = true) =>
  ({ title: `steps.${id}.title`, body: `steps.${id}.body`, ...(refusal ? { refusal: `steps.${id}.refusal` } : {}) });
const mode = (id: string, major = false, done: Record<string, unknown> = {}): BuildStep =>
  ({ id, kind: 'test', action: { type: 'set', state: { mode: id } }, done: { mode: id, status: 'running', ...done }, major, ...text(id) });
// a break step plugs in with its fault's command; it is done once the fault is repaired and the bench runs again
const breakStep = (id: string, faultId: string, major = false, extra: Record<string, unknown> = {}): BuildStep => {
  const f = FAULTS.find((x) => x.id === faultId);
  const state = f && f.figure.type === 'set' ? f.figure.state : {};
  return { id, kind: 'break', action: { type: 'set', state: { ...state, ...extra } }, done: { power: 'bench', status: 'running' }, fault: faultId, major, ...text(id, false) };
};

const steps: BuildStep[] = [
  { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false, ...text('strip') },
  { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, ...text('smd') },
  { id: 'headers', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht' }, major: false, ...text('headers') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: false, ...text('solder') },
  { id: 'link-cap', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-last' }, done: { build: 'assembled' }, major: true, ...text('link-cap') },
  // the Nano, the motor, the pack and the meter go on the mat one at a time (the figure's matSteps)
  { id: 'wire-nano', kind: 'build', action: { type: 'set', state: { matStep: 'nano' } }, done: { matStep: 'nano' }, major: false, ...text('wire-nano') },
  { id: 'wire-motor', kind: 'build', action: { type: 'set', state: { matStep: 'motor' } }, done: { matStep: 'motor' }, major: false, ...text('wire-motor') },
  { id: 'wire-battery', kind: 'build', action: { type: 'set', state: { matStep: 'battery' } }, done: { matStep: 'battery' }, major: false, ...text('wire-battery') },
  { id: 'wire-meter', kind: 'build', action: { type: 'set', state: { matStep: 'meter' } }, done: { matStep: 'meter' }, major: false, ...text('wire-meter') },
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  // the hold sketch runs while the pot turns; the step is done when the meter reads 0.544 V
  mode('vref', true, { 'meas.U1.set': true }),
  mode('full'), mode('half'), mode('micro', true),
  breakStep('lipo-backwards', 'reverse-polarity'),
  breakStep('cap-backwards', 'cap-reversed'),
  breakStep('no-link', 'no-link'),
  breakStep('tired-pack', 'tired-pack', false, { mode: 'full' }),
  breakStep('coils-mixed', 'coils-mixed', false, { mode: 'full' }),
  breakStep('limit-too-high', 'limit-too-high', false, { mode: 'full' }),
  breakStep('unplug-live', 'unplug-live', true, { mode: 'full' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const a4988 = {
  lab: 'robotics',
  id: 'a4988',
  fig: 7,
  board: 'nano',
  modules: ['a4988'],
  parts: ['nema17', 'lipo-2s', 'multimeter'],
  figure: {
    page: '/figures/robotics/a4988.html',
    parts: [
      { id: 'U1', short: 'A4988', role: 'driver', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'RV1', short: 'VREF POT', role: 'passive', name: 'parts.RV1.name', what: 'parts.RV1.what' },
      { id: 'RS1', short: 'R068', role: 'passive', name: 'parts.RS1.name', what: 'parts.RS1.what' },
      { id: 'RS2', short: 'R068', role: 'passive', name: 'parts.RS2.name', what: 'parts.RS2.what' },
      { id: 'C1', short: '4.7 µF', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'CAPS', short: 'CAPS', role: 'passive', name: 'parts.CAPS.name', what: 'parts.CAPS.what' },
      { id: 'RES', short: 'R', role: 'passive', name: 'parts.RES.name', what: 'parts.RES.what' },
      { id: 'H1', short: 'CONTROL', role: 'header', name: 'parts.H1.name', what: 'parts.H1.what' },
      { id: 'H2', short: 'POWER + MOTOR', role: 'header', name: 'parts.H2.name', what: 'parts.H2.what' },
      { id: 'LINK', short: 'RST-SLP', role: 'jumper', name: 'parts.LINK.name', what: 'parts.LINK.what' },
      { id: 'CB', short: '100 µF', role: 'passive', name: 'parts.CB.name', what: 'parts.CB.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'MOT', short: 'NEMA 17', role: 'mechanical', name: 'parts.MOT.name', what: 'parts.MOT.what' },
      { id: 'BATT', short: '7.4V LIPO', role: 'other', name: 'parts.BATT.name', what: 'parts.BATT.what' },
      { id: 'MM', short: 'METER', role: 'other', name: 'parts.MM.name', what: 'parts.MM.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'vref', instant: false, language: 'arduino-cpp', code: { source: HOLD, libraries: [] }, bytes: 1580, serial: ['hold: coils on, no steps'], title: 'modes.vref.title' },
    { id: 'full', instant: false, language: 'arduino-cpp', code: { source: FULL, libraries: [] }, bytes: 1820, serial: ['full step: 200 steps = 1 turn'], title: 'modes.full.title' },
    { id: 'half', instant: false, language: 'arduino-cpp', code: { source: HALF, libraries: [] }, bytes: 1836, serial: ['half step: 400 steps = 1 turn'], title: 'modes.half.title' },
    { id: 'micro', instant: false, language: 'arduino-cpp', code: { source: MICRO, libraries: [] }, bytes: 1852, serial: ['1/16 step: 3200 steps = 1 turn'], title: 'modes.micro.title' },
  ],
  defaultMode: 'vref',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'step', key: 'levels.STEP', format: 'high-low', label: 'status.step' },
    { id: 'dir', key: 'levels.DIR', format: 'high-low', label: 'status.dir' },
    { id: 'ms1', key: 'levels.MS1', format: 'high-low', label: 'status.ms1' },
    { id: 'vref', key: 'meas.U1.vref', format: 'volts', label: 'status.vref' },
    { id: 'limit', key: 'meas.U1.limit_mA', format: 'ma', label: 'status.limit' },
    { id: 'coil', key: 'meas.U1.coil_mA', format: 'ma', label: 'status.coil' },
    { id: 'chip', key: 'meas.U1.tj', format: 'number', label: 'status.chip' },
    { id: 'vmot', key: 'rails.VMOT', format: 'volts', label: 'status.vmot' },
    { id: 'rpm', key: 'meas.MOT.rpm', format: 'rpm', label: 'status.rpm' },
    { id: 'shaft', key: 'meas.MOT.deg', format: 'deg', label: 'status.shaft' },
    { id: 'battery', key: 'currentMa.lipo', format: 'ma', label: 'status.battery' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [
      { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
      { id: 'lipo', volts: 8.4, limitMa: 4000, label: 'current.lipo' },
    ],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'logic', supply: 'usb', ma: 8, when: { power: 'bench' }, label: 'current.logic' },
      { id: 'quiescent', supply: 'lipo', ma: 4, when: { power: 'bench' }, label: 'current.quiescent' },
      // I_MAX² x (coil 1.65 Ω + switches 0.64 Ω) / 8.4 V: what the chopper pulls from the pack at a 1.0 A limit
      { id: 'coils', supply: 'lipo', ma: 270, when: { status: 'running', 'faults.length': 0 }, label: 'current.coils' },
      { id: 'coils-high', supply: 'lipo', ma: 770, when: { 'faults.0': 'limit-too-high' }, label: 'current.coilsHigh' },
      { id: 'cap-short', supply: 'lipo', ma: 2000, when: { 'fault.id': 'reversed:CB' }, label: 'current.capShort' },
      { id: 'body-diodes', supply: 'lipo', ma: 5000, when: { 'fault.id': 'reverse-polarity:bench' }, label: 'current.reverse' },
    ],
  },
  tasks: [
    {
      id: 'turn-and-back',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: BACK_STARTER, libraries: [] },
      solution: BACK_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 3500,
      checks: [
        { kind: 'runs', minMs: 3000, label: 'tasks.turn-and-back.checks.1' },
        { kind: 'pin-level', pin: 'D4', level: 1, atMs: 500, label: 'tasks.turn-and-back.checks.2' },
        { kind: 'pin-toggles', pin: 'D3', periodMs: [4.8, 5.4], minCycles: 390, label: 'tasks.turn-and-back.checks.3' },
        { kind: 'serial', match: 'one turn', regex: false, minCount: 1, byMs: 1200, label: 'tasks.turn-and-back.checks.4' },
        { kind: 'pin-level', pin: 'D4', level: 0, atMs: 2000, label: 'tasks.turn-and-back.checks.5' },
        { kind: 'serial', match: 'home', regex: false, minCount: 1, byMs: 2800, label: 'tasks.turn-and-back.checks.6' },
      ],
      title: 'tasks.turn-and-back.title',
      brief: 'tasks.turn-and-back.brief',
      hints: ['tasks.turn-and-back.hints.1', 'tasks.turn-and-back.hints.2', 'tasks.turn-and-back.hints.3'],
    },
    {
      id: 'quarter-turn',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: QUARTER_STARTER, libraries: [] },
      solution: QUARTER_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 4600,
      checks: [
        { kind: 'runs', minMs: 4300, label: 'tasks.quarter-turn.checks.1' },
        { kind: 'pin-level', pin: 'D5', level: 1, atMs: 100, label: 'tasks.quarter-turn.checks.2' },
        { kind: 'pin-level', pin: 'D6', level: 1, atMs: 100, label: 'tasks.quarter-turn.checks.3' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 100, label: 'tasks.quarter-turn.checks.4' },
        { kind: 'pin-toggles', pin: 'D3', periodMs: [1.2, 1.3], minCycles: 3000, label: 'tasks.quarter-turn.checks.5' },
        { kind: 'serial', match: '1 turn', regex: false, minCount: 1, byMs: 4300, label: 'tasks.quarter-turn.checks.6' },
      ],
      title: 'tasks.quarter-turn.title',
      brief: 'tasks.quarter-turn.brief',
      hints: ['tasks.quarter-turn.hints.1', 'tasks.quarter-turn.hints.2', 'tasks.quarter-turn.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'link-cap', questions: [q('build', 'rst', 1), q('build', 'bulk', 0), q('build', 'labels', 2)] },
    { id: 'limit', afterStep: 'vref', questions: [q('limit', 'formula', 0), q('limit', 'coil', 2), q('limit', 'vdd', 1)] },
    { id: 'steps', afterStep: 'micro', questions: [q('steps', 'pulses', 1), q('steps', 'timing', 0), q('steps', 'ms', 2)] },
    { id: 'faults', afterStep: 'unplug-live', questions: [q('faults', 'unplug', 0), q('faults', 'hot', 2), q('faults', 'tired', 1)] },
    { id: 'end', afterStep: null, questions: [q('end', 'vs-l298n', 1), q('end', 'lost', 0), q('end', 'supply', 2)] },
  ],
  sources: [
    { title: 'Allegro A4988 DMOS microstepping driver datasheet (4988-DS Rev. 8, Pololu mirror)', url: 'https://www.pololu.com/file/0J450/A4988.pdf' },
    { title: 'Pololu A4988 Stepper Motor Driver Carrier (#1182): description, current limit, warnings', url: 'https://www.pololu.com/product/1182' },
    { title: 'Pololu A4988 carrier dimension diagram', url: 'https://www.pololu.com/file/0J1082/a4988-stepper-motor-driver-carrier-dimension-diagram.pdf' },
    { title: 'Pololu #2267 NEMA 17 stepper (SY42STH38-1684A)', url: 'https://www.pololu.com/product/2267' },
    { title: 'SOYO SY42STH38-1684A datasheet', url: 'https://www.pololu.com/file/0J714/SY42STH38-1684A.pdf' },
    { title: 'Arduino Nano (A000005) documentation', url: 'https://docs.arduino.cc/hardware/nano/' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default a4988;
