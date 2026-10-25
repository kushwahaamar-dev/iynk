// Robotics Bench Fig. 12: the blue LM2596 buck module with its 3-digit voltmeter (the 2596-SDC layout) between a 2S
// LiPo and a TT gear motor, with a pocket multimeter on the output screws. No controller: the modes are the trimmer
// turned to a voltage, with the paper sum beside them. Facts: docs/facts/lm2596.md (TI SNVS124G: Vout = 1.23 V x
// (1 + R2 / R1), dropout, saturation, current limit, efficiency; the module's geometry from vendor photos; R1 = 330 Ω
// and the 10 kΩ 25-turn trimmer; no reverse protection, no fuse, no under-voltage cut-off; the failure table) and
// docs/research/robotics-bench-b.md (the original figure).
// Fixed here: the output is set with a meter and nothing on it, then the load goes on with the power off; the trimmer
// arrives at the top, so the first reading is the input less a volt, not 5 V.
// The figure (figures/modules/lm2596.js + figures/robotics/lm2596.js) owns geometry, build groups, the power tree and
// the converter, trimmer, display and heat model; this module owns the text, the paper sums, the steps, the tasks, the
// checks and the current model. Part ids, mode ids, the supply key and fault ids are shared with the figure.

import type { BuildStep, Check, FailureMode, FigurePart, PracticeTask, Quiz, RoboticsContent, StatusField } from '@/content/schema';

/* ---------- the paper sum for each trimmer setting ---------- */
const sum = (id: string, body: string) => `# {{t:modes.${id}.code.what}}
VREF = 1.23        # {{t:modes.code.vref}}
R1 = 330           # {{t:modes.code.r1}}
OHM_PER_TURN = 400 # {{t:modes.code.turn}}
Vin = 8.4          # {{t:modes.code.vin}}

${body}
`;

const FOUND = sum('found', `R2 = 25 * OHM_PER_TURN           # 10000 ohm: {{t:modes.found.code.top}}
Vset = VREF * (1 + R2 / R1)       # 1.23 x 31.3 = 38.5 V
# {{t:modes.code.above}}
Vout = Vin - (0.745 + 0.255 * 0)  # 8.4 - 0.75 = 7.65 V, {{t:modes.found.code.empty}}
# {{t:modes.found.code.verdict}}`);

const SET5 = sum('set5', `Vout = 5.0
R2 = R1 * (Vout / VREF - 1)       # 330 x 3.065 = 1011 ohm
turns = R2 / OHM_PER_TURN         # 2.53 turns {{t:modes.code.from}}
D = (Vout + 0.36) / (Vin - 0.68 + 0.36)   # 0.66: {{t:modes.code.duty}}
P_out = Vout * 0.155              # 0.78 W into the motor
P_in = Vin * 0.125                # 1.05 W from the pack: {{t:modes.code.meter}}
# {{t:modes.set5.code.verdict}}`);

const SET33 = sum('set33', `Vout = 3.3
R2 = R1 * (Vout / VREF - 1)       # 330 x 1.683 = 555 ohm
turns = R2 / OHM_PER_TURN         # 1.39 turns {{t:modes.code.from}}
D = (Vout + 0.36) / (Vin - 0.68 + 0.36)   # 0.45
P_out = Vout * 0.145              # 0.48 W
P_in = Vin * 0.088                # 0.74 W
# {{t:modes.set33.code.verdict}}`);

const SET12 = sum('set12', `Vout = 12.0
R2 = R1 * (Vout / VREF - 1)       # 330 x 8.756 = 2890 ohm
turns = R2 / OHM_PER_TURN         # 7.22 turns {{t:modes.code.from}}
# {{t:modes.code.above}}
Vout = Vin - (0.745 + 0.255 * 0.17)   # 8.4 - 0.79 = 7.61 V
# {{t:modes.set12.code.verdict}}`);

// the figure prints the banner, then the sum's result every 5 s while the converter runs
const notes = (line: string) => ['-- bench notes --', line];

const modes: RoboticsContent['modes'] = [
  { id: 'found', instant: true, language: 'python', code: { source: FOUND, libraries: [] }, bytes: 0,
    serial: notes('Vset = 1.23 x (1 + 10000 / 330) = 38.5 V, more than IN: OUT = IN - dropout'), title: 'modes.found.title' },
  { id: 'set5', instant: true, language: 'python', code: { source: SET5, libraries: [] }, bytes: 0,
    serial: notes('Vout = 1.23 x (1 + 1011 / 330) = 5.00 V'), title: 'modes.set5.title' },
  { id: 'set33', instant: true, language: 'python', code: { source: SET33, libraries: [] }, bytes: 0,
    serial: notes('Vout = 1.23 x (1 + 555 / 330) = 3.30 V'), title: 'modes.set33.title' },
  { id: 'set12', instant: true, language: 'python', code: { source: SET12, libraries: [] }, bytes: 0,
    serial: notes('Vset = 1.23 x (1 + 2890 / 330) = 12.0 V, more than IN: OUT = IN - dropout'), title: 'modes.set12.title' },
];

