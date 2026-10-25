// Robotics Bench Fig. 10: a robot's eyes for the wall ahead. The classic HC-SR04 is the board you build; a Nano pings
// it (Trig D9, Echo D10, as the Learn Arduino lesson) and beeps a piezo on D8 faster as a hand comes closer.
// Facts: docs/facts/hcsr04.md (the ElecFreaks and Cytron sheets, the reverse-engineered schematic, the Silicon Chip
// teardown, the Arduino pulseIn reference): a 10 µs Trig pulse starts eight 40 kHz cycles, Echo stays HIGH for the
// round trip, 58 µs per cm, 2 cm to 4 m, about 38 ms when nothing comes back, 5 V only with no protection at all.
// The figure (figures/modules/hc-sr04.js + figures/robotics/hc-sr04.js) owns geometry, build groups, the power tree,
// the targets and the Nano's sketches; this module owns the text, the code, the steps, the checks and the current
// model. Part ids, mode ids, the supply key and fault ids are shared with the figure and must match it.

import type { BuildStep, FailureMode, RoboticsContent, WorldModel } from '@/content/schema';

const PINS = `const int TRIG = 9;
const int ECHO = 10;
`;

const PING_FN = `
float ping() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);   // {{t:modes.code.trig}}
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000UL);   // {{t:modes.code.timeout}}
  if (us == 0) return -1;
  return us / 58.0;   // {{t:modes.code.cm}}
}
`;

const SETUP = (banner: string, extra = '') => `
void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
${extra}  Serial.println("${banner}");
}
`;

// the same sketch for the wall, the cushion and the open room: only what it points at changes
const PING = (title: string) => `// {{t:modes.code.${title}}}
` + PINS + PING_FN + SETUP('hc-sr04: one ping a second') + `
void loop() {
  float cm = ping();
  if (cm < 0) {
    Serial.println("no echo");   // {{t:modes.code.noEcho}}
  } else {
    Serial.print(cm, 2);
    Serial.println(" cm");
  }
  delay(1000);
}
`;

const PARK = `// {{t:modes.code.park}}
` + PINS + `const int BUZZER = 8;
float cm = -1;
unsigned long lastPing = 0, lastBeep = 0, lastPrint = 0;
` + PING_FN + SETUP('parking sensor: beeps faster as you get closer') + `
void loop() {
  unsigned long now = millis();
  if (now - lastPing >= 60) {   // {{t:modes.code.gap}}
    lastPing = now;
    cm = ping();
  }
  if (cm < 0 || cm > 100) noTone(BUZZER);
  else if (cm < 10) tone(BUZZER, 2000);   // {{t:modes.code.stop}}
  else if (now - lastBeep >= cm * 10) {    // {{t:modes.code.rate}}
    lastBeep = now;
    tone(BUZZER, 2000, 50);
  }
  if (now - lastPrint >= 1000) {
    lastPrint = now;
    if (cm < 0) Serial.println("no echo");
    else {
      Serial.print(cm, 2);
      if (cm < 10) Serial.println(" cm: STOP");
      else if (cm <= 100) {
        Serial.print(" cm: beep every ");
        Serial.print((int)(cm * 10));
        Serial.println(" ms");
      } else Serial.println(" cm");
    }
  }
}
`;

// the bumper: the starter's ping() returns 0 for "no echo", and the starter brakes on it
const BRAKE_TOP = PINS + `const int BRAKE = 13;
unsigned long lastPrint = 0;

float ping() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  unsigned long us = pulseIn(ECHO, HIGH, 30000UL);
  return us / 58.0;   // {{t:tasks.brake.code.zero}}
}
` + SETUP('bumper: brakes under 20 cm', '  pinMode(BRAKE, OUTPUT);\n');

const BRAKE_LOOP = (rule: string, note = '') => `
void loop() {
  float cm = ping();
${note}  bool brake = ${rule};
  digitalWrite(BRAKE, brake ? HIGH : LOW);
  if (millis() - lastPrint >= 1000) {
    lastPrint = millis();
    Serial.print(cm, 2);
    Serial.println(brake ? " cm BRAKE" : " cm");
  }
  delay(60);
}
`;

