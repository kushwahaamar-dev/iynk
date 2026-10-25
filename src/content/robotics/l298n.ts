// Robotics Bench Fig. 06: the red L298N module driving two TT gear motors from a 2S LiPo, its inputs on a Nano.
// Facts: docs/facts/l298n.md (ST L298 datasheet: truth table, saturation voltages, thermal data; the Handson module
// schematic: 78M05 behind the 5V-EN cap, ENA/ENB caps to +5V, eight flyback diodes, no reverse-polarity protection)
// and docs/research/robotics-bench-a.md §8 (the original figure, its quiz and its defects). Fixed here: the drop is
// 1.4 + 1.15 x I volts (about 1.6 V for a free-running TT motor, 2.7 V held), not a flat 2.0 V; the caps hold both
// enables HIGH, so a PWM sketch changes nothing until the cap comes off; a 6 V pack starves the 78M05.
// The figure (figures/modules/l298n.js + figures/robotics/l298n.js) owns geometry, build groups, the power tree, the
// Nano's sketches and the heat model; this module owns the text, the code, the steps, the checks and the current model.
// Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it exactly.

import type { BuildStep, FailureMode, RoboticsContent } from '@/content/schema';

const HEAD = `// {{t:modes.code.title}}
const int ENA = 9, IN1 = 8, IN2 = 7;   // {{t:modes.code.motorA}}
const int ENB = 3, IN3 = 5, IN4 = 4;   // {{t:modes.code.motorB}}

void drive(int in1, int in2, int in3, int in4) {
  digitalWrite(IN1, in1); digitalWrite(IN2, in2);
  digitalWrite(IN3, in3); digitalWrite(IN4, in4);
}
`;

// every sketch sets the enables, the four inputs and prints one line; the caps on ENA and ENB win over D9 and D3
const sketch = (en: number, ins: string, note: string, line: string) => HEAD + `
void setup() {
  for (int p = 3; p <= 9; p++) pinMode(p, OUTPUT);
  Serial.begin(9600);
  analogWrite(ENA, ${en});      // {{t:modes.code.${en === 255 ? 'full' : 'half'}}}
  analogWrite(ENB, ${en});
  drive(${ins});   // {{t:modes.code.${note}}}
  Serial.println("${line}");
}

void loop() {
}
`;

const FWD = sketch(255, 'HIGH, LOW, HIGH, LOW', 'fwd', 'forward: IN1 H, IN2 L, IN3 H, IN4 L');
const REV = sketch(255, 'LOW, HIGH, LOW, HIGH', 'rev', 'reverse: IN1 L, IN2 H, IN3 L, IN4 H');
const SPIN = sketch(255, 'HIGH, LOW, LOW, HIGH', 'spin', 'spin: A forward, B reverse');
const BRAKE = sketch(255, 'HIGH, HIGH, HIGH, HIGH', 'brake', 'brake: IN1 = IN2, IN3 = IN4');
const HALF = sketch(128, 'HIGH, LOW, HIGH, LOW', 'fwd', 'half speed: analogWrite(ENA, 128), analogWrite(ENB, 128)');

const RAMP_STARTER = `// {{t:tasks.soft-start.code.goal}}
const int ENA = 9, IN1 = 8, IN2 = 7;

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  Serial.begin(9600);
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  analogWrite(ENA, 255);      // {{t:tasks.soft-start.code.jump}}
}

void loop() {
}
`;

const RAMP_SOLUTION = `const int ENA = 9, IN1 = 8, IN2 = 7;

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  Serial.begin(9600);
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  for (int duty = 0; duty <= 255; duty++) {
    analogWrite(ENA, duty);
    delay(10);
  }
  delay(2000);
  digitalWrite(IN2, HIGH);
  Serial.println("stopped");
}

void loop() {
}
`;

const SQUARE_HEAD = `const int IN1 = 8, IN2 = 7, IN3 = 5, IN4 = 4;

void drive(int in1, int in2, int in3, int in4) {
  digitalWrite(IN1, in1); digitalWrite(IN2, in2);
  digitalWrite(IN3, in3); digitalWrite(IN4, in4);
}
`;

const SQUARE_STARTER = `// {{t:tasks.square.code.goal}}
` + SQUARE_HEAD + `
void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  Serial.begin(9600);
  // {{t:tasks.square.code.start}}
  drive(HIGH, LOW, HIGH, LOW);
  delay(1000);
}

void loop() {
}
`;

