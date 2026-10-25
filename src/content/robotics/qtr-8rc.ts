// Robotics Bench Fig. 11: a line follower. The Pololu QTR-8RC array is the board you build; a Nano reads it, a
// TB6612FNG drives two TT gear motors from a 2S LiPo, and a white card with black tape lies under the array.
// Facts: docs/facts/qtr8rc.md (Pololu product page and user's guide, drill DXF and STEP model, the QTR application
// note's RC times, QTRSensors v4), docs/facts/tb6612.md for the driver. The array reads by timing: about 120 µs
// over white, past the library's 2500 µs timeout over black; readLineBlack() turns eight of those into 0-7000.
// The figure (figures/modules/qtr-8rc.js + figures/robotics/qtr-8rc.js) owns geometry, build groups, the power tree,
// the Nano's sketches and the steering model; this module owns the text, the code, the steps, the checks and the
// current model. Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it.

import type { BuildStep, FailureMode, RoboticsContent, WorldModel } from '@/content/schema';

const HEAD = `#include <QTRSensors.h>

QTRSensors qtr;
const uint8_t SENSORS[8] = {A0, A1, A2, A3, A4, A5, 11, 12};   // {{t:modes.code.pins}}
uint16_t values[8];
`;

const DRIVER = `const int PWMA = 5, AIN1 = 7, AIN2 = 8, STBY = 9, BIN1 = 10, BIN2 = 4, PWMB = 6;
const int BASE = 150;
`;

const SETUP_ARRAY = `  qtr.setTypeRC();
  qtr.setSensorPins(SENSORS, 8);
  qtr.setEmitterPin(2);          // {{t:modes.code.emitter}}
`;

const CALIBRATE = `  for (int i = 0; i < 100; i++) {   // {{t:modes.code.calibrate}}
    qtr.calibrate();
    delay(20);
  }
`;

const RAW = `// {{t:modes.code.title}}
` + HEAD + `
void setup() {
  Serial.begin(9600);
` + SETUP_ARRAY + `  Serial.println("raw: OUT1-OUT8 in us, 2500 = timeout");
}

void loop() {
  qtr.read(values);              // {{t:modes.code.read}}
  for (int i = 0; i < 8; i++) {
    if (i > 0) Serial.print(' ');
    Serial.print(values[i]);
  }
  Serial.println();
  delay(1000);
}
`;

const LINE = `// {{t:modes.code.title}}
` + HEAD + `
void setup() {
  Serial.begin(9600);
` + SETUP_ARRAY + CALIBRATE + `  Serial.println("calibrated: position 0-7000");
}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);   // {{t:modes.code.position}}
  Serial.print("position ");
  Serial.println(pos);
  delay(1000);
}
`;

const WHEELS = `
void motors(int left, int right) {   // {{t:modes.code.motors}}
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, LOW); analogWrite(PWMA, constrain(left, 0, 255));
  digitalWrite(BIN1, HIGH); digitalWrite(BIN2, LOW); analogWrite(PWMB, constrain(right, 0, 255));
}
`;

const SETUP_DRIVE = `void setup() {
  Serial.begin(9600);
` + SETUP_ARRAY + `  for (int p = 4; p <= 10; p++) pinMode(p, OUTPUT);
  digitalWrite(STBY, HIGH);
` + CALIBRATE;

const FOLLOW = `// {{t:modes.code.title}}
` + HEAD + DRIVER + WHEELS + `
` + SETUP_DRIVE + `  Serial.println("follow: Kp 0.05, base 150");
}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);
  int error = (int)pos - 3500;   // {{t:modes.code.error}}
  int turn = error / 20;         // {{t:modes.code.kp}}
  motors(BASE + turn, BASE - turn);
  Serial.print("pos ");
  Serial.print(pos);
  Serial.print(" L ");
  Serial.print(constrain(BASE + turn, 0, 255));
  Serial.print(" R ");
  Serial.println(constrain(BASE - turn, 0, 255));
  delay(1000);
}
`;

const STEER_STARTER = `// {{t:tasks.steer.code.goal}}
` + HEAD + DRIVER + WHEELS + `
` + SETUP_DRIVE + `}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);
  // {{t:tasks.steer.code.todo}}
  motors(BASE, BASE);
  delay(20);
}
`;

const STEER_SOLUTION = HEAD + DRIVER + WHEELS + `
` + SETUP_DRIVE + `}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);
  int error = (int)pos - 3500;
  int turn = error / 20;
  motors(BASE + turn, BASE - turn);
  delay(20);
}
`;

