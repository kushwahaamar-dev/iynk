import type { BenchMode, BuildStep, Check, FailureMode, FigurePart, PracticeTask, Quiz, RoboticsContent, StatusField } from '@/content/schema';

// Robotics Bench Fig. 01: build an Arduino Uno R3 (A000066, UNO-TH Rev3e) from the bare PCB in factory order: the SMD
// parts and the reflow oven, the through-hole parts low to tall, the iron, then the ATmega328P into its socket. Plug in,
// upload, open the exploded view, break the board on purpose one fault at a time, and finish with Blink.
// The board is figures/boards/uno-r3.js (part ids, groups, the power tree with sources usb / jack / vin); this bench's
// sketches, task circuits and build-step conditions (state.tasks.smd-placed … chip-in) are figures/robotics/uno-r3-build.js.
// Facts: docs/facts/uno-r3.md. Part ids are the silkscreen designators; the breadboard parts are R3, LED1 and SW1
// because the board already has an R1, a D1 and an L.

const BLINK = `// {{t:modes.blink.code.what}}
void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // {{t:modes.blink.code.pin}}
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);                    // {{t:modes.blink.code.blocks}}
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}
`;

const FAST = `// {{t:modes.fast.code.what}}
unsigned long last = 0;
bool lit = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - last >= 200) {        // {{t:modes.fast.code.check}}
    last = now;
    lit = !lit;
    digitalWrite(LED_BUILTIN, lit ? HIGH : LOW);
  }
  // {{t:modes.fast.code.free}}
}
`;

const FADE13 = `// {{t:modes.fade13.code.what}}
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  for (int v = 0; v < 256; v++) {
    analogWrite(13, v);   // {{t:modes.fade13.code.nopwm}}
    delay(8);             // {{t:modes.fade13.code.half}}
  }                       // {{t:modes.fade13.code.fix}}
}
`;

const HELLO = `// {{t:modes.hello.code.what}}
int n = 0;                 // {{t:modes.hello.code.int}}

void setup() {
  Serial.begin(9600);      // {{t:modes.hello.code.baud}}
  Serial.println("Uno ready");
}

void loop() {
  Serial.print("hello, robot #");
  Serial.println(n++);
  delay(1000);
}
`;

// mode ids, bytes and serial lines are the figure's (figures/robotics/uno-r3-build.js); the test holds them together
const modes: BenchMode[] = [
  { id: 'blink', instant: false, language: 'arduino-cpp', code: { source: BLINK, libraries: [] }, bytes: 924, serial: [], title: 'modes.blink.title' },
  { id: 'fast', instant: false, language: 'arduino-cpp', code: { source: FAST, libraries: [] }, bytes: 1006, serial: [], title: 'modes.fast.title' },
  { id: 'fade13', instant: false, language: 'arduino-cpp', code: { source: FADE13, libraries: [] }, bytes: 1132, serial: [], title: 'modes.fade13.title' },
  { id: 'hello', instant: false, language: 'arduino-cpp', code: { source: HELLO, libraries: [] }, bytes: 1490,
    serial: ['Uno ready', 'hello, robot #0', 'hello, robot #1', 'hello, robot #2'], title: 'modes.hello.title' },
];