const SQUARE_SOLUTION = SQUARE_HEAD + `
void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT); pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  Serial.begin(9600);
  for (int side = 1; side <= 4; side++) {
    drive(HIGH, LOW, HIGH, LOW);
    delay(1000);
    drive(HIGH, LOW, LOW, HIGH);
    delay(500);
    Serial.print("corner ");
    Serial.println(side);
  }
  drive(HIGH, HIGH, HIGH, HIGH);
}

void loop() {
}
`;

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('reverse-polarity', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'reverse-polarity:bench',
    { power: 'off', halts: true, damages: ['D1', 'C1'], extraMa: 5000 }),
  fault('c1-reversed', 'reversed-part', { by: 'reverse-part', part: 'C1' }, 'reversed:C1',
    { power: 'off', halts: true, damages: ['C1'], extraMa: 2000 }),
  fault('four-aa', 'brownout', { by: 'power-input', input: 'bench', volts: 6 }, 'wrong-voltage:bench:6',
    { power: 'resetting', halts: true }),
  fault('over-voltage', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 36 }, 'wrong-voltage:bench:36',
    { power: 'off', halts: true, damages: ['U2', 'C1'] }),
  fault('cold-motor-a', 'cold-solder', { by: 'cold-joint', part: 'J2' }, 'cold:J2',
    { power: 'on', halts: false, pins: { OUT1: 'noisy', OUT2: 'noisy' } }),
  fault('no-5v-jumper', 'missing-part', { by: 'remove-part', part: 'JP5' }, 'missing:JP5',
    { power: 'on', halts: true }),
  fault('no-ground', 'floating-input', { by: 'wiring', part: 'l298n', from: 'GND', to: 'GND' }, 'no-ground',
    { power: 'on', halts: false, pins: { IN1: 'noisy', IN2: 'noisy', IN3: 'noisy', IN4: 'noisy' } }),
  fault('stall', 'thermal', { by: 'load', rail: 'VS', ma: 2240, part: 'tt-motor' }, 'stall',
    { power: 'on', halts: false, extraMa: 1920 }),
];

const text = (id: string, refusal = true) =>
  ({ title: `steps.${id}.title`, body: `steps.${id}.body`, ...(refusal ? { refusal: `steps.${id}.refusal` } : {}) });
const mode = (id: string, major = false): BuildStep =>
  ({ id, kind: 'test', action: { type: 'set', state: { mode: id } }, done: { mode: id, status: 'running' }, major, ...text(id) });
// a break step plugs in with its fault's command; it is done once the fault is repaired and the bench runs again
const breakStep = (id: string, faultId: string, major = false, extra: Record<string, unknown> = {}): BuildStep => {
  const f = FAULTS.find((x) => x.id === faultId);
  const state = f && f.figure.type === 'set' ? f.figure.state : {};
  return { id, kind: 'break', action: { type: 'set', state: { ...state, ...extra } }, done: { power: 'bench', status: 'running' }, fault: faultId, major, ...text(id, false) };
};

