import type { BenchMode, BuildStep, FailureMode, PracticeTask, Quiz, RoboticsContent } from '@/content/schema';

// Robotics Bench Fig. 03, rebuilt: a Nano pin switches a battery-powered TT gear motor through a TIP120 Darlington
// (low-side), with a 1N4007 flyback diode across the motor and a green LED that shows what pin 9 is doing.
// The figure (figures/robotics/transistor-switch.js) owns the geometry, the breadboard circuits and the motor model;
// this module holds what the host shows and checks. Shared ids: circuit parts R1 Q1 D1 R2 LED1 M1 BT1, circuits
// bench / stage-drive / stage-motor / speed-knob / toggle-button, modes high / pwm / low / ramp, and the fault ids
// in each FailureMode.figure command.

const page = '/figures/robotics/transistor-switch.html' as const;

const modes: BenchMode[] = [
  {
    id: 'high',
    instant: false,
    language: 'arduino-cpp',
    bytes: 1568,
    title: 'modes.high',
    serial: ['pin 9 HIGH: TIP120 on, motor runs'],
    code: {
      libraries: [],
      source: `// {{t:modes.code.high.c1}}
const int IN = 9;          // {{t:modes.code.high.c2}}

void setup() {
  pinMode(IN, OUTPUT);
  Serial.begin(9600);
  digitalWrite(IN, HIGH);  // {{t:modes.code.high.c3}}
  Serial.println("pin 9 HIGH: TIP120 on, motor runs");
}

void loop() {}             // {{t:modes.code.high.c4}}
// {{t:modes.code.high.c5}}
`,
    },
  },
  {
    id: 'pwm',
    instant: false,
    language: 'arduino-cpp',
    bytes: 1690,
    title: 'modes.pwm',
    serial: ['analogWrite(9, 128): 490 Hz, 50% duty'],
    code: {
      libraries: [],
      source: `// {{t:modes.code.pwm.c1}}
const int IN = 9;          // {{t:modes.code.pwm.c2}}

void setup() {
  pinMode(IN, OUTPUT);
  Serial.begin(9600);
  analogWrite(IN, 128);    // {{t:modes.code.pwm.c3}}
  Serial.println("analogWrite(9, 128): 490 Hz, 50% duty");
}

void loop() {}             // {{t:modes.code.pwm.c4}}
// {{t:modes.code.pwm.c5}}
`,
    },
  },
  {
    id: 'low',
    instant: false,
    language: 'arduino-cpp',
    bytes: 1581,
    title: 'modes.low',
    serial: ['pin 9 LOW: TIP120 off, motor coasts to a stop'],
    code: {
      libraries: [],
      source: `// {{t:modes.code.low.c1}}
const int IN = 9;

void setup() {
  pinMode(IN, OUTPUT);
  Serial.begin(9600);
  digitalWrite(IN, LOW);   // {{t:modes.code.low.c2}}
  Serial.println("pin 9 LOW: TIP120 off, motor coasts to a stop");
}

void loop() {}             // {{t:modes.code.low.c3}}
`,
    },
  },
  {
    id: 'ramp',
    instant: false,
    language: 'arduino-cpp',
    bytes: 2236,
    title: 'modes.ramp',
    serial: ['soft start: 0 to 255 in about 2 s', 'duty 125', 'duty 250', 'duty 255'],
    code: {
      libraries: [],
      source: `// {{t:modes.code.ramp.c1}}
const int IN = 9;
int duty = 0;
unsigned long lastStep = 0;
unsigned long lastPrint = 0;

void setup() {
  pinMode(IN, OUTPUT);
  Serial.begin(9600);
  Serial.println("soft start: 0 to 255 in about 2 s");
}

void loop() {
  unsigned long now = millis();
  if (duty < 255 && now - lastStep >= 8) {   // {{t:modes.code.ramp.c2}}
    lastStep = now;
    duty++;
    analogWrite(IN, duty);
  }
  if (now - lastPrint >= 1000) {             // {{t:modes.code.ramp.c3}}
    lastPrint = now;
    Serial.print("duty ");
    Serial.println(duty);
  }
}
`,
    },
  },
];

