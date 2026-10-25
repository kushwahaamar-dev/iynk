// Robotics Bench Fig. 05: a SparkFun TB6612FNG breakout driving two TT gear motors from a 2S LiPo, controlled by a Nano.
// Facts: docs/facts/tb6612.md (SparkFun v1.1c geometry, Toshiba datasheet: truth table, 0.5 Ω bridge, VM/VCC limits,
// UVLO, pull-downs), docs/facts/nano.md (Mini-B USB, 500 mA polyfuse, BOD 2.7 V) and docs/research/robotics-bench-a.md §7
// (the original figure, its quiz and its defects). Fixed here: the board is 20.32 mm square with four parts (no LED, no
// R1), C1 is on VM and C2 on VCC, C3 is a 10 µF tantalum, coast holds PWM HIGH (the datasheet's Stop row), the bridge
// drop is I x 0.5 Ω (not a constant 0.5 V), BIN1/BIN2/VCC are wired, and both motors have their own state.
// The figure (figures/modules/tb6612fng.js + figures/robotics/tb6612fng.js) owns geometry, build groups, the power
// tree and the built-in commands; this module owns the text, the code, the steps, the checks and the current model.
// Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it exactly.

import type { FailureMode, RoboticsContent } from '@/content/schema';

const HEAD = `// {{t:modes.code.title}}
const int PWMA = 5, AIN1 = 7, AIN2 = 8;
const int PWMB = 6, BIN1 = 10, BIN2 = 11, STBY = 9;

void drive(int in1, int in2, int pwm) {
  digitalWrite(AIN1, in1); digitalWrite(AIN2, in2); analogWrite(PWMA, pwm);
  digitalWrite(BIN1, in1); digitalWrite(BIN2, in2); analogWrite(PWMB, pwm);
}
`;

const AWAKE = `
void setup() {
  for (int p = 5; p <= 11; p++) pinMode(p, OUTPUT);
  digitalWrite(STBY, HIGH);   // {{t:modes.code.stby}}
  Serial.begin(9600);
}
`;

const ASLEEP = `
void setup() {
  for (int p = 5; p <= 11; p++) pinMode(p, OUTPUT);
  digitalWrite(STBY, LOW);    // {{t:modes.code.sleep}}
  Serial.begin(9600);
}
`;

const TABLE = `// IN1 IN2 PWM -> H L pwm: {{t:modes.code.fwd}} | L H pwm: {{t:modes.code.rev}} | H H x: {{t:modes.code.brk}} | L L H: {{t:modes.code.cst}}
`;

const FWD50 = HEAD + AWAKE + `
void loop() {
  drive(HIGH, LOW, 128);      // {{t:modes.code.fwd50}}
  Serial.println("AIN1=H AIN2=L PWMA=128 -> forward, ~3.7 V average");
  delay(3000);
}
` + TABLE;

const FWD100 = HEAD + AWAKE + `
void loop() {
  drive(HIGH, LOW, 255);      // {{t:modes.code.fwd100}}
  Serial.println("AIN1=H AIN2=L PWMA=255 -> forward, ~7.3 V at the motor");
  delay(3000);
}
` + TABLE;

const REV = HEAD + AWAKE + `
void loop() {
  drive(LOW, HIGH, 160);      // {{t:modes.code.rev160}}
  Serial.println("AIN1=L AIN2=H PWMA=160 -> reverse, ~4.6 V average");
  delay(3000);
}
` + TABLE;

const BRAKE = HEAD + AWAKE + `
bool told = false;

void loop() {
  drive(HIGH, HIGH, 255);     // {{t:modes.code.brake}}
  if (!told) { Serial.println("AIN1=H AIN2=H -> short brake: stopped hard"); told = true; }
}
` + TABLE;

const COAST = HEAD + AWAKE + `
bool told = false;

void loop() {
  drive(LOW, LOW, 255);       // {{t:modes.code.coast}}
  if (!told) { Serial.println("AIN1=L AIN2=L PWMA=H -> coast: outputs off, spinning down freely"); told = true; }
}
` + TABLE;

const STANDBY = HEAD + ASLEEP + `
bool told = false;

void loop() {
  drive(HIGH, LOW, 128);      // {{t:modes.code.ignored}}
  if (!told) { Serial.println("STBY=L -> standby: every output off, the chip draws under 1 uA"); told = true; }
}
` + TABLE;