const steps: BuildStep[] = [
  { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false, ...text('strip') },
  { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, ...text('smd') },
  { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht' }, major: false, ...text('low') },
  { id: 'tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 3 }, major: false, ...text('tall') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: false, ...text('solder') },
  { id: 'caps', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-last' }, done: { build: 'assembled' }, major: true, ...text('caps') },
  // the Nano, the motors and the pack go on the mat one at a time, each with its wires (the figure's matSteps)
  { id: 'wire-nano', kind: 'build', action: { type: 'set', state: { matStep: 'nano' } }, done: { matStep: 'nano' }, major: false, ...text('wire-nano') },
  { id: 'wire-motors', kind: 'build', action: { type: 'set', state: { matStep: 'motors' } }, done: { matStep: 'motors' }, major: false, ...text('wire-motors') },
  { id: 'wire-battery', kind: 'build', action: { type: 'set', state: { matStep: 'battery' } }, done: { matStep: 'battery' }, major: false, ...text('wire-battery') },
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  mode('fwd'), mode('rev'), mode('spin'), mode('brake', true), mode('half'),
  breakStep('lipo-backwards', 'reverse-polarity'),
  breakStep('c1-backwards', 'c1-reversed', false, { mode: 'fwd' }),
  breakStep('four-aa', 'four-aa'),
  breakStep('thirty-six-volts', 'over-voltage'),
  breakStep('cold-motor-a', 'cold-motor-a'),
  breakStep('no-5v-jumper', 'no-5v-jumper'),
  breakStep('no-ground', 'no-ground'),
  breakStep('hold-wheels', 'stall', true),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const l298n = {
  lab: 'robotics',
  id: 'l298n',
  fig: 6,
  board: 'nano',
  modules: ['l298n'],
  parts: ['tt-motor', 'lipo-2s'],
  figure: {
    page: '/figures/robotics/l298n.html',
    parts: [
      { id: 'U1', short: 'L298N', role: 'driver', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U2', short: '5V REG', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'D1', short: 'D1', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'C1', short: '220 µF', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C2', short: '220 µF', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'J1', short: 'POWER IN', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'J2', short: 'MOTOR A', role: 'connector', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'J3', short: 'MOTOR B', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J4', short: 'CONTROL', role: 'header', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'JPA', short: 'ENA CAP', role: 'jumper', name: 'parts.JPA.name', what: 'parts.JPA.what' },
      { id: 'JPB', short: 'ENB CAP', role: 'jumper', name: 'parts.JPB.name', what: 'parts.JPB.what' },
      { id: 'JP5', short: '5V-EN CAP', role: 'jumper', name: 'parts.JP5.name', what: 'parts.JP5.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'MOTA', short: 'MOTOR A', role: 'mechanical', name: 'parts.MOTA.name', what: 'parts.MOTA.what' },
      { id: 'MOTB', short: 'MOTOR B', role: 'mechanical', name: 'parts.MOTB.name', what: 'parts.MOTB.what' },
      { id: 'BATT', short: '7.4V LIPO', role: 'other', name: 'parts.BATT.name', what: 'parts.BATT.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'fwd', instant: false, language: 'arduino-cpp', code: { source: FWD, libraries: [] }, bytes: 2252, serial: ['forward: IN1 H, IN2 L, IN3 H, IN4 L'], title: 'modes.fwd.title' },
    { id: 'rev', instant: false, language: 'arduino-cpp', code: { source: REV, libraries: [] }, bytes: 2252, serial: ['reverse: IN1 L, IN2 H, IN3 L, IN4 H'], title: 'modes.rev.title' },
    { id: 'spin', instant: false, language: 'arduino-cpp', code: { source: SPIN, libraries: [] }, bytes: 2250, serial: ['spin: A forward, B reverse'], title: 'modes.spin.title' },
    { id: 'brake', instant: false, language: 'arduino-cpp', code: { source: BRAKE, libraries: [] }, bytes: 2242, serial: ['brake: IN1 = IN2, IN3 = IN4'], title: 'modes.brake.title' },
    { id: 'half', instant: false, language: 'arduino-cpp', code: { source: HALF, libraries: [] }, bytes: 2262,
      serial: ['half speed: analogWrite(ENA, 128), analogWrite(ENB, 128)'], title: 'modes.half.title' },
  ],
  defaultMode: 'fwd',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'in1', key: 'levels.IN1', format: 'high-low', label: 'status.in1' },
    { id: 'in2', key: 'levels.IN2', format: 'high-low', label: 'status.in2' },
    { id: 'ena', key: 'levels.ENA', format: 'high-low', label: 'status.ena' },
    { id: 'vs', key: 'rails.VS', format: 'volts', label: 'status.vs' },
    { id: 'logic', key: 'rails.5V', format: 'volts', label: 'status.logic' },
    { id: 'motor', key: 'meas.MOTA.v', format: 'volts', label: 'status.motor' },
    { id: 'rpm', key: 'meas.MOTA.rpm', format: 'rpm', label: 'status.rpm' },
    { id: 'drop', key: 'meas.U1.drop', format: 'volts', label: 'status.drop' },
    { id: 'heatsink', key: 'meas.U1.sinkC', format: 'number', label: 'status.heatsink' },
    { id: 'battery', key: 'currentMa.lipo', format: 'ma', label: 'status.battery' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [
      { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
      { id: 'lipo', volts: 7.4, limitMa: 4000, label: 'current.lipo' },
    ],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'logic', supply: 'lipo', ma: 60, when: { power: 'bench' }, label: 'current.logic' },
      { id: 'motors-fwd', supply: 'lipo', ma: 320, when: { status: 'running', mode: 'fwd' }, label: 'current.motors' },
      { id: 'motors-rev', supply: 'lipo', ma: 320, when: { status: 'running', mode: 'rev' }, label: 'current.motors' },
      { id: 'motors-spin', supply: 'lipo', ma: 320, when: { status: 'running', mode: 'spin' }, label: 'current.motors' },
      { id: 'motors-half', supply: 'lipo', ma: 320, when: { status: 'running', mode: 'half' }, label: 'current.motors' },
      { id: 'stall', supply: 'lipo', ma: 1920, when: { 'faults.0': 'stall' }, label: 'current.stall' },
      { id: 'c1-short', supply: 'lipo', ma: 2000, when: { 'fault.id': 'reversed:C1' }, label: 'current.c1short' },
      { id: 'diodes', supply: 'lipo', ma: 5000, when: { 'fault.id': 'reverse-polarity:bench' }, label: 'current.reverse' },
    ],
  },
  tasks: [
    {
      id: 'soft-start',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: RAMP_STARTER, libraries: [] },
      solution: RAMP_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 6000,
      checks: [
        { kind: 'runs', minMs: 5500, label: 'tasks.soft-start.checks.1' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 100, label: 'tasks.soft-start.checks.2' },
        { kind: 'pin-level', pin: 'D7', level: 0, atMs: 100, label: 'tasks.soft-start.checks.3' },
        { kind: 'pwm', pin: 'D9', duty: [0.05, 0.15], atMs: 250, label: 'tasks.soft-start.checks.4' },
        { kind: 'pwm', pin: 'D9', duty: [0.35, 0.45], atMs: 1000, label: 'tasks.soft-start.checks.5' },
        { kind: 'pwm', pin: 'D9', duty: [0.97, 1], atMs: 3500, label: 'tasks.soft-start.checks.6' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 5000, label: 'tasks.soft-start.checks.7' },
        { kind: 'serial', match: 'stopped', regex: false, minCount: 1, byMs: 5000, label: 'tasks.soft-start.checks.8' },
      ],
      title: 'tasks.soft-start.title',
      brief: 'tasks.soft-start.brief',
      hints: ['tasks.soft-start.hints.1', 'tasks.soft-start.hints.2', 'tasks.soft-start.hints.3'],
    },
    {
      id: 'square',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: SQUARE_STARTER, libraries: [] },
      solution: SQUARE_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 7000,
      checks: [
        { kind: 'runs', minMs: 6500, label: 'tasks.square.checks.1' },
        { kind: 'pin-level', pin: 'D5', level: 1, atMs: 500, label: 'tasks.square.checks.2' },
        { kind: 'pin-level', pin: 'D4', level: 0, atMs: 500, label: 'tasks.square.checks.3' },
        { kind: 'pin-level', pin: 'D5', level: 0, atMs: 1250, label: 'tasks.square.checks.4' },
        { kind: 'pin-level', pin: 'D4', level: 1, atMs: 1250, label: 'tasks.square.checks.5' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 1250, label: 'tasks.square.checks.6' },
        { kind: 'pin-level', pin: 'D5', level: 1, atMs: 2000, label: 'tasks.square.checks.7' },
        { kind: 'serial', match: 'corner 4', regex: false, minCount: 1, byMs: 6200, label: 'tasks.square.checks.8' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 6500, label: 'tasks.square.checks.9' },
        { kind: 'pin-level', pin: 'D5', level: 1, atMs: 6500, label: 'tasks.square.checks.10' },
      ],
      title: 'tasks.square.title',
      brief: 'tasks.square.brief',
      hints: ['tasks.square.hints.1', 'tasks.square.hints.2', 'tasks.square.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'caps', questions: [q('build', 'reflow-first', 0), q('build', 'caps-job', 0), q('build', 'jp5', 1)] },
    { id: 'drive', afterStep: 'brake', questions: [q('drive', 'brake', 1), q('drive', 'swap', 0), q('drive', 'drop', 1)] },
    { id: 'faults', afterStep: 'hold-wheels', questions: [q('faults', 'backwards', 1), q('faults', 'four-aa', 0), q('faults', 'stall-heat', 1)] },
    { id: 'end', afterStep: null, questions: [q('end', 'vs-tb6612', 0), q('end', 'ground', 1), q('end', 'half', 0)] },
  ],
  sources: [
    { title: 'ST L298 dual full-bridge driver datasheet (Jan 2000, SparkFun mirror)', url: 'https://www.sparkfun.com/datasheets/Robotics/L298_H_Bridge.pdf' },
    { title: 'Handson Technology L298N Dual H-Bridge Motor Driver user guide (module schematic)', url: 'https://www.handsontec.com/dataspecs/L298N%20Motor%20Driver.pdf' },
    { title: 'TI LM78M05 product page', url: 'https://www.ti.com/product/LM78M05' },
    { title: 'Toshiba TB6612FNG datasheet (SparkFun mirror), for the comparison', url: 'https://cdn.sparkfun.com/datasheets/Robotics/TB6612FNG.pdf' },
    { title: 'Last Minute Engineers: L298N motor driver tutorial', url: 'https://lastminuteengineers.com/l298n-dc-stepper-driver-arduino-tutorial/' },
    { title: 'Arduino Nano (A000005) documentation', url: 'https://docs.arduino.cc/hardware/nano/' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default l298n;
