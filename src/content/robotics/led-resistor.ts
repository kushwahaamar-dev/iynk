import type { BuildStep, Check, FailureMode, FigurePart, PracticeTask, Quiz, RoboticsContent, StatusField } from '@/content/schema';

// Robotics Bench Fig. 02: the LED trainer. A 60 x 40 mm through-hole teaching board with no controller: 5 V from a
// USB-C charger (J1) or a bench supply (J2), a slide switch, a jumper (JP1) that picks 220 Ω, 1 kΩ, 10 kΩ or a bare
// wire link, a red 5 mm LED, and a pocket multimeter in series between TP1 and TP2. Build it, read the current at each
// jumper row, then break it one fault at a time.
// The figure is figures/robotics/led-resistor.js: its bench model computes I = (V - V_F) / R with V_F = 2.0 V and
// reports meas.MM1 (the meter), meas.D1 and meas.JP1, plus the build-step conditions state.tasks.low-in … last-in.
// Facts: docs/facts/trainers.md (Fig. 02).

/* ---------- jumper rows: the "math" panel for each one ---------- */
const mathPanel = (id: string, ohms: string, result: string) => `# {{t:modes.${id}.code.what}}
V_supply = 5.0     # {{t:math.supply}}
V_F = 2.0          # {{t:math.vf}}
R = ${ohms.padEnd(14)} # {{t:modes.${id}.code.bands}}

${result}
`;

const R220 = mathPanel('r220', '220', `I = (V_supply - V_F) / R      # 3.0 / 220 = 0.0136 A = 13.6 mA
P_R = I * I * R                # 0.0409 W = 40.9 mW: {{t:math.watts}}
P_LED = V_F * I                # 0.027 W = 27 mW: {{t:math.led}}
# {{t:modes.r220.code.verdict}}`);

const R1K = mathPanel('r1k', '1000', `I = (V_supply - V_F) / R      # 3.0 / 1000 = 0.003 A = 3.0 mA
P_R = I * I * R                # 0.009 W = 9.0 mW
# {{t:modes.r1k.code.verdict}}`);

const R10K = mathPanel('r10k', '10000', `I = (V_supply - V_F) / R      # 3.0 / 10000 = 0.0003 A = 0.30 mA
P_R = I * I * R                # 0.0009 W = 0.9 mW
# {{t:modes.r10k.code.verdict}}`);

const NONE = mathPanel('bypass', '0', `# I = (V_supply - V_F) / 0: {{t:modes.bypass.code.nothing}}
# {{t:modes.bypass.code.real}}
# {{t:modes.bypass.code.verdict}}`);

// one bench-notes line every 4 s while the LED is lit (the figure's model); the figure translates them like its labels
const notes = (line: string) => ['-- bench notes --', line];

const modes: RoboticsContent['modes'] = [
  { id: 'r220', instant: true, language: 'python', code: { source: R220, libraries: [] }, bytes: 0,
    serial: notes('I = 3.0 V / 220 = 13.6 mA  bright, safe'), title: 'modes.r220.title' },
  { id: 'r1k', instant: true, language: 'python', code: { source: R1K, libraries: [] }, bytes: 0,
    serial: notes('I = 3.0 V / 1000 = 3.0 mA  dim'), title: 'modes.r1k.title' },
  { id: 'r10k', instant: true, language: 'python', code: { source: R10K, libraries: [] }, bytes: 0,
    serial: notes('I = 3.0 V / 10000 = 0.30 mA  barely glowing'), title: 'modes.r10k.title' },
  { id: 'bypass', instant: true, language: 'python', code: { source: NONE, libraries: [] }, bytes: 0, serial: [], title: 'modes.bypass.title' },
];