const set = (state: Record<string, unknown>) => ({ type: 'set', state }) as const;
const fault = (id: string) => set({ fault: id });

const faults: FailureMode[] = [
  {
    id: 'no-flyback', kind: 'missing-part', trigger: { by: 'remove-part', part: 'D1' }, figure: fault('no-flyback'),
    effect: { power: 'on', halts: false, damages: ['Q1'] },
    title: 'faults.no-flyback.title', symptom: 'faults.no-flyback.symptom', explanation: 'faults.no-flyback.explanation', fix: 'faults.no-flyback.fix',
  },
  {
    id: 'flyback-reversed', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'D1' }, figure: fault('flyback-reversed'),
    effect: { power: 'on', halts: false, damages: ['D1'], extraMa: 2500 },
    title: 'faults.flyback-reversed.title', symptom: 'faults.flyback-reversed.symptom', explanation: 'faults.flyback-reversed.explanation', fix: 'faults.flyback-reversed.fix',
  },
  {
    id: 'tip120-reversed', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'Q1' }, figure: fault('tip120-reversed'),
    effect: { power: 'on', halts: false },
    title: 'faults.tip120-reversed.title', symptom: 'faults.tip120-reversed.symptom', explanation: 'faults.tip120-reversed.explanation', fix: 'faults.tip120-reversed.fix',
  },
  {
    id: 'no-ground', kind: 'floating-input', trigger: { by: 'wiring', part: 'aa-holder-4', from: 'GND', to: 'BT1.-' }, figure: fault('no-ground'),
    effect: { power: 'on', halts: false },
    title: 'faults.no-ground.title', symptom: 'faults.no-ground.symptom', explanation: 'faults.no-ground.explanation', fix: 'faults.no-ground.fix',
  },
  {
    id: 'no-base-resistor', kind: 'overcurrent', trigger: { by: 'remove-part', part: 'R1' }, figure: fault('no-base-resistor'),
    effect: { power: 'on', halts: false, pins: { D9: 'dead' }, damages: ['IC3'], extraMa: 130 },
    title: 'faults.no-base-resistor.title', symptom: 'faults.no-base-resistor.symptom', explanation: 'faults.no-base-resistor.explanation', fix: 'faults.no-base-resistor.fix',
  },
  {
    id: 'motor-on-pin', kind: 'overcurrent', trigger: { by: 'wiring', part: 'tt-motor', from: 'D9', to: 'M1.+' }, figure: fault('motor-on-pin'),
    effect: { power: 'on', halts: false, pins: { D9: 'dead' }, damages: ['IC3'], extraMa: 140 },
    title: 'faults.motor-on-pin.title', symptom: 'faults.motor-on-pin.symptom', explanation: 'faults.motor-on-pin.explanation', fix: 'faults.motor-on-pin.fix',
  },
  {
    id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 1100, part: 'tt-motor' }, figure: fault('brownout'),
    effect: { power: 'resetting', halts: true, serial: ['pin 9 HIGH: TIP120 on, motor runs', 'pin 9 HIGH: TIP120 on, motor runs'] },
    title: 'faults.brownout.title', symptom: 'faults.brownout.symptom', explanation: 'faults.brownout.explanation', fix: 'faults.brownout.fix',
  },
  {
    id: 'battery-reversed', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'batt' }, figure: fault('battery-reversed'),
    effect: { power: 'on', halts: false, damages: ['D1'], extraMa: 4000 },
    title: 'faults.battery-reversed.title', symptom: 'faults.battery-reversed.symptom', explanation: 'faults.battery-reversed.explanation', fix: 'faults.battery-reversed.fix',
  },
  {
    id: 'li-ion-cells', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'batt', volts: 16.8 }, figure: fault('li-ion-cells'),
    effect: { power: 'on', halts: false, damages: ['M1'], extraMa: 200 },
    title: 'faults.li-ion-cells.title', symptom: 'faults.li-ion-cells.symptom', explanation: 'faults.li-ion-cells.explanation', fix: 'faults.li-ion-cells.fix',
  },
  {
    id: 'cold-motor', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'M1', pin: '+' }, figure: fault('cold:M1'),
    effect: { power: 'on', halts: false },
    title: 'faults.cold-motor.title', symptom: 'faults.cold-motor.symptom', explanation: 'faults.cold-motor.explanation', fix: 'faults.cold-motor.fix',
  },
  {
    id: 'stall', kind: 'thermal', trigger: { by: 'load', rail: 'batt', ma: 1100, part: 'tt-motor' }, figure: fault('stall'),
    effect: { power: 'on', halts: false, extraMa: 950 },
    title: 'faults.stall.title', symptom: 'faults.stall.symptom', explanation: 'faults.stall.explanation', fix: 'faults.stall.fix',
  },
];

