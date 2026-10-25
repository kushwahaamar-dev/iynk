// BBC micro:bit V2 (V2.21). Facts: docs/facts/microbit-v2.md; figure: figures/boards/microbit-v2.js.
// Text fields are keys into src/i18n/content/<lang>/boards/microbit-v2.json.
import type { BoardContent, Check, Lesson, Mcu, PinCap, PinRow, Quiz, WorldInput } from '@/content/schema';

// The edge connector left to right, seen from the front: 25 positions, five of them the big rings (fact sheet section 4).
type Io = { label: string; functions: string[]; caps: PinCap[]; note?: string };
const io = (label: string, functions: string[], caps: PinCap[], note?: string): Io => ({ label, functions, caps, note });
const COLUMN = 'pins.edge.column';
const EDGE: (Io | 'ring' | '3V' | 'GND')[] = [
  io('P3', ['LED column 3', 'AIN7', 'PWM'], ['digital', 'analog-in', 'pwm', 'led'], COLUMN),
  'ring',
  io('P4', ['LED column 1', 'AIN4', 'PWM'], ['digital', 'analog-in', 'pwm', 'led'], COLUMN),
  io('P5', ['Button A'], ['digital', 'interrupt'], 'pins.edge.button'),
  io('P6', ['LED column 4'], ['digital', 'led'], COLUMN),
  io('P7', ['LED column 2'], ['digital', 'led'], COLUMN),
  'ring',
  io('P8', ['GPIO', 'PWM', 'UART'], ['digital', 'pwm', 'uart', 'interrupt']),
  io('P9', ['GPIO', 'PWM', 'UART', 'NFC1'], ['digital', 'pwm', 'uart'], 'pins.edge.p9'),
  io('P10', ['LED column 5', 'AIN6'], ['digital', 'analog-in', 'led'], COLUMN),
  io('P11', ['Button B'], ['digital', 'interrupt'], 'pins.edge.button'),
  io('P12', ['Accessibility'], ['digital'], 'pins.edge.p12'),
  'ring',
  io('P13', ['GPIO', 'SPI SCK', 'PWM', 'UART'], ['digital', 'spi', 'pwm', 'uart', 'interrupt']),
  io('P14', ['GPIO', 'SPI MISO', 'PWM', 'UART'], ['digital', 'spi', 'pwm', 'uart', 'interrupt']),
  io('P15', ['GPIO', 'SPI MOSI', 'PWM', 'UART'], ['digital', 'spi', 'pwm', 'uart', 'interrupt']),
  io('P16', ['GPIO', 'PWM', 'UART'], ['digital', 'pwm', 'uart', 'interrupt']),
  '3V',
  'ring',
  '3V',
  io('P19', ['I2C SCL (external bus)', 'GPIO', 'PWM'], ['i2c', 'digital', 'pwm'], 'pins.edge.i2c'),
  io('P20', ['I2C SDA (external bus)', 'GPIO', 'PWM'], ['i2c', 'digital', 'pwm'], 'pins.edge.i2c'),
  'GND',
  'ring',
  'GND',
];
const RINGS: PinRow[] = [
  { header: 'ring', pin: '0', label: 'P0', functions: ['AIN0', 'Touch', 'PWM', 'UART', 'Sound out'], caps: ['digital', 'analog-in', 'touch', 'pwm', 'uart', 'interrupt'], volts: 3.3, maxCurrentMa: 4, net: 'P0', note: 'pins.ring.p0' },
  { header: 'ring', pin: '1', label: 'P1', functions: ['AIN1', 'Touch', 'PWM', 'UART'], caps: ['digital', 'analog-in', 'touch', 'pwm', 'uart', 'interrupt'], volts: 3.3, maxCurrentMa: 4, net: 'P1' },
  { header: 'ring', pin: '2', label: 'P2', functions: ['AIN2', 'Touch', 'PWM', 'UART'], caps: ['digital', 'analog-in', 'touch', 'pwm', 'uart', 'interrupt'], volts: 3.3, maxCurrentMa: 4, net: 'P2' },
  { header: 'ring', pin: '3V', label: '3V', functions: ['3.3 V out, 3 V in'], caps: ['power'], volts: 3.3, maxCurrentMa: 190, net: '3V', note: 'pins.ring.3v' },
  { header: 'ring', pin: 'GND', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
];
const strips = (): PinRow[] => EDGE.flatMap((e, i): PinRow[] => {
  const pin = String(i + 1);
  if (e === 'ring') return [];
  if (e === '3V') return [{ header: 'edge', pin, label: '3V', functions: ['3.3 V'], caps: ['power'], volts: 3.3, net: '3V', note: 'pins.edge.guard' }];
  if (e === 'GND') return [{ header: 'edge', pin, label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' }];
  return [{ header: 'edge', pin, label: e.label, functions: e.functions, caps: e.caps, volts: 3.3, maxCurrentMa: 4, net: e.label, ...(e.note ? { note: e.note } : {}) }];
});

const NRF52833: Mcu = {
  part: 'nRF52833-QIAA', core: 'Arm Cortex-M4F', cores: 1, clockHz: 64_000_000, flashBytes: 512 * 1024, ramBytes: 128 * 1024,
  target: 'nrf52', adcBits: 10, wireless: ['ble'],
  companions: [
    { part: 'nRF52820-QDAA', role: 'mcu.nrf52820' },
    { part: 'LSM303AGR', role: 'mcu.lsm303agr' },
    { part: 'NCP114', role: 'mcu.ncp114' },
  ],
};

// Lessons: MicroPython for micro:bit V2 (v2.1.2), `from microbit import *` in every program.
const BLINK_PY = `# {{t:lessons.blink.code.top}}
from microbit import *

while True:
    display.set_pixel(2, 2, 9)    # {{t:lessons.blink.code.pixel}}
    pin1.write_digital(1)         # {{t:lessons.blink.code.pin}}
    sleep({{p:ms}})
    display.set_pixel(2, 2, 0)
    pin1.write_digital(0)
    sleep({{p:ms}})
`;

const BUTTONS_PY = `# {{t:lessons.buttons.code.top}}
from microbit import *

count = 0
while True:
    if button_a.was_pressed():    # {{t:lessons.buttons.code.was}}
        count += 1
        display.show(Image.HAPPY)
        print("A pressed", count)
    if button_b.is_pressed():     # {{t:lessons.buttons.code.is}}
        pin1.write_digital(1)
        display.show(Image.SAD)
    else:
        pin1.write_digital(0)
    sleep({{p:poll}})
`;

const DIMMER_PY = `# {{t:lessons.dimmer.code.top}}
from microbit import *

while True:
    raw = pin2.read_analog()      # {{t:lessons.dimmer.code.read}}
    pin1.write_analog(raw)        # {{t:lessons.dimmer.code.write}}
    bars = (raw + 1) * 5 // 1024  # {{t:lessons.dimmer.code.bars}}
    for x in range(5):
        display.set_pixel(x, 4, 9 if x < bars else 0)
    print("raw", raw, "volts", round(raw * 3.3 / 1023, 2))
    sleep({{p:every}})
`;

const TILT_PY = `# {{t:lessons.tilt.code.top}}
from microbit import *

DEAD = {{p:dead}}                 # {{t:lessons.tilt.code.dead}}

while True:
    y = accelerometer.get_y()     # {{t:lessons.tilt.code.read}}
    if y > DEAD:
        display.show(Image.ARROW_N)
        print("y", y, "logo down")
    elif y < -DEAD:
        display.show(Image.ARROW_S)
        print("y", y, "pins down")
    else:
        display.clear()
        display.set_pixel(2, 2, 9)
        print("y", y, "level")
    sleep(200)
`;

const TOUCH_PY = `# {{t:lessons.touch-tune.code.top}}
from microbit import *
import music

touches = 0
while True:
    if pin_logo.is_touched():     # {{t:lessons.touch-tune.code.touch}}
        touches += 1
        display.show(Image.MUSIC_CROTCHET)
        print("touched", touches)
        music.pitch({{p:hz}}, 200)    # {{t:lessons.touch-tune.code.pitch}}
        while pin_logo.is_touched():  # {{t:lessons.touch-tune.code.wait}}
            sleep(10)
        display.clear()
    if button_a.was_pressed():
        print("touches", touches, "temperature", temperature())
    sleep(20)
`;

const lessonText = (id: string, steps: number, hints: number, specs: number, features: string[]) => ({
  title: `lessons.${id}.title`, lede: `lessons.${id}.lede`,
  steps: Array.from({ length: steps }, (_, i) => `lessons.${id}.steps.${i + 1}`),
  hints: Array.from({ length: hints }, (_, i) => `lessons.${id}.hints.${i + 1}`),
  specs: Array.from({ length: specs }, (_, i) => ({ label: `lessons.${id}.specs.${i + 1}.label`, value: `lessons.${id}.specs.${i + 1}.value` })),
  features: features.map((icon, i) => ({ icon, text: `lessons.${id}.features.${i + 1}` })),
});
const chk = (id: string, n: number) => `lessons.${id}.checks.${n}`;
const quiz = (lesson: string, answers: [number, number, number]): Quiz => ({
  id: `${lesson}-quiz`, afterStep: null,
  questions: answers.map((answer, i) => {
    const key = `lessons.${lesson}.quiz.q${i + 1}`;
    return { id: `q${i + 1}`, q: `${key}.q`, options: [`${key}.options.1`, `${key}.options.2`, `${key}.options.3`], answer, why: `${key}.why` };
  }),
});

// Buttons A and B have 10 k pull-ups on the board and read LOW when pressed; the runtime debounces them itself.
const button = (id: string, pin: string, part: string, label: string): WorldInput => ({
  id, quantity: 'button', device: { kind: 'button', pull: 'external-up', bounceMs: 0 }, pins: [pin], part, min: 0, max: 1, step: 1, default: 0, gesture: 'press', label,
});

const blinkChecks: Check[] = [
  { kind: 'runs', minMs: 3000, label: chk('blink', 1) },
  { kind: 'pin-toggles', pin: 'P1', periodMs: [950, 1050], minCycles: 2, label: chk('blink', 2) },
  { kind: 'code', must: ['from microbit import', 'display.set_pixel', 'pin1.write_digital'], mustNot: [], label: chk('blink', 3) },
];

const lessons: Lesson[] = [
  {
    id: 'blink', n: 1, level: 'io', language: 'micropython',
    code: { source: BLINK_PY, libraries: ['microbit'] },
    params: [{ id: 'ms', kind: 'number', label: 'lessons.blink.params.ms.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' }],
    circuit: 'blink',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: [] },
    runMs: 4000,
    checks: blinkChecks,
    variants: [],
    pins: [
      { pin: 'P1', to: 'lessons.blink.pins.P1.to', role: 'lessons.blink.pins.P1.role', color: 'yellow' },
      { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'LEDS', text: 'lessons.blink.callouts.LEDS' }, { part: 'LED1', text: 'lessons.blink.callouts.LED1' }, { part: 'R1', text: 'lessons.blink.callouts.R1' }],
    ...lessonText('blink', 4, 3, 3, ['led', 'code', 'clock']),
    quiz: quiz('blink', [1, 0, 2]),
  },
  {
    id: 'buttons', n: 2, level: 'input', language: 'micropython',
    code: { source: BUTTONS_PY, libraries: ['microbit'] },
    params: [{ id: 'poll', kind: 'number', label: 'lessons.buttons.params.poll.label', default: 20, min: 10, max: 200, step: 10, unit: 'ms' }],
    circuit: 'buttons',
    world: {
      inputs: [button('a', 'P5', 'SW2', 'lessons.buttons.world.a'), button('b', 'P11', 'SW3', 'lessons.buttons.world.b')],
      script: [
        { t: 500, input: 'a', value: 1 }, { t: 700, input: 'a', value: 0 },
        { t: 1200, input: 'a', value: 1 }, { t: 1400, input: 'a', value: 0 },
        { t: 2000, input: 'b', value: 1 }, { t: 2600, input: 'b', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: ['A pressed 1', 'A pressed 2'] },
    runMs: 3200,
    checks: [
      { kind: 'serial', match: 'A pressed 2', regex: false, minCount: 1, label: chk('buttons', 1) },
      { kind: 'responds', after: { t: 2000, input: 'b', value: 1 }, pin: 'P1', withinMs: 50, mode: 'out', v: [1, 1], label: chk('buttons', 2) },
      { kind: 'pin-level', pin: 'P1', level: 0, atMs: 3000, label: chk('buttons', 3) },
      { kind: 'code', must: ['button_a.was_pressed()', 'button_b.is_pressed()'], mustNot: [], label: chk('buttons', 4) },
    ],
    variants: [],
    pins: [
      { pin: 'P5', to: 'lessons.buttons.pins.P5.to', role: 'lessons.buttons.pins.P5.role', color: 'grey' },
      { pin: 'P11', to: 'lessons.buttons.pins.P11.to', role: 'lessons.buttons.pins.P11.role', color: 'grey' },
      { pin: 'P1', to: 'lessons.buttons.pins.P1.to', role: 'lessons.buttons.pins.P1.role', color: 'yellow' },
      { pin: 'GND', to: 'lessons.buttons.pins.GND.to', role: 'lessons.buttons.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'SW2', text: 'lessons.buttons.callouts.SW2' }, { part: 'SW3', text: 'lessons.buttons.callouts.SW3' }],
    ...lessonText('buttons', 4, 3, 3, ['button', 'terminal', 'led']),
    quiz: quiz('buttons', [2, 1, 0]),
  },
  {
    id: 'dimmer', n: 3, level: 'analog', language: 'micropython',
    code: { source: DIMMER_PY, libraries: ['microbit'] },
    params: [{ id: 'every', kind: 'number', label: 'lessons.dimmer.params.every.label', default: 250, min: 50, max: 1000, step: 50, unit: 'ms' }],
    circuit: 'dimmer',
    world: {
      inputs: [
        { id: 'pot', quantity: 'voltage', device: { kind: 'pot', ohms: 10000 }, pins: ['P2'], part: 'POT1', min: 0, max: 3.3, step: 0.01, default: 0, unit: 'V', gesture: 'knob', label: 'lessons.dimmer.world.pot' },
      ],
      script: [{ t: 500, input: 'pot', value: 1.65 }, { t: 2000, input: 'pot', value: 3.3 }],
    },
    serial: { baud: 115200, sample: ['raw 0 volts 0.0', 'raw 512 volts 1.65', 'raw 1023 volts 3.3'] },
    runMs: 3000,
    checks: [
      { kind: 'pwm', pin: 'P1', duty: [0.45, 0.55], atMs: 1500, label: chk('dimmer', 1) },
      { kind: 'pwm', pin: 'P1', duty: [0.95, 1], atMs: 2800, label: chk('dimmer', 2) },
      { kind: 'serial', match: 'raw \\d+ volts', regex: true, minCount: 4, label: chk('dimmer', 3) },
      { kind: 'code', must: ['pin2.read_analog()', 'pin1.write_analog('], mustNot: [], label: chk('dimmer', 4) },
    ],
    variants: [],
    pins: [
      { pin: 'P2', to: 'lessons.dimmer.pins.P2.to', role: 'lessons.dimmer.pins.P2.role', color: 'green' },
      { pin: '3V', to: 'lessons.dimmer.pins.3V.to', role: 'lessons.dimmer.pins.3V.role', color: 'red' },
      { pin: 'GND', to: 'lessons.dimmer.pins.GND.to', role: 'lessons.dimmer.pins.GND.role', color: 'black' },
      { pin: 'P1', to: 'lessons.dimmer.pins.P1.to', role: 'lessons.dimmer.pins.P1.role', color: 'yellow' },
    ],
    callouts: [{ part: 'POT1', text: 'lessons.dimmer.callouts.POT1' }, { part: 'LED1', text: 'lessons.dimmer.callouts.LED1' }],
    ...lessonText('dimmer', 4, 3, 3, ['dial', 'wave', 'chart']),
    quiz: quiz('dimmer', [0, 2, 1]),
  },
  {
    id: 'tilt', n: 4, level: 'protocol', language: 'micropython',
    code: { source: TILT_PY, libraries: ['microbit'] },
    params: [{ id: 'dead', kind: 'number', label: 'lessons.tilt.params.dead.label', default: 300, min: 100, max: 900, step: 100, unit: 'mg' }],
    circuit: null,
    world: {
      inputs: [
        { id: 'tilt', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x19 }, pins: [], part: 'U6', min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'lessons.tilt.world.tilt' },
      ],
      script: [{ t: 700, input: 'tilt', value: 30 }, { t: 1500, input: 'tilt', value: -45 }],
    },
    serial: { baud: 115200, sample: ['y 0 level', 'y 500 logo down', 'y -707 pins down'] },
    runMs: 2400,
    checks: [
      { kind: 'serial', match: 'y 0 level', regex: false, minCount: 2, label: chk('tilt', 1) },
      { kind: 'serial', match: 'y 500 logo down', regex: false, minCount: 2, label: chk('tilt', 2) },
      { kind: 'serial', match: 'y -707 pins down', regex: false, minCount: 2, label: chk('tilt', 3) },
      { kind: 'code', must: ['accelerometer.get_y()'], mustNot: [], label: chk('tilt', 4) },
    ],
    variants: [],
    pins: [],
    callouts: [{ part: 'U6', text: 'lessons.tilt.callouts.U6' }, { part: 'LEDS', text: 'lessons.tilt.callouts.LEDS' }],
    ...lessonText('tilt', 4, 3, 3, ['compass', 'bus', 'chip']),
    quiz: quiz('tilt', [1, 2, 0]),
  },
  {
    id: 'touch-tune', n: 5, level: 'project', language: 'micropython',
    code: { source: TOUCH_PY, libraries: ['microbit', 'music'] },
    params: [{ id: 'hz', kind: 'number', label: 'lessons.touch-tune.params.hz.label', default: 880, min: 220, max: 1760, step: 10, unit: 'Hz' }],
    circuit: null,
    world: {
      inputs: [
        { id: 'logo', quantity: 'touch', device: { kind: 'button', pull: 'external-up', bounceMs: 0 }, pins: ['P201'], part: 'LOGO', min: 0, max: 1, step: 1, default: 0, gesture: 'tap', label: 'lessons.touch-tune.world.logo' },
        button('a', 'P5', 'SW2', 'lessons.touch-tune.world.a'),
      ],
      script: [
        { t: 500, input: 'logo', value: 1 }, { t: 800, input: 'logo', value: 0 },
        { t: 1500, input: 'logo', value: 1 }, { t: 1700, input: 'logo', value: 0 },
        { t: 2300, input: 'a', value: 1 }, { t: 2400, input: 'a', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: ['touched 1', 'touched 2', 'touches 2 temperature 24'] },
    runMs: 3000,
    checks: [
      { kind: 'serial', match: 'touched 1', regex: false, minCount: 1, label: chk('touch-tune', 1) },
      { kind: 'serial', match: 'touched 2', regex: false, minCount: 1, label: chk('touch-tune', 2) },
      { kind: 'serial', match: 'touches 2 temperature -?\\d+', regex: true, minCount: 1, label: chk('touch-tune', 3) },
      { kind: 'code', must: ['pin_logo.is_touched()', 'music.pitch(', 'temperature()'], mustNot: [], label: chk('touch-tune', 4) },
    ],
    variants: [],
    pins: [{ pin: 'P0', to: 'lessons.touch-tune.pins.P0.to', role: 'lessons.touch-tune.pins.P0.role', color: 'orange' }],
    callouts: [{ part: 'LOGO', text: 'lessons.touch-tune.callouts.LOGO' }, { part: 'SP1', text: 'lessons.touch-tune.callouts.SP1' }],
    ...lessonText('touch-tune', 4, 3, 3, ['hand', 'music', 'thermometer']),
    quiz: quiz('touch-tune', [2, 0, 1]),
  },
];

const microbit = {
  lab: 'board',
  id: 'microbit-v2',
  maker: 'Micro:bit Educational Foundation',
  variants: [],
  mcu: NRF52833,
  logicVolts: 3.3,
  power: {
    inputs: [
      { id: 'usb', connector: 'micro-usb', part: 'J3', volts: { min: 4.5, max: 5.5 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'battery', connector: 'jst-ph-2', part: 'J2', volts: { min: 1.8, max: 3.6, recommended: [2.4, 3.2] }, reverseProtected: true, protection: 'power.battery.protection' },
      { id: 'ring3v', connector: 'header-pin', part: 'RING3V', volts: { min: 1.8, max: 3.6 }, reverseProtected: false, protection: 'power.ring3v.protection' },
    ],
    rails: [
      { name: 'VBUS', volts: 5, from: 'J3', note: 'power.rails.vbus' },
      { name: 'VCOMBINED', volts: 4.7, from: 'D51', note: 'power.rails.vcombined' },
      { name: '3V', volts: 3.3, maxCurrentMa: 300, from: 'U3', note: 'power.rails.3v' },
    ],
    io: { perPinMa: 4, totalMa: 190, note: 'power.io' },
    brownoutVolts: 1.7,
    idleMa: 30,
  },
  pinout: [...RINGS, ...strips()],
  leds: [
    { id: 'D60', label: 'Power', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.D60' },
    { id: 'D61', label: 'USB', color: 'yellow', drivenBy: 'usb-rx', activeLow: false, note: 'leds.D61' },
    { id: 'D70', label: 'Microphone', color: 'red', drivenBy: 'RUN_MIC', activeLow: false, note: 'leds.D70' },
  ],
  controls: [
    { id: 'SW2', label: 'A', kind: 'user-button', pin: 'P5', activeLow: true, act: 'SW2', effect: 'controls.SW2' },
    { id: 'SW3', label: 'B', kind: 'user-button', pin: 'P11', activeLow: true, act: 'SW3', effect: 'controls.SW3' },
    { id: 'LOGO', label: 'Logo', kind: 'touch', activeLow: true, act: 'LOGO', effect: 'controls.LOGO' },
    { id: 'SW1', label: 'RESET', kind: 'reset', activeLow: true, act: 'SW1', effect: 'controls.SW1' },
  ],
  displays: [
    { id: 'LEDS', kind: 'led-matrix', size: [5, 5], pins: ['ROW1', 'ROW2', 'ROW3', 'ROW4', 'ROW5', 'P4', 'P7', 'P3', 'P6', 'P10'], activeLow: false, note: 'displays.LEDS' },
  ],
  figure: {
    page: '/figures/boards/microbit-v2.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'U2', short: 'nRF52833', role: 'mcu', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'X1', short: '32 MHz', role: 'crystal', name: 'parts.X1.name', what: 'parts.X1.what' },
      { id: 'U5', short: 'nRF52820', role: 'usb-bridge', name: 'parts.U5.name', what: 'parts.U5.what' },
      { id: 'U3', short: 'LDO', role: 'regulator', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'D51', short: 'D51', role: 'protection', name: 'parts.D51.name', what: 'parts.D51.what' },
      { id: 'D59', short: 'D59', role: 'protection', name: 'parts.D59.name', what: 'parts.D59.what' },
      { id: 'D1', short: 'D1', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'L5', short: 'L5', role: 'passive', name: 'parts.L5.name', what: 'parts.L5.what' },
      { id: 'D62', short: 'ESD', role: 'protection', name: 'parts.D62.name', what: 'parts.D62.what' },
      { id: 'J3', short: 'USB', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J2', short: 'BATTERY', role: 'connector', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'SW1', short: 'RESET', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'SW2', short: 'A', role: 'button', name: 'parts.SW2.name', what: 'parts.SW2.what' },
      { id: 'SW3', short: 'B', role: 'button', name: 'parts.SW3.name', what: 'parts.SW3.what' },
      { id: 'LOGO', short: 'LOGO', role: 'sensor', name: 'parts.LOGO.name', what: 'parts.LOGO.what' },
      { id: 'LEDS', short: '5 x 5 LEDS', role: 'display', name: 'parts.LEDS.name', what: 'parts.LEDS.what' },
      { id: 'D60', short: 'PWR', role: 'led', name: 'parts.D60.name', what: 'parts.D60.what' },
      { id: 'D61', short: 'USB LED', role: 'led', name: 'parts.D61.name', what: 'parts.D61.what' },
      { id: 'D70', short: 'MIC LED', role: 'led', name: 'parts.D70.name', what: 'parts.D70.what' },
      { id: 'U6', short: 'MOTION', role: 'sensor', name: 'parts.U6.name', what: 'parts.U6.what' },
      { id: 'U4', short: 'MIC', role: 'sensor', name: 'parts.U4.name', what: 'parts.U4.what' },
      { id: 'SP1', short: 'SPEAKER', role: 'other', name: 'parts.SP1.name', what: 'parts.SP1.what' },
      { id: 'T2', short: 'T2', role: 'driver', name: 'parts.T2.name', what: 'parts.T2.what' },
      { id: 'D5', short: 'D5', role: 'protection', name: 'parts.D5.name', what: 'parts.D5.what' },
      { id: 'ANT', short: 'ANTENNA', role: 'antenna', name: 'parts.ANT.name', what: 'parts.ANT.what' },
      { id: 'RF', short: 'RF MATCH', role: 'passive', name: 'parts.RF.name', what: 'parts.RF.what' },
      { id: 'RLED', short: 'R38 R39', role: 'passive', name: 'parts.RLED.name', what: 'parts.RLED.what' },
      { id: 'TVS', short: 'ESD', role: 'protection', name: 'parts.TVS.name', what: 'parts.TVS.what' },
      { id: 'TR', short: 'T1-T7', role: 'other', name: 'parts.TR.name', what: 'parts.TR.what' },
      { id: 'RING0', short: '0', role: 'connector', name: 'parts.RING0.name', what: 'parts.RING0.what' },
      { id: 'RING1', short: '1', role: 'connector', name: 'parts.RING1.name', what: 'parts.RING1.what' },
      { id: 'RING2', short: '2', role: 'connector', name: 'parts.RING2.name', what: 'parts.RING2.what' },
      { id: 'RING3V', short: '3V', role: 'connector', name: 'parts.RING3V.name', what: 'parts.RING3V.what' },
      { id: 'RINGGND', short: 'GND', role: 'connector', name: 'parts.RINGGND.name', what: 'parts.RINGGND.what' },
      { id: 'EDGE', short: 'EDGE', role: 'connector', name: 'parts.EDGE.name', what: 'parts.EDGE.what' },
    ],
  },
  wireables: [
    { part: 'led', connections: [{ from: 'A', to: 'P1', color: 'yellow' }, { from: 'K', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.led.note', caution: 'wireables.led.caution' },
    { part: 'push-button', connections: [{ from: '1', to: 'P8', color: 'yellow' }, { from: '3', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.push-button.note' },
    { part: 'potentiometer', connections: [{ from: '1', to: '3V', color: 'red' }, { from: '2', to: 'P2', color: 'green' }, { from: '3', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.potentiometer.note' },
    { part: 'ldr', connections: [{ from: '1', to: '3V', color: 'red' }, { from: '2', to: 'P0', color: 'yellow' }], supplyVolts: 3.3, note: 'wireables.ldr.note' },
    { part: 'piezo-buzzer', connections: [{ from: '+', to: 'P0', color: 'orange' }, { from: '-', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.piezo-buzzer.note' },
    { part: 'servo-sg90', connections: [{ from: 'signal', to: 'P1', color: 'orange' }, { from: 'V+', to: '3V', color: 'red' }, { from: 'GND', to: 'GND', color: 'brown' }], supplyVolts: 3.3, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution' },
    { part: 'mpu6050', connections: [{ from: 'VCC', to: '3V', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'P19', color: 'yellow' }, { from: 'SDA', to: 'P20', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.mpu6050.note' },
    { part: 'ssd1306', connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V', color: 'red' }, { from: 'SCL', to: 'P19', color: 'yellow' }, { from: 'SDA', to: 'P20', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.ssd1306.note' },
    { part: 'hc-sr04', connections: [{ from: 'VCC', to: '3V', color: 'red' }, { from: 'TRIG', to: 'P13', color: 'orange' }, { from: 'ECHO', to: 'P14', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution' },
  ],
  failures: [
    { id: 'reverse-ring3v', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'ring3v' }, figure: { type: 'set', state: { power: 'ring3v', fault: 'reverse-polarity:ring3v' } },
      effect: { power: 'off', halts: true, damages: ['U2', 'U6'] },
      title: 'failures.reverse-ring3v.title', symptom: 'failures.reverse-ring3v.symptom', explanation: 'failures.reverse-ring3v.explanation', fix: 'failures.reverse-ring3v.fix' },
    { id: 'reverse-battery', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'battery' }, figure: { type: 'set', state: { power: 'batt', fault: 'reverse-polarity:batt' } },
      effect: { power: 'off', halts: true },
      title: 'failures.reverse-battery.title', symptom: 'failures.reverse-battery.symptom', explanation: 'failures.reverse-battery.explanation', fix: 'failures.reverse-battery.fix' },
    { id: 'lipo-on-3v', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'ring3v', volts: 4.2 }, figure: { type: 'set', state: { power: 'ring3v', fault: 'wrong-voltage:ring3v:4.2' } },
      effect: { power: 'on', halts: true, damages: ['U6'] },
      title: 'failures.lipo-on-3v.title', symptom: 'failures.lipo-on-3v.symptom', explanation: 'failures.lipo-on-3v.explanation', fix: 'failures.lipo-on-3v.fix' },
    { id: 'flat-battery', kind: 'brownout', trigger: { by: 'power-input', input: 'battery', volts: 1.8 }, figure: { type: 'set', state: { power: 'batt', fault: 'wrong-voltage:batt:1.8' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.flat-battery.title', symptom: 'failures.flat-battery.symptom', explanation: 'failures.flat-battery.explanation', fix: 'failures.flat-battery.fix' },
    { id: 'overload-3v', kind: 'overcurrent', trigger: { by: 'load', rail: '3V', ma: 350 }, figure: { type: 'set', state: { power: 'usb', fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, extraMa: 350 },
      title: 'failures.overload-3v.title', symptom: 'failures.overload-3v.symptom', explanation: 'failures.overload-3v.explanation', fix: 'failures.overload-3v.fix' },
    { id: 'short-3v', kind: 'short', trigger: { by: 'short', nets: ['3V', 'GND'] }, figure: { type: 'set', state: { power: 'usb', fault: 'short:3V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-3v.title', symptom: 'failures.short-3v.symptom', explanation: 'failures.short-3v.explanation', fix: 'failures.short-3v.fix' },
    { id: 'five-volt-pin', kind: 'level-mismatch', trigger: { by: 'wiring', part: 'hc-sr04', from: 'ECHO', to: 'P0' }, figure: { type: 'set', state: { power: 'pin5v' } },
      effect: { power: 'on', halts: true, damages: ['U2', 'U6'] },
      title: 'failures.five-volt-pin.title', symptom: 'failures.five-volt-pin.symptom', explanation: 'failures.five-volt-pin.explanation', fix: 'failures.five-volt-pin.fix' },
    { id: 'loose-clip', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'RING1', pin: 'RING1.1' }, figure: { type: 'set', state: { power: 'usb', circuit: 'blink', mode: 'blink', fault: 'cold:RING1.1' } },
      effect: { power: 'on', halts: false, pins: { P1: 'noisy' } },
      title: 'failures.loose-clip.title', symptom: 'failures.loose-clip.symptom', explanation: 'failures.loose-clip.explanation', fix: 'failures.loose-clip.fix' },
    { id: 'no-crystal', kind: 'missing-part', trigger: { by: 'remove-part', part: 'X1' }, figure: { type: 'set', state: { power: 'usb', fault: 'missing:X1' } },
      effect: { power: 'on', halts: true },
      title: 'failures.no-crystal.title', symptom: 'failures.no-crystal.symptom', explanation: 'failures.no-crystal.explanation', fix: 'failures.no-crystal.fix' },
    { id: 'no-regulator', kind: 'missing-part', trigger: { by: 'remove-part', part: 'U3' }, figure: { type: 'set', state: { power: 'usb', fault: 'missing:U3' } },
      effect: { power: 'off', halts: true },
      title: 'failures.no-regulator.title', symptom: 'failures.no-regulator.symptom', explanation: 'failures.no-regulator.explanation', fix: 'failures.no-regulator.fix' },
  ],
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false, title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'smd' }, major: false, title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'reflow', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false, title: 'assembly.reflow.title', body: 'assembly.reflow.body', refusal: 'assembly.reflow.refusal' },
    { id: 'plug-usb', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { power: 'usb', status: 'running' }, major: false, title: 'assembly.plug-usb.title', body: 'assembly.plug-usb.body' },
    { id: 'rails', kind: 'test', action: { type: 'set', state: { view: 'power' } }, done: { 'rails.VCOMBINED': 4.7, 'rails.3V': 3.3 }, major: false, title: 'assembly.rails.title', body: 'assembly.rails.body' },
    { id: 'flash-blink', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { mode: 'blink', status: 'running' }, major: false, title: 'assembly.flash-blink.title', body: 'assembly.flash-blink.body', refusal: 'assembly.flash-blink.refusal' },
    { id: 'buttons', kind: 'test', action: { type: 'press', id: 'upload', choice: 'buttons' }, done: { mode: 'buttons', status: 'running' }, major: false, title: 'assembly.buttons.title', body: 'assembly.buttons.body' },
    { id: 'battery', kind: 'test', action: { type: 'set', state: { power: 'batt', view: 'board' } }, done: { power: 'batt', status: 'running', 'rails.3V': 3 }, major: false, title: 'assembly.battery.title', body: 'assembly.battery.body' },
    { id: 'serial', kind: 'test', action: { type: 'press', id: 'upload', choice: 'temp' }, done: { mode: 'temp', status: 'running' }, major: false, title: 'assembly.serial.title', body: 'assembly.serial.body' },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, title: 'assembly.exploded.title', body: 'assembly.exploded.body', refusal: 'assembly.exploded.refusal' },
  ],
  lessons,
  serial: { baud: 115200, sample: ['temperature 24 C', 'temperature 24 C', 'temperature 25 C'] },
  sources: [
    { title: 'micro:bit developer docs: 2.2x micro:bit revision', url: 'https://tech.microbit.org/hardware/2-2-revision/' },
    { title: 'micro:bit V2 hardware files (V2.21 schematic and bill of materials)', url: 'https://github.com/microbit-foundation/microbit-v2-hardware' },
    { title: 'micro:bit developer docs: edge connector and pinout', url: 'https://tech.microbit.org/hardware/edge-connector/' },
    { title: 'micro:bit developer docs: power supply', url: 'https://tech.microbit.org/hardware/powersupply/' },
    { title: 'micro:bit developer docs: I2C', url: 'https://tech.microbit.org/hardware/i2c/' },
    { title: 'micro:bit developer docs: DAPLink interface', url: 'https://tech.microbit.org/software/daplink-interface/' },
    { title: 'micro:bit power management spec', url: 'https://github.com/microbit-foundation/spec-power-management' },
    { title: 'CODAL for micro:bit V2 (pin map in model/MicroBitIO.h)', url: 'https://github.com/lancaster-university/codal-microbit-v2' },
    { title: 'Arm DAPLink, micro:bit V2 board files', url: 'https://github.com/ARMmbed/DAPLink' },
    { title: 'MicroPython for micro:bit V2 documentation', url: 'https://microbit-micropython.readthedocs.io/en/v2-docs/' },
    { title: 'MicroPython for micro:bit V2 source', url: 'https://github.com/microbit-foundation/micropython-microbit-v2' },
    { title: 'micro:bit user guide', url: 'https://microbit.org/get-started/user-guide/' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
} satisfies BoardContent;

export default microbit;
