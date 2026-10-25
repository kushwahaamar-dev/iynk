// NodeMCU DevKit v1.0 "Amica": ESP-12E (ESP8266EX), CP2102, 1117-3.3. Facts: docs/facts/nodemcu.md (the NodeMCU
// team's Altium files, ESP8266EX and ESP-12E datasheets, esp8266/Arduino core 3.1.2). Figure, part positions and the
// lesson circuits (key = lesson id): figures/boards/nodemcu.js. Net names are the board's silkscreen names (D0-D8,
// A0, RX, TX, 3V3, VIN), the names the interpreter reports for this profile.
import type { BoardContent, FailureMode, FigurePart, Lesson, PartRole, PinCap, PinRow } from '@/content/schema';

type PinSpec = [pin: string, label: string, functions: string[], caps: PinCap[], volts: number | null, net: string];

const j1: PinSpec[] = [
  ['1', 'A0', ['ADC0 via the 220 k / 100 k divider (0-3.2 V)'], ['analog-in'], 3.2, 'A0'],
  ['2', 'RSV', ['TOUT, straight to the ADC (0-1.0 V)'], ['analog-in'], 1, 'ADC'],
  ['3', 'RSV', [], ['nc'], null, 'J1.3'],
  ['4', 'SD3', ['GPIO10', 'SDIO DATA3', 'flash /WP'], ['spi'], 3.3, 'SD3'],
  ['5', 'SD2', ['GPIO9', 'SDIO DATA2', 'flash /HOLD'], ['spi'], 3.3, 'SD2'],
  ['6', 'SD1', ['GPIO8', 'SDIO DATA1', 'flash DI (MOSI)'], ['spi'], 3.3, 'SD1'],
  ['7', 'CMD', ['GPIO11', 'SDIO CMD', 'flash /CS'], ['spi'], 3.3, 'CMD'],
  ['8', 'SD0', ['GPIO7', 'SDIO DATA0', 'flash DO (MISO)'], ['spi'], 3.3, 'SD0'],
  ['9', 'CLK', ['GPIO6', 'SDIO CLK', 'flash SCLK'], ['spi', 'clock'], 3.3, 'CLK'],
  ['10', 'GND', [], ['gnd'], null, 'GND'],
  ['11', '3V3', ['regulator output'], ['power'], 3.3, '3V3'],
  ['12', 'EN', ['CH_PD chip enable', '12 k pull-up R3'], ['reset'], 3.3, 'EN'],
  ['13', 'RST', ['EXT_RSTB', '12 k pull-up R4', 'RST button'], ['reset'], 3.3, 'RST'],
  ['14', 'GND', [], ['gnd'], null, 'GND'],
  ['15', 'Vin', ['regulator input', 'USB 5 V after D1'], ['power'], 5, 'VIN'],
];

const j2: PinSpec[] = [
  ['1', 'D0', ['GPIO16', 'WAKE', 'LED_BUILTIN_AUX (LED1)'], ['digital', 'pwm', 'led'], 3.3, 'D0'],
  ['2', 'D1', ['GPIO5', 'SCL (Wire)'], ['digital', 'pwm', 'interrupt', 'i2c'], 3.3, 'D1'],
  ['3', 'D2', ['GPIO4', 'SDA (Wire)'], ['digital', 'pwm', 'interrupt', 'i2c'], 3.3, 'D2'],
  ['4', 'D3', ['GPIO0', 'FLASH button', 'boot strap (HIGH to run)'], ['digital', 'pwm', 'interrupt', 'strapping'], 3.3, 'D3'],
  ['5', 'D4', ['GPIO2', 'TXD1 (Serial1)', 'LED_BUILTIN (module LED)', 'boot strap (HIGH at boot)'], ['digital', 'pwm', 'interrupt', 'uart', 'strapping', 'led'], 3.3, 'D4'],
  ['6', '3V3', ['regulator output'], ['power'], 3.3, '3V3'],
  ['7', 'GND', [], ['gnd'], null, 'GND'],
  ['8', 'D5', ['GPIO14', 'HSPI SCK'], ['digital', 'pwm', 'interrupt', 'spi'], 3.3, 'D5'],
  ['9', 'D6', ['GPIO12', 'HSPI MISO'], ['digital', 'pwm', 'interrupt', 'spi'], 3.3, 'D6'],
  ['10', 'D7', ['GPIO13', 'HSPI MOSI', 'RXD2 (Serial.swap)', 'CTS0'], ['digital', 'pwm', 'interrupt', 'spi', 'uart'], 3.3, 'D7'],
  ['11', 'D8', ['GPIO15', 'HSPI SS', 'TXD2 (Serial.swap)', 'RTS0', 'boot strap (LOW at boot)'], ['digital', 'pwm', 'interrupt', 'spi', 'uart', 'strapping'], 3.3, 'D8'],
  ['12', 'RX', ['GPIO3', 'RXD0 (Serial)'], ['digital', 'uart', 'interrupt'], 3.3, 'RX'],
  ['13', 'TX', ['GPIO1', 'TXD0 (Serial)'], ['digital', 'uart'], 3.3, 'TX'],
  ['14', 'GND', [], ['gnd'], null, 'GND'],
  ['15', '3V3', ['regulator output'], ['power'], 3.3, '3V3'],
];

const row = (header: 'J1' | 'J2') => ([pin, label, functions, caps, volts, net]: PinSpec): PinRow => ({
  header, pin, label, functions, caps, volts, net,
  ...(volts !== null && !caps.includes('power') ? { fiveVoltTolerant: false } : {}),
  ...(caps.includes('digital') ? { maxCurrentMa: 12 } : {}),
  note: `pins.${header.toLowerCase()}.${pin}`,
});