const step = (id: string, kind: BuildStep['kind'], action: BuildStep['action'], done: BuildStep['done'], major: boolean, extra: Partial<BuildStep> = {}): BuildStep => ({
  id, kind, action, done, major, title: `steps.${id}.title`, body: `steps.${id}.body`, ...extra,
});
const breakStep = (id: string, faultId: string, major = false): BuildStep => {
  const f = faults.find((x) => x.id === faultId);
  return step(id, 'break', f ? f.figure : null, { status: 'running' }, major, { fault: faultId });
};

const steps: BuildStep[] = [
  step('strip', 'build', { type: 'press', id: 'strip' }, { build: 'bare' }, false, { refusal: 'steps.strip.refusal' }),
  step('pnp', 'build', { type: 'press', id: 'pnp' }, { build: 'reflowed' }, true, { refusal: 'steps.pnp.refusal' }),
  step('headers', 'build', null, { build: 'tht' }, false, { refusal: 'steps.headers.refusal' }),
  step('solder', 'build', { type: 'press', id: 'solder' }, { build: 'assembled' }, true, { refusal: 'steps.solder.refusal' }),
  step('bb-drive', 'build', set({ circuit: 'stage-drive' }), { circuit: 'stage-drive' }, false, { refusal: 'steps.bb-drive.refusal' }),
  step('bb-motor', 'build', set({ circuit: 'stage-motor' }), { circuit: 'stage-motor' }, false, { refusal: 'steps.bb-motor.refusal' }),
  step('bb-power', 'build', set({ circuit: 'bench' }), { circuit: 'bench' }, true, { refusal: 'steps.bb-power.refusal' }),
  step('plug', 'test', { type: 'press', id: 'power', choice: 'usb' }, { power: 'usb', status: 'running' }, false, { refusal: 'steps.plug.refusal' }),
  step('upload-pwm', 'test', { type: 'press', id: 'upload', choice: 'pwm' }, { mode: 'pwm', status: 'running' }, true, { refusal: 'steps.upload-pwm.refusal' }),
  step('measure', 'test', { type: 'press', id: 'upload', choice: 'high' }, { mode: 'high', status: 'running' }, false),
  step('exploded', 'test', set({ power: null, exploded: true }), { exploded: true }, false, { refusal: 'steps.exploded.refusal' }),
  breakStep('break-flyback', 'no-flyback', true),
  breakStep('break-diode', 'flyback-reversed'),
  breakStep('break-tip120', 'tip120-reversed'),
  breakStep('break-ground', 'no-ground'),
  breakStep('break-base', 'no-base-resistor'),
  breakStep('break-pin', 'motor-on-pin', true),
  breakStep('break-brownout', 'brownout', true),
  breakStep('break-polarity', 'battery-reversed'),
  breakStep('break-voltage', 'li-ion-cells'),
  breakStep('break-cold', 'cold-motor'),
  breakStep('break-stall', 'stall'),
];