const part = (id: string, short: string, role: FigurePart['role']): FigurePart =>
  ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` });

const parts: FigurePart[] = [
  part('ZU4', 'MCU', 'mcu'), part('SK1', 'SOCKET', 'socket'), part('U3', 'USB-SERIAL', 'usb-bridge'),
  part('Y1', '16 MHz CRYSTAL', 'crystal'), part('Y2', 'RESONATOR', 'crystal'),
  part('U1', '5V REG', 'regulator'), part('U2', '3V3 REG', 'regulator'), part('U5', 'OP-AMP', 'other'), part('T1', 'USB SWITCH', 'other'),
  part('F1', 'POLYFUSE', 'protection'), part('D1', 'DIODE', 'protection'), part('D2', 'D2', 'protection'), part('D3', 'D3', 'protection'),
  part('Z1', 'Z1', 'protection'), part('Z2', 'Z2', 'protection'),
  part('PC1', '47 µF', 'passive'), part('PC2', '47 µF', 'passive'), part('C5', 'AUTO-RESET', 'passive'),
  ...['L1', 'L2', 'C1', 'C2', 'C3', 'C4', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'R1', 'R2', 'RN1', 'RN2', 'RN3', 'RN4']
    .map((id) => part(id, id, 'passive')),
  part('L', 'L LED', 'led'), part('TX', 'TX', 'led'), part('RX', 'RX', 'led'), part('ON', 'ON', 'led'),
  part('RESET', 'RESET', 'button'), part('JP2', 'JP2', 'header'), part('RESET-EN', 'RESET-EN', 'jumper'),
  part('ICSP1', 'ICSP 16U2', 'header'), part('ICSP', 'ICSP', 'header'),
  part('X2', 'USB-B', 'connector'), part('X1', 'POWER JACK', 'connector'),
  part('IOH', 'D8-D13', 'header'), part('IOL', 'D0-D7', 'header'), part('POWER', 'POWER', 'header'), part('AD', 'A0-A5', 'header'),
  part('R3', 'R3', 'passive'), part('LED1', 'LED1', 'led'), part('SW1', 'SW1', 'button'),
];

/* ---------- faults: the original's (chip and capacitor backwards, no chip, no 16U2, no fuse) and the brief's reverse
   polarity, wrong voltage, brown-out and cold solder, each one bridge command ---------- */
const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], state: Record<string, unknown>, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const faults: FailureMode[] = [
  fault('chip-backwards', 'reversed-part', { by: 'reverse-part', part: 'ZU4' }, { power: 'usb', fault: 'reversed:ZU4' },
    { power: 'on', halts: true, extraMa: 600 }),
  fault('cap-backwards', 'reversed-part', { by: 'reverse-part', part: 'PC2' }, { power: 'usb', fault: 'reversed:PC2' },
    { power: 'on', halts: true, damages: ['PC2'] }),
  fault('reverse-jack', 'reverse-polarity', { by: 'reverse', input: 'jack' }, { power: 'jack', fault: 'reverse-polarity:jack' },
    { power: 'off', halts: true }),
  fault('reverse-vin', 'reverse-polarity', { by: 'reverse', input: 'vin' }, { power: 'vin', fault: 'reverse-polarity:vin' },
    { power: 'off', halts: true, damages: ['U1', 'PC1'] }),
  fault('jack-too-high', 'wrong-voltage', { by: 'power-input', input: 'jack', volts: 24 }, { power: 'jack', fault: 'wrong-voltage:jack:24' },
    { power: 'off', halts: true, damages: ['U1'] }),
  fault('jack-too-low', 'wrong-voltage', { by: 'power-input', input: 'jack', volts: 4 }, { power: 'jack', fault: 'wrong-voltage:jack:4' },
    { power: 'resetting', halts: true }),
  fault('motor-brownout', 'brownout', { by: 'load', rail: '5V', ma: 1000, part: 'dc-motor' }, { power: 'usb', fault: 'brownout' },
    { power: 'resetting', halts: true, extraMa: 1000, serial: ['Uno ready', 'hello, robot #0', 'Uno ready', 'hello, robot #0'] }),
  fault('cold-usb', 'cold-solder', { by: 'cold-joint', part: 'X2' }, { power: 'usb', fault: 'cold:X2' },
    { power: 'resetting', halts: true }),
  fault('solder-bridge', 'short', { by: 'short', nets: ['5V', 'GND'] }, { power: 'usb', fault: 'short:5V:GND' },
    { power: 'off', halts: true }),
  fault('chip-missing', 'missing-part', { by: 'remove-part', part: 'ZU4' }, { power: 'usb', fault: 'missing:ZU4' },
    { power: 'on', halts: true }),
  fault('resonator-missing', 'missing-part', { by: 'remove-part', part: 'Y2' }, { power: 'usb', fault: 'missing:Y2' },
    { power: 'on', halts: true }),
  fault('fuse-missing', 'missing-part', { by: 'remove-part', part: 'F1' }, { power: 'usb', fault: 'missing:F1' },
    { power: 'off', halts: true }),
  fault('bridge-missing', 'missing-part', { by: 'remove-part', part: 'U3' }, { power: 'usb', fault: 'missing:U3' },
    { power: 'on', halts: false }),
];

/* ---------- steps: the factory order, then one break step per fault, then Blink ---------- */
const text = (id: string, refusal = false) =>
  ({ title: `steps.${id}.title`, body: `steps.${id}.body`, ...(refusal ? { refusal: `steps.${id}.refusal` } : {}) });

// a break step: Do it sends the fault's own command; the learner repairs it and the board must run again
const breakStep = (id: string, extra: Record<string, unknown> = {}, power: string = 'usb', major = false): BuildStep => {
  const f = faults.find((x) => x.id === id);
  const state = f && f.figure.type === 'set' ? f.figure.state : {};
  return { id, kind: 'break', action: { type: 'set', state: { ...state, ...extra } }, done: { power, status: 'running' }, fault: id, major, ...text(id) };
};

const steps: BuildStep[] = [
  // the figure mounts plugged in and running Blink, like a board out of the box
  { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false, ...text('unplug') },
  { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, ...text('strip', true) },
  { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { 'tasks.smd-placed': true }, major: false, ...text('pick-place', true) },
  { id: 'reflow', kind: 'build', action: null, done: { 'tasks.smd-soldered': true }, major: true, ...text('reflow') },
  { id: 'low-tht', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'tasks.low-in': true }, major: false, ...text('low-tht', true) },
  { id: 'tall-tht', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'tasks.tall-in': true }, major: false, ...text('tall-tht', true) },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { 'tasks.tht-soldered': true }, major: false, ...text('solder', true) },
  { id: 'chip', kind: 'build', action: { type: 'press', id: 'place', choice: 'zu4' }, done: { 'tasks.chip-in': true }, major: true, ...text('chip', true) },
  { id: 'plug', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { power: 'usb', status: 'running' }, major: false, ...text('plug') },
  { id: 'upload', kind: 'test', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { mode: 'hello', status: 'running', ext: false }, major: true,
    ...text('upload', true) },
  { id: 'exploded', kind: 'build', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded', true) },
  breakStep('chip-backwards', { exploded: false }),
  breakStep('cap-backwards'),
  breakStep('reverse-jack', {}, 'jack'),
  breakStep('reverse-vin', {}, 'vin'),
  breakStep('jack-too-high', {}, 'jack'),
  breakStep('jack-too-low', {}, 'jack'),
  breakStep('motor-brownout', {}, 'usb', true),
  breakStep('cold-usb'),
  breakStep('solder-bridge'),
  breakStep('chip-missing'),
  breakStep('resonator-missing'),
  breakStep('fuse-missing'),
  breakStep('bridge-missing'),
  { id: 'blink', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { power: 'usb', mode: 'blink', status: 'running', ext: false },
    major: false, ...text('blink', true) },
];

/* ---------- status and current ---------- */
const status: StatusField[] = [
  { id: 'status', key: 'status', format: 'running', label: 'status.status' },
  { id: 'powered', key: 'leds.ON', format: 'on-off', label: 'status.powered' },
  { id: 'pin13', key: 'leds.L', format: 'on-off', label: 'status.pin13' },
  { id: 'rail-5v', key: 'rails.5V', format: 'volts', label: 'status.rail-5v' },
  { id: 'rail-3v3', key: 'rails.3V3', format: 'volts', label: 'status.rail-3v3' },
  { id: 'rail-vin', key: 'rails.VIN', format: 'volts', label: 'status.rail-vin' },
  { id: 'current', key: 'currentMa', format: 'ma', label: 'status.current' },
];

// about 50 mA for the board itself (docs/facts/uno-r3.md §5): the 16U2, the regulators, the op-amp and the ON LED,
// plus the 328P while it runs; L takes about 3 mA through its 1 kΩ, the breadboard LED (5 V - 2 V) / 220 Ω = 13.6 mA
const SUPPLIES = ['usb', 'jack', 'vin'] as const;
const current: RoboticsContent['current'] = {
  supplies: [
    { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
    { id: 'jack', volts: 9, limitMa: 300, label: 'current.jack' },
    { id: 'vin', volts: 9, limitMa: 300, label: 'current.vin' },
  ],
  loads: SUPPLIES.flatMap((s) => [
    { id: `board-${s}`, supply: s, ma: 35, when: { power: s, 'leds.ON': 1 }, label: 'current.board' },
    { id: `mcu-${s}`, supply: s, ma: 15, when: { power: s, status: 'running' }, label: 'current.mcu' },
    { id: `led-l-${s}`, supply: s, ma: 3, when: { power: s, 'leds.L': 1 }, label: 'current.led-l' },
    { id: `led-ext-${s}`, supply: s, ma: 13.6, when: { power: s, 'leds.L': 1, circuit: 'reaction-timer' }, label: 'current.led-ext' },
  ]),
};

/* ---------- practice tasks ---------- */
type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const checks = (task: string, list: OmitEach<Check, 'label'>[]): Check[] =>
  list.map((c, i) => ({ ...c, label: `tasks.${task}.checks.${i + 1}` }) as Check);

const REACTION_STARTER = `// {{t:tasks.reaction-timer.code.starter}}
const int LED = 13;   // {{t:tasks.reaction-timer.code.pins}}
const int BTN = 2;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
}

