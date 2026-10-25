// Robotics Bench Fig. 09: a robot's tilt sensor. The GY-521 MPU-6050 breakout is the board you build; a Nano reads it
// with raw Wire calls and sounds a piezo buzzer on D8 when the robot tips past 20°.
// Facts: docs/facts/mpu6050.md (InvenSense product spec rev 3.1 and register map rev 4.0, the GY-521 schematic, the
// Arduino Playground's raw-Wire sketch, the 662K regulator). The chip powers up asleep (PWR_MGMT_1 = 0x40); at its
// default ranges it gives 16384 counts per g and 131 counts per deg/s.
// The figure (figures/modules/mpu6050.js + figures/robotics/mpu6050.js) owns geometry, build groups, the power tree,
// the Nano's sketches and the tilt model; this module owns the text, the code, the steps, the checks and the current
// model. Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it.

import type { BuildStep, FailureMode, RoboticsContent, WorldModel } from '@/content/schema';

const HEAD = `#include <Wire.h>

const int MPU = 0x68;   // {{t:modes.code.address}}
int16_t ax, ay, az, gx;

void wake() {
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);     // {{t:modes.code.pwr}}
  Wire.write(0);
  Wire.endTransmission();
}

void readImu() {
  Wire.beginTransmission(MPU);
  Wire.write(0x3B);     // {{t:modes.code.from}}
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, 14);
  ax = Wire.read() << 8 | Wire.read();
  ay = Wire.read() << 8 | Wire.read();
  az = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read();   // {{t:modes.code.temp}}
  gx = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read(); Wire.read(); Wire.read();
}
`;

const PRINT_RAW = `
void loop() {
  readImu();
  Serial.print("ax ");
  Serial.print(ax / 16384.0, 2);   // {{t:modes.code.g}}
  Serial.print(" ay ");
  Serial.print(ay / 16384.0, 2);
  Serial.print(" az ");
  Serial.print(az / 16384.0, 2);
  Serial.print(" g | gx ");
  Serial.print(gx / 131.0, 1);     // {{t:modes.code.dps}}
  Serial.println(" deg/s");
  delay(1000);
}
`;

const FLAT = `// {{t:modes.code.title}}
` + HEAD + `
void setup() {
  Serial.begin(9600);
  Wire.begin();
  wake();
  Serial.println("mpu6050: awake, +-2 g, +-250 deg/s");
}
` + PRINT_RAW;

const ASLEEP = `// {{t:modes.code.title}}
` + HEAD + `
void setup() {
  Serial.begin(9600);
  Wire.begin();
  // {{t:modes.code.noWake}}
  Serial.println("mpu6050: reading without waking it");
}
` + PRINT_RAW;

const ALARM_TOP = HEAD + `
const int BUZZER = 8;
unsigned long lastPrint = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  wake();
  pinMode(13, OUTPUT);
  Serial.println("tilt alarm: beeps past 20 deg");
}
`;

const PRINT_ROLL = `  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    Serial.print("roll ");
    Serial.print(roll, 0);
    Serial.print(" deg");
    if (abs(roll) > 20) Serial.print(" ALARM");
    Serial.println();
  }
  delay(100);
}
`;

const ALARM_BODY = `  bool alarm = abs(roll) > 20;
  digitalWrite(13, alarm ? HIGH : LOW);
  if (alarm) tone(BUZZER, 2000); else noTone(BUZZER);
`;

const TILT = `// {{t:modes.code.title}}
` + ALARM_TOP + `
void loop() {
  readImu();
  float roll = atan2(ay, az) * 180.0 / PI;   // {{t:modes.code.roll}}
  bool alarm = abs(roll) > 20;
  digitalWrite(13, alarm ? HIGH : LOW);
  if (alarm) tone(BUZZER, 2000); else noTone(BUZZER);   // {{t:modes.code.beep}}
` + PRINT_ROLL;