/* ---------- the figure's parts ---------- */
const part = (id: string, short: string, role: FigurePart['role']): FigurePart =>
  ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` });

const parts: FigurePart[] = [
  part('U1', 'LM2596', 'regulator'), part('L1', '33 µH', 'passive'), part('D1', 'SS34', 'protection'),
  part('C1', '220 µF IN', 'passive'), part('C2', '220 µF OUT', 'passive'), part('RV1', 'TRIMMER', 'passive'),
  part('R7', 'R7', 'passive'), part('C5', 'C5', 'passive'),
  part('J1', 'IN', 'connector'), part('J2', 'OUT', 'connector'),
  part('DS1', 'DISPLAY', 'display'), part('U2', 'METER REG', 'regulator'), part('BITS', 'METER PARTS', 'passive'),
  part('SW1', 'SW1', 'button'), part('LED_IN', 'IN', 'led'), part('LED_OUT', 'OUT', 'led'), part('X1', 'X1', 'other'),
  part('BATT', '7.4V LIPO', 'other'), part('MM', 'METER', 'other'), part('MOT', 'TT MOTOR', 'mechanical'),
];

/* ---------- failures ---------- */
const fault = (id: string, kind: FailureMode['kind'], trigger: FailureMode['trigger'], figureFault: string, effect: FailureMode['effect']): FailureMode => ({
  id, kind, trigger, figure: { type: 'set', state: { power: 'bench', fault: figureFault } }, effect,
  title: `faults.${id}.title`, symptom: `faults.${id}.symptom`, explanation: `faults.${id}.explanation`, fix: `faults.${id}.fix`,
});

const FAULTS: FailureMode[] = [
  fault('reverse-polarity', 'reverse-polarity', { by: 'reverse', input: 'bench' }, 'reverse-polarity:bench',
    { power: 'off', halts: true, damages: ['U1', 'C1'], extraMa: 10000 }),
  fault('cap-reversed', 'reversed-part', { by: 'reverse-part', part: 'C1' }, 'reversed:C1',
    { power: 'off', halts: true, damages: ['C1'], extraMa: 2000 }),
  fault('wiper-open', 'cold-solder', { by: 'cold-joint', part: 'RV1', pin: 'wiper' }, 'cold:RV1',
    { power: 'on', halts: false, extraMa: 64 }),
  fault('flat-pack', 'brownout', { by: 'power-input', input: 'bench', volts: 5.5 }, 'wrong-voltage:bench:5.5',
    { power: 'on', halts: false }),
  fault('stall', 'overcurrent', { by: 'load', rail: 'VOUT', ma: 1250, part: 'tt-motor' }, 'stall',
    { power: 'on', halts: false, extraMa: 776 }),
  fault('short-out', 'short', { by: 'short', nets: ['VOUT', 'GND'] }, 'short-out',
    { power: 'on', halts: false, damages: ['D1'], extraMa: 551 }),
  fault('ten-s-pack', 'wrong-voltage', { by: 'power-input', input: 'bench', volts: 44 }, 'wrong-voltage:bench:44',
    { power: 'off', halts: true, damages: ['D1'] }),
];

/* ---------- steps ---------- */
const text = (id: string, refusal = true) =>
  ({ title: `steps.${id}.title`, body: `steps.${id}.body`, ...(refusal ? { refusal: `steps.${id}.refusal` } : {}) });
// a trimmer setting is done once the screwdriver has reached it
const mode = (id: string, major = false, done: Record<string, unknown> = {}): BuildStep =>
  ({ id, kind: 'test', action: { type: 'set', state: { mode: id } }, done: { mode: id, status: 'running', 'meas.U1.set': true, ...done }, major, ...text(id) });
// a break step plugs in with its fault's command; it is done once the fault is repaired and the bench runs again
const breakStep = (id: string, faultId: string, major = false, extra: Record<string, unknown> = {}): BuildStep => {
  const f = FAULTS.find((x) => x.id === faultId);
  const state = f && f.figure.type === 'set' ? f.figure.state : {};
  return { id, kind: 'break', action: { type: 'set', state: { ...state, ...extra } }, done: { power: 'bench', status: 'running' }, fault: faultId, major, ...text(id, false) };
};

const steps: BuildStep[] = [
  { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false, ...text('strip') },
  { id: 'smd', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, ...text('smd') },
  { id: 'trimmer-display', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { build: 'tht' }, major: false, ...text('trimmer-display') },
  { id: 'caps-terminals', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 0 }, major: false, ...text('caps-terminals') },
  { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true, ...text('solder') },
  // the pack and the meter go on the mat; the motor waits until the output is set
  { id: 'wire-battery', kind: 'build', action: { type: 'set', state: { matStep: 'battery' } }, done: { matStep: 'battery' }, major: false, ...text('wire-battery') },
  { id: 'wire-meter', kind: 'build', action: { type: 'set', state: { matStep: 'meter' } }, done: { matStep: 'meter' }, major: false, ...text('wire-meter') },
  { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running' }, major: false, ...text('plug') },
  { id: 'show-out', kind: 'test', action: { type: 'press', id: 'ctl-sw1' }, done: { 'meas.DS1.shows': 'OUT' }, major: false, ...text('show-out') },
  mode('set5'),
  { id: 'wire-motor', kind: 'build', action: { type: 'set', state: { power: null, matStep: 'motor' } }, done: { matStep: 'motor', power: null }, major: false, ...text('wire-motor') },
  { id: 'load', kind: 'test', action: { type: 'set', state: { power: 'bench' } }, done: { power: 'bench', status: 'running', 'meas.MOT.state': 'ok' }, major: true, ...text('load') },
  mode('set33'), mode('set12', true),
  breakStep('lipo-backwards', 'reverse-polarity', false, { mode: 'set5' }),
  breakStep('cap-backwards', 'cap-reversed', false, { mode: 'set5' }),
  breakStep('wiper-open', 'wiper-open', false, { mode: 'set5' }),
  breakStep('flat-pack', 'flat-pack', false, { mode: 'set5' }),
  breakStep('stall', 'stall', false, { mode: 'set5' }),
  breakStep('short-out', 'short-out', true, { mode: 'set5' }),
  breakStep('ten-s-pack', 'ten-s-pack', false, { mode: 'set5' }),
  { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, ...text('exploded') },
];

/* ---------- status and current ---------- */
const field = (id: string, key: string, format: StatusField['format']): StatusField => ({ id, key, format, label: `status.${id}` });

const status: StatusField[] = [
  field('status', 'status', 'running'), field('powered', 'power', 'on-off'), field('mode', 'mode', 'text'),
  field('vin', 'rails.VIN', 'volts'), field('vout', 'meas.U1.vout', 'volts'), field('display', 'meas.DS1.text', 'text'),
  field('shows', 'meas.DS1.shows', 'text'), field('trimmer', 'meas.U1.turns', 'number'), field('duty', 'meas.U1.duty', 'percent'),
  field('efficiency', 'meas.U1.eff', 'percent'), field('chip', 'meas.U1.tj', 'number'), field('motor', 'meas.MOT.rpm', 'rpm'),
  field('motorCurrent', 'meas.MOT.i_mA', 'ma'), field('battery', 'currentMa.lipo', 'ma'),
];

// pack-side currents from the figure's converter (B.lm2596.convert) with the TT motor as the load
const running = { status: 'running', 'faults.length': 0, matStep: 'motor' };
const current: RoboticsContent['current'] = {
  supplies: [{ id: 'lipo', volts: 8.4, limitMa: 20000, label: 'current.lipo' }],
  loads: [
    { id: 'meter', supply: 'lipo', ma: 15, when: { power: 'bench' }, label: 'current.meter' },
    { id: 'quiescent', supply: 'lipo', ma: 5, when: { power: 'bench' }, label: 'current.quiescent' },
    { id: 'motor-5v', supply: 'lipo', ma: 105, when: { ...running, mode: 'set5' }, label: 'current.motor5' },
    { id: 'motor-3v3', supply: 'lipo', ma: 68, when: { ...running, mode: 'set33' }, label: 'current.motor33' },
    { id: 'motor-flat-out', supply: 'lipo', ma: 169, when: { ...running, mode: 'set12' }, label: 'current.motorFlat' },
    { id: 'wiper-open', supply: 'lipo', ma: 169, when: { 'faults.0': 'cold:RV1' }, label: 'current.wiperOpen' },
    { id: 'flat-pack', supply: 'lipo', ma: 152, when: { 'faults.0': 'wrong-voltage:bench:5.5' }, label: 'current.flatPack' },
    { id: 'stall', supply: 'lipo', ma: 881, when: { 'faults.0': 'stall' }, label: 'current.stall' },
    { id: 'short', supply: 'lipo', ma: 551, when: { 'faults.0': 'short-out', 'meas.D1.dead': false }, label: 'current.short' },
    { id: 'c1-backwards', supply: 'lipo', ma: 2000, when: { 'fault.id': 'reversed:C1' }, label: 'current.capReversed' },
    { id: 'reverse', supply: 'lipo', ma: 10000, when: { 'fault.id': 'reverse-polarity:bench' }, label: 'current.reverse' },
  ],
};

/* ---------- tasks: the trimmer sum, and the cut-off the module does not have ---------- */
const SET_STARTER = `// {{t:tasks.set-points.code.goal}}
const float VREF = 1.23;            // {{t:tasks.set-points.code.vref}}
const float R1 = 330.0;             // {{t:tasks.set-points.code.r1}}
const float OHM_PER_TURN = 400.0;   // {{t:tasks.set-points.code.turn}}