// Every part the figure draws: [id, pill text, role]. Names and descriptions: parts.<id>.name / .what.
const partList: [string, string, PartRole][] = [
  ['U1', 'ESP-12E', 'radio'], ['LED_MOD', 'LED D4', 'led'], ['U2', 'CP2102', 'usb-bridge'], ['U3', 'USB', 'connector'],
  ['U4', '3V3 REG', 'regulator'], ['D1', 'SS14', 'protection'], ['C2', '100 µF', 'passive'], ['C7', 'C7', 'passive'],
  ['C8', 'C8', 'passive'], ['C1', 'C1', 'passive'], ['C3', 'C3', 'passive'], ['C4', 'C4', 'passive'], ['C5', 'C5', 'passive'],
  ['C6', 'C6', 'passive'], ['R1', 'R1', 'passive'], ['R2', 'R2', 'passive'], ['R5', 'R5', 'passive'], ['R13', 'R13', 'passive'],
  ['R14', 'R14', 'passive'], ['R3', 'R3', 'passive'], ['R4', 'R4', 'passive'], ['R11', 'R11', 'passive'], ['R10', 'R10', 'jumper'],
  ['R9', 'R9', 'passive'], ['R6', 'R6', 'passive'], ['R8', 'R8', 'passive'], ['R12', 'R12', 'passive'], ['R7', 'R7', 'passive'],
  ['VT1', 'AUTO-RESET', 'other'], ['VT2', 'VT2', 'other'], ['LED1', 'LED D0', 'led'], ['S1', 'RST', 'button'],
  ['S2', 'FLASH', 'button'], ['J1', 'LEFT HEADER', 'header'], ['J2', 'RIGHT HEADER', 'header'],
];
const parts: FigurePart[] = partList.map(([id, short, role]) => ({ id, short, role, name: `parts.${id}.name`, what: `parts.${id}.what` }));

const failures: FailureMode[] = [
  {
    id: 'reverse-vin', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'vin' },
    figure: { type: 'set', state: { power: 'vin', fault: 'reverse-polarity:vin' } },
    effect: { power: 'off', halts: true, damages: ['U1'] },
    title: 'failures.reverse-vin.title', symptom: 'failures.reverse-vin.symptom', explanation: 'failures.reverse-vin.explanation', fix: 'failures.reverse-vin.fix',
  },
  {
    id: 'vin-overvoltage', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'vin', volts: 20 },
    figure: { type: 'set', state: { power: 'vin', fault: 'wrong-voltage:vin:20' } },
    effect: { power: 'off', halts: true, damages: ['U4'] },
    title: 'failures.vin-overvoltage.title', symptom: 'failures.vin-overvoltage.symptom', explanation: 'failures.vin-overvoltage.explanation', fix: 'failures.vin-overvoltage.fix',
  },
  {
    id: 'five-volts-on-3v3', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin3v3', volts: 5 },
    figure: { type: 'set', state: { power: 'pin3v3', fault: 'wrong-voltage:pin3v3:5' } },
    effect: { power: 'off', halts: true, damages: ['U1'] },
    title: 'failures.five-volts-on-3v3.title', symptom: 'failures.five-volts-on-3v3.symptom', explanation: 'failures.five-volts-on-3v3.explanation', fix: 'failures.five-volts-on-3v3.fix',
  },
  {
    id: 'brownout', kind: 'brownout', trigger: { by: 'load', rail: '3V3', ma: 650, part: 'servo-sg90' },
    figure: { type: 'set', state: { power: 'usb', fault: 'brownout' } },
    effect: { power: 'resetting', halts: true, extraMa: 650, serial: ['NodeMCU ready', 'NodeMCU ready', 'NodeMCU ready'] },
    title: 'failures.brownout.title', symptom: 'failures.brownout.symptom', explanation: 'failures.brownout.explanation', fix: 'failures.brownout.fix',
  },
  {
    id: 'vin-too-low', kind: 'brownout', trigger: { by: 'power-input', input: 'vin', volts: 3.5 },
    figure: { type: 'set', state: { power: 'vin', fault: 'wrong-voltage:vin:3.5' } },
    effect: { power: 'resetting', halts: true },
    title: 'failures.vin-too-low.title', symptom: 'failures.vin-too-low.symptom', explanation: 'failures.vin-too-low.explanation', fix: 'failures.vin-too-low.fix',
  },
  {
    id: 'cold-usb', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'U3' },
    figure: { type: 'set', state: { power: 'usb', fault: 'cold:U3' } },
    effect: { power: 'resetting', halts: true },
    title: 'failures.cold-usb.title', symptom: 'failures.cold-usb.symptom', explanation: 'failures.cold-usb.explanation', fix: 'failures.cold-usb.fix',
  },
  {
    id: 'cold-d1', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J2', pin: 'J2.2' },
    figure: { type: 'set', state: { fault: 'cold:J2.2' } },
    effect: { power: 'on', halts: false, pins: { D1: 'noisy' } },
    title: 'failures.cold-d1.title', symptom: 'failures.cold-d1.symptom', explanation: 'failures.cold-d1.explanation', fix: 'failures.cold-d1.fix',
  },
  {
    id: 'missing-r3', kind: 'missing-part', trigger: { by: 'remove-part', part: 'R3' },
    figure: { type: 'set', state: { fault: 'missing:R3' } },
    effect: { power: 'on', halts: true },
    title: 'failures.missing-r3.title', symptom: 'failures.missing-r3.symptom', explanation: 'failures.missing-r3.explanation', fix: 'failures.missing-r3.fix',
  },
  {
    id: 'strap-gpio15', kind: 'boot-strap', trigger: { by: 'remove-part', part: 'R5' },
    figure: { type: 'set', state: { fault: 'missing:R5' } },
    effect: { power: 'on', halts: true },
    title: 'failures.strap-gpio15.title', symptom: 'failures.strap-gpio15.symptom', explanation: 'failures.strap-gpio15.explanation', fix: 'failures.strap-gpio15.fix',
  },
  {
    id: 'strap-flash-held', kind: 'boot-strap', trigger: { by: 'control', control: 'S2', during: 'boot' },
    figure: { type: 'set', state: { press: { id: 'S2', down: true } } },
    effect: { power: 'on', halts: true, serial: [' ets Jan  8 2013,rst cause:2, boot mode:(1,6)'] },
    title: 'failures.strap-flash-held.title', symptom: 'failures.strap-flash-held.symptom', explanation: 'failures.strap-flash-held.explanation', fix: 'failures.strap-flash-held.fix',
  },
  {
    id: 'short-3v3', kind: 'short', trigger: { by: 'short', nets: ['3V3', 'GND'] },
    figure: { type: 'set', state: { fault: 'short:3V3:GND' } },
    effect: { power: 'off', halts: true },
    title: 'failures.short-3v3.title', symptom: 'failures.short-3v3.symptom', explanation: 'failures.short-3v3.explanation', fix: 'failures.short-3v3.fix',
  },
  {
    id: 'reversed-c2', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'C2' },
    figure: { type: 'set', state: { fault: 'reversed:C2' } },
    effect: { power: 'off', halts: true, damages: ['C2'] },
    title: 'failures.reversed-c2.title', symptom: 'failures.reversed-c2.symptom', explanation: 'failures.reversed-c2.explanation', fix: 'failures.reversed-c2.fix',
  },
  {
    id: 'led-no-resistor', kind: 'overcurrent', trigger: { by: 'setting', key: 'R101.ohms', value: 1 },
    figure: { type: 'set', state: { view: 'breadboard', circuit: 'blink', params: { R101: { ohms: 1 } } } },
    effect: { power: 'on', halts: false, pins: { D1: 'dead' }, damages: ['LED101'] },
    title: 'failures.led-no-resistor.title', symptom: 'failures.led-no-resistor.symptom', explanation: 'failures.led-no-resistor.explanation', fix: 'failures.led-no-resistor.fix',
  },
];