const SCAN = `// {{t:modes.code.scanTitle}}
#include <Wire.h>

void setup() {
  Wire.begin();
  Serial.begin(9600);
  Serial.println("I2C scanner");
}

void loop() {
  bool any = false;
  for (byte addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {   // {{t:modes.code.ack}}
      Serial.print("I2C device found at address 0x");
      if (addr < 16) Serial.print('0');
      Serial.print(addr, HEX);
      Serial.println(" !");
      any = true;
    }
  }
  if (!any) Serial.println("No I2C devices found");
  delay(1000);
}
`;

const ALARM_STARTER = `// {{t:tasks.alarm.code.goal}}
` + ALARM_TOP + `
void loop() {
  readImu();
  float roll = atan2(ay, az) * 180.0 / PI;
  // {{t:tasks.alarm.code.todo}}
` + PRINT_ROLL;

const ALARM_SOLUTION = ALARM_TOP + `
void loop() {
  readImu();
  float roll = atan2(ay, az) * 180.0 / PI;
` + ALARM_BODY + PRINT_ROLL;

const CAL_TOP = `#include <Wire.h>

const int MPU = 0x68;
long offset = 0;

void wake() {
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission();
}

int16_t readGx() {
  Wire.beginTransmission(MPU);
  Wire.write(0x43);     // {{t:tasks.calibrate.code.gyro}}
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, 2);
  return Wire.read() << 8 | Wire.read();
}
`;

const CAL_LOOP = `
void loop() {
  float gx = (readGx() - offset) / 131.0;
  Serial.print("gx ");
  Serial.print(gx, 2);
  Serial.println(" deg/s");
  delay(500);
}
`;

const CAL_STARTER = `// {{t:tasks.calibrate.code.goal}}
` + CAL_TOP + `
void setup() {
  Serial.begin(9600);
  Wire.begin();
  wake();
  delay(100);
  // {{t:tasks.calibrate.code.todo}}
}
` + CAL_LOOP;

const CAL_SOLUTION = CAL_TOP + `
void setup() {
  Serial.begin(9600);
  Wire.begin();
  wake();
  delay(100);
  long sum = 0;
  for (int i = 0; i < 200; i++) {
    sum += readGx();
    delay(2);
  }
  offset = sum / 200;
  Serial.print("calibrated: offset ");
  Serial.print(offset);
  Serial.println(" counts");
}
` + CAL_LOOP;