void show(float vout) {
  float r2 = R1 * vout / VREF;      // {{t:tasks.set-points.code.wrong}}
  Serial.print(vout, 1);
  Serial.print(" V: R2 = ");
  Serial.print(r2, 0);
  Serial.print(" ohm, ");
  Serial.print(r2 / OHM_PER_TURN, 1);
  Serial.println(" turns");
}

void setup() {
  Serial.begin(9600);
  show(5.0);
}

void loop() {
}
`;

const SET_SOLUTION = `const float VREF = 1.23;
const float R1 = 330.0;
const float OHM_PER_TURN = 400.0;
const float PACK_FULL = 8.4;
const float DROPOUT = 1.0;

void show(float vout) {
  float r2 = R1 * (vout / VREF - 1.0);
  Serial.print(vout, 1);
  Serial.print(" V: R2 = ");
  Serial.print(r2, 0);
  Serial.print(" ohm, ");
  Serial.print(r2 / OHM_PER_TURN, 1);
  Serial.println(" turns");
  if (vout > PACK_FULL - DROPOUT) Serial.println("  needs a 3S pack: a buck only steps down");
}

void setup() {
  Serial.begin(9600);
  show(3.3);
  show(5.0);
  show(12.0);
}

void loop() {
}
`;

const CUT_STARTER = `// {{t:tasks.cut-off.code.goal}}
const int PACK = A0;    // {{t:tasks.cut-off.code.divider}}
const int LOAD = 7;     // {{t:tasks.cut-off.code.load}}

