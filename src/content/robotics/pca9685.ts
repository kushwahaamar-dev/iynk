// Robotics Bench Fig. 08: a three-servo desk arm on the Adafruit PCA9685 16-channel servo driver (product 815).
// Facts: docs/facts/pca9685.md (Adafruit Eagle files rev C, NXP datasheet rev 4, Adafruit library 3.0.3, the SG90 sheet,
// AOD417 datasheet, third-party SG90 current figures). The chip counts 4096 ticks a frame from its own 25 MHz clock:
// setPWMFreq(50) gives prescale 121, a 19.99 ms frame and 4.88 µs ticks, so 1500 µs is 307 ticks. The servos follow
// the libraries' 600-2400 µs = 0-180° model.
// The figure (figures/modules/pca9685.js + figures/robotics/pca9685.js) owns geometry, build groups, the power tree,
// the Nano's sketches and the arm model; this module owns the text, the code, the steps, the checks and the current
// model. Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it.

import type { BuildStep, FailureMode, RoboticsContent } from '@/content/schema';

const HEAD = `#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>

Adafruit_PWMServoDriver pwm;   // {{t:modes.code.address}}
`;

const SERVO_DEG = `
void servoDeg(int ch, int deg) {   // {{t:modes.code.servoDeg}}
  pwm.writeMicroseconds(ch, map(deg, 0, 180, 600, 2400));
}
`;

const BEGIN = `  pwm.begin();          // {{t:modes.code.begin}}
  pwm.setPWMFreq(50);   // {{t:modes.code.freq}}
`;

const CENTRE = `// {{t:modes.code.title}}
` + HEAD + `
void setup() {
  Serial.begin(9600);
` + BEGIN + `  for (int ch = 0; ch < 3; ch++) pwm.writeMicroseconds(ch, 1500);   // {{t:modes.code.centre}}
  Serial.println("pca9685: 50 Hz, ch0-2 at 1500 us (307 ticks)");
}

void loop() {}   // {{t:modes.code.idle}}
`;

const SWEEP = `// {{t:modes.code.title}}
` + HEAD + SERVO_DEG + `
void setup() {
  Serial.begin(9600);
` + BEGIN + `  servoDeg(1, 90);
  servoDeg(2, 90);
  Serial.println("sweep: base 0-180-0, 6 s a round trip");
}

void report(int deg) {
  if (deg % 60 == 0) {
    Serial.print("base ");
    Serial.print(deg);
    Serial.println(" deg");
  }
}

void loop() {
  for (int deg = 0; deg < 180; deg++) { servoDeg(0, deg); report(deg); delay(16); }   // {{t:modes.code.sweep}}
  for (int deg = 180; deg > 0; deg--) { servoDeg(0, deg); report(deg); delay(16); }
}
`;

const PICK = `// {{t:modes.code.title}}
` + HEAD + `
// {{t:modes.code.poses}}
const int BASE_DEG[8]     = {90, 45, 45, 45, 45, 135, 135, 135};
const int SHOULDER_DEG[8] = {90, 90, 48, 48, 120, 120, 48, 48};
const int GRIP_DEG[8]     = {90, 150, 150, 70, 70, 70, 70, 150};
int now[3] = {90, 90, 90};
bool mirrored = false;
` + SERVO_DEG + `
void moveTo(int b, int s, int g) {   // {{t:modes.code.ease}}
  int goal[3] = {b, s, g};
  bool moving = true;
  while (moving) {
    moving = false;
    for (int j = 0; j < 3; j++) {
      if (now[j] != goal[j]) {
        now[j] += now[j] < goal[j] ? 1 : -1;
        servoDeg(j, now[j]);
        moving = true;
      }
    }
    delay(8);
  }
}

void setup() {
  Serial.begin(9600);
` + BEGIN + `  for (int j = 0; j < 3; j++) servoDeg(j, 90);
  Serial.println("pick and place: 8 poses, 1 s each");
}

void loop() {
  for (int i = 0; i < 8; i++) {
    unsigned long start = millis();
    int b = mirrored ? 180 - BASE_DEG[i] : BASE_DEG[i];   // {{t:modes.code.mirror}}
    Serial.print("pose ");
    Serial.print(i + 1);
    Serial.print(": base ");
    Serial.print(b);
    Serial.print(" shoulder ");
    Serial.print(SHOULDER_DEG[i]);
    Serial.print(" grip ");
    Serial.println(GRIP_DEG[i]);
    moveTo(b, SHOULDER_DEG[i], GRIP_DEG[i]);
    while (millis() - start < 1000) {}
  }
  mirrored = !mirrored;
}
`;