// the board tipped about its X axis, as the robot carrying it would be
const IMU = {
  id: 'imu', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x68 }, pins: ['A4', 'A5'], part: 'IC1',
  min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'tasks.imu',
} as const;
const world = (...script: [number, number][]): WorldModel => ({
  inputs: [{ ...IMU, device: { ...IMU.device }, pins: [...IMU.pins] }],
  script: script.map(([t, value]) => ({ t, input: 'imu', value })),
});

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('reverse-vcc', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'reverse-polarity:bench',
    { power: 'off', halts: true, damages: ['U2'] }),
  fault('lipo-on-vcc', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 7.4 }, 'wrong-voltage:bench:7.4',
    { power: 'off', halts: true, damages: ['U2'] }),
  fault('no-c14', 'missing-part', { by: 'remove-part', part: 'C14' }, 'missing:C14',
    { power: 'on', halts: false }),
  fault('no-r6', 'floating-input', { by: 'remove-part', part: 'R6' }, 'missing:R6',
    { power: 'on', halts: false, pins: { AD0: 'stuck-high' } }),
  fault('cold-sda', 'cold-solder', { by: 'cold-joint', part: 'H1', pin: 'SDA' }, 'cold:H1.4',
    { power: 'on', halts: false, pins: { SDA: 'noisy' } }),
  fault('c10-reversed', 'reversed-part', { by: 'reverse-part', part: 'C10' }, 'reversed:C10',
    { power: 'off', halts: true, damages: ['C10'] }),
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
  { id: 'header', kind: 'build', action: { type: 'press', id: 'place', choice: 'h1' }, done: { build: 'tht' }, major: false, ...text('header') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true, ...text('solder') },
  mat('wire-nano', 'nano'), mat('wire-buzzer', 'buzzer'),
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  mode('flat'), mode('tilt', true), mode('asleep'), mode('scan'),
  breakStep('reverse-vcc', 'reverse-vcc', false, { mode: 'flat' }),
  breakStep('lipo-on-vcc', 'lipo-on-vcc', false, { mode: 'flat' }),
  breakStep('no-c14', 'no-c14', false, { mode: 'flat' }),
  breakStep('no-r6', 'no-r6', false, { mode: 'tilt' }),
  breakStep('cold-sda', 'cold-sda', false, { mode: 'tilt' }),
  breakStep('c10-backwards', 'c10-reversed', true, { mode: 'flat' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const mpu6050 = {
  lab: 'robotics',
  id: 'mpu6050',
  fig: 9,
  board: 'nano',
  modules: ['mpu6050'],
  parts: ['piezo-buzzer'],
  figure: {
    page: '/figures/robotics/mpu6050.html',
    parts: [
      { id: 'IC1', short: 'MPU-6050', role: 'sensor', name: 'parts.IC1.name', what: 'parts.IC1.what' },
      { id: 'U2', short: '3V3 REG', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'C10', short: '10 µF', role: 'passive', name: 'parts.C10.name', what: 'parts.C10.what' },
      { id: 'C14', short: 'CPOUT', role: 'passive', name: 'parts.C14.name', what: 'parts.C14.what' },
      { id: 'R4', short: 'SDA PULL-UP', role: 'passive', name: 'parts.R4.name', what: 'parts.R4.what' },
      { id: 'R6', short: 'AD0 PULL-DOWN', role: 'passive', name: 'parts.R6.name', what: 'parts.R6.what' },
      { id: 'D1', short: 'POWER LED', role: 'led', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'H1', short: 'HEADER', role: 'header', name: 'parts.H1.name', what: 'parts.H1.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'BUZ', short: 'BUZZER', role: 'other', name: 'parts.BUZ.name', what: 'parts.BUZ.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'flat', instant: false, language: 'arduino-cpp', code: { source: FLAT, libraries: ['Wire'] }, bytes: 4598,
      serial: ['mpu6050: awake, +-2 g, +-250 deg/s', 'ax 0.00 ay 0.00 az 1.00 g | gx 2.4 deg/s'], title: 'modes.flat.title' },
    { id: 'tilt', instant: false, language: 'arduino-cpp', code: { source: TILT, libraries: ['Wire'] }, bytes: 5874,
      serial: ['tilt alarm: beeps past 20 deg', 'roll 0 deg', 'roll 28 deg ALARM'], title: 'modes.tilt.title' },
    { id: 'asleep', instant: false, language: 'arduino-cpp', code: { source: ASLEEP, libraries: ['Wire'] }, bytes: 4466,
      serial: ['mpu6050: reading without waking it', 'ax 0.00 ay 0.00 az 0.00 g | gx 0.0 deg/s'], title: 'modes.asleep.title' },
    { id: 'scan', instant: false, language: 'arduino-cpp', code: { source: SCAN, libraries: ['Wire'] }, bytes: 4682,
      serial: ['I2C scanner', 'I2C device found at address 0x68 !'], title: 'modes.scan.title' },
  ],
  defaultMode: 'flat',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'roll', key: 'imu.roll', format: 'deg', label: 'status.roll' },
    { id: 'az', key: 'imu.az', format: 'number', label: 'status.az' },
    { id: 'gx', key: 'imu.gx', format: 'number', label: 'status.gx' },
    { id: 'address', key: 'imu.addr', format: 'text', label: 'status.address' },
    { id: 'alarm', key: 'imu.alarm', format: 'on-off', label: 'status.alarm' },
    { id: 'vcc', key: 'rails.VCC', format: 'volts', label: 'status.vcc' },
    { id: 'v33', key: 'rails.3V3', format: 'volts', label: 'status.v33' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [{ id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' }],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'board', supply: 'usb', ma: 5, when: { status: 'running' }, label: 'current.board' },
      { id: 'buzzer', supply: 'usb', ma: 3, when: { 'imu.alarm': true }, label: 'current.buzzer' },
    ],
  },
  tasks: [
    {
      id: 'alarm',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: ALARM_STARTER, libraries: ['Wire'] },
      solution: ALARM_SOLUTION,
      circuit: null,
      // level, tipped 35° at 2 s, back to -10° at 3.5 s, tipped -40° the other way at 5 s
      world: world([0, 0], [2000, 35], [3500, -10], [5000, -40]),
      runMs: 5600,
      checks: [
        { kind: 'runs', minMs: 5500, label: 'tasks.alarm.checks.1' },
        { kind: 'pin-level', pin: 'D13', level: 0, atMs: 1500, label: 'tasks.alarm.checks.2' },
        { kind: 'pin-level', pin: 'D13', level: 1, atMs: 2600, label: 'tasks.alarm.checks.3' },
        { kind: 'tone', pin: 'D8', hz: [1900, 2100], atMs: 2600, label: 'tasks.alarm.checks.4' },
        { kind: 'pin-level', pin: 'D13', level: 0, atMs: 4000, label: 'tasks.alarm.checks.5' },
        { kind: 'pin-level', pin: 'D13', level: 1, atMs: 5400, label: 'tasks.alarm.checks.6' },
        { kind: 'tone', pin: 'D8', hz: [1900, 2100], atMs: 5400, label: 'tasks.alarm.checks.7' },
      ],
      title: 'tasks.alarm.title',
      brief: 'tasks.alarm.brief',
      hints: ['tasks.alarm.hints.1', 'tasks.alarm.hints.2', 'tasks.alarm.hints.3'],
    },
    {
      id: 'calibrate',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: CAL_STARTER, libraries: ['Wire'] },
      solution: CAL_SOLUTION,
      circuit: null,
      world: world([0, 0]),
      runMs: 2000,
      checks: [
        { kind: 'runs', minMs: 1900, label: 'tasks.calibrate.checks.1' },
        { kind: 'serial', match: '^calibrated: offset (7[5-9]|8[0-3]) counts$', regex: true, minCount: 1, label: 'tasks.calibrate.checks.2' },
        { kind: 'serial', match: '^gx -?0\\.0[0-3] deg/s$', regex: true, minCount: 2, label: 'tasks.calibrate.checks.3' },
      ],
      title: 'tasks.calibrate.title',
      brief: 'tasks.calibrate.brief',
      hints: ['tasks.calibrate.hints.1', 'tasks.calibrate.hints.2', 'tasks.calibrate.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'solder', questions: [q('build', 'regulator', 1), q('build', 'pullups', 0), q('build', 'address', 2)] },
    { id: 'read', afterStep: 'tilt', questions: [q('read', 'asleep', 2), q('read', 'counts', 0), q('read', 'roll', 1)] },
    { id: 'faults', afterStep: 'c10-backwards', questions: [q('faults', 'minus-one', 1), q('faults', 'lipo', 0), q('faults', 'noise', 2)] },
    { id: 'end', afterStep: null, questions: [q('end', 'rate', 0), q('end', 'drift', 2), q('end', 'vibration', 1)] },
  ],
  sources: [
    { title: 'InvenSense MPU-6000/MPU-6050 product specification rev 3.1', url: 'https://cdn.sparkfun.com/datasheets/Components/General%20IC/PS-MPU-6000A.pdf' },
    { title: 'InvenSense MPU-6000/MPU-6050 register map rev 4.0', url: 'https://cdn.sparkfun.com/datasheets/Sensors/Accelerometers/RM-MPU-6000A.pdf' },
    { title: 'GY-521 schematic (MPU6050-V1-SCH), Arduino Playground', url: 'https://playground.arduino.cc/uploads/Main/MPU6050-V1-SCH/index.jpg' },
    { title: 'Arduino Playground: MPU-6050 accelerometer + gyro', url: 'https://playground.arduino.cc/Main/MPU-6050/' },
    { title: 'Fritzing part: InvenSense MPU6050 (GY-521)', url: 'https://github.com/fritzing/fritzing-parts' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default mpu6050;