const part = (id: string, short: string, role: FigurePart['role']): FigurePart =>
  ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` });

const parts: FigurePart[] = [
  part('J1', '5V IN', 'connector'), part('J2', 'EXT 5V', 'connector'), part('R4', 'CC1', 'passive'), part('R5', 'CC2', 'passive'),
  part('SW1', 'POWER', 'switch'), part('C1', '100 µF', 'passive'),
  part('R1', '220R', 'passive'), part('R2', '1K', 'passive'), part('R3', '10K', 'passive'), part('JL1', 'LINK', 'passive'),
  part('JP1', 'JUMPER', 'header'), part('SHUNT', 'CAP', 'jumper'), part('D1', 'LED', 'led'),
  part('TP1', 'TP1', 'connector'), part('TP2', 'TP2', 'connector'), part('MM1', 'METER', 'other'),
];

/* ---------- faults: each one bridge command; the figure's model decides what it does ---------- */
const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], state: Record<string, unknown>, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const faults: FailureMode[] = [
  fault('no-resistor', 'overcurrent', { by: 'setting', key: 'mode', value: 'bypass' }, { power: 'usb', fault: 'no-resistor' },
    { power: 'on', halts: true, damages: ['D1'] }),
  fault('led-backwards', 'reversed-part', { by: 'reverse-part', part: 'D1' }, { power: 'usb', fault: 'reversed:D1' },
    { power: 'on', halts: true }),
  fault('cap-backwards', 'reversed-part', { by: 'reverse-part', part: 'C1' }, { power: 'usb', fault: 'reversed:C1' },
    { power: 'on', halts: false, damages: ['C1'] }),
  fault('cc-missing', 'missing-part', { by: 'remove-part', part: 'R4' }, { power: 'usb', fault: 'missing:R4' },
    { power: 'off', halts: true }),
  fault('cold-led', 'cold-solder', { by: 'cold-joint', part: 'D1' }, { power: 'usb', fault: 'cold:D1' },
    { power: 'on', halts: false }),
  fault('reverse-supply', 'reverse-polarity', { by: 'reverse', input: 'bench' }, { power: 'bench', fault: 'reverse-polarity:bench' },
    { power: 'on', halts: true, damages: ['C1'] }),
  fault('over-voltage', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 12 }, { power: 'bench', fault: 'wrong-voltage:bench:12' },
    { power: 'on', halts: true, damages: ['D1'] }),
  fault('current-limit', 'brownout', { by: 'setting', key: 'current-limit-ma', value: 10 }, { power: 'bench', fault: 'brownout' },
    { power: 'on', halts: false }),
];

/* ---------- steps: build it low to tall, read the meter at each row, then one break step per fault ---------- */
const text = (id: string, refusal = false) =>
  ({ title: `steps.${id}.title`, body: `steps.${id}.body`, ...(refusal ? { refusal: `steps.${id}.refusal` } : {}) });

// a break step: Do it sends the fault's own command; the learner repairs it and the LED must light again
const breakStep = (id: string, major = false): BuildStep => {
  const f = faults.find((x) => x.id === id);
  const state = f && f.figure.type === 'set' ? f.figure.state : {};
  return { id, kind: 'break', action: { type: 'set', state }, done: { power: String(state.power), status: 'running' }, fault: id, major, ...text(id) };
};

// the meter's display as the figure prints it at each row
const reads = (mode: string, display: string) => ({ mode, status: 'running', 'meas.MM1.text': display });

const steps: BuildStep[] = [
  // the figure mounts built, plugged in and lit at 220 Ω
  { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false, ...text('unplug') },
  { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, ...text('strip', true) },
  { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'tasks.low-in': true }, major: false, ...text('low', true) },
  { id: 'tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'tasks.tall-in': true }, major: false, ...text('tall', true) },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { 'tasks.soldered': true }, major: true, ...text('solder', true) },
  { id: 'jumper-meter', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-last' }, done: { 'tasks.last-in': true }, major: false,
    ...text('jumper-meter', true) },
  // plug and usb-again also set the jumper to 220 Ω: their done conditions read the 220 row
  { id: 'plug', kind: 'test', action: { type: 'set', state: { mode: 'r220', power: 'usb' } }, done: { power: 'usb', ...reads('r220', '13.6') }, major: true,
    ...text('plug') },
  { id: 'row-1k', kind: 'test', action: { type: 'set', state: { mode: 'r1k' } }, done: reads('r1k', '3.0'), major: false, ...text('row-1k') },
  { id: 'row-10k', kind: 'test', action: { type: 'set', state: { mode: 'r10k' } }, done: reads('r10k', '0.30'), major: true, ...text('row-10k') },
  { id: 'row-220', kind: 'test', action: { type: 'set', state: { mode: 'r220' } }, done: reads('r220', '13.6'), major: false, ...text('row-220') },
  breakStep('no-resistor', true),
  breakStep('led-backwards'),
  breakStep('cap-backwards'),
  breakStep('cc-missing'),
  breakStep('cold-led'),
  breakStep('reverse-supply'),
  breakStep('over-voltage'),
  breakStep('current-limit'),
  { id: 'usb-again', kind: 'test', action: { type: 'set', state: { mode: 'r220', power: 'usb' } }, done: { power: 'usb', ...reads('r220', '13.6') }, major: false,
    ...text('usb-again') },
];

/* ---------- status and current: everything comes from the figure's meter and jumper ---------- */
const status: StatusField[] = [
  { id: 'status', key: 'status', format: 'running', label: 'status.status' },
  { id: 'meter', key: 'meas.MM1.text', format: 'text', label: 'status.meter' },
  { id: 'resistor', key: 'meas.JP1.ohms', format: 'number', label: 'status.resistor' },
  { id: 'heat', key: 'meas.JP1.mW', format: 'number', label: 'status.heat' },
  { id: 'rail', key: 'rails.VCC', format: 'volts', label: 'status.rail' },
  { id: 'current', key: 'currentMa', format: 'ma', label: 'status.current' },
];

// nothing on the board draws current but the LED loop, and the meter in series reads exactly that loop
const current: RoboticsContent['current'] = {
  supplies: [
    { id: 'usb', volts: 5, limitMa: 500, label: 'current.usb' },
    { id: 'bench', volts: 5, limitMa: 1000, label: 'current.bench' },
  ],
  loads: (['usb', 'bench'] as const).map((s) => (
    { id: `led-${s}`, supply: s, ma: 0, when: { power: s }, perUnit: { key: 'meas.MM1.i_mA', maPerUnit: 1 }, label: 'current.led' })),
};

/* ---------- practice tasks: Ohm's law in a sketch, then PWM sets the average current ---------- */
type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const checks = (task: string, list: OmitEach<Check, 'label'>[]): Check[] =>
  list.map((c, i) => ({ ...c, label: `tasks.${task}.checks.${i + 1}` }) as Check);

const OHMS_STARTER = `// {{t:tasks.ohms-law.code.starter}}
const int V_SUPPLY = 5;    // {{t:tasks.ohms-law.code.volts}}
const int V_LED = 2;
const int ROWS[] = {220, 1000, 10000};

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 3; i++) {
    int mA = (V_SUPPLY - V_LED) / ROWS[i] * 1000;   // {{t:tasks.ohms-law.code.law}}
    Serial.print(ROWS[i]);
    Serial.print(" ohm: ");
    Serial.print(mA);
    Serial.println(" mA");
  }
}

