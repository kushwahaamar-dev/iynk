// Arduino UNO R3 (A000066): the board the Board Lab opens with. Facts: docs/facts/uno-r3.md (Eagle UNO-TH_Rev3e,
// ATmega328P datasheet, ArduinoCore-avr 1.8.8); parts on the breadboard: docs/facts/la-components.md. The 16 lessons
// follow Learn Arduino's sequence with its defects fixed (docs/research/learn-arduino.md §9.2); the assembly follows
// Robotics Bench Fig. 01. Lesson circuits live in figures/boards/uno-r3.js (key = lesson id).
import type { BoardContent, Lesson } from '@/content/schema';

const lessons = [
  {
    id: 'board',
    n: 1,
    level: 'intro',
    language: 'arduino-cpp',
    code: {
      source: `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);  // {{t:lessons.board.code.output}}
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);  // {{t:lessons.board.code.high}}
  delay(1000);{{p:blink}}
}
`,
      libraries: [],
    },
    params: [
      {
        id: 'blink',
        kind: 'toggle',
        label: 'lessons.board.params.blink.label',
        default: false,
        code: { on: '\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);', off: '' },
      },
    ],
    circuit: null,
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 3000,
    checks: [
      { kind: 'runs', minMs: 3000, label: 'lessons.board.checks.1' },
      { kind: 'pin-level', pin: 'D13', level: 1, atMs: 500, label: 'lessons.board.checks.2' },
      { kind: 'code', must: ['pinMode(LED_BUILTIN, OUTPUT)'], mustNot: [], label: 'lessons.board.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D0-D13', to: 'lessons.board.pins.D0-D13.to', role: 'lessons.board.pins.D0-D13.role', color: 'blue' },
      { pin: 'A0-A5', to: 'lessons.board.pins.A0-A5.to', role: 'lessons.board.pins.A0-A5.role', color: 'green' },
      { pin: '5V-3V3', to: 'lessons.board.pins.5V-3V3.to', role: 'lessons.board.pins.5V-3V3.role', color: 'red' },
      { pin: 'GND', to: 'lessons.board.pins.GND.to', role: 'lessons.board.pins.GND.role', color: 'black' },
      { pin: 'VIN', to: 'lessons.board.pins.VIN.to', role: 'lessons.board.pins.VIN.role', color: 'orange' },
      { pin: 'RESET', to: 'lessons.board.pins.RESET.to', role: 'lessons.board.pins.RESET.role', color: 'grey' },
    ],
    callouts: [
      { part: 'X2', text: 'lessons.board.callouts.X2' },
      { part: 'ZU4', text: 'lessons.board.callouts.ZU4' },
      { part: 'IOL', text: 'lessons.board.callouts.IOL' },
      { part: 'X1', text: 'lessons.board.callouts.X1' },
      { part: 'POWER', text: 'lessons.board.callouts.POWER' },
      { part: 'AD', text: 'lessons.board.callouts.AD' },
    ],
    specs: [
      { label: 'lessons.board.specs.1.label', value: 'lessons.board.specs.1.value' },
      { label: 'lessons.board.specs.2.label', value: 'lessons.board.specs.2.value' },
      { label: 'lessons.board.specs.3.label', value: 'lessons.board.specs.3.value' },
      { label: 'lessons.board.specs.4.label', value: 'lessons.board.specs.4.value' },
      { label: 'lessons.board.specs.5.label', value: 'lessons.board.specs.5.value' },
      { label: 'lessons.board.specs.6.label', value: 'lessons.board.specs.6.value' },
      { label: 'lessons.board.specs.7.label', value: 'lessons.board.specs.7.value' },
      { label: 'lessons.board.specs.8.label', value: 'lessons.board.specs.8.value' },
      { label: 'lessons.board.specs.9.label', value: 'lessons.board.specs.9.value' },
    ],
    features: [
      { icon: 'board', text: 'lessons.board.features.1' },
      { icon: 'globe', text: 'lessons.board.features.2' },
      { icon: 'tip', text: 'lessons.board.features.3' },
    ],
    title: 'lessons.board.title',
    lede: 'lessons.board.lede',
    steps: [
      'lessons.board.steps.1',
      'lessons.board.steps.2',
      'lessons.board.steps.3',
      'lessons.board.steps.4',
      'lessons.board.steps.5',
    ],
    hints: ['lessons.board.hints.1', 'lessons.board.hints.2'],
    quiz: {
      id: 'board-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.board.quiz.q1.q',
          options: ['lessons.board.quiz.q1.options.1', 'lessons.board.quiz.q1.options.2', 'lessons.board.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.board.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.board.quiz.q2.q',
          options: ['lessons.board.quiz.q2.options.1', 'lessons.board.quiz.q2.options.2', 'lessons.board.quiz.q2.options.3'],
          answer: 1,
          why: 'lessons.board.quiz.q2.why',
        },
        {
          id: 'q3',
          q: 'lessons.board.quiz.q3.q',
          options: ['lessons.board.quiz.q3.options.1', 'lessons.board.quiz.q3.options.2', 'lessons.board.quiz.q3.options.3'],
          answer: 2,
          why: 'lessons.board.quiz.q3.why',
        },
        {
          id: 'q4',
          q: 'lessons.board.quiz.q4.q',
          options: ['lessons.board.quiz.q4.options.1', 'lessons.board.quiz.q4.options.2', 'lessons.board.quiz.q4.options.3'],
          answer: 0,
          why: 'lessons.board.quiz.q4.why',
        },
      ],
    },
  },
  {
    id: 'blink',
    n: 2,
    level: 'io',
    language: 'arduino-cpp',
    code: {
      source: `const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay({{p:on}});  // {{t:lessons.blink.code.on}}
  digitalWrite(LED_PIN, LOW);
  delay({{p:off}});  // {{t:lessons.blink.code.off}}
}
`,
      libraries: [],
    },
    params: [
      { id: 'on', kind: 'number', label: 'lessons.blink.params.on.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' },
      { id: 'off', kind: 'number', label: 'lessons.blink.params.off.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' },
      {
        id: 'resistor',
        kind: 'choice',
        label: 'lessons.blink.params.resistor.label',
        default: '220',
        options: [
          { value: '220', code: '220', figureValue: 220, label: 'lessons.blink.params.resistor.220', note: 'lessons.blink.params.resistor.220-note' },
          { value: '1000', code: '1000', figureValue: 1000, label: 'lessons.blink.params.resistor.1000', note: 'lessons.blink.params.resistor.1000-note' },
          { value: '10000', code: '10000', figureValue: 10000, label: 'lessons.blink.params.resistor.10000', note: 'lessons.blink.params.resistor.10000-note' },
        ],
        figure: { part: 'RES1', key: 'ohms' },
      },
      {
        id: 'color',
        kind: 'choice',
        label: 'lessons.blink.params.color.label',
        default: 'red',
        options: [
          { value: 'red', code: 'red', figureValue: 'red', label: 'lessons.blink.params.color.red' },
          { value: 'yellow', code: 'yellow', figureValue: 'yellow', label: 'lessons.blink.params.color.yellow' },
          { value: 'green', code: 'green', figureValue: 'green', label: 'lessons.blink.params.color.green' },
          { value: 'blue', code: 'blue', figureValue: 'blue', label: 'lessons.blink.params.color.blue' },
          { value: 'white', code: 'white', figureValue: 'white', label: 'lessons.blink.params.color.white' },
        ],
        figure: { part: 'LED1', key: 'color' },
      },
    ],
    circuit: 'blink',
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 8500,
    checks: [
      { kind: 'runs', minMs: 8000, label: 'lessons.blink.checks.1' },
      { kind: 'pin-toggles', pin: 'D13', periodMs: [50, 2000], minCycles: 2, label: 'lessons.blink.checks.2' },
      { kind: 'code', must: ['pinMode(LED_PIN, OUTPUT)', 'digitalWrite(LED_PIN, LOW)'], mustNot: [], label: 'lessons.blink.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D13', to: 'lessons.blink.pins.D13.to', role: 'lessons.blink.pins.D13.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'LED1', text: 'lessons.blink.callouts.LED1' },
      { part: 'IOH', text: 'lessons.blink.callouts.IOH' },
      { part: 'RES1', text: 'lessons.blink.callouts.RES1' },
      { part: 'L', text: 'lessons.blink.callouts.L' },
    ],
    specs: [
      { label: 'lessons.blink.specs.1.label', value: 'lessons.blink.specs.1.value' },
      { label: 'lessons.blink.specs.2.label', value: 'lessons.blink.specs.2.value' },
      { label: 'lessons.blink.specs.3.label', value: 'lessons.blink.specs.3.value' },
      { label: 'lessons.blink.specs.4.label', value: 'lessons.blink.specs.4.value' },
      { label: 'lessons.blink.specs.5.label', value: 'lessons.blink.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.blink.features.1' },
      { icon: 'tip', text: 'lessons.blink.features.2' },
      { icon: 'info', text: 'lessons.blink.features.3' },
    ],
    title: 'lessons.blink.title',
    lede: 'lessons.blink.lede',
    steps: ['lessons.blink.steps.1', 'lessons.blink.steps.2', 'lessons.blink.steps.3', 'lessons.blink.steps.4'],
    hints: ['lessons.blink.hints.1', 'lessons.blink.hints.2', 'lessons.blink.hints.3'],
    quiz: {
      id: 'blink-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.blink.quiz.q1.q',
          options: ['lessons.blink.quiz.q1.options.1', 'lessons.blink.quiz.q1.options.2', 'lessons.blink.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.blink.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.blink.quiz.q2.q',
          options: ['lessons.blink.quiz.q2.options.1', 'lessons.blink.quiz.q2.options.2', 'lessons.blink.quiz.q2.options.3'],
          answer: 2,
          why: 'lessons.blink.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'button',
    n: 3,
    level: 'input',
    language: 'arduino-cpp',
    code: {
      source: `const int BUTTON = 2;
const int LED = 13;

int last = LOW;    // {{t:lessons.button.code.last}}
bool lit = false;  // {{t:lessons.button.code.lit}}

void setup() {
  pinMode(BUTTON, INPUT);  // {{t:lessons.button.code.input}}
  pinMode(LED, OUTPUT);
}

void loop() {
  int now = digitalRead(BUTTON);
{{p:logic}}
  last = now;
}
`,
      libraries: [],
    },
    params: [
      {
        id: 'logic',
        kind: 'choice',
        label: 'lessons.button.params.logic.label',
        default: 'hold',
        options: [
          { value: 'hold', code: '  digitalWrite(LED, now);', label: 'lessons.button.params.logic.hold', note: 'lessons.button.params.logic.hold-note' },
          {
            value: 'toggle',
            code: '  if (now == HIGH && last == LOW) {\n    lit = !lit;\n    digitalWrite(LED, lit);\n    delay(30);\n  }',
            label: 'lessons.button.params.logic.toggle',
            note: 'lessons.button.params.logic.toggle-note',
          },
        ],
      },
      {
        id: 'color',
        kind: 'choice',
        label: 'lessons.button.params.color.label',
        default: 'red',
        options: [
          { value: 'red', code: 'red', figureValue: 'red', label: 'lessons.blink.params.color.red' },
          { value: 'yellow', code: 'yellow', figureValue: 'yellow', label: 'lessons.blink.params.color.yellow' },
          { value: 'green', code: 'green', figureValue: 'green', label: 'lessons.blink.params.color.green' },
          { value: 'blue', code: 'blue', figureValue: 'blue', label: 'lessons.blink.params.color.blue' },
          { value: 'white', code: 'white', figureValue: 'white', label: 'lessons.blink.params.color.white' },
        ],
        figure: { part: 'LED1', key: 'color' },
      },
    ],
    circuit: 'button',
    world: {
      inputs: [
        {
          id: 'button',
          quantity: 'button',
          device: { kind: 'button', pull: 'external-down', bounceMs: 5 },
          pins: ['D2'],
          part: 'BTN1',
          min: 0,
          max: 1,
          step: 1,
          default: 0,
          gesture: 'press',
          label: 'lessons.button.world.button',
        },
      ],
      script: [
        { t: 500, input: 'button', value: 1 },
        { t: 1200, input: 'button', value: 0 },
        { t: 2000, input: 'button', value: 1 },
        { t: 2600, input: 'button', value: 0 },
      ],
    },
    serial: { baud: 9600, sample: [] },
    runMs: 3000,
    checks: [
      { kind: 'responds', after: { t: 500, input: 'button', value: 1 }, pin: 'D13', withinMs: 60, mode: 'out', v: [1, 1], label: 'lessons.button.checks.1' },
      { kind: 'pin-level', pin: 'D13', level: 1, atMs: 900, label: 'lessons.button.checks.2' },
      { kind: 'pin-level', pin: 'D13', level: 0, atMs: 2900, label: 'lessons.button.checks.3' },
      { kind: 'code', must: ['digitalRead(BUTTON)'], mustNot: [], label: 'lessons.button.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.button.pins.5V.to', role: 'lessons.button.pins.5V.role', color: 'red' },
      { pin: 'D2', to: 'lessons.button.pins.D2.to', role: 'lessons.button.pins.D2.role', color: 'blue' },
      { pin: 'GND', to: 'lessons.button.pins.GND.to', role: 'lessons.button.pins.GND.role', color: 'black' },
      { pin: 'D13', to: 'lessons.button.pins.D13.to', role: 'lessons.button.pins.D13.role', color: 'orange' },
    ],
    callouts: [
      { part: 'BTN1', text: 'lessons.button.callouts.BTN1' },
      { part: 'RES1', text: 'lessons.button.callouts.RES1' },
      { part: 'LED1', text: 'lessons.button.callouts.LED1' },
      { part: 'IOL', text: 'lessons.button.callouts.IOL' },
    ],
    specs: [
      { label: 'lessons.button.specs.1.label', value: 'lessons.button.specs.1.value' },
      { label: 'lessons.button.specs.2.label', value: 'lessons.button.specs.2.value' },
      { label: 'lessons.button.specs.3.label', value: 'lessons.button.specs.3.value' },
      { label: 'lessons.button.specs.4.label', value: 'lessons.button.specs.4.value' },
      { label: 'lessons.button.specs.5.label', value: 'lessons.button.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.button.features.1' },
      { icon: 'info', text: 'lessons.button.features.2' },
      { icon: 'tip', text: 'lessons.button.features.3' },
    ],
    title: 'lessons.button.title',
    lede: 'lessons.button.lede',
    steps: ['lessons.button.steps.1', 'lessons.button.steps.2', 'lessons.button.steps.3', 'lessons.button.steps.4'],
    hints: ['lessons.button.hints.1', 'lessons.button.hints.2', 'lessons.button.hints.3'],
    quiz: {
      id: 'button-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.button.quiz.q1.q',
          options: ['lessons.button.quiz.q1.options.1', 'lessons.button.quiz.q1.options.2', 'lessons.button.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.button.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.button.quiz.q2.q',
          options: ['lessons.button.quiz.q2.options.1', 'lessons.button.quiz.q2.options.2', 'lessons.button.quiz.q2.options.3'],
          answer: 2,
          why: 'lessons.button.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'knob',
    n: 4,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `const int POT = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int value = analogRead(POT);  // 0-1023
  analogWrite(LED, value / 4);  // 0-255
  Serial.println(value);
  delay({{p:every}});
}
`,
      libraries: [],
    },
    params: [
      { id: 'every', kind: 'number', label: 'lessons.knob.params.every.label', default: 50, min: 10, max: 1000, step: 10, unit: 'ms' },
      {
        id: 'color',
        kind: 'choice',
        label: 'lessons.knob.params.color.label',
        default: 'red',
        options: [
          { value: 'red', code: 'red', figureValue: 'red', label: 'lessons.blink.params.color.red' },
          { value: 'yellow', code: 'yellow', figureValue: 'yellow', label: 'lessons.blink.params.color.yellow' },
          { value: 'green', code: 'green', figureValue: 'green', label: 'lessons.blink.params.color.green' },
          { value: 'blue', code: 'blue', figureValue: 'blue', label: 'lessons.blink.params.color.blue' },
          { value: 'white', code: 'white', figureValue: 'white', label: 'lessons.blink.params.color.white' },
        ],
        figure: { part: 'LED1', key: 'color' },
      },
    ],
    circuit: 'knob',
    world: {
      inputs: [
        {
          id: 'knob',
          quantity: 'level',
          device: { kind: 'pot', ohms: 10000 },
          pins: ['A0'],
          part: 'POT1',
          min: 0,
          max: 1023,
          step: 1,
          default: 620,
          gesture: 'knob',
          label: 'lessons.knob.world.knob',
        },
      ],
      script: [
        { t: 1000, input: 'knob', value: 1023 },
        { t: 2000, input: 'knob', value: 0 },
        { t: 3000, input: 'knob', value: 300 },
      ],
    },
    serial: { baud: 9600, sample: ['620', '620', '620', '1023', '1023', '0', '0', '300'] },
    runMs: 4000,
    checks: [
      { kind: 'serial', match: '^620$', regex: true, minCount: 5, byMs: 1000, label: 'lessons.knob.checks.1' },
      { kind: 'pwm', pin: 'D9', duty: [0.59, 0.63], atMs: 600, label: 'lessons.knob.checks.2' },
      { kind: 'pin-level', pin: 'D9', level: 1, atMs: 1500, label: 'lessons.knob.checks.3' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 2500, label: 'lessons.knob.checks.4' },
      { kind: 'pwm', pin: 'D9', duty: [0.27, 0.32], atMs: 3500, label: 'lessons.knob.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.knob.pins.5V.to', role: 'lessons.knob.pins.5V.role', color: 'red' },
      { pin: 'A0', to: 'lessons.knob.pins.A0.to', role: 'lessons.knob.pins.A0.role', color: 'green' },
      { pin: 'GND1', to: 'lessons.knob.pins.GND1.to', role: 'lessons.knob.pins.GND1.role', color: 'black' },
      { pin: 'D9', to: 'lessons.knob.pins.D9.to', role: 'lessons.knob.pins.D9.role', color: 'orange' },
    ],
    callouts: [
      { part: 'POT1', text: 'lessons.knob.callouts.POT1' },
      { part: 'AD', text: 'lessons.knob.callouts.AD' },
      { part: 'LED1', text: 'lessons.knob.callouts.LED1' },
      { part: 'IOH', text: 'lessons.knob.callouts.IOH' },
    ],
    specs: [
      { label: 'lessons.knob.specs.1.label', value: 'lessons.knob.specs.1.value' },
      { label: 'lessons.knob.specs.2.label', value: 'lessons.knob.specs.2.value' },
      { label: 'lessons.knob.specs.3.label', value: 'lessons.knob.specs.3.value' },
      { label: 'lessons.knob.specs.4.label', value: 'lessons.knob.specs.4.value' },
      { label: 'lessons.knob.specs.5.label', value: 'lessons.knob.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.knob.features.1' },
      { icon: 'info', text: 'lessons.knob.features.2' },
      { icon: 'tip', text: 'lessons.knob.features.3' },
    ],
    title: 'lessons.knob.title',
    lede: 'lessons.knob.lede',
    steps: ['lessons.knob.steps.1', 'lessons.knob.steps.2', 'lessons.knob.steps.3', 'lessons.knob.steps.4'],
    hints: ['lessons.knob.hints.1', 'lessons.knob.hints.2'],
    quiz: {
      id: 'knob-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.knob.quiz.q1.q',
          options: ['lessons.knob.quiz.q1.options.1', 'lessons.knob.quiz.q1.options.2', 'lessons.knob.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.knob.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.knob.quiz.q2.q',
          options: ['lessons.knob.quiz.q2.options.1', 'lessons.knob.quiz.q2.options.2', 'lessons.knob.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.knob.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'rgb',
    n: 5,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `const int RED = 9;
const int GREEN = 10;
const int BLUE = 11;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(GREEN, OUTPUT);
  pinMode(BLUE, OUTPUT);
}

void loop() {
  analogWrite(RED, {{p:red}});
  analogWrite(GREEN, {{p:green}});
  analogWrite(BLUE, {{p:blue}});
  delay(100);
}
`,
      libraries: [],
    },
    params: [
      { id: 'red', kind: 'number', label: 'lessons.rgb.params.red.label', default: 170, min: 0, max: 255, step: 1 },
      { id: 'green', kind: 'number', label: 'lessons.rgb.params.green.label', default: 0, min: 0, max: 255, step: 1 },
      { id: 'blue', kind: 'number', label: 'lessons.rgb.params.blue.label', default: 255, min: 0, max: 255, step: 1 },
    ],
    circuit: 'rgb',
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 1000,
    checks: [
      { kind: 'pwm', pin: 'D9', duty: [0.66, 0.67], atMs: 500, label: 'lessons.rgb.checks.1' },
      { kind: 'pin-level', pin: 'D10', level: 0, atMs: 500, label: 'lessons.rgb.checks.2' },
      { kind: 'pin-level', pin: 'D11', level: 1, atMs: 500, label: 'lessons.rgb.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D9', to: 'lessons.rgb.pins.D9.to', role: 'lessons.rgb.pins.D9.role', color: 'orange' },
      { pin: 'D10', to: 'lessons.rgb.pins.D10.to', role: 'lessons.rgb.pins.D10.role', color: 'green' },
      { pin: 'D11', to: 'lessons.rgb.pins.D11.to', role: 'lessons.rgb.pins.D11.role', color: 'blue' },
      { pin: 'GND', to: 'lessons.rgb.pins.GND.to', role: 'lessons.rgb.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'LED1', text: 'lessons.rgb.callouts.LED1' },
      { part: 'IOH', text: 'lessons.rgb.callouts.IOH' },
      { part: 'RES1', text: 'lessons.rgb.callouts.RES1' },
    ],
    specs: [
      { label: 'lessons.rgb.specs.1.label', value: 'lessons.rgb.specs.1.value' },
      { label: 'lessons.rgb.specs.2.label', value: 'lessons.rgb.specs.2.value' },
      { label: 'lessons.rgb.specs.3.label', value: 'lessons.rgb.specs.3.value' },
      { label: 'lessons.rgb.specs.4.label', value: 'lessons.rgb.specs.4.value' },
      { label: 'lessons.rgb.specs.5.label', value: 'lessons.rgb.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.rgb.features.1' },
      { icon: 'tip', text: 'lessons.rgb.features.2' },
      { icon: 'play', text: 'lessons.rgb.features.3' },
    ],
    title: 'lessons.rgb.title',
    lede: 'lessons.rgb.lede',
    steps: ['lessons.rgb.steps.1', 'lessons.rgb.steps.2', 'lessons.rgb.steps.3', 'lessons.rgb.steps.4'],
    hints: ['lessons.rgb.hints.1', 'lessons.rgb.hints.2'],
    quiz: {
      id: 'rgb-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.rgb.quiz.q1.q',
          options: ['lessons.rgb.quiz.q1.options.1', 'lessons.rgb.quiz.q1.options.2', 'lessons.rgb.quiz.q1.options.3'],
          answer: 2,
          why: 'lessons.rgb.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.rgb.quiz.q2.q',
          options: ['lessons.rgb.quiz.q2.options.1', 'lessons.rgb.quiz.q2.options.2', 'lessons.rgb.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.rgb.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'light',
    n: 6,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `const int SENSOR = A0;
const int LED = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED, OUTPUT);
}

void loop() {
  int light = analogRead(SENSOR);  // {{t:lessons.light.code.higher}}
  Serial.println(light);

  if (light < {{p:dark}}) {
    digitalWrite(LED, HIGH);  // {{t:lessons.light.code.dark}}
  } else {
    digitalWrite(LED, LOW);
  }
  delay(100);
}
`,
      libraries: [],
    },
    params: [
      { id: 'dark', kind: 'number', label: 'lessons.light.params.dark.label', default: 400, min: 50, max: 1000, step: 10 },
      {
        id: 'color',
        kind: 'choice',
        label: 'lessons.light.params.color.label',
        default: 'yellow',
        options: [
          { value: 'red', code: 'red', figureValue: 'red', label: 'lessons.blink.params.color.red' },
          { value: 'yellow', code: 'yellow', figureValue: 'yellow', label: 'lessons.blink.params.color.yellow' },
          { value: 'green', code: 'green', figureValue: 'green', label: 'lessons.blink.params.color.green' },
          { value: 'blue', code: 'blue', figureValue: 'blue', label: 'lessons.blink.params.color.blue' },
          { value: 'white', code: 'white', figureValue: 'white', label: 'lessons.blink.params.color.white' },
        ],
        figure: { part: 'LED1', key: 'color' },
      },
    ],
    circuit: 'light',
    world: {
      inputs: [
        {
          id: 'light',
          quantity: 'light-lux',
          device: { kind: 'divider', sensor: 'ldr', fixedOhms: 10000, sensorTo: 'vcc' },
          pins: ['A0'],
          part: 'LAMP',
          min: 0,
          max: 1000,
          step: 1,
          default: 50,
          unit: 'lux',
          gesture: 'slide',
          label: 'lessons.light.world.light',
        },
      ],
      script: [
        { t: 1000, input: 'light', value: 1 },
        { t: 2000, input: 'light', value: 300 },
      ],
    },
    serial: { baud: 9600, sample: ['773', '773', '170', '170', '936'] },
    runMs: 3000,
    checks: [
      { kind: 'serial', match: '^\\d+$', regex: true, minCount: 10, label: 'lessons.light.checks.1' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 800, label: 'lessons.light.checks.2' },
      { kind: 'responds', after: { t: 1000, input: 'light', value: 1 }, pin: 'D9', withinMs: 150, mode: 'out', v: [1, 1], label: 'lessons.light.checks.3' },
      { kind: 'pin-level', pin: 'D9', level: 0, atMs: 2800, label: 'lessons.light.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.light.pins.5V.to', role: 'lessons.light.pins.5V.role', color: 'red' },
      { pin: 'A0', to: 'lessons.light.pins.A0.to', role: 'lessons.light.pins.A0.role', color: 'green' },
      { pin: 'GND1', to: 'lessons.light.pins.GND1.to', role: 'lessons.light.pins.GND1.role', color: 'black' },
      { pin: 'D9', to: 'lessons.light.pins.D9.to', role: 'lessons.light.pins.D9.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.light.pins.GND.to', role: 'lessons.light.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'LED1', text: 'lessons.light.callouts.LED1' },
      { part: 'LDR1', text: 'lessons.light.callouts.LDR1' },
      { part: 'AD', text: 'lessons.light.callouts.AD' },
      { part: 'LAMP', text: 'lessons.light.callouts.LAMP' },
    ],
    specs: [
      { label: 'lessons.light.specs.1.label', value: 'lessons.light.specs.1.value' },
      { label: 'lessons.light.specs.2.label', value: 'lessons.light.specs.2.value' },
      { label: 'lessons.light.specs.3.label', value: 'lessons.light.specs.3.value' },
      { label: 'lessons.light.specs.4.label', value: 'lessons.light.specs.4.value' },
      { label: 'lessons.light.specs.5.label', value: 'lessons.light.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.light.features.1' },
      { icon: 'play', text: 'lessons.light.features.2' },
      { icon: 'tip', text: 'lessons.light.features.3' },
    ],
    title: 'lessons.light.title',
    lede: 'lessons.light.lede',
    steps: ['lessons.light.steps.1', 'lessons.light.steps.2', 'lessons.light.steps.3', 'lessons.light.steps.4'],
    hints: ['lessons.light.hints.1', 'lessons.light.hints.2'],
    quiz: {
      id: 'light-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.light.quiz.q1.q',
          options: ['lessons.light.quiz.q1.options.1', 'lessons.light.quiz.q1.options.2', 'lessons.light.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.light.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.light.quiz.q2.q',
          options: ['lessons.light.quiz.q2.options.1', 'lessons.light.quiz.q2.options.2', 'lessons.light.quiz.q2.options.3'],
          answer: 1,
          why: 'lessons.light.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'distance',
    n: 7,
    level: 'input',
    language: 'arduino-cpp',
    code: {
      source: `const int TRIG = 9;
const int ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);  // {{t:lessons.distance.code.ping}}
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // {{t:lessons.distance.code.echo}}
  long cm = pulseIn(ECHO, HIGH, 30000) / 58;
  Serial.print(cm);
  Serial.println(" cm");
  delay({{p:every}});
}
`,
      libraries: [],
    },
    params: [
      { id: 'every', kind: 'number', label: 'lessons.distance.params.every.label', default: 100, min: 50, max: 1000, step: 50, unit: 'ms' },
      {
        id: 'obstacle',
        kind: 'choice',
        label: 'lessons.distance.params.obstacle.label',
        default: 'car',
        options: [
          { value: 'car', code: 'car', figureValue: 'car', label: 'lessons.distance.params.obstacle.car', note: 'lessons.distance.params.obstacle.car-note' },
          { value: 'box', code: 'box', figureValue: 'box', label: 'lessons.distance.params.obstacle.box', note: 'lessons.distance.params.obstacle.box-note' },
          { value: 'ball', code: 'ball', figureValue: 'ball', label: 'lessons.distance.params.obstacle.ball', note: 'lessons.distance.params.obstacle.ball-note' },
          { value: 'wall', code: 'wall', figureValue: 'wall', label: 'lessons.distance.params.obstacle.wall', note: 'lessons.distance.params.obstacle.wall-note' },
        ],
        figure: { part: 'OBST', key: 'kind' },
      },
    ],
    circuit: 'distance',
    world: {
      inputs: [
        {
          id: 'distance',
          quantity: 'distance-cm',
          device: { kind: 'hc-sr04' },
          pins: ['D9', 'D10'],
          part: 'OBST',
          min: 2,
          max: 450,
          step: 1,
          default: 30,
          unit: 'cm',
          gesture: 'drag',
          label: 'lessons.distance.world.distance',
        },
      ],
      script: [
        { t: 1000, input: 'distance', value: 12 },
        { t: 2000, input: 'distance', value: 45 },
        { t: 3000, input: 'distance', value: 450 },
      ],
    },
    serial: { baud: 9600, sample: ['30 cm', '30 cm', '12 cm', '45 cm', '0 cm'] },
    runMs: 4000,
    checks: [
      { kind: 'serial', match: '^30 cm$', regex: true, minCount: 5, byMs: 1000, label: 'lessons.distance.checks.1' },
      { kind: 'serial', match: '^12 cm$', regex: true, minCount: 3, label: 'lessons.distance.checks.2' },
      { kind: 'serial', match: '^45 cm$', regex: true, minCount: 3, label: 'lessons.distance.checks.3' },
      { kind: 'serial', match: '^0 cm$', regex: true, minCount: 2, label: 'lessons.distance.checks.4' },
      { kind: 'code', must: ['pulseIn(ECHO, HIGH'], mustNot: [], label: 'lessons.distance.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.distance.pins.5V.to', role: 'lessons.distance.pins.5V.role', color: 'red' },
      { pin: 'GND1', to: 'lessons.distance.pins.GND1.to', role: 'lessons.distance.pins.GND1.role', color: 'black' },
      { pin: 'D9', to: 'lessons.distance.pins.D9.to', role: 'lessons.distance.pins.D9.role', color: 'yellow' },
      { pin: 'D10', to: 'lessons.distance.pins.D10.to', role: 'lessons.distance.pins.D10.role', color: 'green' },
    ],
    callouts: [
      { part: 'US1', text: 'lessons.distance.callouts.US1' },
      { part: 'IOH', text: 'lessons.distance.callouts.IOH' },
      { part: 'POWER', text: 'lessons.distance.callouts.POWER' },
      { part: 'OBST', text: 'lessons.distance.callouts.OBST' },
    ],
    specs: [
      { label: 'lessons.distance.specs.1.label', value: 'lessons.distance.specs.1.value' },
      { label: 'lessons.distance.specs.2.label', value: 'lessons.distance.specs.2.value' },
      { label: 'lessons.distance.specs.3.label', value: 'lessons.distance.specs.3.value' },
      { label: 'lessons.distance.specs.4.label', value: 'lessons.distance.specs.4.value' },
      { label: 'lessons.distance.specs.5.label', value: 'lessons.distance.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.distance.features.1' },
      { icon: 'tip', text: 'lessons.distance.features.2' },
      { icon: 'play', text: 'lessons.distance.features.3' },
    ],
    title: 'lessons.distance.title',
    lede: 'lessons.distance.lede',
    steps: ['lessons.distance.steps.1', 'lessons.distance.steps.2', 'lessons.distance.steps.3', 'lessons.distance.steps.4'],
    hints: ['lessons.distance.hints.1', 'lessons.distance.hints.2', 'lessons.distance.hints.3'],
    quiz: {
      id: 'distance-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.distance.quiz.q1.q',
          options: ['lessons.distance.quiz.q1.options.1', 'lessons.distance.quiz.q1.options.2', 'lessons.distance.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.distance.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.distance.quiz.q2.q',
          options: ['lessons.distance.quiz.q2.options.1', 'lessons.distance.quiz.q2.options.2', 'lessons.distance.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.distance.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'sound',
    n: 8,
    level: 'io',
    language: 'arduino-cpp',
    code: {
      source: `const int BUZZER = 8;
int melody[] = {
{{p:tune}}
};
const int N = sizeof(melody) / sizeof(int);  // {{t:lessons.sound.code.count}}

void setup() {}

void loop() {
  for (int i = 0; i < N; i++) {
    tone(BUZZER, melody[i], {{p:note}});
    delay({{p:note}} + 50);  // {{t:lessons.sound.code.gap}}
  }
  delay(1000);
}
`,
      libraries: [],
    },
    params: [
      {
        id: 'tune',
        kind: 'choice',
        label: 'lessons.sound.params.tune.label',
        default: 'twinkle',
        options: [
          { value: 'scale', code: '  262, 294, 330, 349,\n  392, 440, 494, 523', label: 'lessons.sound.params.tune.scale', note: 'lessons.sound.params.tune.scale-note' },
          {
            value: 'twinkle',
            code: '  262, 262, 392, 392, 440, 440, 392,\n  349, 349, 330, 330, 294, 294, 262',
            label: 'lessons.sound.params.tune.twinkle',
            note: 'lessons.sound.params.tune.twinkle-note',
          },
          {
            value: 'ode',
            code: '  330, 330, 349, 392, 392,\n  349, 330, 294, 262, 262,\n  294, 330, 330, 294, 294',
            label: 'lessons.sound.params.tune.ode',
            note: 'lessons.sound.params.tune.ode-note',
          },
        ],
      },
      { id: 'note', kind: 'number', label: 'lessons.sound.params.note.label', default: 220, min: 80, max: 500, step: 10, unit: 'ms' },
      { id: 'volume', kind: 'number', label: 'lessons.sound.params.volume.label', default: 40, min: 0, max: 100, step: 5, unit: '%', figure: { part: 'BUZ1', key: 'volume' } },
    ],
    circuit: 'sound',
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 5000,
    checks: [
      { kind: 'tone', pin: 'D8', hz: [261, 263], atMs: 100, label: 'lessons.sound.checks.1' },
      { kind: 'tone', pin: 'D8', hz: [391, 393], atMs: 640, label: 'lessons.sound.checks.2' },
      { kind: 'code', must: ['tone(BUZZER'], mustNot: [], label: 'lessons.sound.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D8', to: 'lessons.sound.pins.D8.to', role: 'lessons.sound.pins.D8.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.sound.pins.GND.to', role: 'lessons.sound.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'BUZ1', text: 'lessons.sound.callouts.BUZ1' },
      { part: 'IOH', text: 'lessons.sound.callouts.IOH' },
      { part: 'ZU4', text: 'lessons.sound.callouts.ZU4' },
    ],
    specs: [
      { label: 'lessons.sound.specs.1.label', value: 'lessons.sound.specs.1.value' },
      { label: 'lessons.sound.specs.2.label', value: 'lessons.sound.specs.2.value' },
      { label: 'lessons.sound.specs.3.label', value: 'lessons.sound.specs.3.value' },
      { label: 'lessons.sound.specs.4.label', value: 'lessons.sound.specs.4.value' },
      { label: 'lessons.sound.specs.5.label', value: 'lessons.sound.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.sound.features.1' },
      { icon: 'info', text: 'lessons.sound.features.2' },
      { icon: 'tip', text: 'lessons.sound.features.3' },
    ],
    title: 'lessons.sound.title',
    lede: 'lessons.sound.lede',
    steps: ['lessons.sound.steps.1', 'lessons.sound.steps.2', 'lessons.sound.steps.3', 'lessons.sound.steps.4'],
    hints: ['lessons.sound.hints.1', 'lessons.sound.hints.2'],
    quiz: {
      id: 'sound-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.sound.quiz.q1.q',
          options: ['lessons.sound.quiz.q1.options.1', 'lessons.sound.quiz.q1.options.2', 'lessons.sound.quiz.q1.options.3'],
          answer: 2,
          why: 'lessons.sound.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.sound.quiz.q2.q',
          options: ['lessons.sound.quiz.q2.options.1', 'lessons.sound.quiz.q2.options.2', 'lessons.sound.quiz.q2.options.3'],
          answer: 1,
          why: 'lessons.sound.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'piano',
    n: 9,
    level: 'project',
    language: 'arduino-cpp',
    code: {
      source: `const int BUZZER = 10;
const int KEYS[] = {2, 3, 4, 5, 6, 7, 8, 9};
const int NOTES[] = {{p:octave}}
const char* NAMES[] = {{p:names}}
int playing = -1;  // {{t:lessons.piano.code.playing}}

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 8; i++) {
    pinMode(KEYS[i], INPUT_PULLUP);  // {{t:lessons.piano.code.pullup}}
  }
}

void loop() {
  int pressed = -1;
  for (int i = 0; i < 8; i++) {
    if (digitalRead(KEYS[i]) == LOW) pressed = i;  // {{t:lessons.piano.code.down}}
  }
  if (pressed != playing) {
    playing = pressed;
    if (playing >= 0) {
      tone(BUZZER, NOTES[playing]);
      Serial.println(NAMES[playing]);
    } else {
      noTone(BUZZER);
    }
  }
}
`,
      libraries: [],
    },
    params: [
      {
        id: 'octave',
        kind: 'choice',
        label: 'lessons.piano.params.octave.label',
        default: 'c4',
        options: [
          { value: 'c4', code: '{262, 294, 330, 349, 392, 440, 494, 523};  // C4-C5', label: 'lessons.piano.params.octave.c4' },
          { value: 'c5', code: '{523, 587, 659, 698, 784, 880, 988, 1047};  // C5-C6', label: 'lessons.piano.params.octave.c5', note: 'lessons.piano.params.octave.c5-note' },
        ],
      },
      {
        id: 'names',
        kind: 'choice',
        label: 'lessons.piano.params.names.label',
        default: 'solfege',
        options: [
          { value: 'solfege', code: '{"Do", "Re", "Mi", "Fa", "Sol", "La", "Si", "Do"};', label: 'lessons.piano.params.names.solfege' },
          { value: 'letters', code: '{"C", "D", "E", "F", "G", "A", "B", "C"};', label: 'lessons.piano.params.names.letters' },
        ],
      },
    ],
    circuit: 'piano',
    world: {
      inputs: [
        { id: 'key1', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D2'], part: 'KEY1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key1' },
        { id: 'key2', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D3'], part: 'KEY2', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key2' },
        { id: 'key3', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D4'], part: 'KEY3', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key3' },
        { id: 'key4', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D5'], part: 'KEY4', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key4' },
        { id: 'key5', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D6'], part: 'KEY5', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key5' },
        { id: 'key6', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D7'], part: 'KEY6', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key6' },
        { id: 'key7', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D8'], part: 'KEY7', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key7' },
        { id: 'key8', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['D9'], part: 'KEY8', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.piano.world.key8' },
      ],
      script: [
        { t: 300, input: 'key5', value: 1 },
        { t: 700, input: 'key5', value: 0 },
        { t: 1000, input: 'key1', value: 1 },
        { t: 1400, input: 'key1', value: 0 },
      ],
    },
    serial: { baud: 9600, sample: ['Sol', 'Do'] },
    runMs: 2000,
    checks: [
      { kind: 'serial', match: '^(Sol|G)$', regex: true, minCount: 1, label: 'lessons.piano.checks.1' },
      { kind: 'tone', pin: 'D10', hz: [391, 393], atMs: 500, label: 'lessons.piano.checks.2' },
      { kind: 'serial', match: '^(Do|C)$', regex: true, minCount: 1, label: 'lessons.piano.checks.3' },
      { kind: 'tone', pin: 'D10', hz: [261, 263], atMs: 1200, label: 'lessons.piano.checks.4' },
      { kind: 'code', must: ['INPUT_PULLUP', 'noTone(BUZZER)'], mustNot: [], label: 'lessons.piano.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: 'D2-D9', to: 'lessons.piano.pins.D2-D9.to', role: 'lessons.piano.pins.D2-D9.role', color: 'yellow' },
      { pin: 'D10', to: 'lessons.piano.pins.D10.to', role: 'lessons.piano.pins.D10.role', color: 'brown' },
      { pin: 'GND', to: 'lessons.piano.pins.GND.to', role: 'lessons.piano.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'KEY1', text: 'lessons.piano.callouts.KEY1' },
      { part: 'BUZ1', text: 'lessons.piano.callouts.BUZ1' },
      { part: 'IOL', text: 'lessons.piano.callouts.IOL' },
    ],
    specs: [
      { label: 'lessons.piano.specs.1.label', value: 'lessons.piano.specs.1.value' },
      { label: 'lessons.piano.specs.2.label', value: 'lessons.piano.specs.2.value' },
      { label: 'lessons.piano.specs.3.label', value: 'lessons.piano.specs.3.value' },
      { label: 'lessons.piano.specs.4.label', value: 'lessons.piano.specs.4.value' },
      { label: 'lessons.piano.specs.5.label', value: 'lessons.piano.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.piano.features.1' },
      { icon: 'tip', text: 'lessons.piano.features.2' },
      { icon: 'info', text: 'lessons.piano.features.3' },
    ],
    title: 'lessons.piano.title',
    lede: 'lessons.piano.lede',
    steps: ['lessons.piano.steps.1', 'lessons.piano.steps.2', 'lessons.piano.steps.3', 'lessons.piano.steps.4'],
    hints: ['lessons.piano.hints.1', 'lessons.piano.hints.2'],
    quiz: {
      id: 'piano-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.piano.quiz.q1.q',
          options: ['lessons.piano.quiz.q1.options.1', 'lessons.piano.quiz.q1.options.2', 'lessons.piano.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.piano.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.piano.quiz.q2.q',
          options: ['lessons.piano.quiz.q2.options.1', 'lessons.piano.quiz.q2.options.2', 'lessons.piano.quiz.q2.options.3'],
          answer: 2,
          why: 'lessons.piano.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'motor',
    n: 10,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `const int MOTOR = 6;  // {{t:lessons.motor.code.pin}}

void setup() {
  pinMode(MOTOR, OUTPUT);
}

void loop() {
  for (int s = 0; s <= {{p:top}}; s += {{p:step}}) {
    analogWrite(MOTOR, s);  // {{t:lessons.motor.code.speed}}
    delay(40);
  }
  delay(1500);
  analogWrite(MOTOR, 0);
  delay(1500);
}
`,
      libraries: [],
    },
    params: [
      { id: 'top', kind: 'number', label: 'lessons.motor.params.top.label', default: 255, min: 50, max: 255, step: 5 },
      { id: 'step', kind: 'number', label: 'lessons.motor.params.step.label', default: 5, min: 1, max: 25, step: 1 },
    ],
    circuit: 'motor',
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 4500,
    checks: [
      { kind: 'pwm', pin: 'D6', duty: [0.45, 0.53], atMs: 1000, label: 'lessons.motor.checks.1' },
      { kind: 'pin-level', pin: 'D6', level: 1, atMs: 2600, label: 'lessons.motor.checks.2' },
      { kind: 'pin-level', pin: 'D6', level: 0, atMs: 4000, label: 'lessons.motor.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D6', to: 'lessons.motor.pins.D6.to', role: 'lessons.motor.pins.D6.role', color: 'orange' },
      { pin: '5V', to: 'lessons.motor.pins.5V.to', role: 'lessons.motor.pins.5V.role', color: 'red' },
      { pin: 'GND', to: 'lessons.motor.pins.GND.to', role: 'lessons.motor.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'Q1', text: 'lessons.motor.callouts.Q1' },
      { part: 'RES1', text: 'lessons.motor.callouts.RES1' },
      { part: 'DIO1', text: 'lessons.motor.callouts.DIO1' },
      { part: 'MOT1', text: 'lessons.motor.callouts.MOT1' },
    ],
    specs: [
      { label: 'lessons.motor.specs.1.label', value: 'lessons.motor.specs.1.value' },
      { label: 'lessons.motor.specs.2.label', value: 'lessons.motor.specs.2.value' },
      { label: 'lessons.motor.specs.3.label', value: 'lessons.motor.specs.3.value' },
      { label: 'lessons.motor.specs.4.label', value: 'lessons.motor.specs.4.value' },
      { label: 'lessons.motor.specs.5.label', value: 'lessons.motor.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.motor.features.1' },
      { icon: 'info', text: 'lessons.motor.features.2' },
      { icon: 'warn', text: 'lessons.motor.features.3' },
    ],
    title: 'lessons.motor.title',
    lede: 'lessons.motor.lede',
    steps: ['lessons.motor.steps.1', 'lessons.motor.steps.2', 'lessons.motor.steps.3', 'lessons.motor.steps.4'],
    hints: ['lessons.motor.hints.1', 'lessons.motor.hints.2'],
    quiz: {
      id: 'motor-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.motor.quiz.q1.q',
          options: ['lessons.motor.quiz.q1.options.1', 'lessons.motor.quiz.q1.options.2', 'lessons.motor.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.motor.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.motor.quiz.q2.q',
          options: ['lessons.motor.quiz.q2.options.1', 'lessons.motor.quiz.q2.options.2', 'lessons.motor.quiz.q2.options.3'],
          answer: 2,
          why: 'lessons.motor.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'heat',
    n: 11,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `const int SENSOR = A0;
const int FAN = 6;                // {{t:lessons.heat.code.fan}}
const float LIMIT = {{p:limit}};  // {{t:lessons.heat.code.limit}}

void setup() {
  Serial.begin(9600);
  pinMode(FAN, OUTPUT);
}

void loop() {
  int raw = analogRead(SENSOR);
  float volts = raw * 5.0 / 1023.0;    // {{t:lessons.heat.code.volts}}
  float tempC = (volts - 0.5) * 100.0;  // {{t:lessons.heat.code.degrees}}
  Serial.println(tempC);

{{p:mode}}
  delay(200);
}
`,
      libraries: [],
    },
    params: [
      { id: 'limit', kind: 'number', label: 'lessons.heat.params.limit.label', default: 30, min: 24, max: 45, step: 1, unit: '°C' },
      {
        id: 'mode',
        kind: 'choice',
        label: 'lessons.heat.params.mode.label',
        default: 'onoff',
        options: [
          {
            value: 'onoff',
            code: '  if (tempC > LIMIT) {\n    analogWrite(FAN, 255);\n  } else {\n    analogWrite(FAN, 0);\n  }',
            label: 'lessons.heat.params.mode.onoff',
            note: 'lessons.heat.params.mode.onoff-note',
          },
          {
            value: 'ramp',
            code: '  int speed = (tempC - LIMIT) * 32;\n  analogWrite(FAN, constrain(speed, 0, 255));',
            label: 'lessons.heat.params.mode.ramp',
            note: 'lessons.heat.params.mode.ramp-note',
          },
        ],
      },
    ],
    circuit: 'heat',
    world: {
      inputs: [
        {
          id: 'temp',
          quantity: 'temperature-c',
          device: { kind: 'tmp36' },
          pins: ['A0'],
          part: 'DRYER',
          min: -40,
          max: 125,
          step: 0.5,
          default: 22,
          unit: '°C',
          gesture: 'drag',
          label: 'lessons.heat.world.temp',
        },
      ],
      script: [
        { t: 1000, input: 'temp', value: 34 },
        { t: 2500, input: 'temp', value: 26 },
      ],
    },
    serial: { baud: 9600, sample: ['21.85', '21.85', '34.07', '25.76'] },
    runMs: 3200,
    checks: [
      { kind: 'serial', match: '^21\\.8\\d$', regex: true, minCount: 3, byMs: 1000, label: 'lessons.heat.checks.1' },
      { kind: 'pin-level', pin: 'D6', level: 0, atMs: 800, label: 'lessons.heat.checks.2' },
      { kind: 'pin-level', pin: 'D6', level: 1, atMs: 1600, label: 'lessons.heat.checks.3' },
      { kind: 'pin-level', pin: 'D6', level: 0, atMs: 3000, label: 'lessons.heat.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.heat.pins.5V.to', role: 'lessons.heat.pins.5V.role', color: 'red' },
      { pin: 'A0', to: 'lessons.heat.pins.A0.to', role: 'lessons.heat.pins.A0.role', color: 'green' },
      { pin: 'GND1', to: 'lessons.heat.pins.GND1.to', role: 'lessons.heat.pins.GND1.role', color: 'black' },
      { pin: 'D6', to: 'lessons.heat.pins.D6.to', role: 'lessons.heat.pins.D6.role', color: 'orange' },
    ],
    callouts: [
      { part: 'TMP1', text: 'lessons.heat.callouts.TMP1' },
      { part: 'FAN1', text: 'lessons.heat.callouts.FAN1' },
      { part: 'Q1', text: 'lessons.heat.callouts.Q1' },
      { part: 'DRYER', text: 'lessons.heat.callouts.DRYER' },
    ],
    specs: [
      { label: 'lessons.heat.specs.1.label', value: 'lessons.heat.specs.1.value' },
      { label: 'lessons.heat.specs.2.label', value: 'lessons.heat.specs.2.value' },
      { label: 'lessons.heat.specs.3.label', value: 'lessons.heat.specs.3.value' },
      { label: 'lessons.heat.specs.4.label', value: 'lessons.heat.specs.4.value' },
      { label: 'lessons.heat.specs.5.label', value: 'lessons.heat.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.heat.features.1' },
      { icon: 'play', text: 'lessons.heat.features.2' },
      { icon: 'tip', text: 'lessons.heat.features.3' },
    ],
    title: 'lessons.heat.title',
    lede: 'lessons.heat.lede',
    steps: ['lessons.heat.steps.1', 'lessons.heat.steps.2', 'lessons.heat.steps.3', 'lessons.heat.steps.4'],
    hints: ['lessons.heat.hints.1', 'lessons.heat.hints.2'],
    quiz: {
      id: 'heat-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.heat.quiz.q1.q',
          options: ['lessons.heat.quiz.q1.options.1', 'lessons.heat.quiz.q1.options.2', 'lessons.heat.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.heat.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.heat.quiz.q2.q',
          options: ['lessons.heat.quiz.q2.options.1', 'lessons.heat.quiz.q2.options.2', 'lessons.heat.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.heat.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'servo',
    n: 12,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `#include <Servo.h>
Servo arm;

void setup() {
  arm.attach(9);  // {{t:lessons.servo.code.attach}}
}

void loop() {
  for (int a = {{p:from}}; a <= {{p:to}}; a++) {
    arm.write(a);  // {{t:lessons.servo.code.write}}
    delay({{p:wait}});
  }
  for (int a = {{p:to}}; a >= {{p:from}}; a--) {
    arm.write(a);
    delay({{p:wait}});
  }
}
`,
      libraries: ['Servo'],
    },
    params: [
      { id: 'from', kind: 'number', label: 'lessons.servo.params.from.label', default: 0, min: 0, max: 175, step: 5, unit: '°', keepApart: { param: 'to', op: '<', gap: 5 } },
      { id: 'to', kind: 'number', label: 'lessons.servo.params.to.label', default: 180, min: 5, max: 180, step: 5, unit: '°', keepApart: { param: 'from', op: '>', gap: 5 } },
      { id: 'wait', kind: 'number', label: 'lessons.servo.params.wait.label', default: 12, min: 2, max: 40, step: 1, unit: 'ms' },
    ],
    circuit: 'servo',
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 4400,
    checks: [
      { kind: 'servo', pin: 'D9', deg: [80, 100], atMs: 1100, label: 'lessons.servo.checks.1' },
      { kind: 'servo', pin: 'D9', deg: [170, 180], atMs: 2150, label: 'lessons.servo.checks.2' },
      { kind: 'servo', pin: 'D9', deg: [80, 100], atMs: 3260, label: 'lessons.servo.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'GND2', to: 'lessons.servo.pins.GND2.to', role: 'lessons.servo.pins.GND2.role', color: 'brown' },
      { pin: '5V', to: 'lessons.servo.pins.5V.to', role: 'lessons.servo.pins.5V.role', color: 'red' },
      { pin: 'D9', to: 'lessons.servo.pins.D9.to', role: 'lessons.servo.pins.D9.role', color: 'orange' },
    ],
    callouts: [
      { part: 'SRV1', text: 'lessons.servo.callouts.SRV1' },
      { part: 'IOH', text: 'lessons.servo.callouts.IOH' },
      { part: 'POWER', text: 'lessons.servo.callouts.POWER' },
    ],
    specs: [
      { label: 'lessons.servo.specs.1.label', value: 'lessons.servo.specs.1.value' },
      { label: 'lessons.servo.specs.2.label', value: 'lessons.servo.specs.2.value' },
      { label: 'lessons.servo.specs.3.label', value: 'lessons.servo.specs.3.value' },
      { label: 'lessons.servo.specs.4.label', value: 'lessons.servo.specs.4.value' },
      { label: 'lessons.servo.specs.5.label', value: 'lessons.servo.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.servo.features.1' },
      { icon: 'info', text: 'lessons.servo.features.2' },
      { icon: 'tip', text: 'lessons.servo.features.3' },
    ],
    title: 'lessons.servo.title',
    lede: 'lessons.servo.lede',
    steps: ['lessons.servo.steps.1', 'lessons.servo.steps.2', 'lessons.servo.steps.3', 'lessons.servo.steps.4'],
    hints: ['lessons.servo.hints.1', 'lessons.servo.hints.2'],
    quiz: {
      id: 'servo-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.servo.quiz.q1.q',
          options: ['lessons.servo.quiz.q1.options.1', 'lessons.servo.quiz.q1.options.2', 'lessons.servo.quiz.q1.options.3'],
          answer: 2,
          why: 'lessons.servo.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.servo.quiz.q2.q',
          options: ['lessons.servo.quiz.q2.options.1', 'lessons.servo.quiz.q2.options.2', 'lessons.servo.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.servo.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'stepper',
    n: 13,
    level: 'project',
    language: 'arduino-cpp',
    code: {
      source: `#include <AccelStepper.h>

const float STEPS = 2037.8864;  // {{t:lessons.stepper.code.steps}}
const int SEGMENTS = 8;
const int BUTTON = 2;
const int DIR = {{p:dir}};  // {{t:lessons.stepper.code.dir}}
// {{t:lessons.stepper.code.pins}}
AccelStepper wheel(AccelStepper::FULL4WIRE, 8, 10, 9, 11);

const char* PRIZES[] = {"50", "100", "200", "AGAIN",
                        "500", "x2", "1000", "JACKPOT"};
int at = 0;       // {{t:lessons.stepper.code.at}}
long moved = 0;   // {{t:lessons.stepper.code.moved}}

void setup() {
  pinMode(BUTTON, INPUT);
  wheel.setMaxSpeed({{p:rpm}} * STEPS / 60.0);  // {{t:lessons.stepper.code.speed}}
  wheel.setAcceleration({{p:accel}});
  Serial.begin(9600);
  randomSeed(analogRead(A0));
  Serial.println("{{t:lessons.stepper.code.press}}");
}

void loop() {
  if (digitalRead(BUTTON) == HIGH) {
    int prize = random(SEGMENTS);
    int ahead = DIR > 0 ? (prize - at + SEGMENTS) % SEGMENTS : (at - prize + SEGMENTS) % SEGMENTS;
    moved += {{p:turns}} * SEGMENTS + ahead;
    // {{t:lessons.stepper.code.target}}
    long target = round(moved * STEPS / SEGMENTS);
    wheel.moveTo(DIR * target);
    wheel.runToPosition();  // {{t:lessons.stepper.code.run}}
    at = prize;
    Serial.print("{{t:lessons.stepper.code.landed}} ");
    Serial.println(PRIZES[at]);
  }
}
`,
      libraries: ['AccelStepper'],
    },
    params: [
      { id: 'rpm', kind: 'number', label: 'lessons.stepper.params.rpm.label', default: 15, min: 6, max: 28, step: 1, unit: 'RPM' },
      { id: 'accel', kind: 'number', label: 'lessons.stepper.params.accel.label', default: 1200, min: 200, max: 3000, step: 100, unit: 'steps/s²' },
      { id: 'turns', kind: 'number', label: 'lessons.stepper.params.turns.label', default: 1, min: 0, max: 3, step: 1 },
      {
        id: 'dir',
        kind: 'choice',
        label: 'lessons.stepper.params.dir.label',
        default: 'cw',
        options: [
          { value: 'cw', code: '1', label: 'lessons.stepper.params.dir.cw' },
          { value: 'ccw', code: '-1', label: 'lessons.stepper.params.dir.ccw' },
        ],
      },
    ],
    circuit: 'stepper',
    world: {
      inputs: [
        {
          id: 'button',
          quantity: 'button',
          device: { kind: 'button', pull: 'external-down', bounceMs: 5 },
          pins: ['D2'],
          part: 'BTN1',
          min: 0,
          max: 1,
          step: 1,
          default: 0,
          gesture: 'press',
          label: 'lessons.stepper.world.button',
        },
      ],
      script: [
        { t: 500, input: 'button', value: 1 },
        { t: 700, input: 'button', value: 0 },
      ],
    },
    serial: { baud: 9600, sample: ['Press the button to spin the wheel!'] },
    runMs: 10000,
    checks: [
      { kind: 'serial', match: '(50|100|200|AGAIN|500|x2|1000|JACKPOT)$', regex: true, minCount: 1, label: 'lessons.stepper.checks.1' },
      { kind: 'pin-toggles', pin: 'D8', periodMs: [1, 60], minCycles: 50, label: 'lessons.stepper.checks.2' },
      { kind: 'code', must: ['AccelStepper::FULL4WIRE, 8, 10, 9, 11'], mustNot: [], label: 'lessons.stepper.checks.3' },
    ],
    variants: [],
    pins: [
      { pin: 'D8-D11', to: 'lessons.stepper.pins.D8-D11.to', role: 'lessons.stepper.pins.D8-D11.role', color: 'orange' },
      { pin: '5V', to: 'lessons.stepper.pins.5V.to', role: 'lessons.stepper.pins.5V.role', color: 'red' },
      { pin: 'D2', to: 'lessons.stepper.pins.D2.to', role: 'lessons.stepper.pins.D2.role', color: 'blue' },
    ],
    callouts: [
      { part: 'STP1', text: 'lessons.stepper.callouts.STP1' },
      { part: 'DRV1', text: 'lessons.stepper.callouts.DRV1' },
      { part: 'BTN1', text: 'lessons.stepper.callouts.BTN1' },
      { part: 'WHEEL', text: 'lessons.stepper.callouts.WHEEL' },
    ],
    specs: [
      { label: 'lessons.stepper.specs.1.label', value: 'lessons.stepper.specs.1.value' },
      { label: 'lessons.stepper.specs.2.label', value: 'lessons.stepper.specs.2.value' },
      { label: 'lessons.stepper.specs.3.label', value: 'lessons.stepper.specs.3.value' },
      { label: 'lessons.stepper.specs.4.label', value: 'lessons.stepper.specs.4.value' },
      { label: 'lessons.stepper.specs.5.label', value: 'lessons.stepper.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.stepper.features.1' },
      { icon: 'tip', text: 'lessons.stepper.features.2' },
      { icon: 'play', text: 'lessons.stepper.features.3' },
    ],
    title: 'lessons.stepper.title',
    lede: 'lessons.stepper.lede',
    steps: ['lessons.stepper.steps.1', 'lessons.stepper.steps.2', 'lessons.stepper.steps.3', 'lessons.stepper.steps.4'],
    hints: ['lessons.stepper.hints.1', 'lessons.stepper.hints.2', 'lessons.stepper.hints.3'],
    quiz: {
      id: 'stepper-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.stepper.quiz.q1.q',
          options: ['lessons.stepper.quiz.q1.options.1', 'lessons.stepper.quiz.q1.options.2', 'lessons.stepper.quiz.q1.options.3'],
          answer: 1,
          why: 'lessons.stepper.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.stepper.quiz.q2.q',
          options: ['lessons.stepper.quiz.q2.options.1', 'lessons.stepper.quiz.q2.options.2', 'lessons.stepper.quiz.q2.options.3'],
          answer: 0,
          why: 'lessons.stepper.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'plant',
    n: 14,
    level: 'protocol',
    language: 'arduino-cpp',
    code: {
      source: `#include <Wire.h>
#include <Adafruit_SSD1306.h>

const int SENSOR = A0;
const int DRY = {{p:dry}};  // {{t:lessons.plant.code.dry}}
const int WET = {{p:wet}};  // {{t:lessons.plant.code.wet}}
Adafruit_SSD1306 screen(128, 64, &Wire);

void setup() {
  Serial.begin(9600);
  screen.begin(SSD1306_SWITCHCAPVCC, 0x3C);  // {{t:lessons.plant.code.address}}
  screen.setTextColor(SSD1306_WHITE);
}

void loop() {
  int raw = analogRead(SENSOR);
  int moisture = map(raw, DRY, WET, 0, 100);  // {{t:lessons.plant.code.map}}
  moisture = constrain(moisture, 0, 100);
  Serial.println(moisture);

  screen.clearDisplay();
  screen.setTextSize(3);
  screen.setCursor(0, 0);
  screen.print(moisture);
  screen.print("%");
  screen.drawRect(0, 28, 128, 8, SSD1306_WHITE);
  screen.fillRect(0, 28, moisture * 128 / 100, 8, SSD1306_WHITE);

  // {{t:lessons.plant.code.font}}
  screen.setTextSize(2);
  screen.setCursor(0, 46);
  if (moisture < {{p:thirsty}}) {
    screen.print("Water me!");
  } else if (moisture > {{p:soggy}}) {
    screen.print("Too wet!");
  } else {
    screen.print("Happy :)");
  }
  screen.display();
  delay(500);
}
`,
      libraries: ['Wire', 'Adafruit_SSD1306'],
    },
    params: [
      { id: 'dry', kind: 'number', label: 'lessons.plant.params.dry.label', default: 520, min: 400, max: 700, step: 10, keepApart: { param: 'wet', op: '>', gap: 20 } },
      { id: 'wet', kind: 'number', label: 'lessons.plant.params.wet.label', default: 260, min: 150, max: 400, step: 10, keepApart: { param: 'dry', op: '<', gap: 20 } },
      { id: 'thirsty', kind: 'number', label: 'lessons.plant.params.thirsty.label', default: 30, min: 10, max: 50, step: 5, unit: '%' },
      { id: 'soggy', kind: 'number', label: 'lessons.plant.params.soggy.label', default: 85, min: 60, max: 95, step: 5, unit: '%' },
    ],
    circuit: 'plant',
    world: {
      inputs: [
        {
          id: 'soil',
          quantity: 'moisture-pct',
          device: { kind: 'linear', voltsAtMin: 2.54, voltsAtMax: 1.27 },
          pins: ['A0'],
          part: 'SOIL1',
          min: 0,
          max: 100,
          step: 1,
          default: 40,
          unit: '%',
          gesture: 'press',
          label: 'lessons.plant.world.soil',
        },
      ],
      script: [
        { t: 1500, input: 'soil', value: 20 },
        { t: 3000, input: 'soil', value: 90 },
      ],
    },
    serial: { baud: 9600, sample: ['40', '40', '40', '20', '20', '20', '90', '90'] },
    runMs: 4000,
    checks: [
      { kind: 'serial', match: '^40$', regex: true, minCount: 2, byMs: 1400, label: 'lessons.plant.checks.1' },
      { kind: 'serial', match: '^20$', regex: true, minCount: 2, label: 'lessons.plant.checks.2' },
      { kind: 'serial', match: '^90$', regex: true, minCount: 1, label: 'lessons.plant.checks.3' },
      { kind: 'code', must: ['screen.begin(SSD1306_SWITCHCAPVCC, 0x3C)', 'screen.display()'], mustNot: [], label: 'lessons.plant.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.plant.pins.5V.to', role: 'lessons.plant.pins.5V.role', color: 'red' },
      { pin: 'A0', to: 'lessons.plant.pins.A0.to', role: 'lessons.plant.pins.A0.role', color: 'yellow' },
      { pin: '3V3', to: 'lessons.plant.pins.3V3.to', role: 'lessons.plant.pins.3V3.role', color: 'orange' },
      { pin: 'SCL-SDA', to: 'lessons.plant.pins.SCL-SDA.to', role: 'lessons.plant.pins.SCL-SDA.role', color: 'blue' },
    ],
    callouts: [
      { part: 'OLED1', text: 'lessons.plant.callouts.OLED1' },
      { part: 'SOIL1', text: 'lessons.plant.callouts.SOIL1' },
      { part: 'CAN', text: 'lessons.plant.callouts.CAN' },
      { part: 'AD', text: 'lessons.plant.callouts.AD' },
    ],
    specs: [
      { label: 'lessons.plant.specs.1.label', value: 'lessons.plant.specs.1.value' },
      { label: 'lessons.plant.specs.2.label', value: 'lessons.plant.specs.2.value' },
      { label: 'lessons.plant.specs.3.label', value: 'lessons.plant.specs.3.value' },
      { label: 'lessons.plant.specs.4.label', value: 'lessons.plant.specs.4.value' },
      { label: 'lessons.plant.specs.5.label', value: 'lessons.plant.specs.5.value' },
    ],
    features: [
      { icon: 'info', text: 'lessons.plant.features.1' },
      { icon: 'board', text: 'lessons.plant.features.2' },
      { icon: 'play', text: 'lessons.plant.features.3' },
    ],
    title: 'lessons.plant.title',
    lede: 'lessons.plant.lede',
    steps: ['lessons.plant.steps.1', 'lessons.plant.steps.2', 'lessons.plant.steps.3', 'lessons.plant.steps.4', 'lessons.plant.steps.5'],
    hints: ['lessons.plant.hints.1', 'lessons.plant.hints.2'],
    quiz: {
      id: 'plant-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.plant.quiz.q1.q',
          options: ['lessons.plant.quiz.q1.options.1', 'lessons.plant.quiz.q1.options.2', 'lessons.plant.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.plant.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.plant.quiz.q2.q',
          options: ['lessons.plant.quiz.q2.options.1', 'lessons.plant.quiz.q2.options.2', 'lessons.plant.quiz.q2.options.3'],
          answer: 1,
          why: 'lessons.plant.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'force',
    n: 15,
    level: 'project',
    language: 'arduino-cpp',
    code: {
      source: `#include <Servo.h>

const int FSR = A0;
const int BELL = 8;
const long PULLDOWN = {{p:pulldown}};  // {{t:lessons.force.code.pulldown}}
Servo needle;

int best = 0;              // {{t:lessons.force.code.best}}
unsigned long bestAt = 0;  // {{t:lessons.force.code.bestAt}}
bool rung = false;

void setup() {
  needle.attach(9);
  Serial.begin(9600);
}

void loop() {
  int force = analogRead(FSR);  // {{t:lessons.force.code.read}}

  // {{t:lessons.force.code.hold}}
  if (force >= best || millis() - bestAt > {{p:hold}}) {
    best = force;
    bestAt = millis();
  }
  needle.write(map(best, 0, 1023, 0, 180));

  if (best > {{p:bell}} && !rung) {
    tone(BELL, 1568, 400);  // {{t:lessons.force.code.ding}}
    rung = true;
  } else if (best < {{p:bell}} - 100) {
    rung = false;
  }

  if (force > 10) {
    // {{t:lessons.force.code.ohms}}
    long ohms = PULLDOWN * (1023L - force) / force;
    Serial.print(force);
    Serial.print("  ");
    Serial.print(ohms);
    Serial.println(" ohms");
  }
  delay(20);
}
`,
      libraries: ['Servo'],
    },
    params: [
      {
        id: 'pulldown',
        kind: 'choice',
        label: 'lessons.force.params.pulldown.label',
        default: '10000',
        options: [
          { value: '1000', code: '1000', figureValue: 1000, label: 'lessons.force.params.pulldown.1000', note: 'lessons.force.params.pulldown.1000-note' },
          { value: '10000', code: '10000', figureValue: 10000, label: 'lessons.force.params.pulldown.10000', note: 'lessons.force.params.pulldown.10000-note' },
          { value: '100000', code: '100000', figureValue: 100000, label: 'lessons.force.params.pulldown.100000', note: 'lessons.force.params.pulldown.100000-note' },
        ],
        figure: { part: 'RES1', key: 'ohms' },
      },
      { id: 'hold', kind: 'number', label: 'lessons.force.params.hold.label', default: 1500, min: 0, max: 3000, step: 250, unit: 'ms' },
      { id: 'bell', kind: 'number', label: 'lessons.force.params.bell.label', default: 880, min: 500, max: 1000, step: 10 },
    ],
    circuit: 'force',
    world: {
      inputs: [
        {
          id: 'force',
          quantity: 'force-n',
          device: { kind: 'divider', sensor: 'fsr', fixedOhms: 10000, sensorTo: 'vcc' },
          pins: ['A0'],
          part: 'FSR1',
          min: 0,
          max: 50,
          step: 0.1,
          default: 0,
          unit: 'N',
          gesture: 'squeeze',
          label: 'lessons.force.world.force',
        },
      ],
      script: [
        { t: 500, input: 'force', value: 2 },
        { t: 1500, input: 'force', value: 20 },
        { t: 2500, input: 'force', value: 0 },
      ],
    },
    serial: { baud: 9600, sample: ['682  5000 ohms', '682  5000 ohms', '974  503 ohms'] },
    runMs: 4500,
    checks: [
      { kind: 'serial', match: '^682  5000 ohms$', regex: true, minCount: 3, byMs: 1500, label: 'lessons.force.checks.1' },
      { kind: 'servo', pin: 'D9', deg: [115, 125], atMs: 1400, label: 'lessons.force.checks.2' },
      { kind: 'tone', pin: 'D8', hz: [1567, 1569], atMs: 1600, label: 'lessons.force.checks.3' },
      { kind: 'servo', pin: 'D9', deg: [165, 180], atMs: 2000, label: 'lessons.force.checks.4' },
      { kind: 'servo', pin: 'D9', deg: [0, 5], atMs: 4300, label: 'lessons.force.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: '5V', to: 'lessons.force.pins.5V.to', role: 'lessons.force.pins.5V.role', color: 'red' },
      { pin: 'A0', to: 'lessons.force.pins.A0.to', role: 'lessons.force.pins.A0.role', color: 'green' },
      { pin: 'GND1', to: 'lessons.force.pins.GND1.to', role: 'lessons.force.pins.GND1.role', color: 'black' },
      { pin: 'D9', to: 'lessons.force.pins.D9.to', role: 'lessons.force.pins.D9.role', color: 'orange' },
      { pin: 'D8', to: 'lessons.force.pins.D8.to', role: 'lessons.force.pins.D8.role', color: 'purple' },
    ],
    callouts: [
      { part: 'METER', text: 'lessons.force.callouts.METER' },
      { part: 'BUZ1', text: 'lessons.force.callouts.BUZ1' },
      { part: 'FSR1', text: 'lessons.force.callouts.FSR1' },
      { part: 'WEIGHTS', text: 'lessons.force.callouts.WEIGHTS' },
      { part: 'AD', text: 'lessons.force.callouts.AD' },
    ],
    specs: [
      { label: 'lessons.force.specs.1.label', value: 'lessons.force.specs.1.value' },
      { label: 'lessons.force.specs.2.label', value: 'lessons.force.specs.2.value' },
      { label: 'lessons.force.specs.3.label', value: 'lessons.force.specs.3.value' },
      { label: 'lessons.force.specs.4.label', value: 'lessons.force.specs.4.value' },
      { label: 'lessons.force.specs.5.label', value: 'lessons.force.specs.5.value' },
    ],
    features: [
      { icon: 'play', text: 'lessons.force.features.1' },
      { icon: 'info', text: 'lessons.force.features.2' },
      { icon: 'tip', text: 'lessons.force.features.3' },
      { icon: 'check', text: 'lessons.force.features.4' },
    ],
    title: 'lessons.force.title',
    lede: 'lessons.force.lede',
    steps: ['lessons.force.steps.1', 'lessons.force.steps.2', 'lessons.force.steps.3', 'lessons.force.steps.4'],
    hints: ['lessons.force.hints.1', 'lessons.force.hints.2'],
    quiz: {
      id: 'force-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.force.quiz.q1.q',
          options: ['lessons.force.quiz.q1.options.1', 'lessons.force.quiz.q1.options.2', 'lessons.force.quiz.q1.options.3'],
          answer: 2,
          why: 'lessons.force.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.force.quiz.q2.q',
          options: ['lessons.force.quiz.q2.options.1', 'lessons.force.quiz.q2.options.2', 'lessons.force.quiz.q2.options.3'],
          answer: 1,
          why: 'lessons.force.quiz.q2.why',
        },
      ],
    },
  },
  {
    id: 'parking',
    n: 16,
    level: 'project',
    language: 'arduino-cpp',
    code: {
      source: `const int TRIG = 9, ECHO = 10;
const int RED = 4, YLW = 3, GRN = 2;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  for (int p = 2; p <= 4; p++)
    pinMode(p, OUTPUT);
}

void loop() {
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long cm = pulseIn(ECHO, HIGH, 30000) / 58;  // {{t:lessons.parking.code.noecho}}
  Serial.print(cm);
  Serial.println(" cm");

  // {{t:lessons.parking.code.lights}}
  digitalWrite(GRN, cm > {{p:far}});
  digitalWrite(YLW, cm > {{p:near}} && cm <= {{p:far}});
  digitalWrite(RED, cm <= {{p:near}});
  delay(60);
}
`,
      libraries: [],
    },
    params: [
      { id: 'far', kind: 'number', label: 'lessons.parking.params.far.label', default: 30, min: 10, max: 50, step: 1, unit: 'cm', keepApart: { param: 'near', op: '>', gap: 1 } },
      { id: 'near', kind: 'number', label: 'lessons.parking.params.near.label', default: 15, min: 3, max: 45, step: 1, unit: 'cm', keepApart: { param: 'far', op: '<', gap: 1 } },
      {
        id: 'obstacle',
        kind: 'choice',
        label: 'lessons.distance.params.obstacle.label',
        default: 'car',
        options: [
          { value: 'car', code: 'car', figureValue: 'car', label: 'lessons.distance.params.obstacle.car', note: 'lessons.distance.params.obstacle.car-note' },
          { value: 'box', code: 'box', figureValue: 'box', label: 'lessons.distance.params.obstacle.box', note: 'lessons.distance.params.obstacle.box-note' },
          { value: 'ball', code: 'ball', figureValue: 'ball', label: 'lessons.distance.params.obstacle.ball', note: 'lessons.distance.params.obstacle.ball-note' },
          { value: 'wall', code: 'wall', figureValue: 'wall', label: 'lessons.distance.params.obstacle.wall', note: 'lessons.distance.params.obstacle.wall-note' },
        ],
        figure: { part: 'OBST', key: 'kind' },
      },
    ],
    circuit: 'parking',
    world: {
      inputs: [
        {
          id: 'distance',
          quantity: 'distance-cm',
          device: { kind: 'hc-sr04' },
          pins: ['D9', 'D10'],
          part: 'OBST',
          min: 2,
          max: 450,
          step: 1,
          default: 40,
          unit: 'cm',
          gesture: 'drag',
          label: 'lessons.parking.world.distance',
        },
      ],
      script: [
        { t: 1000, input: 'distance', value: 20 },
        { t: 2000, input: 'distance', value: 8 },
      ],
    },
    serial: { baud: 9600, sample: ['40 cm', '40 cm', '20 cm', '8 cm'] },
    runMs: 3000,
    checks: [
      { kind: 'pin-level', pin: 'D2', level: 1, atMs: 800, label: 'lessons.parking.checks.1' },
      { kind: 'pin-level', pin: 'D3', level: 1, atMs: 1800, label: 'lessons.parking.checks.2' },
      { kind: 'pin-level', pin: 'D4', level: 1, atMs: 2800, label: 'lessons.parking.checks.3' },
      { kind: 'pin-level', pin: 'D2', level: 0, atMs: 2800, label: 'lessons.parking.checks.4' },
      { kind: 'serial', match: '^40 cm$', regex: true, minCount: 3, label: 'lessons.parking.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: '5V-GND', to: 'lessons.parking.pins.5V-GND.to', role: 'lessons.parking.pins.5V-GND.role', color: 'red' },
      { pin: 'D9-D10', to: 'lessons.parking.pins.D9-D10.to', role: 'lessons.parking.pins.D9-D10.role', color: 'blue' },
      { pin: 'D4', to: 'lessons.parking.pins.D4.to', role: 'lessons.parking.pins.D4.role', color: 'orange' },
      { pin: 'D3', to: 'lessons.parking.pins.D3.to', role: 'lessons.parking.pins.D3.role', color: 'yellow' },
      { pin: 'D2', to: 'lessons.parking.pins.D2.to', role: 'lessons.parking.pins.D2.role', color: 'green' },
    ],
    callouts: [
      { part: 'US1', text: 'lessons.parking.callouts.US1' },
      { part: 'TL1', text: 'lessons.parking.callouts.TL1' },
      { part: 'ZU4', text: 'lessons.parking.callouts.ZU4' },
      { part: 'OBST', text: 'lessons.parking.callouts.OBST' },
    ],
    specs: [
      { label: 'lessons.parking.specs.1.label', value: 'lessons.parking.specs.1.value' },
      { label: 'lessons.parking.specs.2.label', value: 'lessons.parking.specs.2.value' },
      { label: 'lessons.parking.specs.3.label', value: 'lessons.parking.specs.3.value' },
      { label: 'lessons.parking.specs.4.label', value: 'lessons.parking.specs.4.value' },
      { label: 'lessons.parking.specs.5.label', value: 'lessons.parking.specs.5.value' },
    ],
    features: [
      { icon: 'tip', text: 'lessons.parking.features.1' },
      { icon: 'info', text: 'lessons.parking.features.2' },
      { icon: 'play', text: 'lessons.parking.features.3' },
    ],
    title: 'lessons.parking.title',
    lede: 'lessons.parking.lede',
    steps: ['lessons.parking.steps.1', 'lessons.parking.steps.2', 'lessons.parking.steps.3', 'lessons.parking.steps.4'],
    hints: ['lessons.parking.hints.1', 'lessons.parking.hints.2'],
    quiz: {
      id: 'parking-quiz',
      afterStep: null,
      questions: [
        {
          id: 'q1',
          q: 'lessons.parking.quiz.q1.q',
          options: ['lessons.parking.quiz.q1.options.1', 'lessons.parking.quiz.q1.options.2', 'lessons.parking.quiz.q1.options.3'],
          answer: 0,
          why: 'lessons.parking.quiz.q1.why',
        },
        {
          id: 'q2',
          q: 'lessons.parking.quiz.q2.q',
          options: ['lessons.parking.quiz.q2.options.1', 'lessons.parking.quiz.q2.options.2', 'lessons.parking.quiz.q2.options.3'],
          answer: 2,
          why: 'lessons.parking.quiz.q2.why',
        },
      ],
    },
  },
] satisfies Lesson[];

const board: BoardContent = {
  lab: 'board',
  id: 'uno-r3',
  maker: 'Arduino',
  variants: [],
  mcu: {
    part: 'ATmega328P-PU',
    core: 'AVR 8-bit',
    cores: 1,
    clockHz: 16_000_000,
    flashBytes: 32_768,
    ramBytes: 2_048,
    eepromBytes: 1_024,
    target: 'avr',
    adcBits: 10,
    wireless: [],
    companions: [{ part: 'ATmega16U2-MU', role: 'mcu.atmega16u2-mu' }],
  },
  logicVolts: 5,
  power: {
    inputs: [
      { id: 'usb', connector: 'usb-b', part: 'X2', volts: { min: 4.75, max: 5.5 }, maxCurrentMa: 500, reverseProtected: false, protection: 'power.usb.protection' },
      { id: 'jack', connector: 'barrel-5.5x2.1', part: 'X1', volts: { min: 6, max: 20, recommended: [7, 12] }, reverseProtected: true, protection: 'power.jack.protection' },
      { id: 'vin', connector: 'header-pin', part: 'POWER', volts: { min: 6, max: 20, recommended: [7, 12] }, reverseProtected: false, protection: 'power.vin.protection' },
      { id: 'pin5', connector: 'header-pin', part: 'POWER', volts: { min: 4.75, max: 5.5 }, reverseProtected: false, protection: 'power.pin5.protection' },
    ],
    rails: [
      { name: '5V', volts: 5, from: 'U1', note: 'power.rails.5v' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 150, from: 'U2', note: 'power.rails.3v3' },
      { name: 'VIN', volts: 8.3, from: 'D1', note: 'power.rails.vin' },
      { name: 'USBVCC', volts: 5, maxCurrentMa: 500, from: 'F1', note: 'power.rails.usbvcc' },
    ],
    io: { perPinMa: 20, absMaxPerPinMa: 40, totalMa: 200, note: 'power.io' },
    brownoutVolts: 2.7,
    idleMa: 50,
  },
  pinout: [
    { header: 'IOL', pin: '1', label: 'D0', functions: ['RX', 'PCINT16'], caps: ['digital', 'uart'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D0', note: 'pins.iol.1' },
    { header: 'IOL', pin: '2', label: 'D1', functions: ['TX', 'PCINT17'], caps: ['digital', 'uart'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D1', note: 'pins.iol.2' },
    { header: 'IOL', pin: '3', label: 'D2', functions: ['INT0', 'PCINT18'], caps: ['digital', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D2', note: 'pins.iol.3' },
    { header: 'IOL', pin: '4', label: '~D3', functions: ['PWM 490 Hz (OC2B)', 'INT1', 'PCINT19'], caps: ['digital', 'pwm', 'interrupt'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D3', note: 'pins.iol.4' },
    { header: 'IOL', pin: '5', label: 'D4', functions: ['T0', 'XCK', 'PCINT20'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D4' },
    { header: 'IOL', pin: '6', label: '~D5', functions: ['PWM 977 Hz (OC0B)', 'T1', 'PCINT21'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D5' },
    { header: 'IOL', pin: '7', label: '~D6', functions: ['PWM 977 Hz (OC0A)', 'AIN0', 'PCINT22'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D6' },
    { header: 'IOL', pin: '8', label: 'D7', functions: ['AIN1', 'PCINT23'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D7', note: 'pins.iol.8' },
    { header: 'IOH', pin: '1', label: 'D8', functions: ['ICP1', 'CLKO', 'PCINT0'], caps: ['digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D8' },
    { header: 'IOH', pin: '2', label: '~D9', functions: ['PWM 490 Hz (OC1A)', 'PCINT1'], caps: ['digital', 'pwm'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D9', note: 'pins.ioh.2' },
    { header: 'IOH', pin: '3', label: '~D10', functions: ['PWM 490 Hz (OC1B)', 'SPI SS', 'PCINT2'], caps: ['digital', 'pwm', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D10', note: 'pins.ioh.3' },
    { header: 'IOH', pin: '4', label: '~D11', functions: ['PWM 490 Hz (OC2A)', 'SPI MOSI', 'PCINT3'], caps: ['digital', 'pwm', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D11' },
    { header: 'IOH', pin: '5', label: 'D12', functions: ['SPI MISO', 'PCINT4'], caps: ['digital', 'spi'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D12' },
    { header: 'IOH', pin: '6', label: 'D13', functions: ['SPI SCK', 'LED_BUILTIN', 'PCINT5'], caps: ['digital', 'spi', 'led'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'D13', note: 'pins.ioh.6' },
    { header: 'IOH', pin: '7', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'IOH', pin: '8', label: 'AREF', functions: ['ADC reference'], caps: ['analog-in'], volts: 5, net: 'AREF', note: 'pins.ioh.8' },
    { header: 'IOH', pin: '9', label: 'SDA', functions: ['I2C SDA', 'A4'], caps: ['i2c', 'analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'SDA', note: 'pins.ioh.9' },
    { header: 'IOH', pin: '10', label: 'SCL', functions: ['I2C SCL', 'A5'], caps: ['i2c', 'analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'SCL', note: 'pins.ioh.10' },
    { header: 'POWER', pin: '1', label: 'NC', functions: [], caps: ['nc'], volts: null, net: 'NC', note: 'pins.power.1' },
    { header: 'POWER', pin: '2', label: 'IOREF', functions: ['I/O voltage for shields'], caps: ['power'], volts: 5, net: 'IOREF', note: 'pins.power.2' },
    { header: 'POWER', pin: '3', label: 'RESET', functions: ['Active-low reset'], caps: ['reset'], volts: 5, net: 'RESET', note: 'pins.power.3' },
    { header: 'POWER', pin: '4', label: '3V3', functions: ['3.3 V out'], caps: ['power'], volts: 3.3, maxCurrentMa: 150, net: '3V3', note: 'pins.power.4' },
    { header: 'POWER', pin: '5', label: '5V', functions: ['5 V out'], caps: ['power'], volts: 5, net: '5V', note: 'pins.power.5' },
    { header: 'POWER', pin: '6', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'POWER', pin: '7', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'POWER', pin: '8', label: 'VIN', functions: ['Supply in (after the jack diode)'], caps: ['power'], volts: 8.3, net: 'VIN', note: 'pins.power.8' },
    { header: 'AD', pin: '1', label: 'A0', functions: ['ADC0', 'D14', 'PCINT8'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A0', note: 'pins.ad.1' },
    { header: 'AD', pin: '2', label: 'A1', functions: ['ADC1', 'D15', 'PCINT9'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A1' },
    { header: 'AD', pin: '3', label: 'A2', functions: ['ADC2', 'D16', 'PCINT10'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A2' },
    { header: 'AD', pin: '4', label: 'A3', functions: ['ADC3', 'D17', 'PCINT11'], caps: ['analog-in', 'digital'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A3' },
    { header: 'AD', pin: '5', label: 'A4', functions: ['ADC4', 'D18', 'I2C SDA', 'PCINT12'], caps: ['analog-in', 'digital', 'i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A4', note: 'pins.ad.5' },
    { header: 'AD', pin: '6', label: 'A5', functions: ['ADC5', 'D19', 'I2C SCL', 'PCINT13'], caps: ['analog-in', 'digital', 'i2c'], volts: 5, fiveVoltTolerant: true, maxCurrentMa: 40, net: 'A5', note: 'pins.ad.6' },
    { header: 'ICSP', pin: '1', label: 'MISO', functions: ['SPI MISO = D12'], caps: ['spi'], volts: 5, net: 'D12' },
    { header: 'ICSP', pin: '2', label: '5V', functions: [], caps: ['power'], volts: 5, net: '5V' },
    { header: 'ICSP', pin: '3', label: 'SCK', functions: ['SPI SCK = D13'], caps: ['spi'], volts: 5, net: 'D13' },
    { header: 'ICSP', pin: '4', label: 'MOSI', functions: ['SPI MOSI = D11'], caps: ['spi'], volts: 5, net: 'D11' },
    { header: 'ICSP', pin: '5', label: 'RESET', functions: [], caps: ['reset'], volts: 5, net: 'RESET', note: 'pins.icsp.5' },
    { header: 'ICSP', pin: '6', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
    { header: 'ICSP1', pin: '1', label: 'MISO2', functions: ['16U2 PB3'], caps: ['spi'], volts: 5, net: 'MISO2' },
    { header: 'ICSP1', pin: '2', label: '5V', functions: [], caps: ['power'], volts: 5, net: '5V' },
    { header: 'ICSP1', pin: '3', label: 'SCK2', functions: ['16U2 PB1'], caps: ['spi'], volts: 5, net: 'SCK2' },
    { header: 'ICSP1', pin: '4', label: 'MOSI2', functions: ['16U2 PB2'], caps: ['spi'], volts: 5, net: 'MOSI2' },
    { header: 'ICSP1', pin: '5', label: 'RESET2', functions: ['16U2 reset'], caps: ['reset'], volts: 5, net: 'RESET2', note: 'pins.icsp1.5' },
    { header: 'ICSP1', pin: '6', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
  ],
  leds: [
    { id: 'ON', label: 'ON', color: 'green', drivenBy: 'power', activeLow: false, note: 'leds.ON' },
    { id: 'L', label: 'L', color: 'yellow', drivenBy: 'D13', activeLow: false, note: 'leds.L' },
    { id: 'TX', label: 'TX', color: 'yellow', drivenBy: 'usb-tx', activeLow: true, note: 'leds.TX' },
    { id: 'RX', label: 'RX', color: 'yellow', drivenBy: 'usb-rx', activeLow: true, note: 'leds.RX' },
  ],
  controls: [{ id: 'RESET', label: 'RESET', kind: 'reset', pin: 'RESET', activeLow: true, act: 'ctl-reset', effect: 'controls.RESET' }],
  displays: [],
  figure: {
    page: '/figures/boards/uno-r3.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'ZU4', short: 'MCU', role: 'mcu', name: 'parts.ZU4.name', what: 'parts.ZU4.what' },
      { id: 'SK1', short: 'SOCKET', role: 'socket', name: 'parts.SK1.name', what: 'parts.SK1.what' },
      { id: 'U3', short: 'USB-SERIAL', role: 'usb-bridge', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'Y1', short: '16 MHz CRYSTAL', role: 'crystal', name: 'parts.Y1.name', what: 'parts.Y1.what' },
      { id: 'Y2', short: 'RESONATOR', role: 'crystal', name: 'parts.Y2.name', what: 'parts.Y2.what' },
      { id: 'U1', short: '5V REG', role: 'regulator', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U2', short: '3V3 REG', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'U5', short: 'OP-AMP', role: 'other', name: 'parts.U5.name', what: 'parts.U5.what' },
      { id: 'T1', short: 'USB SWITCH', role: 'other', name: 'parts.T1.name', what: 'parts.T1.what' },
      { id: 'F1', short: 'POLYFUSE', role: 'protection', name: 'parts.F1.name', what: 'parts.F1.what' },
      { id: 'D1', short: 'DIODE', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'D2', short: 'D2', role: 'protection', name: 'parts.D2.name', what: 'parts.D2.what' },
      { id: 'D3', short: 'D3', role: 'protection', name: 'parts.D3.name', what: 'parts.D3.what' },
      { id: 'PC1', short: '47 µF', role: 'passive', name: 'parts.PC1.name', what: 'parts.PC1.what' },
      { id: 'PC2', short: '47 µF', role: 'passive', name: 'parts.PC2.name', what: 'parts.PC2.what' },
      { id: 'L1', short: 'L1', role: 'passive', name: 'parts.L1.name', what: 'parts.L1.what' },
      { id: 'L2', short: 'L2', role: 'passive', name: 'parts.L2.name', what: 'parts.L2.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C2', short: 'C2', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'C3', short: 'C3', role: 'passive', name: 'parts.C3.name', what: 'parts.C3.what' },
      { id: 'C4', short: 'C4', role: 'passive', name: 'parts.C4.name', what: 'parts.C4.what' },
      { id: 'C5', short: 'AUTO-RESET', role: 'passive', name: 'parts.C5.name', what: 'parts.C5.what' },
      { id: 'C6', short: 'C6', role: 'passive', name: 'parts.C6.name', what: 'parts.C6.what' },
      { id: 'C7', short: 'C7', role: 'passive', name: 'parts.C7.name', what: 'parts.C7.what' },
      { id: 'C8', short: 'C8', role: 'passive', name: 'parts.C8.name', what: 'parts.C8.what' },
      { id: 'C9', short: 'C9', role: 'passive', name: 'parts.C9.name', what: 'parts.C9.what' },
      { id: 'C10', short: 'C10', role: 'passive', name: 'parts.C10.name', what: 'parts.C10.what' },
      { id: 'C11', short: 'C11', role: 'passive', name: 'parts.C11.name', what: 'parts.C11.what' },
      { id: 'R1', short: 'R1', role: 'passive', name: 'parts.R1.name', what: 'parts.R1.what' },
      { id: 'R2', short: 'R2', role: 'passive', name: 'parts.R2.name', what: 'parts.R2.what' },
      { id: 'RN1', short: 'RN1', role: 'passive', name: 'parts.RN1.name', what: 'parts.RN1.what' },
      { id: 'RN2', short: 'RN2', role: 'passive', name: 'parts.RN2.name', what: 'parts.RN2.what' },
      { id: 'RN3', short: 'RN3', role: 'passive', name: 'parts.RN3.name', what: 'parts.RN3.what' },
      { id: 'RN4', short: 'RN4', role: 'passive', name: 'parts.RN4.name', what: 'parts.RN4.what' },
      { id: 'Z1', short: 'Z1', role: 'protection', name: 'parts.Z1.name', what: 'parts.Z1.what' },
      { id: 'Z2', short: 'Z2', role: 'protection', name: 'parts.Z2.name', what: 'parts.Z2.what' },
      { id: 'L', short: 'L LED', role: 'led', name: 'parts.L.name', what: 'parts.L.what' },
      { id: 'TX', short: 'TX', role: 'led', name: 'parts.TX.name', what: 'parts.TX.what' },
      { id: 'RX', short: 'RX', role: 'led', name: 'parts.RX.name', what: 'parts.RX.what' },
      { id: 'ON', short: 'ON', role: 'led', name: 'parts.ON.name', what: 'parts.ON.what' },
      { id: 'RESET', short: 'RESET', role: 'button', name: 'parts.RESET.name', what: 'parts.RESET.what' },
      { id: 'JP2', short: 'JP2', role: 'header', name: 'parts.JP2.name', what: 'parts.JP2.what' },
      { id: 'RESET-EN', short: 'RESET-EN', role: 'jumper', name: 'parts.RESET-EN.name', what: 'parts.RESET-EN.what' },
      { id: 'ICSP1', short: 'ICSP 16U2', role: 'header', name: 'parts.ICSP1.name', what: 'parts.ICSP1.what' },
      { id: 'ICSP', short: 'ICSP', role: 'header', name: 'parts.ICSP.name', what: 'parts.ICSP.what' },
      { id: 'X2', short: 'USB-B', role: 'connector', name: 'parts.X2.name', what: 'parts.X2.what' },
      { id: 'X1', short: 'POWER JACK', role: 'connector', name: 'parts.X1.name', what: 'parts.X1.what' },
      { id: 'IOH', short: 'D8-D13', role: 'header', name: 'parts.IOH.name', what: 'parts.IOH.what' },
      { id: 'IOL', short: 'D0-D7', role: 'header', name: 'parts.IOL.name', what: 'parts.IOL.what' },
      { id: 'POWER', short: 'POWER', role: 'header', name: 'parts.POWER.name', what: 'parts.POWER.what' },
      { id: 'AD', short: 'A0-A5', role: 'header', name: 'parts.AD.name', what: 'parts.AD.what' },
    ],
  },
  wireables: [
    { part: 'led', connections: [{ from: 'A', to: 'D13', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.led.note', caution: 'wireables.led.caution' },
    { part: 'push-button', connections: [{ from: '1', to: 'D2', color: 'blue' }, { from: '3', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.push-button.note' },
    { part: 'potentiometer', connections: [{ from: '1', to: 'GND', color: 'black' }, { from: '2', to: 'A0', color: 'green' }, { from: '3', to: '5V', color: 'red' }], supplyVolts: 5, note: 'wireables.potentiometer.note' },
    { part: 'ldr', connections: [{ from: '1', to: '5V', color: 'red' }, { from: '2', to: 'A0', color: 'green' }], supplyVolts: 5, note: 'wireables.ldr.note' },
    { part: 'piezo-buzzer', connections: [{ from: 'POS', to: 'D8', color: 'orange' }, { from: 'NEG', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.piezo-buzzer.note' },
    { part: 'tmp36', connections: [{ from: 'VS', to: '5V', color: 'red' }, { from: 'VOUT', to: 'A0', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.tmp36.note' },
    { part: 'servo-sg90', connections: [{ from: 'GND', to: 'GND', color: 'brown' }, { from: 'VCC', to: '5V', color: 'red' }, { from: 'SIG', to: 'D9', color: 'orange' }], supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution' },
    { part: 'tip120', connections: [{ from: 'B', to: 'D6', color: 'orange' }, { from: 'E', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.tip120.note', caution: 'wireables.tip120.caution' },
    { part: 'hc-sr04', connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'TRIG', to: 'D9', color: 'yellow' }, { from: 'ECHO', to: 'D10', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.hc-sr04.note' },
    { part: 'ssd1306', connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V3', color: 'orange' }, { from: 'SCL', to: 'SCL', color: 'blue' }, { from: 'SDA', to: 'SDA', color: 'purple' }], supplyVolts: 3.3, note: 'wireables.ssd1306.note', caution: 'wireables.ssd1306.caution' },
    { part: 'uln2003', connections: [{ from: 'IN1', to: 'D8', color: 'orange' }, { from: 'IN2', to: 'D9', color: 'yellow' }, { from: 'IN3', to: 'D10', color: 'green' }, { from: 'IN4', to: 'D11', color: 'purple' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '5V', color: 'red' }], supplyVolts: 5, note: 'wireables.uln2003.note', caution: 'wireables.uln2003.caution' },
    { part: 'soil-moisture', connections: [{ from: 'AOUT', to: 'A0', color: 'yellow' }, { from: 'VCC', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.soil-moisture.note' },
    { part: 'traffic-light', connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'R', to: 'D4', color: 'orange' }, { from: 'Y', to: 'D3', color: 'yellow' }, { from: 'G', to: 'D2', color: 'green' }], supplyVolts: 5, note: 'wireables.traffic-light.note' },
    { part: 'fsr402', connections: [{ from: '1', to: '5V', color: 'red' }, { from: '2', to: 'A0', color: 'green' }], supplyVolts: 5, note: 'wireables.fsr402.note' },
    { part: 'mpu6050', connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'SCL', color: 'blue' }, { from: 'SDA', to: 'SDA', color: 'purple' }], supplyVolts: 5, note: 'wireables.mpu6050.note', caution: 'wireables.mpu6050.caution' },
    { part: 'pca9685', connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'SCL', color: 'blue' }, { from: 'SDA', to: 'SDA', color: 'purple' }], supplyVolts: 5, note: 'wireables.pca9685.note', caution: 'wireables.pca9685.caution' },
  ],
  failures: [
    {
      id: 'reverse-jack',
      kind: 'reverse-polarity',
      trigger: { by: 'reverse', input: 'jack' },
      figure: { type: 'set', state: { power: 'jack', fault: 'reverse-polarity:jack' } },
      effect: { power: 'off', halts: true },
      title: 'failures.reverse-jack.title',
      symptom: 'failures.reverse-jack.symptom',
      explanation: 'failures.reverse-jack.explanation',
      fix: 'failures.reverse-jack.fix',
    },
    {
      id: 'reverse-vin',
      kind: 'reverse-polarity',
      trigger: { by: 'reverse', input: 'vin' },
      figure: { type: 'set', state: { power: 'vin', fault: 'reverse-polarity:vin' } },
      effect: { power: 'off', halts: true, damages: ['U1', 'PC1'] },
      title: 'failures.reverse-vin.title',
      symptom: 'failures.reverse-vin.symptom',
      explanation: 'failures.reverse-vin.explanation',
      fix: 'failures.reverse-vin.fix',
    },
    {
      id: 'brownout',
      kind: 'brownout',
      trigger: { by: 'load', rail: '5V', ma: 900, part: 'dc-motor' },
      figure: { type: 'set', state: { power: 'usb', fault: 'brownout' } },
      effect: { power: 'resetting', halts: false, extraMa: 900, serial: ['Uno ready', 'Uno ready', 'Uno ready'] },
      title: 'failures.brownout.title',
      symptom: 'failures.brownout.symptom',
      explanation: 'failures.brownout.explanation',
      fix: 'failures.brownout.fix',
    },
    {
      id: 'overvoltage',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'jack', volts: 24 },
      figure: { type: 'set', state: { power: 'jack', fault: 'wrong-voltage:jack:24' } },
      effect: { power: 'off', halts: true, damages: ['U1'] },
      title: 'failures.overvoltage.title',
      symptom: 'failures.overvoltage.symptom',
      explanation: 'failures.overvoltage.explanation',
      fix: 'failures.overvoltage.fix',
    },
    {
      id: 'undervoltage',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'jack', volts: 4.9 },
      figure: { type: 'set', state: { power: 'jack', fault: 'wrong-voltage:jack:4.9' } },
      effect: { power: 'on', halts: false },
      title: 'failures.undervoltage.title',
      symptom: 'failures.undervoltage.symptom',
      explanation: 'failures.undervoltage.explanation',
      fix: 'failures.undervoltage.fix',
    },
    {
      id: 'pin5-overvoltage',
      kind: 'wrong-voltage',
      trigger: { by: 'power-input', input: 'pin5', volts: 9 },
      figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:9' } },
      effect: { power: 'off', halts: true, damages: ['ZU4', 'U3'] },
      title: 'failures.pin5-overvoltage.title',
      symptom: 'failures.pin5-overvoltage.symptom',
      explanation: 'failures.pin5-overvoltage.explanation',
      fix: 'failures.pin5-overvoltage.fix',
    },
    {
      id: 'cold-usb',
      kind: 'cold-solder',
      trigger: { by: 'cold-joint', part: 'X2' },
      figure: { type: 'set', state: { power: 'usb', fault: 'cold:X2' } },
      effect: { power: 'resetting', halts: false, serial: ['Uno ready', 'Uno ready'] },
      title: 'failures.cold-usb.title',
      symptom: 'failures.cold-usb.symptom',
      explanation: 'failures.cold-usb.explanation',
      fix: 'failures.cold-usb.fix',
    },
    {
      id: 'missing-resonator',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'Y2' },
      figure: { type: 'set', state: { power: null, remove: 'Y2' } },
      effect: { power: 'on', halts: true },
      title: 'failures.missing-resonator.title',
      symptom: 'failures.missing-resonator.symptom',
      explanation: 'failures.missing-resonator.explanation',
      fix: 'failures.missing-resonator.fix',
    },
    {
      id: 'missing-autoreset',
      kind: 'missing-part',
      trigger: { by: 'remove-part', part: 'C5' },
      figure: { type: 'set', state: { power: null, remove: 'C5' } },
      effect: { power: 'on', halts: false },
      title: 'failures.missing-autoreset.title',
      symptom: 'failures.missing-autoreset.symptom',
      explanation: 'failures.missing-autoreset.explanation',
      fix: 'failures.missing-autoreset.fix',
    },
    {
      id: 'chip-backwards',
      kind: 'reversed-part',
      trigger: { by: 'reverse-part', part: 'ZU4' },
      figure: { type: 'set', state: { power: 'usb', fault: 'reversed:ZU4' } },
      effect: { power: 'on', halts: true, damages: ['ZU4'], extraMa: 400 },
      title: 'failures.chip-backwards.title',
      symptom: 'failures.chip-backwards.symptom',
      explanation: 'failures.chip-backwards.explanation',
      fix: 'failures.chip-backwards.fix',
    },
    {
      id: 'cap-backwards',
      kind: 'reversed-part',
      trigger: { by: 'reverse-part', part: 'PC2' },
      figure: { type: 'set', state: { power: 'usb', fault: 'reversed:PC2' } },
      effect: { power: 'on', halts: false, damages: ['PC2'] },
      title: 'failures.cap-backwards.title',
      symptom: 'failures.cap-backwards.symptom',
      explanation: 'failures.cap-backwards.explanation',
      fix: 'failures.cap-backwards.fix',
    },
    {
      id: 'short-5v',
      kind: 'short',
      trigger: { by: 'short', nets: ['5V', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-5v.title',
      symptom: 'failures.short-5v.symptom',
      explanation: 'failures.short-5v.explanation',
      fix: 'failures.short-5v.fix',
    },
    {
      id: 'short-3v3',
      kind: 'short',
      trigger: { by: 'short', nets: ['3V3', 'GND'] },
      figure: { type: 'set', state: { power: 'usb', fault: 'short:3V3:GND' } },
      effect: { power: 'on', halts: false, pins: { '3V3': 'dead' } },
      title: 'failures.short-3v3.title',
      symptom: 'failures.short-3v3.symptom',
      explanation: 'failures.short-3v3.explanation',
      fix: 'failures.short-3v3.fix',
    },
    {
      id: 'led-no-resistor',
      kind: 'overcurrent',
      trigger: { by: 'wiring', part: 'led', from: 'A', to: 'D13' },
      figure: { type: 'set', state: { circuit: 'blink', params: { RES1: { ohms: 1 } } } },
      effect: { power: 'on', halts: false, damages: ['LED1'], extraMa: 115 },
      title: 'failures.led-no-resistor.title',
      symptom: 'failures.led-no-resistor.symptom',
      explanation: 'failures.led-no-resistor.explanation',
      fix: 'failures.led-no-resistor.fix',
    },
  ],
  assembly: [
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'through-hole', kind: 'build', action: null, done: { build: 'tht' }, major: false, title: 'assembly.through-hole.title', body: 'assembly.through-hole.body', refusal: 'assembly.through-hole.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: false, title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'chip', kind: 'build', action: { type: 'press', id: 'place', choice: 'zu4' }, done: { build: 'assembled' }, major: false, title: 'assembly.chip.title', body: 'assembly.chip.body', refusal: 'assembly.chip.refusal' },
    { id: 'plug', kind: 'build', action: { type: 'set', state: { power: 'usb' } }, done: { power: 'usb', status: 'running' }, major: false, title: 'assembly.plug.title', body: 'assembly.plug.body', refusal: 'assembly.plug.refusal' },
    { id: 'upload', kind: 'build', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { mode: 'hello', status: 'running' }, major: false, title: 'assembly.upload.title', body: 'assembly.upload.body', refusal: 'assembly.upload.refusal' },
    { id: 'power-check', kind: 'test', action: null, done: { status: 'running', 'leds.ON': 1, 'rails.3V3': 3.3 }, major: false, title: 'assembly.power-check.title', body: 'assembly.power-check.body' },
    { id: 'break-chip', kind: 'break', action: { type: 'set', state: { power: 'usb', fault: 'reversed:ZU4' } }, done: { status: 'fault' }, fault: 'chip-backwards', major: false, title: 'assembly.break-chip.title', body: 'assembly.break-chip.body' },
    { id: 'break-resonator', kind: 'break', action: { type: 'set', state: { power: null, remove: 'Y2' } }, done: { status: 'powered' }, fault: 'missing-resonator', major: false, title: 'assembly.break-resonator.title', body: 'assembly.break-resonator.body' },
    { id: 'break-brownout', kind: 'break', action: { type: 'set', state: { power: 'usb', fault: 'brownout' } }, done: { status: 'brownout' }, fault: 'brownout', major: false, title: 'assembly.break-brownout.title', body: 'assembly.break-brownout.body' },
    { id: 'exploded', kind: 'build', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, title: 'assembly.exploded.title', body: 'assembly.exploded.body', refusal: 'assembly.exploded.refusal' },
  ],
  lessons,
  serial: { baud: 9600, sample: ['Uno ready', 'hello from the Uno #0', 'hello from the Uno #1'] },
  sources: [
    { title: 'Arduino UNO R3 datasheet (A000066)', url: 'https://docs.arduino.cc/resources/datasheets/A000066-datasheet.pdf' },
    { title: 'Arduino UNO R3 schematic (A000066)', url: 'https://docs.arduino.cc/resources/schematics/A000066-schematics.pdf' },
    { title: 'Arduino UNO R3 full pinout (A000066)', url: 'https://docs.arduino.cc/resources/pinouts/A000066-full-pinout.pdf' },
    { title: 'Arduino UNO R3 CAD files (Eagle UNO-TH_Rev3e)', url: 'https://docs.arduino.cc/static/6bb7a3ca51ebee82a252f60c0b418787/A000066-cad-files.zip' },
    { title: 'Microchip ATmega48A/PA/88A/PA/168A/PA/328/P datasheet DS40002061B', url: 'https://ww1.microchip.com/downloads/en/DeviceDoc/ATmega48A-PA-88A-PA-168A-PA-328-P-DS-DS40002061B.pdf' },
    { title: 'ArduinoCore-avr 1.8.8 (boards.txt, Optiboot)', url: 'https://github.com/arduino/ArduinoCore-avr/tree/1.8.8' },
    { title: 'avrdude 8.0 source (stk500.c, arduino.c)', url: 'https://github.com/avrdudes/avrdude' },
    { title: 'Bourns MF-MSMF050-2 PTC (element14)', url: 'https://sg.element14.com/bourns/mf-msmf050-2/fuse-ptc-reset-15v-500ma-1812/dp/2128216' },
    { title: 'onsemi NCP1117ST50T3G LDO (element14)', url: 'https://sg.element14.com/onsemi/ncp1117st50t3g/ana-sot223-800ma-ldo/dp/2441623' },
    { title: 'Analog Devices TMP35/TMP36/TMP37 datasheet', url: 'https://www.analog.com/media/en/technical-documentation/data-sheets/TMP35_36_37.pdf' },
    { title: 'onsemi TIP120 Darlington datasheet', url: 'https://www.onsemi.com/pdf/datasheet/tip120-d.pdf' },
    { title: 'AccelStepper library (Mike McCauley)', url: 'https://www.airspayce.com/mikem/arduino/AccelStepper/' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
};

export default board;