void loop() {
  digitalWrite(LED, LOW);
  delay(random(1000, 3001));               // {{t:tasks.reaction-timer.code.blocks}}
  digitalWrite(LED, HIGH);
  unsigned long litAt = millis();
  while (digitalRead(BTN) == HIGH) {       // {{t:tasks.reaction-timer.code.poll}}
  }
  Serial.print("Reaction: ");
  Serial.print(millis() - litAt);
  Serial.println(" ms");
}
`;

const REACTION_SOLUTION = `// {{t:tasks.reaction-timer.code.pins}}
const int LED = 13;
const int BTN = 2;

volatile unsigned long fellAt = 0;
volatile bool fell = false;

unsigned long goAt = 0;
unsigned long litAt = 0;
unsigned long pressAt = 0;
bool lit = false;
bool pending = false;

// {{t:tasks.reaction-timer.code.isr}}
void onFall() {
  fellAt = millis();
  fell = true;
}

void newRound() {
  digitalWrite(LED, LOW);
  lit = false;
  goAt = millis() + random(1000, 3001);
}

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
  pinMode(BTN, INPUT_PULLUP);
  randomSeed(analogRead(A0));              // {{t:tasks.reaction-timer.code.seed}}
  attachInterrupt(digitalPinToInterrupt(BTN), onFall, FALLING);
  newRound();
}