const lessons = [
  {
    id: 'blink',
    n: 1,
    level: 'io',
    language: 'arduino-cpp',
    code: {
      source: `// {{t:lessons.blink.code.intro}}
// R101 = {{p:ohms}} ohm: {{t:lessons.blink.code.resistor}}
const int LED_PIN = D1;          // {{t:lessons.blink.code.ledpin}}
const int WAIT_MS = {{p:wait}};

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);    // {{t:lessons.blink.code.builtin}}
}

void loop() {
  digitalWrite(LED_PIN, HIGH);     // {{t:lessons.blink.code.on}}
  digitalWrite(LED_BUILTIN, LOW);  // {{t:lessons.blink.code.activelow}}
  delay(WAIT_MS);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LED_BUILTIN, HIGH);
  delay(WAIT_MS);
}
`,
      libraries: [],
    },
    params: [
      { id: 'wait', kind: 'number', label: 'lessons.blink.params.wait.label', default: 500, min: 100, max: 2000, step: 100, unit: 'ms' },
      {
        id: 'ohms', kind: 'choice', label: 'lessons.blink.params.ohms.label', default: '220', figure: { part: 'R101', key: 'ohms' },
        options: [
          { value: '220', code: '220', figureValue: 220, label: 'lessons.blink.params.ohms.220' },
          { value: '330', code: '330', figureValue: 330, label: 'lessons.blink.params.ohms.330' },
          { value: '1000', code: '1000', figureValue: 1000, label: 'lessons.blink.params.ohms.1000' },
        ],
      },
    ],
    circuit: 'blink',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: [] },
    runMs: 4000,
    checks: [
      { kind: 'runs', minMs: 3000, label: 'lessons.blink.checks.1' },
      { kind: 'pin-toggles', pin: 'D1', periodMs: [900, 1100], minCycles: 3, label: 'lessons.blink.checks.2' },
      { kind: 'pin-level', pin: 'D4', level: 0, atMs: 250, label: 'lessons.blink.checks.3' },
      { kind: 'pin-level', pin: 'D4', level: 1, atMs: 750, label: 'lessons.blink.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: 'D1', to: 'lessons.blink.pins.D1.to', role: 'lessons.blink.pins.D1.role', color: 'orange' },
      { pin: 'D4', to: 'lessons.blink.pins.D4.to', role: 'lessons.blink.pins.D4.role', color: 'blue' },
      { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'LED_MOD', text: 'lessons.blink.callouts.LED_MOD' },
      { part: 'R101', text: 'lessons.blink.callouts.R101' },
      { part: 'LED101', text: 'lessons.blink.callouts.LED101' },
    ],
    specs: [
      { label: 'lessons.blink.specs.1.label', value: 'lessons.blink.specs.1.value' },
      { label: 'lessons.blink.specs.2.label', value: 'lessons.blink.specs.2.value' },
      { label: 'lessons.blink.specs.3.label', value: 'lessons.blink.specs.3.value' },
    ],
    features: [
      { icon: 'bulb', text: 'lessons.blink.features.1' },
      { icon: 'swap', text: 'lessons.blink.features.2' },
      { icon: 'pin', text: 'lessons.blink.features.3' },
    ],
    title: 'lessons.blink.title',
    lede: 'lessons.blink.lede',
    steps: ['lessons.blink.steps.1', 'lessons.blink.steps.2', 'lessons.blink.steps.3', 'lessons.blink.steps.4'],
    hints: ['lessons.blink.hints.1', 'lessons.blink.hints.2', 'lessons.blink.hints.3'],
    quiz: {
      id: 'blink',
      afterStep: null,
      questions: [
        { id: 'activelow', q: 'lessons.blink.quiz.activelow.q', options: ['lessons.blink.quiz.activelow.options.1', 'lessons.blink.quiz.activelow.options.2', 'lessons.blink.quiz.activelow.options.3'], answer: 1, why: 'lessons.blink.quiz.activelow.why' },
        { id: 'dnames', q: 'lessons.blink.quiz.dnames.q', options: ['lessons.blink.quiz.dnames.options.1', 'lessons.blink.quiz.dnames.options.2', 'lessons.blink.quiz.dnames.options.3'], answer: 2, why: 'lessons.blink.quiz.dnames.why' },
        { id: 'resistor', q: 'lessons.blink.quiz.resistor.q', options: ['lessons.blink.quiz.resistor.options.1', 'lessons.blink.quiz.resistor.options.2', 'lessons.blink.quiz.resistor.options.3'], answer: 0, why: 'lessons.blink.quiz.resistor.why' },
      ],
    },
  },
  {
    id: 'button',
    n: 2,
    level: 'input',
    language: 'arduino-cpp',
    code: {
      source: `// {{t:lessons.button.code.intro}}
const int BUTTON = D3;   // {{t:lessons.button.code.button}}
const int LIGHT = A0;    // {{t:lessons.button.code.light}}

bool wasPressed = false;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON, INPUT);            // {{t:lessons.button.code.pullup}}
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);   // {{t:lessons.button.code.off}}
  Serial.println("ready: press FLASH");
}

void loop() {
  bool pressed = digitalRead(BUTTON) == LOW;
  digitalWrite(LED_BUILTIN, pressed ? LOW : HIGH);
  if (pressed && !wasPressed) {
    int raw = analogRead(LIGHT);
    float volts = raw * 3.2 / 1023.0;  // {{t:lessons.button.code.divider}}
    Serial.print("A0 raw=");
    Serial.print(raw);
    Serial.print(" volts=");
    Serial.println(volts, 2);
  }
  wasPressed = pressed;
  delay({{p:debounce}});   // {{t:lessons.button.code.debounce}}
}
`,
      libraries: [],
    },
    params: [
      { id: 'debounce', kind: 'number', label: 'lessons.button.params.debounce.label', default: 20, min: 5, max: 100, step: 5, unit: 'ms' },
    ],
    circuit: 'button',
    world: {
      inputs: [
        { id: 'flash', quantity: 'button', device: { kind: 'button', pull: 'external-up', bounceMs: 5 }, pins: ['D3'], part: 'S2', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.button.world.flash' },
        { id: 'light', quantity: 'light-lux', device: { kind: 'divider', sensor: 'ldr', fixedOhms: 10000, sensorTo: 'vcc' }, pins: ['A0'], part: 'LDR101', min: 1, max: 1000, step: 1, default: 300, unit: 'lx', gesture: 'slide', label: 'lessons.button.world.light' },
      ],
      script: [
        { t: 600, input: 'flash', value: 1 },
        { t: 900, input: 'flash', value: 0 },
        { t: 1200, input: 'light', value: 20 },
        { t: 1500, input: 'flash', value: 1 },
        { t: 1800, input: 'flash', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: ['ready: press FLASH', 'A0 raw=936 volts=2.93', 'A0 raw=633 volts=1.98'] },
    runMs: 2500,
    checks: [
      { kind: 'serial', match: 'ready: press FLASH', regex: false, minCount: 1, byMs: 500, label: 'lessons.button.checks.1' },
      { kind: 'responds', after: { t: 600, input: 'flash', value: 1 }, pin: 'D4', withinMs: 100, mode: 'out', v: [0, 0], label: 'lessons.button.checks.2' },
      { kind: 'pin-level', pin: 'D4', level: 1, atMs: 1100, label: 'lessons.button.checks.3' },
      { kind: 'serial', match: 'A0 raw=\\d+ volts=\\d\\.\\d\\d', regex: true, minCount: 2, label: 'lessons.button.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: 'D3', to: 'lessons.button.pins.D3.to', role: 'lessons.button.pins.D3.role', color: 'white' },
      { pin: 'D4', to: 'lessons.button.pins.D4.to', role: 'lessons.button.pins.D4.role', color: 'blue' },
      { pin: 'A0', to: 'lessons.button.pins.A0.to', role: 'lessons.button.pins.A0.role', color: 'yellow' },
      { pin: '3V3', to: 'lessons.button.pins.3V3.to', role: 'lessons.button.pins.3V3.role', color: 'red' },
      { pin: 'GND', to: 'lessons.button.pins.GND.to', role: 'lessons.button.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'S2', text: 'lessons.button.callouts.S2' },
      { part: 'R1', text: 'lessons.button.callouts.R1' },
      { part: 'LDR101', text: 'lessons.button.callouts.LDR101' },
      { part: 'R13', text: 'lessons.button.callouts.R13' },
    ],
    specs: [
      { label: 'lessons.button.specs.1.label', value: 'lessons.button.specs.1.value' },
      { label: 'lessons.button.specs.2.label', value: 'lessons.button.specs.2.value' },
      { label: 'lessons.button.specs.3.label', value: 'lessons.button.specs.3.value' },
    ],
    features: [
      { icon: 'button', text: 'lessons.button.features.1' },
      { icon: 'sun', text: 'lessons.button.features.2' },
      { icon: 'terminal', text: 'lessons.button.features.3' },
    ],
    title: 'lessons.button.title',
    lede: 'lessons.button.lede',
    steps: ['lessons.button.steps.1', 'lessons.button.steps.2', 'lessons.button.steps.3', 'lessons.button.steps.4'],
    hints: ['lessons.button.hints.1', 'lessons.button.hints.2', 'lessons.button.hints.3'],
    quiz: {
      id: 'button',
      afterStep: null,
      questions: [
        { id: 'pullup', q: 'lessons.button.quiz.pullup.q', options: ['lessons.button.quiz.pullup.options.1', 'lessons.button.quiz.pullup.options.2', 'lessons.button.quiz.pullup.options.3'], answer: 1, why: 'lessons.button.quiz.pullup.why' },
        { id: 'boot', q: 'lessons.button.quiz.boot.q', options: ['lessons.button.quiz.boot.options.1', 'lessons.button.quiz.boot.options.2', 'lessons.button.quiz.boot.options.3'], answer: 0, why: 'lessons.button.quiz.boot.why' },
        { id: 'divider', q: 'lessons.button.quiz.divider.q', options: ['lessons.button.quiz.divider.options.1', 'lessons.button.quiz.divider.options.2', 'lessons.button.quiz.divider.options.3'], answer: 2, why: 'lessons.button.quiz.divider.why' },
      ],
    },
  },
  {
    id: 'dimmer',
    n: 3,
    level: 'analog',
    language: 'arduino-cpp',
    code: {
      source: `// {{t:lessons.dimmer.code.intro}}
const int KNOB = A0;      // {{t:lessons.dimmer.code.knob}}
const int LED_PIN = D5;   // {{t:lessons.dimmer.code.led}}

void setup() {
  Serial.begin(115200);
  analogWriteRange(255);  // {{t:lessons.dimmer.code.range}}
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int raw = analogRead(KNOB);             // {{t:lessons.dimmer.code.read}}
  int duty = map(raw, 0, 1023, 0, 255);   // {{t:lessons.dimmer.code.map}}
  analogWrite(LED_PIN, duty);
  Serial.print("knob=");
  Serial.print(raw);
  Serial.print(" duty=");
  Serial.println(duty);
  delay({{p:every}});
}
`,
      libraries: [],
    },
    params: [
      { id: 'every', kind: 'number', label: 'lessons.dimmer.params.every.label', default: 200, min: 20, max: 1000, step: 20, unit: 'ms' },
    ],
    circuit: 'dimmer',
    world: {
      inputs: [
        { id: 'knob', quantity: 'angle-deg', device: { kind: 'pot', ohms: 10000 }, pins: ['A0'], part: 'POT101', min: 0, max: 270, step: 1, default: 135, unit: '°', gesture: 'knob', label: 'lessons.dimmer.world.knob' },
      ],
      script: [
        { t: 1000, input: 'knob', value: 270 },
        { t: 2000, input: 'knob', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: ['knob=527 duty=131', 'knob=1023 duty=255', 'knob=0 duty=0'] },
    runMs: 3000,
    checks: [
      { kind: 'pwm', pin: 'D5', duty: [0.45, 0.58], atMs: 800, label: 'lessons.dimmer.checks.1' },
      { kind: 'pwm', pin: 'D5', duty: [0.95, 1], atMs: 1800, label: 'lessons.dimmer.checks.2' },
      { kind: 'serial', match: 'knob=\\d+ duty=\\d+', regex: true, minCount: 10, label: 'lessons.dimmer.checks.3' },
      { kind: 'serial', match: 'duty=0', regex: false, minCount: 1, label: 'lessons.dimmer.checks.4' },
    ],
    variants: [],
    pins: [
      { pin: 'A0', to: 'lessons.dimmer.pins.A0.to', role: 'lessons.dimmer.pins.A0.role', color: 'yellow' },
      { pin: 'D5', to: 'lessons.dimmer.pins.D5.to', role: 'lessons.dimmer.pins.D5.role', color: 'green' },
      { pin: '3V3', to: 'lessons.dimmer.pins.3V3.to', role: 'lessons.dimmer.pins.3V3.role', color: 'red' },
      { pin: 'GND', to: 'lessons.dimmer.pins.GND.to', role: 'lessons.dimmer.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'POT101', text: 'lessons.dimmer.callouts.POT101' },
      { part: 'R14', text: 'lessons.dimmer.callouts.R14' },
      { part: 'LED101', text: 'lessons.dimmer.callouts.LED101' },
    ],
    specs: [
      { label: 'lessons.dimmer.specs.1.label', value: 'lessons.dimmer.specs.1.value' },
      { label: 'lessons.dimmer.specs.2.label', value: 'lessons.dimmer.specs.2.value' },
      { label: 'lessons.dimmer.specs.3.label', value: 'lessons.dimmer.specs.3.value' },
    ],
    features: [
      { icon: 'knob', text: 'lessons.dimmer.features.1' },
      { icon: 'wave', text: 'lessons.dimmer.features.2' },
      { icon: 'ruler', text: 'lessons.dimmer.features.3' },
    ],
    title: 'lessons.dimmer.title',
    lede: 'lessons.dimmer.lede',
    steps: ['lessons.dimmer.steps.1', 'lessons.dimmer.steps.2', 'lessons.dimmer.steps.3', 'lessons.dimmer.steps.4'],
    hints: ['lessons.dimmer.hints.1', 'lessons.dimmer.hints.2', 'lessons.dimmer.hints.3'],
    quiz: {
      id: 'dimmer',
      afterStep: null,
      questions: [
        { id: 'range', q: 'lessons.dimmer.quiz.range.q', options: ['lessons.dimmer.quiz.range.options.1', 'lessons.dimmer.quiz.range.options.2', 'lessons.dimmer.quiz.range.options.3'], answer: 2, why: 'lessons.dimmer.quiz.range.why' },
        { id: 'fullscale', q: 'lessons.dimmer.quiz.fullscale.q', options: ['lessons.dimmer.quiz.fullscale.options.1', 'lessons.dimmer.quiz.fullscale.options.2', 'lessons.dimmer.quiz.fullscale.options.3'], answer: 1, why: 'lessons.dimmer.quiz.fullscale.why' },
        { id: 'map', q: 'lessons.dimmer.quiz.map.q', options: ['lessons.dimmer.quiz.map.options.1', 'lessons.dimmer.quiz.map.options.2', 'lessons.dimmer.quiz.map.options.3'], answer: 0, why: 'lessons.dimmer.quiz.map.why' },
      ],
    },
  },
  {
    id: 'webserver',
    n: 4,
    level: 'wireless',
    language: 'arduino-cpp',
    code: {
      source: `// {{t:lessons.webserver.code.intro}}
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

const char* ssid = "{{p:ssid}}";
const char* password = "";       // {{t:lessons.webserver.code.open}}
const int LED_PIN = D1;

ESP8266WebServer server(80);

void handleRoot() {
  server.send(200, "text/plain", "NodeMCU: try /on or /off");
}

void handleOn() {
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(LED_BUILTIN, LOW);  // {{t:lessons.webserver.code.activelow}}
  server.send(200, "text/plain", "LED on");
}

void handleOff() {
  digitalWrite(LED_PIN, LOW);
  digitalWrite(LED_BUILTIN, HIGH);
  server.send(200, "text/plain", "LED off");
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  WiFi.mode(WIFI_STA);             // {{t:lessons.webserver.code.sta}}
  WiFi.begin(ssid, password);
  Serial.print("Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);                    // {{t:lessons.webserver.code.wait}}
    Serial.print(".");
  }
  Serial.println();
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  server.on("/", handleRoot);
  server.on("/on", handleOn);
  server.on("/off", handleOff);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();           // {{t:lessons.webserver.code.loop}}
}
`,
      libraries: ['ESP8266WiFi', 'ESP8266WebServer'],
    },
    params: [
      {
        id: 'ssid', kind: 'choice', label: 'lessons.webserver.params.ssid.label', default: 'iynk-guest',
        options: [
          { value: 'iynk-guest', code: 'iynk-guest', label: 'lessons.webserver.params.ssid.iynk-guest' },
          { value: 'iynk-5g', code: 'iynk-5G', label: 'lessons.webserver.params.ssid.iynk-5g', note: 'lessons.webserver.params.ssid.note5g' },
        ],
      },
    ],
    circuit: 'webserver',
    world: {
      inputs: [
        { id: 'phone', quantity: 'request', device: { kind: 'network', ssid: 'iynk-guest', ip: '192.168.4.1', requests: ['GET /on', 'GET /off', 'GET /'] }, pins: [], part: 'U1', min: 0, max: 2, step: 1, default: 2, gesture: 'tap', label: 'lessons.webserver.world.phone' },
      ],
      script: [
        { t: 4000, input: 'phone', value: 0 },
        { t: 5000, input: 'phone', value: 1 },
        { t: 6000, input: 'phone', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: ['Connecting...', 'IP address: 192.168.4.216', 'HTTP server started'] },
    runMs: 7000,
    checks: [
      { kind: 'serial', match: 'IP address: \\d+\\.\\d+\\.\\d+\\.\\d+', regex: true, minCount: 1, byMs: 4000, label: 'lessons.webserver.checks.1' },
      { kind: 'serial', match: 'HTTP server started', regex: false, minCount: 1, byMs: 4000, label: 'lessons.webserver.checks.2' },
      { kind: 'responds', after: { t: 4000, input: 'phone', value: 0 }, pin: 'D1', withinMs: 300, mode: 'out', v: [1, 1], label: 'lessons.webserver.checks.3' },
      { kind: 'responds', after: { t: 5000, input: 'phone', value: 1 }, pin: 'D4', withinMs: 300, mode: 'out', v: [1, 1], label: 'lessons.webserver.checks.4' },
      { kind: 'code', must: ['server.handleClient()', 'WiFi.begin('], mustNot: [], label: 'lessons.webserver.checks.5' },
    ],
    variants: [],
    pins: [
      { pin: 'D1', to: 'lessons.webserver.pins.D1.to', role: 'lessons.webserver.pins.D1.role', color: 'orange' },
      { pin: 'D4', to: 'lessons.webserver.pins.D4.to', role: 'lessons.webserver.pins.D4.role', color: 'blue' },
      { pin: 'GND', to: 'lessons.webserver.pins.GND.to', role: 'lessons.webserver.pins.GND.role', color: 'black' },
    ],
    callouts: [
      { part: 'U1', text: 'lessons.webserver.callouts.U1' },
      { part: 'U4', text: 'lessons.webserver.callouts.U4' },
      { part: 'LED101', text: 'lessons.webserver.callouts.LED101' },
    ],
    specs: [
      { label: 'lessons.webserver.specs.1.label', value: 'lessons.webserver.specs.1.value' },
      { label: 'lessons.webserver.specs.2.label', value: 'lessons.webserver.specs.2.value' },
      { label: 'lessons.webserver.specs.3.label', value: 'lessons.webserver.specs.3.value' },
    ],
    features: [
      { icon: 'wifi', text: 'lessons.webserver.features.1' },
      { icon: 'globe', text: 'lessons.webserver.features.2' },
      { icon: 'bolt', text: 'lessons.webserver.features.3' },
    ],
    title: 'lessons.webserver.title',
    lede: 'lessons.webserver.lede',
    steps: ['lessons.webserver.steps.1', 'lessons.webserver.steps.2', 'lessons.webserver.steps.3', 'lessons.webserver.steps.4'],
    hints: ['lessons.webserver.hints.1', 'lessons.webserver.hints.2', 'lessons.webserver.hints.3'],
    quiz: {
      id: 'webserver',
      afterStep: null,
      questions: [
        { id: 'band', q: 'lessons.webserver.quiz.band.q', options: ['lessons.webserver.quiz.band.options.1', 'lessons.webserver.quiz.band.options.2', 'lessons.webserver.quiz.band.options.3'], answer: 0, why: 'lessons.webserver.quiz.band.why' },
        { id: 'power', q: 'lessons.webserver.quiz.power.q', options: ['lessons.webserver.quiz.power.options.1', 'lessons.webserver.quiz.power.options.2', 'lessons.webserver.quiz.power.options.3'], answer: 1, why: 'lessons.webserver.quiz.power.why' },
        { id: 'loop', q: 'lessons.webserver.quiz.loop.q', options: ['lessons.webserver.quiz.loop.options.1', 'lessons.webserver.quiz.loop.options.2', 'lessons.webserver.quiz.loop.options.3'], answer: 2, why: 'lessons.webserver.quiz.loop.why' },
      ],
    },
  },
] satisfies Lesson[];

const board = {
  lab: 'board',
  id: 'nodemcu',
  maker: 'NodeMCU (open hardware) · ESP8266 by Espressif',
  variants: [],
  mcu: {
    part: 'ESP8266EX (Ai-Thinker ESP-12E module)',
    core: 'Tensilica L106 32-bit (Xtensa), 80 MHz, up to 160 MHz',
    cores: 1,
    clockHz: 80_000_000,
    flashBytes: 4_194_304,
    ramBytes: 51_200,
    target: 'esp8266',
    adcBits: 10,
    wireless: ['wifi'],
    companions: [
      { part: 'CP2102 (Silicon Labs, QFN-28)', role: 'mcu.cp2102' },
      { part: '4 MB SPI NOR flash (25Q32 class, inside the ESP-12E)', role: 'mcu.spi-flash' },
    ],
  },
  logicVolts: 3.3,
  power: {
    inputs: [
      { id: 'usb', connector: 'micro-usb', part: 'U3', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'vin', connector: 'header-pin', part: 'J1', volts: { min: 4.6, max: 15, recommended: [5, 9] }, reverseProtected: false, protection: 'power.vin.protection' },
      { id: 'pin3v3', connector: 'header-pin', part: 'J2', volts: { min: 2.5, max: 3.6, recommended: [3, 3.6] }, reverseProtected: false, protection: 'power.pin3v3.protection' },
    ],
    rails: [
      { name: 'VIN', volts: 4.65, from: 'D1', note: 'power.rails.vin' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 500, from: 'U4', note: 'power.rails.3v3' },
    ],
    io: { perPinMa: 12, note: 'power.io' },
    brownoutVolts: 2.5,
    idleMa: 80,
  },
  pinout: [...j1.map(row('J1')), ...j2.map(row('J2'))],
  leds: [
    { id: 'LED_MOD', label: 'LED_BUILTIN (GPIO2, D4)', color: 'blue', drivenBy: 'D4', activeLow: true, note: 'leds.LED_MOD' },
    { id: 'LED1', label: 'LED_BUILTIN_AUX (GPIO16, D0)', color: 'blue', drivenBy: 'D0', activeLow: true, note: 'leds.LED1' },
  ],
  controls: [
    { id: 'S1', label: 'RST', kind: 'reset', pin: 'RST', activeLow: true, act: 'S1', effect: 'controls.S1' },
    { id: 'S2', label: 'FLASH', kind: 'boot', pin: 'D3', activeLow: true, act: 'S2', effect: 'controls.S2' },
  ],
  displays: [],
  figure: { page: '/figures/boards/nodemcu.html', parts, sheets: ['board', 'breadboard', 'schematic', 'power'] },
  wireables: [
    { part: 'led', supplyVolts: 3.3, note: 'wireables.led.note', caution: 'wireables.led.caution',
      connections: [{ from: 'anode (long leg), through 220 Ω', to: 'D1', color: 'orange' }, { from: 'cathode', to: 'GND', color: 'black' }] },
    { part: 'push-button', supplyVolts: 3.3, note: 'wireables.push-button.note', caution: 'wireables.push-button.caution',
      connections: [{ from: 'leg 1', to: 'D5', color: 'white' }, { from: 'leg 2', to: 'GND', color: 'black' }] },
    { part: 'potentiometer', supplyVolts: 3.3, note: 'wireables.potentiometer.note',
      connections: [{ from: 'end 1', to: '3V3', color: 'red' }, { from: 'wiper', to: 'A0', color: 'yellow' }, { from: 'end 2', to: 'GND', color: 'black' }] },
    { part: 'ldr', supplyVolts: 3.3, note: 'wireables.ldr.note',
      connections: [{ from: 'LDR leg 1', to: '3V3', color: 'red' }, { from: 'LDR leg 2 + 10 kΩ to GND', to: 'A0', color: 'yellow' }] },
    { part: 'tmp36', supplyVolts: 3.3, note: 'wireables.tmp36.note',
      connections: [{ from: '+Vs', to: '3V3', color: 'red' }, { from: 'Vout', to: 'A0', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'piezo-buzzer', supplyVolts: 3.3, note: 'wireables.piezo-buzzer.note',
      connections: [{ from: '+', to: 'D6', color: 'purple' }, { from: '-', to: 'GND', color: 'black' }] },
    { part: 'servo-sg90', supplyVolts: 4.65, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution',
      connections: [{ from: 'orange (signal)', to: 'D5', color: 'orange' }, { from: 'red (+)', to: 'VIN', color: 'red' }, { from: 'brown (GND)', to: 'GND', color: 'brown' }] },
    { part: 'hc-sr04', supplyVolts: 4.65, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution',
      connections: [{ from: 'VCC', to: 'VIN', color: 'red' }, { from: 'Trig', to: 'D5', color: 'green' }, { from: 'Echo, through 1 kΩ / 2 kΩ divider', to: 'D6', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'ssd1306', supplyVolts: 3.3, note: 'wireables.ssd1306.note',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'D1', color: 'yellow' }, { from: 'SDA', to: 'D2', color: 'blue' }] },
    { part: 'mpu6050', supplyVolts: 3.3, note: 'wireables.mpu6050.note', caution: 'wireables.mpu6050.caution',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'D1', color: 'yellow' }, { from: 'SDA', to: 'D2', color: 'blue' }] },
    { part: 'soil-moisture', supplyVolts: 3.3, note: 'wireables.soil-moisture.note',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'AO', to: 'A0', color: 'yellow' }] },
    { part: 'uln2003', supplyVolts: 4.65, note: 'wireables.uln2003.note', caution: 'wireables.uln2003.caution',
      connections: [{ from: 'IN1', to: 'D1', color: 'orange' }, { from: 'IN2', to: 'D2', color: 'yellow' }, { from: 'IN3', to: 'D5', color: 'green' }, { from: 'IN4', to: 'D6', color: 'blue' }, { from: '+ (5-12 V)', to: 'VIN', color: 'red' }, { from: '-', to: 'GND', color: 'black' }] },
  ],
  failures,
  assembly: [
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false,
      title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: true,
      title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'header-j1', kind: 'build', action: { type: 'press', id: 'place', choice: 'j1' }, done: { build: 'tht' }, major: false,
      title: 'assembly.header-j1.title', body: 'assembly.header-j1.body', refusal: 'assembly.header-j1.refusal' },
    { id: 'header-j2', kind: 'build', action: { type: 'press', id: 'place', choice: 'j2' }, done: { build: 'tht' }, major: false,
      title: 'assembly.header-j2.title', body: 'assembly.header-j2.body', refusal: 'assembly.header-j2.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: true,
      title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'plug-usb', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { power: 'usb', status: 'running', 'rails.VIN': 4.7, 'rails.3V3': 3.3 }, major: false,
      title: 'assembly.plug-usb.title', body: 'assembly.plug-usb.body', refusal: 'assembly.plug-usb.refusal' },
    { id: 'upload-blink', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { mode: 'blink', status: 'running', 'leds.LED_MOD': 1 }, major: false,
      title: 'assembly.upload-blink.title', body: 'assembly.upload-blink.body', refusal: 'assembly.upload-blink.refusal' },
    { id: 'download-mode', kind: 'break', action: { type: 'set', state: { press: { id: 'S2', down: true } } }, done: { boot: 'download' }, fault: 'strap-flash-held', major: true,
      title: 'assembly.download-mode.title', body: 'assembly.download-mode.body' },
    { id: 'power-up', kind: 'test', action: { type: 'press', id: 'upload', choice: 'hello' }, done: { mode: 'hello', status: 'running', 'rails.3V3': 3.3 }, major: false,
      title: 'assembly.power-up.title', body: 'assembly.power-up.body', refusal: 'assembly.power-up.refusal' },
  ],
  lessons,
  serial: { baud: 115200, sample: ['NodeMCU ready', 'hello from the ESP8266 #0', 'hello from the ESP8266 #1'] },
  sources: [
    { title: 'NodeMCU DevKit v1.0: Altium design files, schematic and BOM', url: 'https://github.com/nodemcu/nodemcu-devkit-v1.0' },
    { title: 'Espressif ESP8266EX datasheet', url: 'https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf' },
    { title: 'Espressif: ESP8266 reset causes and common fatal exception causes', url: 'https://www.espressif.com/sites/default/files/documentation/esp8266_reset_causes_and_common_fatal_exception_causes_en.pdf' },
    { title: 'esp8266/Arduino core 3.1.2: variants/nodemcu/pins_arduino.h', url: 'https://github.com/esp8266/Arduino/blob/3.1.2/variants/nodemcu/pins_arduino.h' },
    { title: 'esp8266/Arduino core documentation: boards and boot modes', url: 'https://arduino-esp8266.readthedocs.io/en/latest/boards.html' },
    { title: 'Silicon Labs CP2102/9 datasheet', url: 'https://www.silabs.com/documents/public/data-sheets/CP2102-9.pdf' },
    { title: 'onsemi NCP1117 datasheet', url: 'https://www.onsemi.com/pdf/datasheet/ncp1117-d.pdf' },
    { title: 'Advanced Monolithic Systems AMS1117 datasheet', url: 'http://www.advanced-monolithic.com/pdf/ds1117.pdf' },
    { title: 'MicroPython quick reference for the ESP8266', url: 'https://docs.micropython.org/en/latest/esp8266/quickref.html' },
    { title: 'esptool (Espressif)', url: 'https://github.com/espressif/esptool' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
} satisfies BoardContent;

export default board;