void loop() {
}
`;

const OHMS_SOLUTION = `const float V_SUPPLY = 5.0;
const float V_LED = 2.0;
const int ROWS[] = {220, 1000, 10000};

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 3; i++) {
    float mA = (V_SUPPLY - V_LED) / ROWS[i] * 1000.0;   // {{t:tasks.ohms-law.code.floats}}
    Serial.print(ROWS[i]);
    Serial.print(" ohm: ");
    Serial.print(mA, 2);
    Serial.println(" mA");
  }
  // {{t:tasks.ohms-law.code.smallest}}
  float rMin = (V_SUPPLY - V_LED) / 0.020;
  Serial.print("20 mA needs ");
  Serial.print(rMin, 0);
  Serial.println(" ohm");
}

void loop() {
}
`;

const PWM_STARTER = `// {{t:tasks.pwm-current.code.starter}}
const int LED = 9;   // {{t:tasks.pwm-current.code.pin}}

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  digitalWrite(LED, HIGH);   // {{t:tasks.pwm-current.code.full}}
  Serial.println("13.6 mA");
  delay(1000);
  digitalWrite(LED, HIGH);   // {{t:tasks.pwm-current.code.half}}
  Serial.println("6.8 mA");
  delay(1000);
  digitalWrite(LED, HIGH);
  Serial.println("3.4 mA");
  delay(1000);
}
`;

const PWM_SOLUTION = `const int LED = 9;
const float FULL_MA = 13.6;   // {{t:tasks.pwm-current.code.peak}}
const float STEPS_MA[] = {13.6, 6.8, 3.4};

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  for (int i = 0; i < 3; i++) {
    int duty = round(STEPS_MA[i] / FULL_MA * 255);   // {{t:tasks.pwm-current.code.duty}}
    analogWrite(LED, duty);
    Serial.print(STEPS_MA[i], 1);
    Serial.print(" mA average, duty ");
    Serial.println(duty);
    delay(1000);
  }
}
`;

const NO_WORLD = { inputs: [], script: [] };

const tasks: PracticeTask[] = [
  {
    id: 'ohms-law', board: 'uno-r3', language: 'arduino-cpp',
    starter: { source: OHMS_STARTER, libraries: [] }, solution: OHMS_SOLUTION, circuit: null, world: NO_WORLD, runMs: 500,
    checks: checks('ohms-law', [
      { kind: 'serial', match: '^220 ohm: 13\\.6\\d? mA$', regex: true, minCount: 1 },
      { kind: 'serial', match: '^1000 ohm: 3\\.00? mA$', regex: true, minCount: 1 },
      { kind: 'serial', match: '^10000 ohm: 0\\.30? mA$', regex: true, minCount: 1 },
      { kind: 'serial', match: '20 mA needs 150 ohm', regex: false, minCount: 1 },
    ]),
    title: 'tasks.ohms-law.title', brief: 'tasks.ohms-law.brief',
    hints: ['tasks.ohms-law.hints.1', 'tasks.ohms-law.hints.2', 'tasks.ohms-law.hints.3'],
  },
  {
    id: 'pwm-current', board: 'uno-r3', language: 'arduino-cpp',
    starter: { source: PWM_STARTER, libraries: [] }, solution: PWM_SOLUTION, circuit: null, world: NO_WORLD, runMs: 3200,
    checks: checks('pwm-current', [
      { kind: 'code', must: ['analogWrite('], mustNot: [] },
      { kind: 'pwm', pin: 'D9', duty: [0.95, 1], atMs: 500 },
      { kind: 'pwm', pin: 'D9', duty: [0.48, 0.52], atMs: 1500 },
      { kind: 'pwm', pin: 'D9', duty: [0.23, 0.27], atMs: 2500 },
      { kind: 'serial', match: '^6\\.8 mA', regex: true, minCount: 1, byMs: 2000 },
    ]),
    title: 'tasks.pwm-current.title', brief: 'tasks.pwm-current.brief',
    hints: ['tasks.pwm-current.hints.1', 'tasks.pwm-current.hints.2', 'tasks.pwm-current.hints.3'],
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
  quiz('solder', 'solder', [['led-legs', 1], ['cap-stripe', 0]]),
  quiz('plug', 'plug', [['predict', 1], ['series', 2]]),
  quiz('row-10k', 'row-10k', [['heat', 0], ['pull-up', 2]]),
  quiz('no-resistor', 'no-resistor', [['why', 1], ['ol', 0]]),
  quiz('end', null, [['r330', 2], ['smallest', 0], ['cc', 1], ['two-caps', 1]]),
];

const bench = {
  lab: 'robotics',
  id: 'led-resistor',
  fig: 2,
  board: null,
  modules: [],
  parts: ['led', 'resistor', 'multimeter'],
  figure: { page: '/figures/robotics/led-resistor.html', parts, sheets: ['board', 'schematic', 'power'] },
  power: { source: 'usb', label: 'power.label', ok: 'power.ok' },
  modes,
  defaultMode: 'r220',
  steps,
  faults,
  status,
  current,
  tasks,
  quizzes,
  sources: [
    { title: 'Kingbright WP7113ID 5 mm red LED datasheet (V_F, 30 mA maximum, reverse voltage)', url: 'https://www.kingbrightusa.com/images/catalog/SPEC/WP7113ID.pdf' },
    { title: 'Fluke: Can you live with the burden? (a meter in series, burden voltage)', url: 'https://www.fluke.com/en-us/learn/blog/electrical/can-you-live-with-the-burden' },
    { title: 'Panasonic FAQ: aluminium electrolytic capacitors and reverse voltage', url: 'https://industrial.panasonic.com/sa/faq/faq0012' },
    { title: 'Nichicon/Rubycon: aluminium electrolytic capacitor technical notes', url: 'https://www.mouser.com/pdfDocs/al-technical-note_en.pdf' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default bench;