const SPEEDS_STARTER = `// {{t:tasks.five-speeds.code.goal}}
const int PWMA = 5, AIN1 = 7, AIN2 = 8, STBY = 9;

void setup() {
  pinMode(PWMA, OUTPUT); pinMode(AIN1, OUTPUT); pinMode(AIN2, OUTPUT); pinMode(STBY, OUTPUT);
  digitalWrite(STBY, HIGH);
  Serial.begin(9600);
}

void loop() {
  // {{t:tasks.five-speeds.code.start}}
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, LOW);
  analogWrite(PWMA, 51);
  delay(1000);
}
`;

const SPEEDS_SOLUTION = `const int PWMA = 5, AIN1 = 7, AIN2 = 8, STBY = 9;

void setup() {
  pinMode(PWMA, OUTPUT); pinMode(AIN1, OUTPUT); pinMode(AIN2, OUTPUT); pinMode(STBY, OUTPUT);
  digitalWrite(STBY, HIGH);
  Serial.begin(9600);
}

void sweep(int in1, int in2) {
  digitalWrite(AIN1, in1);
  digitalWrite(AIN2, in2);
  for (int i = 1; i <= 5; i++) {
    int pwm = 51 * i;
    analogWrite(PWMA, pwm);
    Serial.print("pwm ");
    Serial.println(pwm);
    delay(1000);
  }
}

void loop() {
  sweep(HIGH, LOW);
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, HIGH);
  delay(500);
  sweep(LOW, HIGH);
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, HIGH);
  delay(500);
}
`;

const TURN_STARTER = `// {{t:tasks.one-turn.code.goal}}
const int PWMA = 5, AIN1 = 7, AIN2 = 8, STBY = 9, ENC = 2;
const long SLOTS = 20;        // {{t:tasks.one-turn.code.slots}}
volatile long count = 0;

void tick() {
  count++;
}

void setup() {
  pinMode(PWMA, OUTPUT); pinMode(AIN1, OUTPUT); pinMode(AIN2, OUTPUT); pinMode(STBY, OUTPUT);
  pinMode(ENC, INPUT);
  attachInterrupt(digitalPinToInterrupt(ENC), tick, RISING);
  digitalWrite(STBY, HIGH);
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, LOW);
  analogWrite(PWMA, 150);
  Serial.begin(9600);
}

void loop() {
  // {{t:tasks.one-turn.code.todo}}
}
`;

const TURN_SOLUTION = `const int PWMA = 5, AIN1 = 7, AIN2 = 8, STBY = 9, ENC = 2;
const long SLOTS = 20;
volatile long count = 0;
bool stopped = false;

void tick() {
  count++;
}

void setup() {
  pinMode(PWMA, OUTPUT); pinMode(AIN1, OUTPUT); pinMode(AIN2, OUTPUT); pinMode(STBY, OUTPUT);
  pinMode(ENC, INPUT);
  attachInterrupt(digitalPinToInterrupt(ENC), tick, RISING);
  digitalWrite(STBY, HIGH);
  digitalWrite(AIN1, HIGH); digitalWrite(AIN2, LOW);
  analogWrite(PWMA, 150);
  Serial.begin(9600);
}

void loop() {
  noInterrupts();
  long n = count;
  interrupts();
  if (!stopped && n >= SLOTS) {
    digitalWrite(AIN2, HIGH);
    stopped = true;
    Serial.print("one turn: ");
    Serial.print(n);
    Serial.println(" slots");
  }
}
`;

// The encoder: a 20-slot disc on motor A's shaft gives one rising edge per slot. At PWM 150 from a fresh pack the
// slots pass every 50 ms; the script plays them from t = 300 ms (rising edges at 300, 350, ... 2250 ms: 40 slots).
const ENCODER: { t: number; input: string; value: number }[] = [];
for (let i = 0; i < 80; i++) ENCODER.push({ t: 300 + i * 25, input: 'enc', value: i % 2 === 0 ? 1 : 0 });