const SCAN = `// {{t:modes.code.scanTitle}}
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  Serial.println("I2C scanner");
}

void loop() {
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {   // {{t:modes.code.ack}}
      Serial.print("I2C device found at address 0x");
      if (addr < 16) Serial.print('0');
      Serial.print(addr, HEX);
      Serial.println(" !");
    }
  }
  delay(2000);
}
`;

const SEND = `
void send(uint8_t ch, int us) {
  uint16_t off = ticksFor(us);
  pwm.setPWM(ch, 0, off);   // {{t:tasks.ticks.code.setPWM}}
  Serial.print("ch");
  Serial.print(ch);
  Serial.print(" ");
  Serial.print(us);
  Serial.print(" us = ");
  Serial.print(off);
  Serial.println(" ticks");
}
`;

const TICKS_STARTER = `// {{t:tasks.ticks.code.goal}}
` + HEAD + `
// {{t:tasks.ticks.code.todo}}
uint16_t ticksFor(int us) {
  return us;
}
` + SEND + `
void setup() {
  Serial.begin(9600);
  pwm.begin();
  send(0, 1500);
  send(1, 600);
  send(2, 2400);
}

void loop() {}
`;

const TICKS_SOLUTION = HEAD + `
uint16_t ticksFor(int us) {
  return (uint32_t)us * 4096 / 20000;
}
` + SEND + `
void setup() {
  Serial.begin(9600);
  pwm.begin();
  pwm.setPWMFreq(50);
  send(0, 1500);
  send(1, 600);
  send(2, 2400);
}

void loop() {}
`;

const KNOB_REPORT = `
void report(int deg, int us) {
  Serial.print("base ");
  Serial.print(deg);
  Serial.print(" deg = ");
  Serial.print(us);
  Serial.println(" us");
}
`;

const KNOB_STARTER = `// {{t:tasks.knob.code.goal}}
` + HEAD + `int last = -1;
` + KNOB_REPORT + `
void setup() {
  Serial.begin(9600);
  pwm.begin();
  pwm.setPWMFreq(50);
}

void loop() {
  int deg = 90;   // {{t:tasks.knob.code.todo}}
  int us = map(deg, 0, 180, 600, 2400);
  pwm.writeMicroseconds(0, us);
  if (deg != last) {
    report(deg, us);
    last = deg;
  }
  delay(50);
}
`;