// one wheel forward or backwards: the sign picks IN1/IN2, the size the duty
const WHEELS_SIGNED = `
void wheel(int in1, int in2, int pwm, int speed) {
  digitalWrite(in1, speed >= 0 ? HIGH : LOW);
  digitalWrite(in2, speed >= 0 ? LOW : HIGH);
  analogWrite(pwm, constrain(abs(speed), 0, 255));
}

void motors(int left, int right) {
  wheel(AIN1, AIN2, PWMA, left);
  wheel(BIN1, BIN2, PWMB, right);
}
`;

const SEARCH_STARTER = `// {{t:tasks.search.code.goal}}
` + HEAD + DRIVER + WHEELS_SIGNED + `
` + SETUP_DRIVE + `}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);
  // {{t:tasks.search.code.todo}}
  int turn = ((int)pos - 3500) / 20;
  motors(BASE + turn, BASE - turn);
  delay(20);
}
`;

const SEARCH_SOLUTION = HEAD + DRIVER + WHEELS_SIGNED + `
` + SETUP_DRIVE + `}

void loop() {
  uint16_t pos = qtr.readLineBlack(values);
  if (pos < 1000) {
    motors(-110, 110);
  } else if (pos > 6000) {
    motors(110, -110);
  } else {
    int turn = ((int)pos - 3500) / 20;
    motors(BASE + turn, BASE - turn);
  }
  delay(20);
}
`;

// the line under the array: 0 = under sensor 1, 7000 = under sensor 8. The first 1.6 s sweep it under every
// sensor once, as you do by hand while calibrate() runs
const LINE_INPUT = {
  id: 'line', quantity: 'line-position', device: { kind: 'qtr-rc', sensors: 8 }, pins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'D11', 'D12'],
  part: 'U1', min: 0, max: 7000, step: 100, default: 3500, unit: '', gesture: 'slide', label: 'tasks.line',
} as const;
const sweep = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 3500].map((value, i) => ({ t: i * 200, input: 'line', value }));
const world = (...script: [number, number][]): WorldModel => ({
  inputs: [{ ...LINE_INPUT, device: { ...LINE_INPUT.device }, pins: [...LINE_INPUT.pins] }],
  script: [...sweep, ...script.map(([t, value]) => ({ t, input: 'line', value }))],
});

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('low-vcc', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 3.3 }, 'wrong-voltage:bench:3.3',
    { power: 'on', halts: false }),
  fault('bypass-5v', 'overcurrent', { by: 'short', nets: ['BYPASS', 'VCC'] }, 'bypass-5v',
    { power: 'on', halts: false, damages: ['U5', 'U6'], extraMa: 120, pins: { OUT5: 'stuck-high', OUT6: 'stuck-high' } }),
  fault('cold-out1', 'cold-solder', { by: 'cold-joint', part: 'J1', pin: 'OUT1' }, 'cold:J1.4',
    { power: 'on', halts: false, pins: { OUT1: 'noisy' } }),
  fault('no-r9', 'missing-part', { by: 'remove-part', part: 'R9' }, 'missing:R9',
    { power: 'on', halts: false, pins: { OUT3: 'stuck-high', OUT4: 'stuck-high' } }),
  fault('sunlight', 'config', { by: 'setting', key: 'ambient', value: 'sunlight' }, 'ambient-ir',
    { power: 'on', halts: false }),
  fault('lifted', 'config', { by: 'setting', key: 'height-mm', value: 10 }, 'lifted',
    { power: 'on', halts: false }),
  fault('motors-swapped', 'config', { by: 'wiring', part: 'tt-motor', from: 'A01', to: 'B01' }, 'motors-swapped',
    { power: 'on', halts: false }),
  fault('brownout', 'brownout', { by: 'load', rail: '5V', ma: 600, part: 'tt-motor' }, 'brownout',
    { power: 'resetting', halts: true }),
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
const mat = (id: string, step: string): BuildStep =>
  ({ id, kind: 'build', action: { type: 'set', state: { matStep: step } }, done: { matStep: step }, major: false, ...text(id) });