const FAULTS: FailureMode[] = [
  { id: 'c3-reversed', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'C3' },
    figure: { type: 'set', state: { power: 'bench', fault: 'reversed:C3' } },
    effect: { power: 'off', halts: true, damages: ['C3'], extraMa: 3000 },
    title: 'faults.c3-reversed.title', symptom: 'faults.c3-reversed.symptom', explanation: 'faults.c3-reversed.explanation', fix: 'faults.c3-reversed.fix' },
  { id: 'reverse-polarity', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'bench' },
    figure: { type: 'set', state: { power: 'bench', fault: 'reverse-polarity:bench' } },
    effect: { power: 'off', halts: true, damages: ['U1', 'C3'], extraMa: 5000 },
    title: 'faults.reverse-polarity.title', symptom: 'faults.reverse-polarity.symptom', explanation: 'faults.reverse-polarity.explanation', fix: 'faults.reverse-polarity.fix' },
  { id: 'over-voltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'bench', volts: 16.8 },
    figure: { type: 'set', state: { power: 'bench', fault: 'wrong-voltage:bench:16.8' } },
    effect: { power: 'off', halts: true, damages: ['U1'] },
    title: 'faults.over-voltage.title', symptom: 'faults.over-voltage.symptom', explanation: 'faults.over-voltage.explanation', fix: 'faults.over-voltage.fix' },
  { id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: 'VCC', ma: 1600, part: 'tt-motor' },
    figure: { type: 'set', state: { power: 'bench', fault: 'brownout' } },
    effect: { power: 'resetting', halts: true, extraMa: 1600, serial: ['AIN1=H AIN2=L PWMA=128 -> forward, ~3.7 V average'] },
    title: 'faults.brownout.title', symptom: 'faults.brownout.symptom', explanation: 'faults.brownout.explanation', fix: 'faults.brownout.fix' },
  { id: 'cold-header', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'JP2', pin: 'JP2.4' },
    figure: { type: 'set', state: { power: 'bench', fault: 'cold:JP2' } },
    effect: { power: 'on', halts: false, pins: { STBY: 'noisy' } },
    title: 'faults.cold-header.title', symptom: 'faults.cold-header.symptom', explanation: 'faults.cold-header.explanation', fix: 'faults.cold-header.fix' },
  { id: 'stby-low', kind: 'floating-input', trigger: { by: 'setting', key: 'mode', value: 'standby' },
    figure: { type: 'set', state: { power: 'bench', mode: 'standby' } },
    effect: { power: 'on', halts: false, pins: { A01: 'dead', A02: 'dead', B01: 'dead', B02: 'dead' } },
    title: 'faults.stby-low.title', symptom: 'faults.stby-low.symptom', explanation: 'faults.stby-low.explanation', fix: 'faults.stby-low.fix' },
  { id: 'no-driver', kind: 'missing-part', trigger: { by: 'remove-part', part: 'U1' },
    figure: { type: 'set', state: { power: 'bench', fault: 'missing:U1' } },
    effect: { power: 'on', halts: true },
    title: 'faults.no-driver.title', symptom: 'faults.no-driver.symptom', explanation: 'faults.no-driver.explanation', fix: 'faults.no-driver.fix' },
];