const BRAKE_STARTER = `// {{t:tasks.brake.code.goal}}
` + BRAKE_TOP + BRAKE_LOOP('cm < 20', '  // {{t:tasks.brake.code.todo}}\n');
const BRAKE_SOLUTION = BRAKE_TOP + BRAKE_LOOP('cm > 0 && cm < 20');

const SPEED_TOP = PINS + `float last = -1;
unsigned long lastAt = 0, nextAt = 0;
` + PING_FN + SETUP('closing speed: a ping every 500 ms');

const SPEED_STARTER = `// {{t:tasks.speed.code.goal}}
` + SPEED_TOP + `
void loop() {
  unsigned long now = millis();
  if (now < nextAt) return;
  nextAt = now + 500;
  float cm = ping();
  if (cm < 0) Serial.print("no echo");
  else {
    Serial.print(cm, 1);
    Serial.print(" cm");
  }
  // {{t:tasks.speed.code.todo}}
  Serial.println();
}
`;

const SPEED_SOLUTION = SPEED_TOP + `
void loop() {
  unsigned long now = millis();
  if (now < nextAt) return;
  nextAt = now + 500;
  float cm = ping();
  if (cm < 0) Serial.print("no echo");
  else {
    Serial.print(cm, 1);
    Serial.print(" cm");
  }
  if (cm > 0 && last > 0) {
    float speed = (last - cm) / ((now - lastAt) / 1000.0);
    if (speed > 2) {
      Serial.print(", approaching at ");
      Serial.print(speed, 0);
      Serial.print(" cm/s");
    } else if (speed < -2) {
      Serial.print(", moving away at ");
      Serial.print(-speed, 0);
      Serial.print(" cm/s");
    } else {
      Serial.print(", holding");
    }
  }
  Serial.println();
  last = cm;
  lastAt = now;
}
`;

// what is in front of the sensor, in cm (over 4 m: nothing echoes)
const SONAR = {
  id: 'sonar', quantity: 'distance-cm', device: { kind: 'hc-sr04' }, pins: ['D9', 'D10'], part: 'R',
  min: 2, max: 450, step: 1, default: 30, unit: 'cm', gesture: 'drag', label: 'tasks.sonar',
} as const;
const world = (...script: [number, number][]): WorldModel => ({
  inputs: [{ ...SONAR, device: { ...SONAR.device }, pins: [...SONAR.pins] }],
  script: script.map(([t, value]) => ({ t, input: 'sonar', value })),
});
// a hand 1 m away coming 10 cm closer every half second down to 30 cm, holding there, then backing off
const CLOSING: [number, number][] = [[0, 100], [250, 90], [750, 80], [1250, 70], [1750, 60], [2250, 50], [2750, 40], [3250, 30], [4250, 40], [4750, 50]];