// A quiz question: options are 1-based text keys, `answer` is the 0-based index of the right one.
const qq = (quiz: string, id: string, answer: number, n = 3) => ({
  id,
  q: `quizzes.${quiz}.${id}.q`,
  options: Array.from({ length: n }, (_, i) => `quizzes.${quiz}.${id}.options.${i + 1}`),
  answer,
  why: `quizzes.${quiz}.${id}.why`,
});

const quizzes: Quiz[] = [
  { id: 'q-smd', afterStep: 'pnp', questions: [qq('q-smd', 'why-first', 1), qq('q-smd', 'reflow', 2)] },
  { id: 'q-solder', afterStep: 'solder', questions: [qq('q-solder', 'cold', 0), qq('q-solder', 'headers', 2)] },
  { id: 'q-ground', afterStep: 'bb-power', questions: [qq('q-ground', 'shared', 1), qq('q-ground', 'low-side', 0)] },
  { id: 'q-pwm', afterStep: 'upload-pwm', questions: [qq('q-pwm', 'freq', 2), qq('q-pwm', 'half', 1), qq('q-pwm', 'led', 0)] },
  { id: 'q-flyback', afterStep: 'break-flyback', questions: [qq('q-flyback', 'protects', 1), qq('q-flyback', 'band', 0)] },
  { id: 'q-pin', afterStep: 'break-pin', questions: [qq('q-pin', 'why-not', 0), qq('q-pin', 'base-r', 2)] },
  { id: 'q-brownout', afterStep: 'break-brownout', questions: [qq('q-brownout', 'reset', 1), qq('q-brownout', 'cure', 2)] },
  {
    id: 'q-end',
    afterStep: null,
    questions: [qq('q-end', 'drop', 2), qq('q-end', 'gain', 0), qq('q-end', 'pinout', 1), qq('q-end', 'stall', 2), qq('q-end', 'mosfet', 0)],
  },
];

const noInputs = { inputs: [], script: [] };