const steps: BuildStep[] = [
  { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false, ...text('strip') },
  { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, ...text('smd') },
  { id: 'header', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { build: 'tht' }, major: false, ...text('header') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true, ...text('solder') },
  // the Nano, the driver, the motors, the pack and the card go on the mat one at a time (the figure's matSteps)
  mat('wire-nano', 'nano'), mat('wire-driver', 'driver'), mat('wire-motors', 'motors'), mat('wire-battery', 'battery'), mat('card', 'track'),
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  mode('raw'), mode('line', true), mode('follow', true),
  breakStep('three-volts', 'low-vcc', false, { mode: 'line' }),
  breakStep('bridge-bypass', 'bypass-5v', false, { mode: 'raw' }),
  breakStep('cold-out1', 'cold-out1', false, { mode: 'raw' }),
  breakStep('no-r9', 'no-r9', false, { mode: 'raw' }),
  breakStep('sunlight', 'sunlight', false, { mode: 'line' }),
  breakStep('lift-array', 'lifted', false, { mode: 'follow' }),
  breakStep('swap-motors', 'motors-swapped', false, { mode: 'follow' }),
  breakStep('motors-on-5v', 'brownout', true, { mode: 'follow' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const qtr8rc = {
  lab: 'robotics',
  id: 'qtr-8rc',
  fig: 11,
  board: 'nano',
  modules: ['qtr-8rc'],
  parts: [],
  figure: {
    page: '/figures/robotics/qtr-8rc.html',
    parts: [
      { id: 'U1', short: 'SENSOR 1', role: 'sensor', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'Q1', short: 'LED SWITCH', role: 'switch', name: 'parts.Q1.name', what: 'parts.Q1.what' },
      { id: 'R3', short: 'R3', role: 'passive', name: 'parts.R3.name', what: 'parts.R3.what' },
      { id: 'R4', short: 'R4', role: 'passive', name: 'parts.R4.name', what: 'parts.R4.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'BYP', short: '3.3V BYPASS', role: 'jumper', name: 'parts.BYP.name', what: 'parts.BYP.what' },
      { id: 'PERF', short: 'SNAP LINE', role: 'other', name: 'parts.PERF.name', what: 'parts.PERF.what' },
      { id: 'J1', short: 'HEADER', role: 'header', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'DRV', short: 'TB6612FNG', role: 'driver', name: 'parts.DRV.name', what: 'parts.DRV.what' },
      { id: 'MOTL', short: 'MOTOR L', role: 'mechanical', name: 'parts.MOTL.name', what: 'parts.MOTL.what' },
      { id: 'MOTR', short: 'MOTOR R', role: 'mechanical', name: 'parts.MOTR.name', what: 'parts.MOTR.what' },
      { id: 'BATT', short: '7.4V LIPO', role: 'other', name: 'parts.BATT.name', what: 'parts.BATT.what' },
      { id: 'TRACK', short: 'TEST CARD', role: 'other', name: 'parts.TRACK.name', what: 'parts.TRACK.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'raw', instant: false, language: 'arduino-cpp', code: { source: RAW, libraries: ['QTRSensors'] }, bytes: 4410,
      serial: ['raw: OUT1-OUT8 in us, 2500 = timeout', '120 120 120 2500 2500 120 120 120'], title: 'modes.raw.title' },
    { id: 'line', instant: false, language: 'arduino-cpp', code: { source: LINE, libraries: ['QTRSensors'] }, bytes: 4652,
      serial: ['calibrated: position 0-7000', 'position 3500'], title: 'modes.line.title' },
    { id: 'follow', instant: false, language: 'arduino-cpp', code: { source: FOLLOW, libraries: ['QTRSensors'] }, bytes: 5086,
      serial: ['follow: Kp 0.05, base 150', 'pos 3500 L 150 R 150'], title: 'modes.follow.title' },
  ],
  defaultMode: 'raw',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'position', key: 'qtr.pos', format: 'number', label: 'status.position' },
    { id: 'sensor1', key: 'qtr.us.0', format: 'number', label: 'status.sensor1' },
    { id: 'sensor4', key: 'qtr.us.3', format: 'number', label: 'status.sensor4' },
    { id: 'left', key: 'drive.L', format: 'number', label: 'status.left' },
    { id: 'right', key: 'drive.R', format: 'number', label: 'status.right' },
    { id: 'vcc', key: 'rails.VCC', format: 'volts', label: 'status.vcc' },
    { id: 'rpm', key: 'readings.MOTL.rpm', format: 'rpm', label: 'status.rpm' },
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
      { id: 'array', supply: 'usb', ma: 96, when: { status: 'running' }, label: 'current.array' },
      { id: 'logic', supply: 'usb', ma: 2, when: { power: 'bench' }, label: 'current.logic' },
      { id: 'motors', supply: 'lipo', ma: 300, when: { status: 'running', mode: 'follow' }, label: 'current.motors' },
      { id: 'bypass', supply: 'usb', ma: 120, when: { 'faults.0': 'bypass-5v' }, label: 'current.bypass' },
    ],
  },
  tasks: [
    {
      id: 'steer',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: STEER_STARTER, libraries: ['QTRSensors'] },
      solution: STEER_SOLUTION,
      circuit: null,
      // centred at 2.5 s, under sensor 2 at 3 s, under sensor 7 at 3.6 s, centred again at 4.2 s
      world: world([2500, 3500], [3000, 1000], [3600, 6000], [4200, 3500]),
      runMs: 4600,
      checks: [
        { kind: 'runs', minMs: 4500, label: 'tasks.steer.checks.1' },
        { kind: 'code', must: ['readLineBlack'], mustNot: [], label: 'tasks.steer.checks.2' },
        { kind: 'pin-level', pin: 'D9', level: 1, atMs: 2600, label: 'tasks.steer.checks.3' },
        { kind: 'pwm', pin: 'D5', duty: [0.5, 0.68], atMs: 2800, label: 'tasks.steer.checks.4' },
        { kind: 'pwm', pin: 'D6', duty: [0.5, 0.68], atMs: 2800, label: 'tasks.steer.checks.5' },
        { kind: 'pwm', pin: 'D5', duty: [0, 0.45], atMs: 3400, label: 'tasks.steer.checks.6' },
        { kind: 'pwm', pin: 'D6', duty: [0.75, 1], atMs: 3400, label: 'tasks.steer.checks.7' },
        { kind: 'pwm', pin: 'D5', duty: [0.75, 1], atMs: 4000, label: 'tasks.steer.checks.8' },
        { kind: 'pwm', pin: 'D6', duty: [0, 0.45], atMs: 4000, label: 'tasks.steer.checks.9' },
        { kind: 'pwm', pin: 'D5', duty: [0.5, 0.68], atMs: 4500, label: 'tasks.steer.checks.10' },
      ],
      title: 'tasks.steer.title',
      brief: 'tasks.steer.brief',
      hints: ['tasks.steer.hints.1', 'tasks.steer.hints.2', 'tasks.steer.hints.3'],
    },
    {
      id: 'search',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: SEARCH_STARTER, libraries: ['QTRSensors'] },
      solution: SEARCH_SOLUTION,
      circuit: null,
      // the line far left (under sensor 1) at 2.2 s, centred at 3 s, far right (under sensor 8) at 3.6 s
      world: world([2200, 0], [3000, 3500], [3600, 7000]),
      runMs: 4400,
      checks: [
        { kind: 'runs', minMs: 4300, label: 'tasks.search.checks.1' },
        { kind: 'pin-level', pin: 'D7', level: 0, atMs: 2600, label: 'tasks.search.checks.2' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 2600, label: 'tasks.search.checks.3' },
        { kind: 'pin-level', pin: 'D10', level: 1, atMs: 2600, label: 'tasks.search.checks.4' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 3400, label: 'tasks.search.checks.5' },
        { kind: 'pin-level', pin: 'D10', level: 0, atMs: 4100, label: 'tasks.search.checks.6' },
        { kind: 'pin-level', pin: 'D4', level: 1, atMs: 4100, label: 'tasks.search.checks.7' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 4100, label: 'tasks.search.checks.8' },
        { kind: 'pwm', pin: 'D5', duty: [0.38, 0.48], atMs: 2600, label: 'tasks.search.checks.9' },
        { kind: 'pwm', pin: 'D6', duty: [0.38, 0.48], atMs: 4100, label: 'tasks.search.checks.10' },
      ],
      title: 'tasks.search.title',
      brief: 'tasks.search.brief',
      hints: ['tasks.search.hints.1', 'tasks.search.hints.2', 'tasks.search.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'solder', questions: [q('build', 'header-side', 1), q('build', 'pairs', 0), q('build', 'bypass', 2)] },
    { id: 'read', afterStep: 'line', questions: [q('read', 'rc', 0), q('read', 'timeout', 1), q('read', 'calibrate', 2)] },
    { id: 'follow', afterStep: 'follow', questions: [q('follow', 'error', 1), q('follow', 'kp', 0), q('follow', 'lost', 2)] },
    { id: 'faults', afterStep: 'motors-on-5v', questions: [q('faults', 'three-volts', 2), q('faults', 'pair', 0), q('faults', 'swapped', 1)] },
    { id: 'end', afterStep: null, questions: [q('end', 'why-rc', 1), q('end', 'height', 0), q('end', 'derivative', 2)] },
  ],
  sources: [
    { title: 'Pololu QTR-8RC Reflectance Sensor Array (item 961)', url: 'https://www.pololu.com/product/961' },
    { title: 'Pololu QTR-8A and QTR-8RC user\'s guide', url: 'https://www.pololu.com/docs/0J12' },
    { title: 'Pololu QTR reflectance sensor application note (measured RC times)', url: 'https://www.pololu.com/docs/0J13' },
    { title: 'Pololu QTRSensors Arduino library v4', url: 'https://github.com/pololu/qtr-sensors-arduino' },
    { title: 'onsemi QRE1113 reflective object sensor datasheet', url: 'https://www.pololu.com/file/0J117/QRE1113GR.pdf' },
    { title: 'Toshiba TB6612FNG datasheet (SparkFun mirror)', url: 'https://cdn.sparkfun.com/datasheets/Robotics/TB6612FNG.pdf' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default qtr8rc;