const tb6612fng = {
  lab: 'robotics',
  id: 'tb6612fng',
  fig: 5,
  board: 'nano',
  modules: ['tb6612fng'],
  parts: ['tt-motor', 'lipo-2s'],
  figure: {
    page: '/figures/robotics/tb6612fng.html',
    parts: [
      { id: 'U1', short: 'DRIVER IC', role: 'driver', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C2', short: 'C2', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'C3', short: '10 µF', role: 'passive', name: 'parts.C3.name', what: 'parts.C3.what' },
      { id: 'JP1', short: 'MOTOR + POWER', role: 'header', name: 'parts.JP1.name', what: 'parts.JP1.what' },
      { id: 'JP2', short: 'CONTROL PINS', role: 'header', name: 'parts.JP2.name', what: 'parts.JP2.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'MOTA', short: 'MOTOR A', role: 'mechanical', name: 'parts.MOTA.name', what: 'parts.MOTA.what' },
      { id: 'MOTB', short: 'MOTOR B', role: 'mechanical', name: 'parts.MOTB.name', what: 'parts.MOTB.what' },
      { id: 'BATT', short: '7.4V LIPO', role: 'other', name: 'parts.BATT.name', what: 'parts.BATT.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'fwd50', instant: true, language: 'arduino-cpp', code: { source: FWD50, libraries: [] }, bytes: 2142,
      serial: ['AIN1=H AIN2=L PWMA=128 -> forward, ~3.7 V average'], title: 'modes.fwd50.title' },
    { id: 'fwd100', instant: true, language: 'arduino-cpp', code: { source: FWD100, libraries: [] }, bytes: 2142,
      serial: ['AIN1=H AIN2=L PWMA=255 -> forward, ~7.3 V at the motor'], title: 'modes.fwd100.title' },
    { id: 'rev', instant: true, language: 'arduino-cpp', code: { source: REV, libraries: [] }, bytes: 2130,
      serial: ['AIN1=L AIN2=H PWMA=160 -> reverse, ~4.6 V average'], title: 'modes.rev.title' },
    { id: 'brake', instant: true, language: 'arduino-cpp', code: { source: BRAKE, libraries: [] }, bytes: 2112,
      serial: ['AIN1=H AIN2=H -> short brake: stopped hard'], title: 'modes.brake.title' },
    { id: 'coast', instant: true, language: 'arduino-cpp', code: { source: COAST, libraries: [] }, bytes: 2118,
      serial: ['AIN1=L AIN2=L PWMA=H -> coast: outputs off, spinning down freely'], title: 'modes.coast.title' },
    { id: 'standby', instant: true, language: 'arduino-cpp', code: { source: STANDBY, libraries: [] }, bytes: 2104,
      serial: ['STBY=L -> standby: every output off, the chip draws under 1 uA'], title: 'modes.standby.title' },
  ],
  defaultMode: 'fwd50',
  steps: [
    { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false,
      title: 'steps.strip.title', body: 'steps.strip.body', refusal: 'steps.strip.refusal' },
    { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false,
      title: 'steps.smd.title', body: 'steps.smd.body', refusal: 'steps.smd.refusal' },
    { id: 'jp1', kind: 'build', action: { type: 'press', id: 'place', choice: 'jp1' }, done: { build: 'tht' }, major: false,
      title: 'steps.jp1.title', body: 'steps.jp1.body', refusal: 'steps.jp1.refusal' },
    { id: 'jp2', kind: 'build', action: { type: 'press', id: 'place', choice: 'jp2' }, done: { build: 'tht', 'missing.length': 0 }, major: false,
      title: 'steps.jp2.title', body: 'steps.jp2.body', refusal: 'steps.jp2.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true,
      title: 'steps.solder.title', body: 'steps.solder.body', refusal: 'steps.solder.refusal' },
    // the Nano, the motors and the LiPo go on the mat one at a time, each with its wires (the figure's matSteps)
    { id: 'wire-nano', kind: 'build', action: { type: 'set', state: { matStep: 'nano' } }, done: { matStep: 'nano' }, major: false,
      title: 'steps.wire-nano.title', body: 'steps.wire-nano.body', refusal: 'steps.wire-nano.refusal' },
    { id: 'wire-motors', kind: 'build', action: { type: 'set', state: { matStep: 'motors' } }, done: { matStep: 'motors' }, major: false,
      title: 'steps.wire-motors.title', body: 'steps.wire-motors.body', refusal: 'steps.wire-motors.refusal' },
    { id: 'wire-battery', kind: 'build', action: { type: 'set', state: { matStep: 'battery' } }, done: { matStep: 'battery' }, major: false,
      title: 'steps.wire-battery.title', body: 'steps.wire-battery.body', refusal: 'steps.wire-battery.refusal' },
    { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false,
      title: 'steps.plug.title', body: 'steps.plug.body', refusal: 'steps.plug.refusal' },
    { id: 'fwd50', kind: 'test', action: { type: 'set', state: { mode: 'fwd50' } }, done: { mode: 'fwd50', status: 'running' }, major: false,
      title: 'steps.fwd50.title', body: 'steps.fwd50.body', refusal: 'steps.fwd50.refusal' },
    { id: 'brake', kind: 'test', action: { type: 'set', state: { mode: 'brake' } }, done: { mode: 'brake', status: 'running' }, major: false,
      title: 'steps.brake.title', body: 'steps.brake.body', refusal: 'steps.brake.refusal' },
    { id: 'coast', kind: 'test', action: { type: 'set', state: { mode: 'coast' } }, done: { mode: 'coast', status: 'running' }, major: true,
      title: 'steps.coast.title', body: 'steps.coast.body', refusal: 'steps.coast.refusal' },
    { id: 'rev', kind: 'test', action: { type: 'set', state: { mode: 'rev' } }, done: { mode: 'rev', status: 'running' }, major: false,
      title: 'steps.rev.title', body: 'steps.rev.body', refusal: 'steps.rev.refusal' },
    { id: 'fwd100', kind: 'test', action: { type: 'set', state: { mode: 'fwd100' } }, done: { mode: 'fwd100', status: 'running' }, major: false,
      title: 'steps.fwd100.title', body: 'steps.fwd100.body', refusal: 'steps.fwd100.refusal' },
    { id: 'standby', kind: 'test', action: { type: 'set', state: { mode: 'standby' } }, done: { mode: 'standby', status: 'running' }, major: false,
      title: 'steps.standby.title', body: 'steps.standby.body', refusal: 'steps.standby.refusal' },
    { id: 'c3-backwards', kind: 'break', action: { type: 'set', state: { power: 'bench', mode: 'fwd50', fault: 'reversed:C3' } }, done: { power: 'bench', status: 'running' },
      fault: 'c3-reversed', major: false, title: 'steps.c3-backwards.title', body: 'steps.c3-backwards.body' },
    { id: 'lipo-backwards', kind: 'break', action: { type: 'set', state: { power: 'bench', fault: 'reverse-polarity:bench' } }, done: { power: 'bench', status: 'running' },
      fault: 'reverse-polarity', major: false, title: 'steps.lipo-backwards.title', body: 'steps.lipo-backwards.body' },
    { id: 'four-cells', kind: 'break', action: { type: 'set', state: { power: 'bench', fault: 'wrong-voltage:bench:16.8' } }, done: { power: 'bench', status: 'running' },
      fault: 'over-voltage', major: false, title: 'steps.four-cells.title', body: 'steps.four-cells.body' },
    { id: 'motors-on-5v', kind: 'break', action: { type: 'set', state: { power: 'bench', fault: 'brownout' } }, done: { power: 'bench', status: 'running' },
      fault: 'brownout', major: true, title: 'steps.motors-on-5v.title', body: 'steps.motors-on-5v.body' },
    { id: 'cold-stby', kind: 'break', action: { type: 'set', state: { power: 'bench', fault: 'cold:JP2' } }, done: { power: 'bench', status: 'running' },
      fault: 'cold-header', major: false, title: 'steps.cold-stby.title', body: 'steps.cold-stby.body' },
    { id: 'no-driver', kind: 'test', action: { type: 'set', state: { power: 'bench', fault: 'missing:U1' } }, done: { power: 'bench', status: 'powered', 'missing.0': 'U1' }, major: false,
      title: 'steps.no-driver.title', body: 'steps.no-driver.body', refusal: 'steps.no-driver.refusal' },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false,
      title: 'steps.exploded.title', body: 'steps.exploded.body', refusal: 'steps.exploded.refusal' },
  ],
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'stby', key: 'levels.STBY', format: 'high-low', label: 'status.stby' },
    { id: 'ain1', key: 'levels.AIN1', format: 'high-low', label: 'status.ain1' },
    { id: 'ain2', key: 'levels.AIN2', format: 'high-low', label: 'status.ain2' },
    { id: 'pwma', key: 'levels.PWMA', format: 'percent', label: 'status.pwma' },
    { id: 'vm', key: 'rails.VM', format: 'volts', label: 'status.vm' },
    { id: 'vcc', key: 'rails.VCC', format: 'volts', label: 'status.vcc' },
    { id: 'motors', key: 'currentMa.lipo', format: 'ma', label: 'status.motors' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [
      { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
      { id: 'lipo', volts: 7.4, limitMa: 2000, label: 'current.lipo' },
    ],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'logic', supply: 'usb', ma: 1.5, when: { status: 'running' }, label: 'current.logic' },
      { id: 'motors-fwd50', supply: 'lipo', ma: 150, when: { status: 'running', mode: 'fwd50' }, label: 'current.motors' },
      { id: 'motors-fwd100', supply: 'lipo', ma: 330, when: { status: 'running', mode: 'fwd100' }, label: 'current.motors' },
      { id: 'motors-rev', supply: 'lipo', ma: 190, when: { status: 'running', mode: 'rev' }, label: 'current.motors' },
      { id: 'motors-on-5v', supply: 'usb', ma: 1600, when: { 'faults.0': 'brownout' }, label: 'current.motors5v' },
      { id: 'c3-short', supply: 'lipo', ma: 3000, when: { 'fault.id': 'reversed:C3' }, label: 'current.c3short' },
      { id: 'body-diodes', supply: 'lipo', ma: 5000, when: { 'fault.id': 'reverse-polarity:bench' }, label: 'current.reverse' },
    ],
  },
  tasks: [
    {
      id: 'five-speeds',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: SPEEDS_STARTER, libraries: [] },
      solution: SPEEDS_SOLUTION,
      circuit: null,
      world: { inputs: [], script: [] },
      runMs: 11000,
      checks: [
        { kind: 'runs', minMs: 10500, label: 'tasks.five-speeds.checks.1' },
        { kind: 'pin-level', pin: 'D9', level: 1, atMs: 100, label: 'tasks.five-speeds.checks.2' },
        { kind: 'pin-level', pin: 'D7', level: 1, atMs: 2500, label: 'tasks.five-speeds.checks.3' },
        { kind: 'pin-level', pin: 'D8', level: 0, atMs: 2500, label: 'tasks.five-speeds.checks.4' },
        { kind: 'pwm', pin: 'D5', duty: [0.18, 0.22], atMs: 500, label: 'tasks.five-speeds.checks.5' },
        { kind: 'pwm', pin: 'D5', duty: [0.58, 0.62], atMs: 2500, label: 'tasks.five-speeds.checks.6' },
        { kind: 'pwm', pin: 'D5', duty: [0.97, 1], atMs: 4500, label: 'tasks.five-speeds.checks.7' },
        { kind: 'pin-level', pin: 'D7', level: 0, atMs: 8000, label: 'tasks.five-speeds.checks.8' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 8000, label: 'tasks.five-speeds.checks.9' },
        { kind: 'pwm', pin: 'D5', duty: [0.18, 0.22], atMs: 6000, label: 'tasks.five-speeds.checks.10' },
        { kind: 'pwm', pin: 'D5', duty: [0.97, 1], atMs: 10000, label: 'tasks.five-speeds.checks.11' },
      ],
      title: 'tasks.five-speeds.title',
      brief: 'tasks.five-speeds.brief',
      hints: ['tasks.five-speeds.hints.1', 'tasks.five-speeds.hints.2', 'tasks.five-speeds.hints.3'],
    },
    {
      id: 'one-turn',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: TURN_STARTER, libraries: [] },
      solution: TURN_SOLUTION,
      circuit: null,
      world: {
        inputs: [
          { id: 'enc', quantity: 'switch', device: { kind: 'switch' }, pins: ['D2'], part: 'MOTA', min: 0, max: 1, step: 1, default: 0,
            gesture: 'tap', label: 'tasks.one-turn.world.enc' },
        ],
        script: ENCODER,
      },
      runMs: 2600,
      checks: [
        { kind: 'code', must: ['attachInterrupt', 'volatile'], mustNot: [], label: 'tasks.one-turn.checks.1' },
        { kind: 'pwm', pin: 'D5', duty: [0.55, 0.62], atMs: 600, label: 'tasks.one-turn.checks.2' },
        { kind: 'pin-level', pin: 'D8', level: 0, atMs: 1200, label: 'tasks.one-turn.checks.3' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 1300, label: 'tasks.one-turn.checks.4' },
        { kind: 'pin-level', pin: 'D8', level: 1, atMs: 2500, label: 'tasks.one-turn.checks.5' },
        { kind: 'serial', match: 'one turn: 20 slots', regex: false, minCount: 1, byMs: 1400, label: 'tasks.one-turn.checks.6' },
      ],
      title: 'tasks.one-turn.title',
      brief: 'tasks.one-turn.brief',
      hints: ['tasks.one-turn.hints.1', 'tasks.one-turn.hints.2', 'tasks.one-turn.hints.3'],
    },
  ],
  quizzes: [
    {
      id: 'build',
      afterStep: 'solder',
      questions: [
        { id: 'reflow-first', q: 'quizzes.build.reflow-first.q', options: ['quizzes.build.reflow-first.options.1', 'quizzes.build.reflow-first.options.2', 'quizzes.build.reflow-first.options.3'], answer: 0, why: 'quizzes.build.reflow-first.why' },
        { id: 'c3-way', q: 'quizzes.build.c3-way.q', options: ['quizzes.build.c3-way.options.1', 'quizzes.build.c3-way.options.2', 'quizzes.build.c3-way.options.3'], answer: 0, why: 'quizzes.build.c3-way.why' },
        { id: 'c3-job', q: 'quizzes.build.c3-job.q', options: ['quizzes.build.c3-job.options.1', 'quizzes.build.c3-job.options.2', 'quizzes.build.c3-job.options.3'], answer: 1, why: 'quizzes.build.c3-job.why' },
      ],
    },
    {
      id: 'drive',
      afterStep: 'coast',
      questions: [
        { id: 'both-high', q: 'quizzes.drive.both-high.q', options: ['quizzes.drive.both-high.options.1', 'quizzes.drive.both-high.options.2', 'quizzes.drive.both-high.options.3'], answer: 1, why: 'quizzes.drive.both-high.why' },
        { id: 'half-duty', q: 'quizzes.drive.half-duty.q', options: ['quizzes.drive.half-duty.options.1', 'quizzes.drive.half-duty.options.2', 'quizzes.drive.half-duty.options.3'], answer: 1, why: 'quizzes.drive.half-duty.why' },
        { id: 'pwm-low', q: 'quizzes.drive.pwm-low.q', options: ['quizzes.drive.pwm-low.options.1', 'quizzes.drive.pwm-low.options.2', 'quizzes.drive.pwm-low.options.3'], answer: 1, why: 'quizzes.drive.pwm-low.why' },
      ],
    },
    {
      id: 'faults',
      afterStep: 'motors-on-5v',
      questions: [
        { id: 'resets', q: 'quizzes.faults.resets.q', options: ['quizzes.faults.resets.options.1', 'quizzes.faults.resets.options.2', 'quizzes.faults.resets.options.3'], answer: 2, why: 'quizzes.faults.resets.why' },
        { id: 'backwards', q: 'quizzes.faults.backwards.q', options: ['quizzes.faults.backwards.options.1', 'quizzes.faults.backwards.options.2', 'quizzes.faults.backwards.options.3'], answer: 1, why: 'quizzes.faults.backwards.why' },
        { id: 'cells', q: 'quizzes.faults.cells.q', options: ['quizzes.faults.cells.options.1', 'quizzes.faults.cells.options.2', 'quizzes.faults.cells.options.3'], answer: 2, why: 'quizzes.faults.cells.why' },
      ],
    },
    {
      id: 'end',
      afterStep: null,
      questions: [
        { id: 'vs-l298n', q: 'quizzes.end.vs-l298n.q', options: ['quizzes.end.vs-l298n.options.1', 'quizzes.end.vs-l298n.options.2', 'quizzes.end.vs-l298n.options.3'], answer: 0, why: 'quizzes.end.vs-l298n.why' },
        { id: 'stby-open', q: 'quizzes.end.stby-open.q', options: ['quizzes.end.stby-open.options.1', 'quizzes.end.stby-open.options.2', 'quizzes.end.stby-open.options.3'], answer: 1, why: 'quizzes.end.stby-open.why' },
        { id: 'stutter', q: 'quizzes.end.stutter.q', options: ['quizzes.end.stutter.options.1', 'quizzes.end.stutter.options.2', 'quizzes.end.stutter.options.3'], answer: 0, why: 'quizzes.end.stutter.why' },
      ],
    },
  ],
  sources: [
    { title: 'Toshiba TB6612FNG datasheet (2008-05-09, Pololu mirror)', url: 'https://www.pololu.com/file/0J86/TB6612FNG.pdf' },
    { title: 'SparkFun Motor Driver - Dual TB6612FNG (1A), ROB-14451', url: 'https://www.sparkfun.com/sparkfun-motor-driver-dual-tb6612fng-1a.html' },
    { title: 'SparkFun TB6612FNG v11c Eagle files', url: 'https://cdn.sparkfun.com/assets/4/0/c/e/4/SparkFun_Motor_Driver-TB6612FNG_v11c.zip' },
    { title: 'SparkFun TB6612FNG Hookup Guide', url: 'https://learn.sparkfun.com/tutorials/tb6612fng-hookup-guide/all' },
    { title: 'Pololu TB6612FNG Dual Motor Driver Carrier (#713)', url: 'https://www.pololu.com/product/713' },
    { title: 'Arduino Nano (A000005) documentation', url: 'https://docs.arduino.cc/hardware/nano/' },
    { title: 'Microchip ATmega328P datasheet (brown-out levels)', url: 'https://www.microchip.com/en-us/product/ATmega328P' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default tb6612fng;