const tasks: PracticeTask[] = [
  {
    id: 'pulse',
    board: 'nano',
    language: 'arduino-cpp',
    circuit: null,
    world: noInputs,
    runMs: 5000,
    title: 'tasks.pulse.title',
    brief: 'tasks.pulse.brief',
    hints: ['tasks.pulse.hints.1', 'tasks.pulse.hints.2', 'tasks.pulse.hints.3'],
    starter: {
      libraries: [],
      source: `// {{t:tasks.pulse.code.c1}}
const int MOTOR = 9;

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  digitalWrite(MOTOR, HIGH);
  delay(1000);             // {{t:tasks.pulse.code.c2}}
  digitalWrite(MOTOR, LOW);
  delay(1000);
}
`,
    },
    solution: `const int MOTOR = 9;
const unsigned long HALF_PERIOD = 1000;
unsigned long last = 0;
bool on = false;

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  if (millis() - last >= HALF_PERIOD) {
    last += HALF_PERIOD;
    on = !on;
    digitalWrite(MOTOR, on ? HIGH : LOW);
  }
}
`,
    checks: [
      { kind: 'pin-toggles', pin: 'D9', periodMs: [1900, 2100], minCycles: 2, label: 'tasks.pulse.checks.1' },
      { kind: 'pin-level', pin: 'D9', level: 1, atMs: 1500, label: 'tasks.pulse.checks.2' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 2500, label: 'tasks.pulse.checks.3' },
      { kind: 'code', must: ['millis'], mustNot: ['delay('], label: 'tasks.pulse.checks.4' },
    ],
  },
  {
    id: 'soft-start',
    board: 'nano',
    language: 'arduino-cpp',
    circuit: null,
    world: noInputs,
    runMs: 3000,
    title: 'tasks.soft-start.title',
    brief: 'tasks.soft-start.brief',
    hints: ['tasks.soft-start.hints.1', 'tasks.soft-start.hints.2', 'tasks.soft-start.hints.3'],
    starter: {
      libraries: [],
      source: `// {{t:tasks.soft-start.code.c1}}
const int MOTOR = 9;
const unsigned long RAMP_MS = 2000;
unsigned long start;

void setup() {
  pinMode(MOTOR, OUTPUT);
  start = millis();
}

void loop() {
  analogWrite(MOTOR, 255);   // {{t:tasks.soft-start.code.c2}}
}
`,
    },
    solution: `const int MOTOR = 9;
const unsigned long RAMP_MS = 2000;
unsigned long start;

void setup() {
  pinMode(MOTOR, OUTPUT);
  start = millis();
}

void loop() {
  unsigned long t = millis() - start;
  if (t < RAMP_MS) {
    analogWrite(MOTOR, t * 255 / RAMP_MS);
  } else {
    analogWrite(MOTOR, 255);
  }
}
`,
    checks: [
      { kind: 'pwm', pin: 'D9', duty: [0.2, 0.3], atMs: 500, label: 'tasks.soft-start.checks.1' },
      { kind: 'pwm', pin: 'D9', duty: [0.45, 0.55], atMs: 1000, label: 'tasks.soft-start.checks.2' },
      { kind: 'pwm', pin: 'D9', duty: [0.7, 0.8], atMs: 1500, label: 'tasks.soft-start.checks.3' },
      { kind: 'pin-level', pin: 'D9', level: 1, atMs: 2500, label: 'tasks.soft-start.checks.4' },
      { kind: 'code', must: ['millis', 'analogWrite'], mustNot: ['delay('], label: 'tasks.soft-start.checks.5' },
    ],
  },
  {
    id: 'speed-knob',
    board: 'nano',
    language: 'arduino-cpp',
    circuit: 'speed-knob',
    world: {
      inputs: [
        {
          id: 'pot', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'POT1',
          min: 0, max: 300, step: 1, default: 0, unit: '°', gesture: 'knob', label: 'tasks.speed-knob.world.pot',
        },
      ],
      script: [
        { t: 0, input: 'pot', value: 0 },
        { t: 1000, input: 'pot', value: 150 },
        { t: 2000, input: 'pot', value: 300 },
        { t: 3000, input: 'pot', value: 15 },
      ],
    },
    runMs: 4000,
    title: 'tasks.speed-knob.title',
    brief: 'tasks.speed-knob.brief',
    hints: ['tasks.speed-knob.hints.1', 'tasks.speed-knob.hints.2', 'tasks.speed-knob.hints.3'],
    starter: {
      libraries: [],
      source: `// {{t:tasks.speed-knob.code.c1}}
const int POT = A0;
const int MOTOR = 9;

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  int raw = analogRead(POT);   // {{t:tasks.speed-knob.code.c2}}
  // {{t:tasks.speed-knob.code.c3}}
}
`,
    },
    solution: `const int POT = A0;
const int MOTOR = 9;
const int MIN_DUTY = 40;

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  int raw = analogRead(POT);
  int duty = map(raw, 0, 1023, 0, 255);
  if (duty < MIN_DUTY) {
    duty = 0;
  }
  analogWrite(MOTOR, duty);
}
`,
    checks: [
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 500, label: 'tasks.speed-knob.checks.1' },
      { kind: 'pwm', pin: 'D9', duty: [0.45, 0.55], atMs: 1500, label: 'tasks.speed-knob.checks.2' },
      { kind: 'pin-level', pin: 'D9', level: 1, atMs: 2500, label: 'tasks.speed-knob.checks.3' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 3500, label: 'tasks.speed-knob.checks.4' },
      { kind: 'code', must: ['analogRead', 'analogWrite'], mustNot: [], label: 'tasks.speed-knob.checks.5' },
    ],
  },
  {
    id: 'toggle-button',
    board: 'nano',
    language: 'arduino-cpp',
    circuit: 'toggle-button',
    world: {
      inputs: [
        {
          id: 'btn', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 8 }, pins: ['D2'], part: 'SW1',
          min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'tasks.toggle-button.world.btn',
        },
      ],
      script: [
        { t: 500, input: 'btn', value: 1 },
        { t: 700, input: 'btn', value: 0 },
        { t: 1500, input: 'btn', value: 1 },
        { t: 1700, input: 'btn', value: 0 },
      ],
    },
    runMs: 2500,
    title: 'tasks.toggle-button.title',
    brief: 'tasks.toggle-button.brief',
    hints: ['tasks.toggle-button.hints.1', 'tasks.toggle-button.hints.2', 'tasks.toggle-button.hints.3'],
    starter: {
      libraries: [],
      source: `// {{t:tasks.toggle-button.code.c1}}
const int BUTTON = 2;
const int MOTOR = 9;
bool motorOn = false;
int last = HIGH;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);   // {{t:tasks.toggle-button.code.c2}}
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  int now = digitalRead(BUTTON);
  if (last == HIGH && now == LOW) {  // {{t:tasks.toggle-button.code.c3}}
    motorOn = !motorOn;
    digitalWrite(MOTOR, motorOn ? HIGH : LOW);
  }
  last = now;
}
`,
    },
    solution: `const int BUTTON = 2;
const int MOTOR = 9;
const unsigned long DEBOUNCE_MS = 30;
bool motorOn = false;
int lastReading = HIGH;
int stableState = HIGH;
unsigned long lastChange = 0;

void setup() {
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  int reading = digitalRead(BUTTON);
  if (reading != lastReading) {
    lastChange = millis();
    lastReading = reading;
  }
  if (millis() - lastChange > DEBOUNCE_MS && reading != stableState) {
    stableState = reading;
    if (stableState == LOW) {
      motorOn = !motorOn;
      digitalWrite(MOTOR, motorOn ? HIGH : LOW);
    }
  }
}
`,
    checks: [
      { kind: 'responds', after: { t: 500, input: 'btn', value: 1 }, pin: 'D9', withinMs: 60, mode: 'out', v: [1, 1], label: 'tasks.toggle-button.checks.1' },
      { kind: 'pin-level', pin: 'D9', level: 1, atMs: 1200, label: 'tasks.toggle-button.checks.2' },
      { kind: 'responds', after: { t: 1500, input: 'btn', value: 1 }, pin: 'D9', withinMs: 60, mode: 'out', v: [0, 0], label: 'tasks.toggle-button.checks.3' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 2200, label: 'tasks.toggle-button.checks.4' },
      { kind: 'code', must: ['millis', 'INPUT_PULLUP'], mustNot: ['delay('], label: 'tasks.toggle-button.checks.5' },
    ],
  },
];