const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('reverse-vcc', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'reverse-polarity:bench',
    { power: 'off', halts: true, damages: ['U1'] }),
  fault('vcc-on-3v3', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 3.3 }, 'wrong-voltage:bench:3.3',
    { power: 'on', halts: false }),
  fault('no-receiver', 'missing-part', { by: 'remove-part', part: 'R' }, 'missing:R',
    { power: 'on', halts: false }),
  fault('cold-echo', 'cold-solder', { by: 'cold-joint', part: 'J1', pin: 'ECHO' }, 'cold:J1.3',
    { power: 'on', halts: false, pins: { ECHO: 'noisy' } }),
  fault('no-timeout', 'config', { by: 'setting', key: 'pulsein-timeout', value: 0 }, 'no-timeout',
    { power: 'on', halts: false }),
  fault('short-vcc', 'short', { by: 'short', nets: ['VCC', 'GND'] }, 'short:VCC:GND',
    { power: 'off', halts: true }),
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
  { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht', 'missing.0': 'T' }, major: false, ...text('low') },
  { id: 'cans', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { build: 'tht', 'missing.0': null }, major: false, ...text('cans') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true, ...text('solder') },
  mat('wire-nano', 'nano'), mat('wire-buzzer', 'buzzer'),
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  mode('wall'), mode('approach', true), mode('cushion'), mode('open'),
  breakStep('reverse-vcc', 'reverse-vcc', false, { mode: 'wall' }),
  breakStep('vcc-on-3v3', 'vcc-on-3v3', false, { mode: 'wall' }),
  breakStep('no-receiver', 'no-receiver', false, { mode: 'wall' }),
  breakStep('cold-echo', 'cold-echo', false, { mode: 'wall' }),
  breakStep('no-timeout', 'no-timeout', false, { mode: 'open' }),
  breakStep('short-vcc', 'short-vcc', true, { mode: 'wall' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

const q = (quiz: string, id: string, answer: number) => ({
  id, q: `quizzes.${quiz}.${id}.q`, options: [1, 2, 3].map((n) => `quizzes.${quiz}.${id}.options.${n}`), answer, why: `quizzes.${quiz}.${id}.why`,
});

const hcsr04 = {
  lab: 'robotics',
  id: 'hc-sr04',
  fig: 10,
  board: 'nano',
  modules: ['hc-sr04'],
  parts: ['piezo-buzzer'],
  figure: {
    page: '/figures/robotics/hc-sr04.html',
    parts: [
      { id: 'T', short: 'TRANSMITTER', role: 'sensor', name: 'parts.T.name', what: 'parts.T.what' },
      { id: 'R', short: 'RECEIVER', role: 'sensor', name: 'parts.R.name', what: 'parts.R.what' },
      { id: 'U1', short: 'MCU', role: 'mcu', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U2', short: 'TX DRIVER', role: 'driver', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'U3', short: 'RX AMP', role: 'other', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'Y1', short: '4 MHz', role: 'crystal', name: 'parts.Y1.name', what: 'parts.Y1.what' },
      { id: 'J1', short: 'HEADER', role: 'header', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'NANO', short: 'NANO', role: 'mcu', name: 'parts.NANO.name', what: 'parts.NANO.what' },
      { id: 'BUZ', short: 'BUZZER', role: 'other', name: 'parts.BUZ.name', what: 'parts.BUZ.what' },
    ],
    sheets: ['board', 'schematic', 'power'],
  },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes: [
    { id: 'wall', instant: false, language: 'arduino-cpp', code: { source: PING('wall'), libraries: [] }, bytes: 2340,
      serial: ['hc-sr04: one ping a second', '30.02 cm'], title: 'modes.wall.title' },
    { id: 'approach', instant: false, language: 'arduino-cpp', code: { source: PARK, libraries: [] }, bytes: 3412,
      serial: ['parking sensor: beeps faster as you get closer', '92.10 cm: beep every 921 ms', '8.03 cm: STOP'], title: 'modes.approach.title' },
    { id: 'cushion', instant: false, language: 'arduino-cpp', code: { source: PING('cushion'), libraries: [] }, bytes: 2340,
      serial: ['hc-sr04: one ping a second', 'no echo', '183.40 cm'], title: 'modes.cushion.title' },
    { id: 'open', instant: false, language: 'arduino-cpp', code: { source: PING('open'), libraries: [] }, bytes: 2340,
      serial: ['hc-sr04: one ping a second', 'no echo'], title: 'modes.open.title' },
  ],
  defaultMode: 'wall',
  steps,
  faults: FAULTS,
  status: [
    { id: 'status', key: 'status', format: 'running', label: 'status.status' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'mode', key: 'mode', format: 'text', label: 'status.mode' },
    { id: 'distance', key: 'sonar.cm', format: 'cm', label: 'status.distance' },
    { id: 'echo', key: 'sonar.us', format: 'number', label: 'status.echo' },
    { id: 'beep', key: 'sonar.beep', format: 'on-off', label: 'status.beep' },
    { id: 'vcc', key: 'rails.VCC', format: 'volts', label: 'status.vcc' },
    { id: 'usb', key: 'currentMa.usb', format: 'ma', label: 'status.usb' },
  ],
  current: {
    supplies: [{ id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' }],
    loads: [
      { id: 'nano', supply: 'usb', ma: 25, when: { power: 'bench' }, label: 'current.nano' },
      { id: 'board', supply: 'usb', ma: 15, when: { status: 'running' }, label: 'current.board' },
      { id: 'buzzer', supply: 'usb', ma: 3, when: { 'sonar.beep': true }, label: 'current.buzzer' },
    ],
  },
  tasks: [
    {
      id: 'brake',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: BRAKE_STARTER, libraries: [] },
      solution: BRAKE_SOLUTION,
      circuit: null,
      // a wall 80 cm off, 15 cm at 1.5 s, an open room (nothing echoes) at 3 s, 8 cm at 4.5 s
      world: world([0, 80], [1500, 15], [3000, 450], [4500, 8]),
      runMs: 6000,
      checks: [
        { kind: 'runs', minMs: 5900, label: 'tasks.brake.checks.1' },
        { kind: 'pin-level', pin: 'D13', level: 0, atMs: 1200, label: 'tasks.brake.checks.2' },
        { kind: 'pin-level', pin: 'D13', level: 1, atMs: 2500, label: 'tasks.brake.checks.3' },
        { kind: 'pin-level', pin: 'D13', level: 0, atMs: 4000, label: 'tasks.brake.checks.4' },
        { kind: 'pin-level', pin: 'D13', level: 1, atMs: 5500, label: 'tasks.brake.checks.5' },
      ],
      title: 'tasks.brake.title',
      brief: 'tasks.brake.brief',
      hints: ['tasks.brake.hints.1', 'tasks.brake.hints.2', 'tasks.brake.hints.3'],
    },
    {
      id: 'speed',
      board: 'nano',
      language: 'arduino-cpp',
      starter: { source: SPEED_STARTER, libraries: [] },
      solution: SPEED_SOLUTION,
      circuit: null,
      world: world(...CLOSING),
      runMs: 5200,
      checks: [
        { kind: 'runs', minMs: 5100, label: 'tasks.speed.checks.1' },
        { kind: 'serial', match: '^\\d+\\.\\d cm, approaching at (19|20|21) cm/s$', regex: true, minCount: 6, label: 'tasks.speed.checks.2' },
        { kind: 'serial', match: '^30\\.\\d cm, holding$', regex: true, minCount: 1, label: 'tasks.speed.checks.3' },
        { kind: 'serial', match: '^\\d+\\.\\d cm, moving away at (19|20|21) cm/s$', regex: true, minCount: 1, label: 'tasks.speed.checks.4' },
      ],
      title: 'tasks.speed.title',
      brief: 'tasks.speed.brief',
      hints: ['tasks.speed.hints.1', 'tasks.speed.hints.2', 'tasks.speed.hints.3'],
    },
  ],
  quizzes: [
    { id: 'build', afterStep: 'solder', questions: [q('build', 'crystal', 0), q('build', 'cans', 1), q('build', 'protection', 2)] },
    { id: 'ping', afterStep: 'approach', questions: [q('ping', 'formula', 1), q('ping', 'why58', 0), q('ping', 'zero', 2)] },
    { id: 'faults', afterStep: 'short-vcc', questions: [q('faults', 'low-vcc', 1), q('faults', 'soft', 2), q('faults', 'timeout', 0)] },
    { id: 'end', afterStep: null, questions: [q('end', 'cone', 0), q('end', 'two', 1), q('end', 'gap', 2)] },
  ],
  sources: [
    { title: 'ElecFreaks: Ultrasonic Ranging Module HC-SR04 datasheet', url: 'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf' },
    { title: 'Cytron: HC-SR04 Ultrasonic Sensor user manual V1.0', url: 'https://docs.google.com/document/d/1Y-yZnNhMYy7rwhAgyL_pfa39RsB-x2qR4vP8saG73rE' },
    { title: 'HC-SR04 Ultrasound Echo Locator, reverse-engineered schematic rev 0.1', url: 'https://mischianti.org/wp-content/uploads/2025/11/Ultrasonic-Sensor-HC-SR04-classic-schema.pdf' },
    { title: 'Silicon Chip: El Cheapo Modules From Asia, part 2 (December 2016)', url: 'https://siliconchip.com.au/Issue/2016/December/El+Cheapo+Modules+From+Asia+-+Part+2' },
    { title: 'Arduino language reference: pulseIn()', url: 'https://docs.arduino.cc/language-reference/en/functions/advanced-io/pulseIn/' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default hcsr04;