const KNOB_SOLUTION = HEAD + `int last = -1;
` + KNOB_REPORT + `
void setup() {
  Serial.begin(9600);
  pwm.begin();
  pwm.setPWMFreq(50);
}

void loop() {
  int deg = map(analogRead(A0), 0, 1023, 0, 180);
  int us = map(deg, 0, 180, 600, 2400);
  pwm.writeMicroseconds(0, us);
  if (deg != last) {
    report(deg, us);
    last = deg;
  }
  delay(50);
}
`;

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('pack-reversed', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'pack-reversed',
    { power: 'on', halts: false }),
  fault('li-ion', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 16.8 }, 'wrong-voltage:bench:16.8',
    { power: 'on', halts: false, damages: ['ARM'] }),
  fault('brownout', 'brownout', { by: 'load', rail: '5V', ma: 900, part: 'servo-sg90' }, 'brownout',
    { power: 'resetting', halts: true }),
  fault('no-freq', 'config', { by: 'setting', key: 'pwm-hz', value: 1000 }, 'no-freq',
    { power: 'on', halts: false }),
  fault('addr-a0', 'config', { by: 'setting', key: 'i2c-address', value: '0x41' }, 'addr-a0',
    { power: 'on', halts: false }),
  fault('c2-reversed', 'reversed-part', { by: 'reverse-part', part: 'C2' }, 'reversed:C2',
    { power: 'off', halts: true, damages: ['C2'] }),
  fault('cold-sda', 'cold-solder', { by: 'cold-joint', part: 'JP3', pin: 'SDA' }, 'cold:JP3.3',
    { power: 'on', halts: false, pins: { SDA: 'noisy' } }),
  fault('gripper-stall', 'overcurrent', { by: 'load', rail: 'V+', ma: 450, part: 'servo-sg90' }, 'gripper-stall',
    { power: 'on', halts: false, extraMa: 450 }),
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
  // the five headers are the low parts; the terminal and the capacitor are tall, so they go on after them
  { id: 'headers', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht', 'missing.0': 'J1' }, major: false, ...text('headers') },
  { id: 'terminal', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { build: 'tht', 'missing.0': 'C2' }, major: false, ...text('terminal') },
  { id: 'cap', kind: 'build', action: { type: 'press', id: 'place', choice: 'c2' }, done: { build: 'tht', 'missing.0': null }, major: false, ...text('cap') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true, ...text('solder') },
  mat('wire-nano', 'nano'), mat('wire-arm', 'arm'), mat('wire-pack', 'pack'),
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  mode('centre'), mode('sweep'), mode('pick', true), mode('scan'),
  breakStep('reverse-pack', 'pack-reversed', false, { mode: 'centre' }),
  breakStep('li-ion-cells', 'li-ion', false, { mode: 'centre' }),
  breakStep('servos-on-5v', 'brownout', false, { mode: 'sweep' }),
  breakStep('forget-freq', 'no-freq', false, { mode: 'centre' }),
  breakStep('bridge-a0', 'addr-a0', false, { mode: 'centre' }),
  breakStep('c2-backwards', 'c2-reversed', false, { mode: 'centre' }),
  breakStep('cold-sda', 'cold-sda', false, { mode: 'pick' }),
  breakStep('squeeze', 'gripper-stall', true, { mode: 'pick' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const pca9685 = {
  lab: 'robotics',
  id: 'pca9685',
  fig: 8,
  board: 'nano',
  modules: ['pca9685'],
  parts: ['servo-sg90'],
  figure: {
    page: '/figures/robotics/pca9685.html',
    parts: [
      { id: 'U1', short: 'PCA9685', role: 'driver', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'Q1', short: 'PROTECT FET', role: 'protection', name: 'parts.Q1.name', what: 'parts.Q1.what' },
      { id: 'J1', short: 'V+ TERMINAL', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'C2', short: '470 µF', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'JP3', short: 'I2C HEADER', role: 'header', name: 'parts.JP3.name', what: 'parts.JP3.what' },
      { id: 'JP2', short: 'CH 0-3', role: 'header', name: 'parts.JP2.name', what: 'parts.JP2.what' },
      { id: 'R13', short: '220 Ω', role: 'passive', name: 'parts.R13.name', what: 'parts.R13.what' },
      { id: 'R2', short: 'I2C PULL-UPS', role: 'passive', name: 'parts.R2.name', what: 'parts.R2.what' },
      { id: 'SJ_A0', short: 'A0', role: 'jumper', name: 'parts.SJ_A0.name', what: 'parts.SJ_A0.what' },
      { id: 'LED1', short: 'POWER LED', role: 'led', name: 'parts.LED1.name', what: 'parts.LED1.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'ARM', short: 'ARM', role: 'mechanical', name: 'parts.ARM.name', what: 'parts.ARM.what' },
      { id: 'PACK', short: '4 x AA', role: 'other', name: 'parts.PACK.name', what: 'parts.PACK.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'centre', instant: false, language: 'arduino-cpp', code: { source: CENTRE, libraries: ['Wire', 'Adafruit_PWMServoDriver'] }, bytes: 6178,
      serial: ['pca9685: 50 Hz, ch0-2 at 1500 us (307 ticks)'], title: 'modes.centre.title' },
    { id: 'sweep', instant: false, language: 'arduino-cpp', code: { source: SWEEP, libraries: ['Wire', 'Adafruit_PWMServoDriver'] }, bytes: 6342,
      serial: ['sweep: base 0-180-0, 6 s a round trip', 'base 0 deg', 'base 60 deg', 'base 120 deg'], title: 'modes.sweep.title' },
    { id: 'pick', instant: false, language: 'arduino-cpp', code: { source: PICK, libraries: ['Wire', 'Adafruit_PWMServoDriver'] }, bytes: 7206,
      serial: ['pick and place: 8 poses, 1 s each', 'pose 1: base 90 shoulder 90 grip 90', 'pose 2: base 45 shoulder 90 grip 150'], title: 'modes.pick.title' },
    { id: 'scan', instant: false, language: 'arduino-cpp', code: { source: SCAN, libraries: ['Wire'] }, bytes: 4682,
      serial: ['I2C scanner', 'I2C device found at address 0x40 !', 'I2C device found at address 0x70 !'], title: 'modes.scan.title' },
  ],
  defaultMode: 'centre',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'frame', key: 'pwm.hz', format: 'hz', label: 'status.frame' },
    { id: 'ch0', key: 'pwm.us.0', format: 'number', label: 'status.ch0' },
    { id: 'base', key: 'arm.base', format: 'deg', label: 'status.base' },
    { id: 'shoulder', key: 'arm.shoulder', format: 'deg', label: 'status.shoulder' },
    { id: 'grip', key: 'arm.grip', format: 'deg', label: 'status.grip' },
    { id: 'vplus', key: 'arm.vplus', format: 'volts', label: 'status.vplus' },
    { id: 'vcc', key: 'rails.VCC', format: 'volts', label: 'status.vcc' },
    { id: 'servos', key: 'arm.ma', format: 'ma', label: 'status.servos' },
    { id: 'pack', key: 'currentMa.pack', format: 'ma', label: 'status.pack' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [
      { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
      { id: 'pack', volts: 6, limitMa: 2000, label: 'current.pack' },
    ],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'logic', supply: 'usb', ma: 12, when: { power: 'bench' }, label: 'current.logic' },
      { id: 'idle', supply: 'pack', ma: 30, when: { status: 'running' }, label: 'current.idle' },
      { id: 'moving', supply: 'pack', ma: 300, when: { status: 'running', mode: 'pick' }, label: 'current.moving' },
      { id: 'stall', supply: 'pack', ma: 450, when: { 'faults.0': 'gripper-stall' }, label: 'current.stall' },
    ],
  },
  tasks: [
    {
      id: 'ticks',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: TICKS_STARTER, libraries: ['Wire', 'Adafruit_PWMServoDriver'] },
      solution: TICKS_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 600,
      checks: [
        { kind: 'runs', minMs: 500, label: 'tasks.ticks.checks.1' },
        { kind: 'code', must: ['setPWMFreq(50)'], mustNot: [], label: 'tasks.ticks.checks.2' },
        { kind: 'serial', match: '^ch0 1500 us = 30[6-8] ticks$', regex: true, minCount: 1, label: 'tasks.ticks.checks.3' },
        { kind: 'serial', match: '^ch1 600 us = 12[2-4] ticks$', regex: true, minCount: 1, label: 'tasks.ticks.checks.4' },
        { kind: 'serial', match: '^ch2 2400 us = 49[0-3] ticks$', regex: true, minCount: 1, label: 'tasks.ticks.checks.5' },
      ],
      title: 'tasks.ticks.title',
      brief: 'tasks.ticks.brief',
      hints: ['tasks.ticks.hints.1', 'tasks.ticks.hints.2', 'tasks.ticks.hints.3'],
    },
    {
      id: 'knob',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: KNOB_STARTER, libraries: ['Wire', 'Adafruit_PWMServoDriver'] },
      solution: KNOB_SOLUTION,
      circuit: null,
      // a 10 kΩ knob on A0: half way at the start, all the way down at 1.5 s, all the way up at 3 s
      world: {
        inputs: [
          { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'RV1',
            min: 0, max: 300, step: 1, default: 150, unit: '°', gesture: 'knob', label: 'tasks.knob.world' },
        ],
        script: [
          { t: 0, input: 'knob', value: 150 },
          { t: 1500, input: 'knob', value: 0 },
          { t: 3000, input: 'knob', value: 300 },
        ],
      },
      runMs: 4000,
      checks: [
        { kind: 'runs', minMs: 3900, label: 'tasks.knob.checks.1' },
        { kind: 'code', must: ['analogRead(A0)'], mustNot: [], label: 'tasks.knob.checks.2' },
        { kind: 'serial', match: '^base (8[5-9]|9[0-5]) deg = 1[45]\\d\\d us$', regex: true, minCount: 1, byMs: 1400, label: 'tasks.knob.checks.3' },
        { kind: 'serial', match: '^base 0 deg = 600 us$', regex: true, minCount: 1, label: 'tasks.knob.checks.4' },
        { kind: 'serial', match: '^base 180 deg = 2400 us$', regex: true, minCount: 1, label: 'tasks.knob.checks.5' },
      ],
      title: 'tasks.knob.title',
      brief: 'tasks.knob.brief',
      hints: ['tasks.knob.hints.1', 'tasks.knob.hints.2', 'tasks.knob.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'solder', questions: [q('build', 'two-supplies', 1), q('build', 'cap', 0), q('build', 'kit', 2)] },
    { id: 'pulses', afterStep: 'pick', questions: [q('pulses', 'ticks', 2), q('pulses', 'frame', 0), q('pulses', 'cpu', 1)] },
    { id: 'faults', afterStep: 'squeeze', questions: [q('faults', 'led-on', 1), q('faults', 'stall', 2), q('faults', 'brownout', 0)] },
    { id: 'end', afterStep: null, questions: [q('end', 'address', 0), q('end', 'one-frequency', 2), q('end', 'six-volts', 1)] },
  ],
  sources: [
    { title: 'Adafruit 16-Channel 12-bit PWM/Servo Driver, I2C (product 815)', url: 'https://www.adafruit.com/product/815' },
    { title: 'Adafruit PCA9685 board Eagle files (rev C)', url: 'https://github.com/adafruit/Adafruit-16-Channel-PWM-Servo-Driver-PCB' },
    { title: 'NXP PCA9685 datasheet rev 4', url: 'https://cdn-shop.adafruit.com/datasheets/PCA9685.pdf' },
    { title: 'Adafruit PWM Servo Driver library', url: 'https://github.com/adafruit/Adafruit-PWM-Servo-Driver-Library' },
    { title: 'Adafruit Learn: 16 channel servo driver with Arduino', url: 'https://learn.adafruit.com/16-channel-pwm-servo-driver/hooking-it-up' },
    { title: 'TowerPro SG90 datasheet', url: 'https://tams.informatik.uni-hamburg.de/lehre/2023ss/vorlesung/es/doc/sg90.pdf' },
    { title: 'Alpha & Omega AOD417 P-channel MOSFET datasheet', url: 'https://www.aosmd.com/res/datasheets/AOD417.pdf' },
    { title: 'Protosupplies SG90 micro servo (measured idle, moving and stall current)', url: 'https://protosupplies.com/product/servo-motor-micro-sg90/' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default pca9685;