void setup() {
  pinMode(LOAD, OUTPUT);
  digitalWrite(LOAD, HIGH);
  Serial.begin(9600);
}

void loop() {
  float pack = analogRead(PACK) * 5.0 / 1023.0;   // {{t:tasks.cut-off.code.scale}}
  Serial.print("pack ");
  Serial.println(pack, 1);
  // {{t:tasks.cut-off.code.todo}}
  delay(250);
}
`;

const CUT_SOLUTION = `const int PACK = A0;
const int LOAD = 7;
const float CUT = 6.6;    // 3.3 V a cell
bool cut = false;

void setup() {
  pinMode(LOAD, OUTPUT);
  digitalWrite(LOAD, HIGH);
  Serial.begin(9600);
}

void loop() {
  float pack = analogRead(PACK) * 5.0 / 1023.0 * 3.0;
  Serial.print("pack ");
  Serial.println(pack, 1);
  if (!cut && pack < CUT) {
    cut = true;
    digitalWrite(LOAD, LOW);
    Serial.println("cut-off");
  }
  delay(250);
}
`;

type OmitEach<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
const checks = (task: string, list: OmitEach<Check, 'label'>[]): Check[] =>
  list.map((c, i) => ({ ...c, label: `tasks.${task}.checks.${i + 1}` }) as Check);

const tasks: PracticeTask[] = [
  {
    id: 'set-points', board: 'nano', language: 'arduino-cpp',
    starter: { source: SET_STARTER, libraries: [] }, solution: SET_SOLUTION, circuit: null, world: { inputs: [], script: [] }, runMs: 500,
    checks: checks('set-points', [
      { kind: 'serial', match: '^3\\.3 V: R2 = 55[456] ohm, 1\\.4 turns$', regex: true, minCount: 1 },
      { kind: 'serial', match: '^5\\.0 V: R2 = 101[012] ohm, 2\\.5 turns$', regex: true, minCount: 1 },
      { kind: 'serial', match: '^12\\.0 V: R2 = 2(889|890|891) ohm, 7\\.2 turns$', regex: true, minCount: 1 },
      { kind: 'serial', match: 'needs a 3S pack', regex: false, minCount: 1 },
    ]),
    title: 'tasks.set-points.title', brief: 'tasks.set-points.brief',
    hints: ['tasks.set-points.hints.1', 'tasks.set-points.hints.2', 'tasks.set-points.hints.3'],
  },
  {
    id: 'cut-off', board: 'nano', language: 'arduino-cpp',
    starter: { source: CUT_STARTER, libraries: [] }, solution: CUT_SOLUTION, circuit: null,
    world: {
      inputs: [{
        id: 'pack', quantity: 'voltage', device: { kind: 'linear', voltsAtMin: 0, voltsAtMax: 3 }, pins: ['A0'], part: 'BATT',
        min: 0, max: 9, step: 0.1, default: 8.4, unit: 'V', gesture: 'slide', label: 'tasks.cut-off.world.pack',
      }],
      // the pack runs down under the motor, then bounces back once the load is off
      script: [
        { t: 500, input: 'pack', value: 7.8 }, { t: 1000, input: 'pack', value: 7.4 }, { t: 1500, input: 'pack', value: 7.0 },
        { t: 2000, input: 'pack', value: 6.8 }, { t: 2500, input: 'pack', value: 6.5 }, { t: 3000, input: 'pack', value: 6.9 },
      ],
    },
    runMs: 3600,
    checks: checks('cut-off', [
      { kind: 'runs', minMs: 3500 },
      { kind: 'serial', match: '^pack 8\\.4$', regex: true, minCount: 1, byMs: 300 },
      { kind: 'pin-level', pin: 'D7', level: 1, atMs: 2400 },
      { kind: 'serial', match: 'cut-off', regex: false, minCount: 1, byMs: 2900 },
      { kind: 'pin-level', pin: 'D7', level: 0, atMs: 2900 },
      { kind: 'pin-level', pin: 'D7', level: 0, atMs: 3500 },
    ]),
    title: 'tasks.cut-off.title', brief: 'tasks.cut-off.brief',
    hints: ['tasks.cut-off.hints.1', 'tasks.cut-off.hints.2', 'tasks.cut-off.hints.3'],
  },
];

/* ---------- quizzes: one after each major step, then the end quiz ---------- */
const quiz = (id: string, afterStep: string | null, questions: [string, number][]): Quiz => ({
  id, afterStep,
  questions: questions.map(([q, answer]) => {
    const k = `quizzes.${id}.${q}`;
    return { id: q, q: `${k}.q`, options: [1, 2, 3].map((n) => `${k}.options.${n}`), answer, why: `${k}.why` };
  }),
});

const quizzes: Quiz[] = [
  quiz('build', 'solder', [['diode', 1], ['inductor', 0], ['caps', 2]]),
  quiz('load', 'load', [['order', 2], ['current', 0], ['meter', 1]]),
  quiz('limits', 'set12', [['step-down', 1], ['turns', 0], ['efficiency', 2]]),
  quiz('faults', 'short-out', [['short', 0], ['stall', 2], ['wiper', 1]]),
  quiz('end', null, [['vs-7805', 1], ['cut-off', 2], ['first', 0]]),
];

const lm2596 = {
  lab: 'robotics',
  id: 'lm2596',
  fig: 12,
  board: null,
  modules: ['lm2596'],
  parts: ['lipo-2s', 'tt-motor', 'multimeter'],
  figure: { page: '/figures/robotics/lm2596.html', parts, sheets: ['board', 'schematic', 'power'] },
  power: { source: 'bench', label: 'power.label', ok: 'power.ok' },
  modes,
  defaultMode: 'found',
  steps,
  faults: FAULTS,
  status,
  current,
  tasks,
  quizzes,
  sources: [
    { title: 'Texas Instruments LM2596 SIMPLE SWITCHER datasheet (SNVS124G)', url: 'https://www.ti.com/lit/ds/symlink/lm2596.pdf' },
    { title: 'Envistia Mall: LM2596 buck module with voltmeter (V2), specification and photos', url: 'https://envistiamall.com/products/lm2596-dc-dc-4v-40v-input-1-3v-to-35v-output-3a-buck-step-down-voltage-converter-regulator-module-with-led-voltmeter-display-v2' },
    { title: 'Codrey Electronics: LM2596S module teardown and traced schematic', url: 'https://www.codrey.com/learn/lm2596s-module-a-trivial-tale/' },
    { title: 'Vishay SS32-SS36 Schottky rectifier datasheet', url: 'https://www.vishay.com/docs/88751/ss32.pdf' },
  ],
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  overview: 'overview',
} satisfies RoboticsContent;

export default lm2596;