void loop() {
  if (!lit && (long)(millis() - goAt) >= 0) {
    digitalWrite(LED, HIGH);
    litAt = millis();
    lit = true;
  }

  noInterrupts();
  bool got = fell;
  unsigned long at = fellAt;
  fell = false;
  interrupts();
  if (got && !pending) {
    pending = true;
    pressAt = at;
  }

  // {{t:tasks.reaction-timer.code.bounce}}
  if (pending && millis() - pressAt >= 20) {
    pending = false;
    if (digitalRead(BTN) == LOW) {
      if (lit) {
        Serial.print("Reaction: ");
        Serial.print(pressAt - litAt);
        Serial.println(" ms");
      } else {
        Serial.println("Too soon!");
      }
      newRound();
    }
  }
}
`;

const FADE_STARTER = `// {{t:tasks.fade-pwm.code.starter}}
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  for (int v = 0; v < 256; v++) {
    analogWrite(13, v);
    delay(8);
  }
}
`;

const FADE_SOLUTION = `void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  for (int v = 0; v <= 255; v++) {    // {{t:tasks.fade-pwm.code.up}}
    analogWrite(9, v);
    delay(4);
  }
  for (int v = 255; v >= 0; v--) {    // {{t:tasks.fade-pwm.code.down}}
    analogWrite(9, v);
    delay(4);
  }
}
`;

// the button on D2 goes to GND (INPUT_PULLUP): pressed reads LOW. Press 1 comes after the LED is lit, press 2 early in
// the next round (a new round waits at least 1 s), press 3 again after the LED
const PRESSES = [3400, 3700, 7500];

const tasks: PracticeTask[] = [
  {
    id: 'reaction-timer', board: 'uno-r3', language: 'arduino-cpp',
    starter: { source: REACTION_STARTER, libraries: [] }, solution: REACTION_SOLUTION, circuit: 'reaction-timer',
    world: {
      inputs: [{
        id: 'button', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 8 },
        pins: ['D2'], part: 'SW1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'tasks.reaction-timer.world.button',
      }],
      script: PRESSES.flatMap((t) => [{ t, input: 'button', value: 1 }, { t: t + 120, input: 'button', value: 0 }]),
    },
    runMs: 8000,
    checks: checks('reaction-timer', [
      { kind: 'code', must: ['attachInterrupt', 'INPUT_PULLUP', 'millis()'], mustNot: ['delay('] },
      { kind: 'pin-level', pin: 'D13', level: 0, atMs: 500 },
      { kind: 'pin-level', pin: 'D13', level: 1, atMs: 3050 },
      { kind: 'responds', after: { t: PRESSES[0], input: 'button', value: 1 }, pin: 'D13', withinMs: 60, mode: 'out', v: [0, 0] },
      { kind: 'serial', match: '^Reaction: \\d+ ms$', regex: true, minCount: 1, byMs: PRESSES[0] + 100 },
      { kind: 'serial', match: 'Too soon!', regex: false, minCount: 1, byMs: PRESSES[1] + 100 },
    ]),
    title: 'tasks.reaction-timer.title', brief: 'tasks.reaction-timer.brief',
    hints: ['tasks.reaction-timer.hints.1', 'tasks.reaction-timer.hints.2', 'tasks.reaction-timer.hints.3', 'tasks.reaction-timer.hints.4'],
  },
  {
    id: 'fade-pwm', board: 'uno-r3', language: 'arduino-cpp',
    starter: { source: FADE_STARTER, libraries: [] }, solution: FADE_SOLUTION, circuit: 'fade-pwm',
    world: { inputs: [], script: [] }, runMs: 2500,
    checks: checks('fade-pwm', [
      { kind: 'code', must: ['analogWrite('], mustNot: ['analogWrite(13', 'analogWrite(LED_BUILTIN'] },
      { kind: 'pwm', pin: 'D9', duty: [0.4, 0.6], atMs: 500 },
      { kind: 'pwm', pin: 'D9', duty: [0.9, 1], atMs: 1000 },
      { kind: 'pwm', pin: 'D9', duty: [0, 0.1], atMs: 2000 },
    ]),
    title: 'tasks.fade-pwm.title', brief: 'tasks.fade-pwm.brief',
    hints: ['tasks.fade-pwm.hints.1', 'tasks.fade-pwm.hints.2', 'tasks.fade-pwm.hints.3'],
  },
];

/* ---------- quizzes: one after each major step, then the end quiz ---------- */
// questions have named ids (quizzes.<quiz>.<question>.q); answer is the 0-based option
const quiz = (id: string, afterStep: string | null, questions: [string, number][]): Quiz => ({
  id, afterStep,
  questions: questions.map(([q, answer]) => {
    const k = `quizzes.${id}.${q}`;
    return { id: q, q: `${k}.q`, options: [1, 2, 3].map((n) => `${k}.options.${n}`), answer, why: `${k}.why` };
  }),
});

const quizzes: Quiz[] = [
  quiz('reflow', 'reflow', [['smd-first', 0], ['self-align', 1]]),
  quiz('socket', 'chip', [['socket-first', 1], ['notch', 2]]),
  quiz('usb', 'upload', [['bridge', 0], ['auto-reset', 1], ['d0d1', 0]]),
  quiz('brownout', 'motor-brownout', [['motor', 2], ['bod', 0]]),
  quiz('end', null, [['pwm13', 0], ['jack-reverse', 0], ['two-clocks', 1], ['int16', 1]]),
];

const bench = {
  lab: 'robotics',
  id: 'uno-r3-build',
  fig: 1,
  board: 'uno-r3',
  modules: [],
  parts: ['led'],
  figure: { page: '/figures/robotics/uno-r3-build.html', parts, sheets: ['board', 'breadboard', 'schematic', 'power'] },
  power: { source: 'usb', label: 'power.label', ok: 'power.ok' },
  modes,
  defaultMode: 'blink',
  steps,
  faults,
  status,
  current,
  tasks,
  quizzes,
  sources: [
    { title: 'Arduino: UNO R3 (A000066) datasheet', url: 'https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf' },
    { title: 'Arduino: UNO R3 schematic', url: 'https://docs.arduino.cc/resources/schematics/A000066-schematics.pdf' },
    { title: 'Arduino: UNO R3 full pinout', url: 'https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf' },
    { title: 'Arduino: UNO R3 CAD files (UNO-TH_Rev3e Eagle board and schematic)', url: 'https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip' },
    { title: 'Microchip: ATmega328P datasheet DS40002061B (pin limits, brown-out levels)', url: 'https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf' },
    { title: 'ArduinoCore-avr 1.8.8: boards.txt, Optiboot', url: 'https://github.com/arduino/ArduinoCore-avr/tree/1.8.8' },
    { title: 'Bourns MF-MSMF050-2 500 mA polyfuse (element14)', url: 'https://sg.element14.com/bourns/mf-msmf050-2/fuse-ptc-reset-15v-500ma-1812/dp/2128216' },
    { title: 'onsemi NCP1117ST50T3G 5 V regulator (element14)', url: 'https://sg.element14.com/onsemi/ncp1117st50t3g/ana-sot223-800ma-ldo/dp/2441623' },
    { title: 'Texas Instruments: LP2985 150 mA LDO datasheet', url: 'https://www.ti.com/lit/ds/symlink/lp2985.pdf' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default bench;