const bench = {
  lab: 'robotics',
  id: 'transistor-switch',
  fig: 3,
  board: 'nano',
  modules: [],
  parts: ['tip120', 'diode-1n4007', 'tt-motor', 'aa-holder-4'],
  figure: {
    page,
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'R1', short: '1K BASE', role: 'passive', name: 'parts.R1.name', what: 'parts.R1.what' },
      { id: 'Q1', short: 'TIP120', role: 'driver', name: 'parts.Q1.name', what: 'parts.Q1.what' },
      { id: 'D1', short: 'FLYBACK', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'R2', short: '1K LED', role: 'passive', name: 'parts.R2.name', what: 'parts.R2.what' },
      { id: 'LED1', short: 'PIN 9', role: 'led', name: 'parts.LED1.name', what: 'parts.LED1.what' },
      { id: 'M1', short: 'MOTOR', role: 'mechanical', name: 'parts.M1.name', what: 'parts.M1.what' },
      { id: 'BT1', short: '4 x AA', role: 'other', name: 'parts.BT1.name', what: 'parts.BT1.what' },
    ],
  },
  power: { source: 'usb', label: 'power.label', ok: 'power.ok' },
  modes,
  defaultMode: 'high',
  steps,
  faults,
  status: [
    { id: 'program', key: 'status', format: 'running', label: 'status.program' },
    { id: 'powered', key: 'power', format: 'on-off', label: 'status.powered' },
    { id: 'pin9', key: 'meas.Q1.drive', format: 'percent', label: 'status.pin9' },
    { id: 'base', key: 'meas.Q1.ib_mA', format: 'ma', label: 'status.base' },
    { id: 'motor', key: 'meas.M1.i_mA', format: 'ma', label: 'status.motor' },
    { id: 'battery-current', key: 'meas.BT1.i_mA', format: 'ma', label: 'status.battery-current' },
    { id: 'vce', key: 'meas.Q1.vce', format: 'volts', label: 'status.vce' },
    { id: 'peak', key: 'meas.Q1.peak_V', format: 'volts', label: 'status.peak' },
    { id: 'rpm', key: 'meas.M1.rpm', format: 'rpm', label: 'status.rpm' },
    { id: 'battery', key: 'meas.BT1.v', format: 'volts', label: 'status.battery' },
    { id: 'q1-temp', key: 'meas.Q1.tj_C', format: 'number', label: 'status.q1-temp' },
    { id: 'usb-current', key: 'currentMa.usb', format: 'ma', label: 'status.usb-current' },
  ],
  current: {
    supplies: [
      { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
      { id: 'batt', volts: 6, limitMa: 1000, label: 'current.batt' },
    ],
    loads: [
      { id: 'nano', supply: 'usb', ma: 27, when: { power: 'usb' }, label: 'current.nano' },
      { id: 'base', supply: 'usb', ma: 0, when: { power: 'usb' }, perUnit: { key: 'meas.Q1.ib_mA', maPerUnit: 1 }, label: 'current.base' },
      { id: 'led', supply: 'usb', ma: 0, when: { power: 'usb' }, perUnit: { key: 'meas.LED1.i_mA', maPerUnit: 1 }, label: 'current.led' },
      { id: 'motor-batt', supply: 'batt', ma: 0, when: {}, perUnit: { key: 'meas.BT1.i_mA', maPerUnit: 1 }, label: 'current.motor-batt' },
      { id: 'motor-usb', supply: 'usb', ma: 0, when: { 'meas.M1.supply': 'usb' }, perUnit: { key: 'meas.M1.i_mA', maPerUnit: 1 }, label: 'current.motor-usb' },
    ],
  },
  tasks,
  quizzes,
  sources: [
    { title: 'Arduino Nano (A000005) datasheet and tech specs', url: 'https://docs.arduino.cc/hardware/nano/' },
    { title: 'Arduino reference: analogWrite() (490 Hz on pin 9 of the Nano)', url: 'https://docs.arduino.cc/language-reference/en/functions/analog-io/analogWrite/' },
    { title: 'Microchip ATmega328P datasheet (40 mA per pin absolute maximum, 2.7 V brown-out level)', url: 'https://www.microchip.com/en-us/product/ATmega328P' },
    { title: 'onsemi TIP120/TIP121/TIP122 Darlington datasheet', url: 'https://www.onsemi.com/pdf/datasheet/tip120-d.pdf' },
    { title: 'Diodes Inc. 1N4001-1N4007 datasheet', url: 'https://www.diodes.com/assets/Datasheets/ds28002.pdf' },
    { title: 'Adafruit 3777: DC gearbox "TT" motor, 3-6 V (no-load and stall current measurements)', url: 'https://www.adafruit.com/product/3777' },
    { title: 'Energizer E91 AA alkaline datasheet (internal resistance, discharge curves)', url: 'https://data.energizer.com/pdfs/E91_Max_NA.pdf' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default bench;
