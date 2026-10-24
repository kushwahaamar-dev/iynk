// Raspberry Pi Pico family (Pico, Pico W, Pico 2, Pico 2 W). Facts: docs/facts/pico.md; figure: figures/boards/pico.js.
// Text fields are keys into src/i18n/content/<lang>/boards/pico.json.
import type { BoardContent, BoardPower, Check, Lesson, Mcu, PinCap, PinRow } from '@/content/schema';

// Default hardware functions per GPIO (RP2040 datasheet function table; the RP2350A maps GPIO 0-29 the same way).
const SPI_SIG = ['RX', 'CSn', 'SCK', 'TX'];
const UART0 = [0, 1, 12, 13, 16, 17, 28, 29];
const UART1 = [4, 5, 8, 9, 20, 21, 24, 25];
const functionsOf = (n: number): string[] => {
  const out: string[] = [];
  if (n >= 26 && n <= 28) out.push(`ADC${n - 26}`);
  if (UART0.includes(n)) out.push(`UART0 ${n % 2 ? 'RX' : 'TX'}`);
  if (UART1.includes(n)) out.push(`UART1 ${n % 2 ? 'RX' : 'TX'}`);
  out.push(`I2C${(n % 4) >> 1} ${n % 2 ? 'SCL' : 'SDA'}`);
  out.push(`SPI${(n >= 8 && n <= 15) || n >= 24 ? 1 : 0} ${SPI_SIG[n % 4]}`);
  out.push(`PWM${(n >> 1) % 8}${n % 2 ? 'B' : 'A'}`);
  out.push('PIO');
  return out;
};
const capsOf = (n: number): PinCap[] => {
  const caps: PinCap[] = ['digital', 'pwm', 'interrupt', 'pio', 'i2c', 'spi'];
  if (UART0.includes(n) || UART1.includes(n)) caps.push('uart');
  if (n >= 26 && n <= 28) caps.push('analog-in');
  return caps;
};
const NOTED = new Set([0, 1, 4, 5, 14, 15, 26, 27, 28]);
const gp = (pin: number, n: number, ft: boolean): PinRow => ({
  header: 'edge', pin: String(pin), label: n >= 26 ? `GP${n}_A${n - 26}` : `GP${n}`, functions: functionsOf(n), caps: capsOf(n),
  volts: 3.3, fiveVoltTolerant: ft && n <= 22, maxCurrentMa: 12, net: `GP${n}`,
  ...(NOTED.has(n) ? { note: `pins.edge.gp${n}` } : {}),
});
const gnd = (pin: number): PinRow => ({ header: 'edge', pin: String(pin), label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' });

// Physical pin order (identical on all four boards): pins 1-20 down the left side, 21-40 up the right side.
const pinout = (ft: boolean): PinRow[] => [
  gp(1, 0, ft), gp(2, 1, ft), gnd(3), gp(4, 2, ft), gp(5, 3, ft), gp(6, 4, ft), gp(7, 5, ft), gnd(8), gp(9, 6, ft), gp(10, 7, ft),
  gp(11, 8, ft), gp(12, 9, ft), gnd(13), gp(14, 10, ft), gp(15, 11, ft), gp(16, 12, ft), gp(17, 13, ft), gnd(18), gp(19, 14, ft), gp(20, 15, ft),
  gp(21, 16, ft), gp(22, 17, ft), gnd(23), gp(24, 18, ft), gp(25, 19, ft), gp(26, 20, ft), gp(27, 21, ft), gnd(28), gp(29, 22, ft),
  { header: 'edge', pin: '30', label: 'RUN', functions: ['RUN (reset, active low)'], caps: ['reset'], volts: 3.3, net: 'RUN', note: 'pins.edge.run' },
  gp(31, 26, ft), gp(32, 27, ft),
  { header: 'edge', pin: '33', label: 'AGND', functions: ['Analog ground'], caps: ['gnd'], volts: null, net: 'AGND', note: 'pins.edge.agnd' },
  gp(34, 28, ft),
  { header: 'edge', pin: '35', label: 'ADC_VREF', functions: ['ADC reference'], caps: ['power'], volts: 3.3, net: 'ADC_VREF', note: 'pins.edge.adc-vref' },
  { header: 'edge', pin: '36', label: '3V3', functions: ['3.3 V out'], caps: ['power'], volts: 3.3, maxCurrentMa: 300, net: '3V3', note: 'pins.edge.3v3' },
  { header: 'edge', pin: '37', label: '3V3_EN', functions: ['SMPS enable'], caps: ['power'], volts: 4.7, net: '3V3_EN', note: 'pins.edge.3v3-en' },
  gnd(38),
  { header: 'edge', pin: '39', label: 'VSYS', functions: ['1.8-5.5 V in / out'], caps: ['power'], volts: 4.7, net: 'VSYS', note: 'pins.edge.vsys' },
  { header: 'edge', pin: '40', label: 'VBUS', functions: ['USB 5 V'], caps: ['power', 'usb'], volts: 5, net: 'VBUS', note: 'pins.edge.vbus' },
  { header: 'DEBUG', pin: '1', label: 'SWCLK', functions: ['SWD clock'], caps: ['swd'], volts: 3.3, net: 'SWCLK', note: 'pins.debug.swclk' },
  { header: 'DEBUG', pin: '2', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
  { header: 'DEBUG', pin: '3', label: 'SWDIO', functions: ['SWD data'], caps: ['swd'], volts: 3.3, net: 'SWDIO' },
];

const RP2040: Mcu = {
  part: 'RP2040', core: 'Arm Cortex-M0+ dual-core', cores: 2, clockHz: 133_000_000, flashBytes: 2 * 1024 * 1024, ramBytes: 264 * 1024,
  target: 'rp2040', adcBits: 12, wireless: [],
  companions: [{ part: 'W25Q16JVUXIQ', role: 'mcu.w25q16jv' }, { part: 'RT6150B-33GQW', role: 'mcu.rt6150b' }],
};
const RP2040W: Mcu = {
  ...RP2040, wireless: ['wifi', 'ble', 'bt-classic'],
  companions: [{ part: 'CYW43439', role: 'mcu.cyw43439' }, { part: 'W25Q16JV', role: 'mcu.w25q16jv' }, { part: 'RT6154AGQW', role: 'mcu.rt6154a' }],
};
const RP2350: Mcu = {
  part: 'RP2350A', core: 'Arm Cortex-M33 dual-core (or Hazard3 RISC-V dual-core)', cores: 2, clockHz: 150_000_000, flashBytes: 4 * 1024 * 1024,
  ramBytes: 520 * 1024, target: 'rp2350', adcBits: 12, wireless: [],
  companions: [{ part: 'W25Q32RV', role: 'mcu.w25q32rv' }, { part: 'RT6150', role: 'mcu.rt6150b' }],
};
const RP2350W: Mcu = {
  ...RP2350, wireless: ['wifi', 'ble', 'bt-classic'],
  companions: [{ part: 'CYW43439', role: 'mcu.cyw43439' }, { part: 'W25Q32RVXHJQ', role: 'mcu.w25q32rv' }, { part: 'RT6154AGQW', role: 'mcu.rt6154a' }],
};

const power: BoardPower = {
  inputs: [
    { id: 'usb', connector: 'micro-usb', part: 'J1', volts: { min: 4.5, max: 5.5 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
    { id: 'vbus', connector: 'header-pin', part: 'PINS2', volts: { min: 4.5, max: 5.5 }, reverseProtected: true, protection: 'power.vbus.protection' },
    { id: 'vsys', connector: 'header-pin', part: 'PINS2', volts: { min: 1.8, max: 5.5 }, reverseProtected: false, protection: 'power.vsys.protection' },
  ],
  rails: [
    { name: 'VBUS', volts: 5, from: 'J1', note: 'power.rails.vbus' },
    { name: 'VSYS', volts: 4.7, from: 'D1', note: 'power.rails.vsys' },
    { name: '3V3', volts: 3.3, maxCurrentMa: 300, from: 'U2', note: 'power.rails.3v3' },
  ],
  io: { perPinMa: 12, totalMa: 50, note: 'power.io' },
  brownoutVolts: 1.8,
  idleMa: 8.7,
};

// Lessons: MicroPython first (all four boards run the same pins: docs/facts/pico.md section 7), Arduino C++ last.
const BLINK_PY = `# {{t:lessons.blink.code.top}}
from machine import Pin
import time

led = Pin("LED", Pin.OUT)   # {{t:lessons.blink.code.led}}
ext = Pin(15, Pin.OUT)      # {{t:lessons.blink.code.ext}}

while True:
    led.toggle()
    ext.toggle()
    time.sleep_ms({{p:ms}})
`;

const BUTTON_PY = `# {{t:lessons.button.code.top}}
from machine import Pin, ADC
import time

button = Pin(14, Pin.IN, Pin.PULL_UP)   # {{t:lessons.button.code.pullup}}
led = Pin(15, Pin.OUT)
sensor = ADC(4)                         # {{t:lessons.button.code.sensor}}
last = time.ticks_ms()

while True:
    pressed = button.value() == 0       # {{t:lessons.button.code.pressed}}
    led.value(1 if pressed else 0)
    if time.ticks_diff(time.ticks_ms(), last) >= {{p:every}}:
        last = time.ticks_ms()
        volts = sensor.read_u16() * 3.3 / 65535
        celsius = 27 - (volts - 0.706) / 0.001721
        print("button", "down" if pressed else "up", "temperature", round(celsius, 1), "C")
    time.sleep_ms(10)
`;

const FADE_PY = `# {{t:lessons.fade.code.top}}
from machine import Pin, PWM, ADC
import time

pot = ADC(26)                # {{t:lessons.fade.code.pot}}
led = PWM(Pin(15))
led.freq({{p:freq}})         # {{t:lessons.fade.code.freq}}

while True:
    raw = pot.read_u16()     # {{t:lessons.fade.code.raw}}
    led.duty_u16(raw)
    print("raw", raw, "volts", round(raw * 3.3 / 65535, 2))
    time.sleep_ms(250)
`;

const I2C_PY = `# {{t:lessons.i2c-mpu6050.code.top}}
from machine import Pin, I2C
import time

i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq={{p:freq}})
print("found", i2c.scan())                       # {{t:lessons.i2c-mpu6050.code.scan}}

ADDR = 0x68
i2c.writeto_mem(ADDR, 0x6B, bytes([0]))          # {{t:lessons.i2c-mpu6050.code.wake}}
print("who am i", hex(i2c.readfrom_mem(ADDR, 0x75, 1)[0]))

while True:
    data = i2c.readfrom_mem(ADDR, 0x3F, 2)       # {{t:lessons.i2c-mpu6050.code.read}}
    z = (data[0] << 8) | data[1]
    if z > 32767:
        z -= 65536
    print("accel z", round(z / 16384, 2), "g")
    time.sleep_ms(500)
`;

const WIFI_PY = `# {{t:lessons.wifi.code.top}}
import network
import requests
import time
from machine import Pin

led = Pin("LED", Pin.OUT)    # {{t:lessons.wifi.code.led}}
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("HackTX", "hackathon")

while not wlan.isconnected():
    led.toggle()             # {{t:lessons.wifi.code.wait}}
    time.sleep_ms(250)

led.on()
print("connected", wlan.ifconfig()[0])
reply = requests.get("http://worldtimeapi.org/api/ip")   # {{t:lessons.wifi.code.get}}
print(reply.text)
`;

const BLINK_CPP = `// {{t:lessons.blink-cpp.code.top}}
const int LED_PIN = 15;
unsigned long last = 0;
bool on = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // {{t:lessons.blink-cpp.code.builtin}}
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);           // {{t:lessons.blink-cpp.code.serial}}
}

void loop() {
  unsigned long now = millis();
  if (now - last >= {{p:ms}}) {   // {{t:lessons.blink-cpp.code.nodelay}}
    last = now;
    on = !on;
    digitalWrite(LED_BUILTIN, on ? HIGH : LOW);
    digitalWrite(LED_PIN, on ? HIGH : LOW);
    Serial.print("uptime ms ");
    Serial.println(now);
  }
}
`;

const lessonText = (id: string, steps: number, hints: number, specs: number, features: string[]) => ({
  title: `lessons.${id}.title`, lede: `lessons.${id}.lede`,
  steps: Array.from({ length: steps }, (_, i) => `lessons.${id}.steps.${i + 1}`),
  hints: Array.from({ length: hints }, (_, i) => `lessons.${id}.hints.${i + 1}`),
  specs: Array.from({ length: specs }, (_, i) => ({ label: `lessons.${id}.specs.${i + 1}.label`, value: `lessons.${id}.specs.${i + 1}.value` })),
  features: features.map((icon, i) => ({ icon, text: `lessons.${id}.features.${i + 1}` })),
});
const chk = (id: string, n: number) => `lessons.${id}.checks.${n}`;

const blinkChecks: Check[] = [
  { kind: 'runs', minMs: 3000, label: chk('blink', 1) },
  { kind: 'pin-toggles', pin: 'GP15', periodMs: [950, 1050], minCycles: 2, label: chk('blink', 2) },
  { kind: 'code', must: ['Pin("LED"'], mustNot: ['Pin(25'], label: chk('blink', 3) },
];

const lessons: Lesson[] = [
  {
    id: 'blink', n: 1, level: 'io', language: 'micropython',
    code: { source: BLINK_PY, libraries: [] },
    params: [{ id: 'ms', kind: 'number', label: 'lessons.blink.params.ms.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' }],
    circuit: 'blink',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: [] },
    runMs: 4000,
    checks: blinkChecks,
    variants: [],
    pins: [
      { pin: 'GP15', to: 'lessons.blink.pins.GP15.to', role: 'lessons.blink.pins.GP15.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.blink.pins.GND.to', role: 'lessons.blink.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'D2', text: 'lessons.blink.callouts.D2' }, { part: 'R1', text: 'lessons.blink.callouts.R1' }],
    ...lessonText('blink', 4, 3, 3, ['led', 'code', 'clock']),
  },
  {
    id: 'button', n: 2, level: 'input', language: 'micropython',
    code: { source: BUTTON_PY, libraries: [] },
    params: [{ id: 'every', kind: 'number', label: 'lessons.button.params.every.label', default: 1000, min: 200, max: 5000, step: 100, unit: 'ms' }],
    circuit: 'button',
    world: {
      inputs: [
        { id: 'btn', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['GP14'], part: 'BTN1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.button.world.btn' },
        { id: 'chip', quantity: 'temperature-c', device: { kind: 'onboard', sensor: 'temperature' }, pins: [], part: 'U1', min: -20, max: 85, step: 1, default: 24, unit: '°C', gesture: 'slide', label: 'lessons.button.world.chip' },
      ],
      script: [{ t: 1500, input: 'btn', value: 1 }, { t: 2600, input: 'btn', value: 0 }],
    },
    serial: { baud: 115200, sample: ['button up temperature 24.0 C', 'button down temperature 24.0 C'] },
    runMs: 4000,
    checks: [
      { kind: 'responds', after: { t: 1500, input: 'btn', value: 1 }, pin: 'GP15', withinMs: 50, mode: 'out', v: [1, 1], label: chk('button', 1) },
      { kind: 'pin-level', pin: 'GP15', level: 0, atMs: 3000, label: chk('button', 2) },
      { kind: 'serial', match: 'temperature -?\\d+\\.\\d C', regex: true, minCount: 3, label: chk('button', 3) },
      { kind: 'code', must: ['Pin.PULL_UP', 'ADC(4)'], mustNot: ['PULL_DOWN'], label: chk('button', 4) },
    ],
    variants: [],
    pins: [
      { pin: 'GP14', to: 'lessons.button.pins.GP14.to', role: 'lessons.button.pins.GP14.role', color: 'yellow' },
      { pin: 'GP15', to: 'lessons.button.pins.GP15.to', role: 'lessons.button.pins.GP15.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.button.pins.GND.to', role: 'lessons.button.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'BTN1', text: 'lessons.button.callouts.BTN1' }, { part: 'U1', text: 'lessons.button.callouts.U1' }],
    ...lessonText('button', 4, 3, 3, ['button', 'thermometer', 'terminal']),
  },
  {
    id: 'fade', n: 3, level: 'analog', language: 'micropython',
    code: { source: FADE_PY, libraries: [] },
    params: [{
      id: 'freq', kind: 'choice', label: 'lessons.fade.params.freq.label', default: '1000',
      options: [
        { value: '100', code: '100', label: 'lessons.fade.params.freq.100' },
        { value: '1000', code: '1000', label: 'lessons.fade.params.freq.1000' },
        { value: '20000', code: '20000', label: 'lessons.fade.params.freq.20000' },
      ],
    }],
    circuit: 'fade',
    world: {
      inputs: [
        { id: 'pot', quantity: 'voltage', device: { kind: 'pot', ohms: 10000 }, pins: ['GP26'], part: 'POT1', min: 0, max: 3.3, step: 0.01, default: 0, unit: 'V', gesture: 'knob', label: 'lessons.fade.world.pot' },
      ],
      script: [{ t: 500, input: 'pot', value: 1.65 }, { t: 2000, input: 'pot', value: 3.3 }],
    },
    serial: { baud: 115200, sample: ['raw 0 volts 0.0', 'raw 32775 volts 1.65', 'raw 65535 volts 3.3'] },
    runMs: 3000,
    checks: [
      { kind: 'pwm', pin: 'GP15', duty: [0.45, 0.55], atMs: 1500, label: chk('fade', 1) },
      { kind: 'pwm', pin: 'GP15', duty: [0.95, 1], atMs: 2800, label: chk('fade', 2) },
      { kind: 'serial', match: 'raw \\d+ volts', regex: true, minCount: 4, label: chk('fade', 3) },
    ],
    variants: [],
    pins: [
      { pin: 'GP26', to: 'lessons.fade.pins.GP26.to', role: 'lessons.fade.pins.GP26.role', color: 'yellow' },
      { pin: '3V3', to: 'lessons.fade.pins.3V3.to', role: 'lessons.fade.pins.3V3.role', color: 'red' },
      { pin: 'AGND', to: 'lessons.fade.pins.AGND.to', role: 'lessons.fade.pins.AGND.role', color: 'black' },
      { pin: 'GP15', to: 'lessons.fade.pins.GP15.to', role: 'lessons.fade.pins.GP15.role', color: 'orange' },
    ],
    callouts: [{ part: 'POT1', text: 'lessons.fade.callouts.POT1' }, { part: 'LED1', text: 'lessons.fade.callouts.LED1' }],
    ...lessonText('fade', 4, 3, 3, ['dial', 'wave', 'chart']),
  },
  {
    id: 'i2c-mpu6050', n: 4, level: 'protocol', language: 'micropython',
    code: { source: I2C_PY, libraries: ['mpu6050'] },
    params: [{
      id: 'freq', kind: 'choice', label: 'lessons.i2c-mpu6050.params.freq.label', default: '400000',
      options: [
        { value: '100000', code: '100000', label: 'lessons.i2c-mpu6050.params.freq.100000' },
        { value: '400000', code: '400000', label: 'lessons.i2c-mpu6050.params.freq.400000' },
      ],
    }],
    circuit: 'i2c-mpu6050',
    world: {
      inputs: [
        { id: 'tilt', quantity: 'tilt-deg', device: { kind: 'mpu6050', address: 0x68 }, pins: ['GP4', 'GP5'], part: 'IMU1', min: -90, max: 90, step: 1, default: 0, unit: '°', gesture: 'tilt', label: 'lessons.i2c-mpu6050.world.tilt' },
      ],
      script: [],
    },
    serial: { baud: 115200, sample: ['found [104]', 'who am i 0x68', 'accel z 1.0 g'] },
    runMs: 2000,
    checks: [
      { kind: 'serial', match: 'found [104]', regex: false, minCount: 1, label: chk('i2c-mpu6050', 1) },
      { kind: 'serial', match: 'who am i 0x68', regex: false, minCount: 1, label: chk('i2c-mpu6050', 2) },
      { kind: 'serial', match: 'accel z (0\\.9\\d|1\\.0\\d?) g', regex: true, minCount: 2, label: chk('i2c-mpu6050', 3) },
    ],
    variants: [],
    pins: [
      { pin: 'GP4', to: 'lessons.i2c-mpu6050.pins.GP4.to', role: 'lessons.i2c-mpu6050.pins.GP4.role', color: 'blue' },
      { pin: 'GP5', to: 'lessons.i2c-mpu6050.pins.GP5.to', role: 'lessons.i2c-mpu6050.pins.GP5.role', color: 'yellow' },
      { pin: '3V3', to: 'lessons.i2c-mpu6050.pins.3V3.to', role: 'lessons.i2c-mpu6050.pins.3V3.role', color: 'red' },
      { pin: 'GND', to: 'lessons.i2c-mpu6050.pins.GND.to', role: 'lessons.i2c-mpu6050.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'IMU1', text: 'lessons.i2c-mpu6050.callouts.IMU1' }],
    ...lessonText('i2c-mpu6050', 4, 3, 3, ['bus', 'chip', 'compass']),
  },
  {
    id: 'wifi', n: 5, level: 'wireless', language: 'micropython',
    code: { source: WIFI_PY, libraries: ['network', 'requests'] },
    params: [],
    circuit: null,
    world: {
      inputs: [
        { id: 'net', quantity: 'request', device: { kind: 'network', ssid: 'HackTX', ip: '192.168.4.20', requests: ['GET http://worldtimeapi.org/api/ip'] }, pins: [], part: 'SH1', min: 0, max: 0, step: 1, default: 0, gesture: 'tap', label: 'lessons.wifi.world.net' },
      ],
      script: [],
    },
    serial: { baud: 115200, sample: ['connected 192.168.4.20', '{"datetime":"2026-10-24T12:00:00-05:00"}'] },
    runMs: 6000,
    checks: [
      { kind: 'serial', match: 'connected \\d+\\.\\d+\\.\\d+\\.\\d+', regex: true, minCount: 1, label: chk('wifi', 1) },
      { kind: 'serial', match: 'datetime', regex: false, minCount: 1, label: chk('wifi', 2) },
      { kind: 'code', must: ['Pin("LED"', 'network.WLAN'], mustNot: ['Pin(25'], label: chk('wifi', 3) },
    ],
    variants: ['pico-w', 'pico2-w'],
    pins: [{ pin: 'WL_GPIO0', to: 'lessons.wifi.pins.WL_GPIO0.to', role: 'lessons.wifi.pins.WL_GPIO0.role', color: 'green' }],
    callouts: [{ part: 'SH1', text: 'lessons.wifi.callouts.SH1' }, { part: 'ANT', text: 'lessons.wifi.callouts.ANT' }, { part: 'D2', text: 'lessons.wifi.callouts.D2' }],
    ...lessonText('wifi', 4, 3, 3, ['wifi', 'globe', 'led']),
  },
  {
    id: 'blink-cpp', n: 6, level: 'io', language: 'arduino-cpp',
    code: { source: BLINK_CPP, libraries: [] },
    params: [{ id: 'ms', kind: 'number', label: 'lessons.blink-cpp.params.ms.label', default: 500, min: 50, max: 2000, step: 50, unit: 'ms' }],
    circuit: 'blink-cpp',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: ['uptime ms 500', 'uptime ms 1000', 'uptime ms 1500'] },
    runMs: 3000,
    checks: [
      { kind: 'pin-toggles', pin: 'GP15', periodMs: [950, 1050], minCycles: 2, label: chk('blink-cpp', 1) },
      { kind: 'serial', match: 'uptime ms \\d+', regex: true, minCount: 4, label: chk('blink-cpp', 2) },
      { kind: 'code', must: ['millis()', 'LED_BUILTIN'], mustNot: ['delay('], label: chk('blink-cpp', 3) },
    ],
    variants: [],
    pins: [
      { pin: 'GP15', to: 'lessons.blink-cpp.pins.GP15.to', role: 'lessons.blink-cpp.pins.GP15.role', color: 'orange' },
      { pin: 'GND', to: 'lessons.blink-cpp.pins.GND.to', role: 'lessons.blink-cpp.pins.GND.role', color: 'black' },
    ],
    callouts: [{ part: 'D2', text: 'lessons.blink-cpp.callouts.D2' }],
    ...lessonText('blink-cpp', 4, 3, 3, ['code', 'clock', 'terminal']),
  },
];

const W_LED = { id: 'D2', label: 'LED', color: 'green' as const, drivenBy: 'WL_GPIO0', activeLow: false, note: 'leds.D2-w' };
const ftPatch = pinout(true).filter((r) => r.fiveVoltTolerant);

const pico = {
  lab: 'board',
  id: 'pico',
  maker: 'Raspberry Pi',
  variants: [
    { id: 'pico', name: 'Raspberry Pi Pico', note: 'variants.pico', figureVariant: 'pico' },
    { id: 'pico-w', name: 'Raspberry Pi Pico W', note: 'variants.pico-w', mcu: RP2040W, leds: [W_LED], figureVariant: 'pico-w' },
    { id: 'pico2', name: 'Raspberry Pi Pico 2', note: 'variants.pico2', mcu: RP2350, pinPatch: ftPatch, figureVariant: 'pico2' },
    { id: 'pico2-w', name: 'Raspberry Pi Pico 2 W', note: 'variants.pico2-w', mcu: RP2350W, leds: [W_LED], pinPatch: ftPatch, figureVariant: 'pico2-w' },
  ],
  mcu: RP2040,
  logicVolts: 3.3,
  power,
  pinout: pinout(false),
  leds: [{ id: 'D2', label: 'LED', color: 'green', drivenBy: 'GP25', activeLow: false, note: 'leds.D2' }],
  controls: [{ id: 'SW1', label: 'BOOTSEL', kind: 'bootsel', pin: 'QSPI_SS', activeLow: true, act: 'ctl', effect: 'controls.SW1' }],
  displays: [],
  figure: {
    page: '/figures/boards/pico.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'U1', short: 'RP2040', role: 'mcu', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U3', short: 'FLASH', role: 'memory', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'X1', short: '12 MHz', role: 'crystal', name: 'parts.X1.name', what: 'parts.X1.what' },
      { id: 'U2', short: 'BUCK-BOOST', role: 'regulator', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'L1', short: 'INDUCTOR', role: 'passive', name: 'parts.L1.name', what: 'parts.L1.what' },
      { id: 'C1', short: 'C1', role: 'passive', name: 'parts.C1.name', what: 'parts.C1.what' },
      { id: 'C2', short: 'C2', role: 'passive', name: 'parts.C2.name', what: 'parts.C2.what' },
      { id: 'C3', short: 'C3', role: 'passive', name: 'parts.C3.name', what: 'parts.C3.what' },
      { id: 'D1', short: 'DIODE', role: 'protection', name: 'parts.D1.name', what: 'parts.D1.what' },
      { id: 'Q1', short: 'Q1', role: 'protection', name: 'parts.Q1.name', what: 'parts.Q1.what' },
      { id: 'J1', short: 'USB', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'SW1', short: 'BOOTSEL', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'D2', short: 'LED', role: 'led', name: 'parts.D2.name', what: 'parts.D2.what' },
      { id: 'PINS1', short: 'PINS 1-20', role: 'header', name: 'parts.PINS1.name', what: 'parts.PINS1.what' },
      { id: 'PINS2', short: 'PINS 21-40', role: 'header', name: 'parts.PINS2.name', what: 'parts.PINS2.what' },
      { id: 'H1', short: 'HEADER 1-20', role: 'header', name: 'parts.H1.name', what: 'parts.H1.what' },
      { id: 'H2', short: 'HEADER 21-40', role: 'header', name: 'parts.H2.name', what: 'parts.H2.what' },
      { id: 'J2', short: 'DEBUG', role: 'debugger', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'TP1', short: 'TP1', role: 'other', name: 'parts.TP1.name', what: 'parts.TP1.what' },
      { id: 'TP2', short: 'TP2', role: 'other', name: 'parts.TP2.name', what: 'parts.TP2.what' },
      { id: 'TP4', short: 'TP4', role: 'other', name: 'parts.TP4.name', what: 'parts.TP4.what' },
      { id: 'SH1', short: 'WI-FI', role: 'radio', name: 'parts.SH1.name', what: 'parts.SH1.what' },
      { id: 'ANT', short: 'ANTENNA', role: 'antenna', name: 'parts.ANT.name', what: 'parts.ANT.what' },
    ],
  },
  wireables: [
    { part: 'led', connections: [{ from: 'A', to: 'GP15', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.led.note', caution: 'wireables.led.caution' },
    { part: 'push-button', connections: [{ from: '1', to: 'GP14', color: 'yellow' }, { from: '3', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.push-button.note', caution: 'wireables.push-button.caution' },
    { part: 'potentiometer', connections: [{ from: '1', to: '3V3', color: 'red' }, { from: '2', to: 'GP26', color: 'yellow' }, { from: '3', to: 'AGND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.potentiometer.note', caution: 'wireables.potentiometer.caution' },
    { part: 'ldr', connections: [{ from: '1', to: '3V3', color: 'red' }, { from: '2', to: 'GP27', color: 'yellow' }], supplyVolts: 3.3, note: 'wireables.ldr.note' },
    { part: 'tmp36', connections: [{ from: '+Vs', to: '3V3', color: 'red' }, { from: 'Vout', to: 'GP28', color: 'yellow' }, { from: 'GND', to: 'AGND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.tmp36.note' },
    { part: 'piezo-buzzer', connections: [{ from: '+', to: 'GP18', color: 'orange' }, { from: '-', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.piezo-buzzer.note' },
    { part: 'servo-sg90', connections: [{ from: 'signal', to: 'GP16', color: 'orange' }, { from: 'V+', to: 'VBUS', color: 'red' }, { from: 'GND', to: 'GND', color: 'brown' }], supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution' },
    { part: 'mpu6050', connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'GP5', color: 'yellow' }, { from: 'SDA', to: 'GP4', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.mpu6050.note' },
    { part: 'ssd1306', connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V3', color: 'red' }, { from: 'SCL', to: 'GP5', color: 'yellow' }, { from: 'SDA', to: 'GP4', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.ssd1306.note', caution: 'wireables.ssd1306.caution' },
    { part: 'hc-sr04', connections: [{ from: 'VCC', to: 'VBUS', color: 'red' }, { from: 'TRIG', to: 'GP16', color: 'orange' }, { from: 'ECHO', to: 'GP17', color: 'yellow' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution' },
  ],
  failures: [
    { id: 'reverse-vsys', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'vsys' }, figure: { type: 'set', state: { power: 'vsys', fault: 'reverse-polarity:vsys' } },
      effect: { power: 'off', halts: true, damages: ['U2', 'U1'] },
      title: 'failures.reverse-vsys.title', symptom: 'failures.reverse-vsys.symptom', explanation: 'failures.reverse-vsys.explanation', fix: 'failures.reverse-vsys.fix' },
    { id: 'reverse-vbus', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'vbus' }, figure: { type: 'set', state: { power: 'vbus', fault: 'reverse-polarity:vbus' } },
      effect: { power: 'off', halts: true },
      title: 'failures.reverse-vbus.title', symptom: 'failures.reverse-vbus.symptom', explanation: 'failures.reverse-vbus.explanation', fix: 'failures.reverse-vbus.fix' },
    { id: 'overvolt-vsys', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'vsys', volts: 9 }, figure: { type: 'set', state: { power: 'vsys', fault: 'wrong-voltage:vsys:9' } },
      effect: { power: 'off', halts: true, damages: ['U2', 'U1'] },
      title: 'failures.overvolt-vsys.title', symptom: 'failures.overvolt-vsys.symptom', explanation: 'failures.overvolt-vsys.explanation', fix: 'failures.overvolt-vsys.fix' },
    { id: 'flat-battery', kind: 'brownout', trigger: { by: 'power-input', input: 'vsys', volts: 1.5 }, figure: { type: 'set', state: { power: 'vsys', fault: 'wrong-voltage:vsys:1.5' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.flat-battery.title', symptom: 'failures.flat-battery.symptom', explanation: 'failures.flat-battery.explanation', fix: 'failures.flat-battery.fix' },
    { id: 'brownout-servo', kind: 'brownout', trigger: { by: 'load', rail: '3V3', ma: 450, part: 'servo-sg90' }, figure: { type: 'set', state: { fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, extraMa: 450 },
      title: 'failures.brownout-servo.title', symptom: 'failures.brownout-servo.symptom', explanation: 'failures.brownout-servo.explanation', fix: 'failures.brownout-servo.fix' },
    { id: 'cold-header', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'H1', pin: 'H1.20' }, figure: { type: 'set', state: { fault: 'cold:H1.20' } },
      effect: { power: 'on', halts: false, pins: { GP15: 'noisy' } },
      title: 'failures.cold-header.title', symptom: 'failures.cold-header.symptom', explanation: 'failures.cold-header.explanation', fix: 'failures.cold-header.fix' },
    { id: 'no-crystal', kind: 'missing-part', trigger: { by: 'remove-part', part: 'X1' }, figure: { type: 'set', state: { fault: 'missing:X1' } },
      effect: { power: 'on', halts: true },
      title: 'failures.no-crystal.title', symptom: 'failures.no-crystal.symptom', explanation: 'failures.no-crystal.explanation', fix: 'failures.no-crystal.fix' },
    { id: 'no-output-cap', kind: 'missing-part', trigger: { by: 'remove-part', part: 'C2' }, figure: { type: 'set', state: { fault: 'missing:C2' } },
      effect: { power: 'resetting', halts: true },
      title: 'failures.no-output-cap.title', symptom: 'failures.no-output-cap.symptom', explanation: 'failures.no-output-cap.explanation', fix: 'failures.no-output-cap.fix' },
    { id: 'diode-backwards', kind: 'reversed-part', trigger: { by: 'reverse-part', part: 'D1' }, figure: { type: 'set', state: { fault: 'reversed:D1' } },
      effect: { power: 'off', halts: true },
      title: 'failures.diode-backwards.title', symptom: 'failures.diode-backwards.symptom', explanation: 'failures.diode-backwards.explanation', fix: 'failures.diode-backwards.fix' },
    { id: 'bootsel-held', kind: 'boot-strap', trigger: { by: 'control', control: 'SW1', during: 'boot' }, figure: { type: 'set', state: { power: null, press: { id: 'SW1', down: true } } },
      effect: { power: 'on', halts: true },
      title: 'failures.bootsel-held.title', symptom: 'failures.bootsel-held.symptom', explanation: 'failures.bootsel-held.explanation', fix: 'failures.bootsel-held.fix' },
    { id: 'short-3v3', kind: 'short', trigger: { by: 'short', nets: ['3V3', 'GND'] }, figure: { type: 'set', state: { fault: 'short:3V3:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-3v3.title', symptom: 'failures.short-3v3.symptom', explanation: 'failures.short-3v3.explanation', fix: 'failures.short-3v3.fix' },
    { id: 'five-volt-echo', kind: 'level-mismatch', trigger: { by: 'wiring', part: 'hc-sr04', from: 'ECHO', to: 'GP17' }, figure: { type: 'set', state: { power: 'echo5' } },
      effect: { power: 'off', halts: true, damages: ['U1'] },
      title: 'failures.five-volt-echo.title', symptom: 'failures.five-volt-echo.symptom', explanation: 'failures.five-volt-echo.explanation', fix: 'failures.five-volt-echo.fix' },
  ],
  assembly: [
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false, title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'headers', kind: 'build', action: null, done: { build: 'tht' }, major: false, title: 'assembly.headers.title', body: 'assembly.headers.body', refusal: 'assembly.headers.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false, title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'plug-blank', kind: 'test', action: { type: 'set', state: { mode: 'blank', power: 'usb' } }, done: { power: 'usb', mode: 'blank', status: 'running' }, major: false, title: 'assembly.plug-blank.title', body: 'assembly.plug-blank.body' },
    { id: 'rails', kind: 'test', action: { type: 'set', state: { view: 'power' } }, done: { 'rails.VSYS': 4.7, 'rails.3V3': 3.3 }, major: false, title: 'assembly.rails.title', body: 'assembly.rails.body' },
    { id: 'flash-blink', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { mode: 'blink', status: 'running' }, major: false, title: 'assembly.flash-blink.title', body: 'assembly.flash-blink.body', refusal: 'assembly.flash-blink.refusal' },
    { id: 'led', kind: 'test', action: { type: 'set', state: { view: 'board' } }, done: { 'leds.D2': 1 }, major: false, title: 'assembly.led.title', body: 'assembly.led.body' },
    { id: 'serial', kind: 'test', action: { type: 'press', id: 'upload', choice: 'temp' }, done: { mode: 'temp', status: 'running' }, major: false, title: 'assembly.serial.title', body: 'assembly.serial.body' },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, title: 'assembly.exploded.title', body: 'assembly.exploded.body', refusal: 'assembly.exploded.refusal' },
  ],
  lessons,
  serial: { baud: 115200, sample: ['temperature 27.6 C', 'temperature 27.9 C', 'temperature 28.2 C'] },
  sources: [
    { title: 'Raspberry Pi Pico Datasheet', url: 'https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf' },
    { title: 'Raspberry Pi Pico W Datasheet', url: 'https://datasheets.raspberrypi.com/picow/pico-w-datasheet.pdf' },
    { title: 'Raspberry Pi Pico 2 Datasheet', url: 'https://datasheets.raspberrypi.com/pico/pico-2-datasheet.pdf' },
    { title: 'Raspberry Pi Pico 2 W Datasheet', url: 'https://datasheets.raspberrypi.com/picow/pico-2-w-datasheet.pdf' },
    { title: 'RP2040 Datasheet', url: 'https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf' },
    { title: 'RP2350 Datasheet', url: 'https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf' },
    { title: 'Pico Rev3 design files (BOM, STEP, schematic)', url: 'https://datasheets.raspberrypi.com/pico/RPi-Pico-R3-PUBLIC-20200119.zip' },
    { title: 'Raspberry Pi Pico-series Python SDK', url: 'https://datasheets.raspberrypi.com/pico/raspberry-pi-pico-python-sdk.pdf' },
    { title: 'Raspberry Pi documentation: Pico-series microcontrollers', url: 'https://www.raspberrypi.com/documentation/microcontrollers/pico-series.html' },
    { title: 'MicroPython quick reference for the RP2', url: 'https://docs.micropython.org/en/latest/rp2/quickref.html' },
    { title: 'Arduino-Pico core (Earle Philhower)', url: 'https://github.com/earlephilhower/arduino-pico' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
} satisfies BoardContent;

export default pico;
