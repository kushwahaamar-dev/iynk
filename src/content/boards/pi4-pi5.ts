// Raspberry Pi 5 and Raspberry Pi 4 Model B. Facts: docs/facts/pi4-pi5.md (Raspberry Pi's STEP model, DXF, product
// briefs, datasheet and documentation sources). Figure: figures/boards/pi4-pi5.js, which owns the geometry, build groups,
// power tree, programs and lesson circuits; the ids here (part ids, nets, circuit keys, fault ids) match it.
// Part ids work by function and are the same on both boards (U3 is the RP1 on the Pi 5 and the VL805 on the Pi 4), so
// a part's text names both where they differ. Text fields are keys into src/i18n/content/<lang>/boards/pi4-pi5.json.
import type { BoardContent, BoardPower, Check, Lesson, Mcu, OnboardLed, PinCap, PinRow, Quiz } from '@/content/schema';

/** A lesson's three-question quiz; `answers` are the right option (0-2) of q1, q2, q3. */
const quiz = (lesson: string, answers: [number, number, number]): Quiz => ({
  id: `${lesson}-quiz`,
  afterStep: null,
  questions: answers.map((answer, i) => {
    const key = `lessons.${lesson}.quiz.q${i + 1}`;
    return { id: `q${i + 1}`, q: `${key}.q`, options: [`${key}.options.1`, `${key}.options.2`, `${key}.options.3`], answer, why: `${key}.why` };
  }),
});

// The 40-pin header J8 in physical order (docs/facts/pi4-pi5.md §4): odd pins on the inner row, pin 1 is 3V3.
// Every GPIO is 3.3 V and not 5 V tolerant; gpiozero can run software PWM and edge callbacks on any of them.
const FUNCTIONS: Record<number, string[]> = {
  0: ['ID_SD (HAT EEPROM, reserved)'], 1: ['ID_SC (HAT EEPROM, reserved)'], 2: ['I2C1 SDA'], 3: ['I2C1 SCL'],
  4: ['GPCLK0', '1-Wire (w1-gpio)'], 7: ['SPI0 CE1'], 8: ['SPI0 CE0'], 9: ['SPI0 MISO'], 10: ['SPI0 MOSI'], 11: ['SPI0 SCLK'],
  12: ['PWM0'], 13: ['PWM1'], 14: ['UART0 TXD'], 15: ['UART0 RXD'], 16: ['SPI1 CE2'], 17: ['SPI1 CE1'], 18: ['PCM CLK', 'PWM0'],
  19: ['PCM FS', 'PWM1', 'SPI1 MISO'], 20: ['PCM DIN', 'SPI1 MOSI'], 21: ['PCM DOUT', 'SPI1 SCLK'],
};
const NOTED = new Set([0, 1, 2, 3, 14, 15, 18]);
const capsOf = (n: number): PinCap[] => {
  const caps: PinCap[] = ['digital', 'pwm', 'interrupt'];
  if (n <= 3) caps.push('i2c');
  if ((n >= 7 && n <= 11) || n === 16 || (n >= 19 && n <= 21)) caps.push('spi');
  if (n === 14 || n === 15) caps.push('uart');
  if (n >= 18 && n <= 21) caps.push('i2s');
  if (n === 4) caps.push('clock');
  return caps;
};
const J8: string[] = [
  '3V3', '5V', 'GPIO2', '5V', 'GPIO3', 'GND', 'GPIO4', 'GPIO14', 'GND', 'GPIO15',
  'GPIO17', 'GPIO18', 'GPIO27', 'GND', 'GPIO22', 'GPIO23', '3V3', 'GPIO24', 'GPIO10', 'GND',
  'GPIO9', 'GPIO25', 'GPIO11', 'GPIO8', 'GND', 'GPIO7', 'GPIO0', 'GPIO1', 'GPIO5', 'GND',
  'GPIO6', 'GPIO12', 'GPIO13', 'GND', 'GPIO19', 'GPIO16', 'GPIO26', 'GPIO20', 'GND', 'GPIO21',
];
const row = (net: string, i: number): PinRow => {
  const pin = String(i + 1);
  if (net === 'GND') return { header: 'J8', pin, label: 'GND', functions: [], caps: ['gnd'], volts: null, net };
  if (net === '3V3') return { header: 'J8', pin, label: '3V3', functions: ['3.3 V power'], caps: ['power'], volts: 3.3, net, note: 'pins.j8.3v3' };
  if (net === '5V') return { header: 'J8', pin, label: '5V', functions: ['5 V power (the input rail itself)'], caps: ['power'], volts: 5, net, note: 'pins.j8.5v' };
  const n = Number(net.slice(4));
  return {
    header: 'J8', pin, label: net, functions: FUNCTIONS[n] ?? [], caps: capsOf(n), volts: 3.3, fiveVoltTolerant: false, maxCurrentMa: 16, net,
    ...(NOTED.has(n) ? { note: `pins.j8.gpio${n}` } : {}),
  };
};

const BCM2712: Mcu = {
  part: 'BCM2712', core: 'Arm Cortex-A76 quad-core (64-bit)', cores: 4, clockHz: 2_400_000_000, ramBytes: 4 * 1024 ** 3,
  target: 'linux', wireless: ['wifi', 'ble', 'bt-classic'],
  companions: [{ part: 'RP1', role: 'mcu.rp1' }, { part: 'DA9091', role: 'mcu.da9091' }],
};
const BCM2711: Mcu = {
  part: 'BCM2711', core: 'Arm Cortex-A72 quad-core (64-bit)', cores: 4, clockHz: 1_800_000_000, ramBytes: 4 * 1024 ** 3,
  target: 'linux', wireless: ['wifi', 'ble', 'bt-classic'],
  companions: [{ part: 'VL805', role: 'mcu.vl805' }, { part: 'MxL7704', role: 'mcu.mxl7704' }, { part: 'CYW43455', role: 'mcu.cyw43455' }],
};

const power = (usbMa: number, idleMa: number): BoardPower => ({
  inputs: [
    { id: 'usbc', connector: 'usb-c', part: 'J1', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: usbMa, reverseProtected: true, protection: 'power.usbc.protection' },
    { id: 'pin5', connector: 'header-pin', part: 'J8', volts: { min: 4.75, max: 5.25 }, reverseProtected: false, protection: 'power.pin5.protection' },
  ],
  rails: [
    { name: '5V', volts: 5.1, from: 'J1', note: 'power.rails.5v' },
    { name: '3V3', volts: 3.3, from: 'U4', note: 'power.rails.3v3' },
    { name: '1V8', volts: 1.8, from: 'U4', note: 'power.rails.1v8' },
    { name: 'CORE', volts: 0.8, from: 'U4', note: 'power.rails.core' },
  ],
  io: { perPinMa: 16, totalMa: 50, note: 'power.io' },
  // the figure's SoC stops when its 3.3 V rail falls under 3 V, which the PMIC holds until the 5 V input nears 3.4 V
  brownoutVolts: 3.4,
  idleMa,
});

const PI4_LEDS: OnboardLed[] = [
  { id: 'D3', label: 'PWR', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.D3' },
  { id: 'D5', label: 'ACT', color: 'green', drivenBy: 'status', activeLow: false, note: 'leds.D5' },
];

// Lessons: Python with gpiozero on Raspberry Pi OS, then a ROS 2 node (docs/facts/pi4-pi5.md §5 and §7). The pins are
// BCM numbers, as gpiozero takes them: LED(17) is header pin 11.
const BLINK_PY = `# {{t:lessons.blink.code.top}}
from gpiozero import LED
from time import sleep

led = LED(17)          # {{t:lessons.blink.code.led}}

while True:
    led.on()
    sleep({{p:secs}})
    led.off()
    sleep({{p:secs}})
`;

const BUTTON_PY = `# {{t:lessons.button.code.top}}
from gpiozero import LED, Button
from signal import pause

led = LED(17)
button = Button(27, bounce_time={{p:bounce}})   # {{t:lessons.button.code.button}}
presses = 0


def pressed():
    global presses
    presses += 1
    led.on()
    print("pressed", presses)


button.when_pressed = pressed       # {{t:lessons.button.code.callback}}
button.when_released = led.off
pause()                             # {{t:lessons.button.code.pause}}
`;

const FADE_PY = `# {{t:lessons.fade.code.top}}
from gpiozero import PWMLED
from time import sleep

led = PWMLED(18, frequency={{p:freq}})   # {{t:lessons.fade.code.led}}

while True:
    for step in range(11):
        led.value = step / 10            # {{t:lessons.fade.code.value}}
        print("brightness", led.value)
        sleep(0.2)
`;

const DISTANCE_PY = `# {{t:lessons.distance.code.top}}
from gpiozero import DistanceSensor, LED
from time import sleep

sensor = DistanceSensor(echo=24, trigger=23, threshold_distance={{p:near}})   # {{t:lessons.distance.code.sensor}}
warn = LED(17)

sensor.when_in_range = warn.on          # {{t:lessons.distance.code.near}}
sensor.when_out_of_range = warn.off

while True:
    print("distance", round(sensor.distance * 100), "cm")   # {{t:lessons.distance.code.print}}
    sleep(0.5)
`;

const ROS2_PY = `# {{t:lessons.ros2.code.top}}
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from gpiozero import Button, LED


class Drive(Node):
    def __init__(self):
        super().__init__('drive')
        self.pub = self.create_publisher(Twist, 'cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.tick)      # {{t:lessons.ros2.code.timer}}
        self.estop = Button(27)                             # {{t:lessons.ros2.code.estop}}
        self.estop.when_pressed = self.halt
        self.status = LED(17)
        self.stopped = False
        self.count = 0

    def tick(self):
        msg = Twist()
        if not self.stopped:
            msg.linear.x = {{p:speed}}
            msg.angular.z = 0.5
        self.pub.publish(msg)
        self.status.value = 0 if self.stopped else 1
        self.count += 1
        if self.count % 10 == 0:
            self.get_logger().info(f'sent {self.count} commands, linear.x={msg.linear.x:.2f}')

    def halt(self):
        if self.stopped:
            return
        self.stopped = True                                 # {{t:lessons.ros2.code.latch}}
        self.status.off()
        self.get_logger().warn('e-stop pressed: stopping')


def main():
    rclpy.init()
    node = Drive()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
`;

const lessonText = (id: string, steps: number, hints: number, specs: number, features: string[]) => ({
  title: `lessons.${id}.title`, lede: `lessons.${id}.lede`,
  steps: Array.from({ length: steps }, (_, i) => `lessons.${id}.steps.${i + 1}`),
  hints: Array.from({ length: hints }, (_, i) => `lessons.${id}.hints.${i + 1}`),
  specs: Array.from({ length: specs }, (_, i) => ({ label: `lessons.${id}.specs.${i + 1}.label`, value: `lessons.${id}.specs.${i + 1}.value` })),
  features: features.map((icon, i) => ({ icon, text: `lessons.${id}.features.${i + 1}` })),
});
const chk = (id: string, n: number) => `lessons.${id}.checks.${n}`;
const pins = (id: string, list: [string, Lesson['pins'][number]['color']][]): Lesson['pins'] =>
  list.map(([pin, color]) => ({ pin, to: `lessons.${id}.pins.${pin}.to`, role: `lessons.${id}.pins.${pin}.role`, color }));

const buttonChecks: Check[] = [
  { kind: 'responds', after: { t: 1000, input: 'btn', value: 1 }, pin: 'GPIO17', withinMs: 50, mode: 'out', v: [1, 1], label: chk('button', 1) },
  { kind: 'pin-level', pin: 'GPIO17', level: 0, atMs: 2000, label: chk('button', 2) },
  { kind: 'serial', match: 'pressed 2', regex: false, minCount: 1, label: chk('button', 3) },
  { kind: 'code', must: ['Button(27', 'when_pressed', 'pause()'], mustNot: ['while True'], label: chk('button', 4) },
];

const lessons: Lesson[] = [
  {
    id: 'blink', n: 1, level: 'io', language: 'python',
    code: { source: BLINK_PY, libraries: ['gpiozero'] },
    params: [{ id: 'secs', kind: 'number', label: 'lessons.blink.params.secs.label', default: 1, min: 0.2, max: 2, step: 0.2, unit: 's' }],
    circuit: 'blink',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: [] },
    runMs: 9000,
    checks: [
      { kind: 'runs', minMs: 8000, label: chk('blink', 1) },
      { kind: 'pin-toggles', pin: 'GPIO17', periodMs: [380, 4100], minCycles: 2, label: chk('blink', 2) },
      { kind: 'code', must: ['LED(17)'], mustNot: ['RPi.GPIO'], label: chk('blink', 3) },
    ],
    variants: [],
    pins: pins('blink', [['GPIO17', 'orange'], ['GND', 'black']]),
    callouts: [{ part: 'D1', text: 'lessons.blink.callouts.D1' }, { part: 'R1', text: 'lessons.blink.callouts.R1' }, { part: 'J8', text: 'lessons.blink.callouts.J8' }],
    ...lessonText('blink', 4, 3, 3, ['led', 'code', 'clock']),
    quiz: quiz('blink', [1, 2, 0]),
  },
  {
    id: 'button', n: 2, level: 'input', language: 'python',
    code: { source: BUTTON_PY, libraries: ['gpiozero'] },
    params: [{
      id: 'bounce', kind: 'choice', label: 'lessons.button.params.bounce.label', default: '50',
      options: [
        { value: 'none', code: 'None', label: 'lessons.button.params.bounce.none', note: 'lessons.button.params.bounce.none-note' },
        { value: '10', code: '0.01', label: 'lessons.button.params.bounce.10' },
        { value: '50', code: '0.05', label: 'lessons.button.params.bounce.50' },
      ],
    }],
    circuit: 'button',
    world: {
      inputs: [
        { id: 'btn', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['GPIO27'], part: 'BTN1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.button.world.btn' },
      ],
      script: [{ t: 1000, input: 'btn', value: 1 }, { t: 1600, input: 'btn', value: 0 }, { t: 2400, input: 'btn', value: 1 }, { t: 2900, input: 'btn', value: 0 }],
    },
    serial: { baud: 115200, sample: ['pressed 1', 'pressed 2'] },
    runMs: 3500,
    checks: buttonChecks,
    variants: [],
    pins: pins('button', [['GPIO27', 'yellow'], ['GPIO17', 'orange'], ['GND', 'black']]),
    callouts: [{ part: 'BTN1', text: 'lessons.button.callouts.BTN1' }, { part: 'D1', text: 'lessons.button.callouts.D1' }],
    ...lessonText('button', 4, 3, 3, ['button', 'bolt', 'terminal']),
    quiz: quiz('button', [2, 0, 1]),
  },
  {
    id: 'fade', n: 3, level: 'analog', language: 'python',
    code: { source: FADE_PY, libraries: ['gpiozero'] },
    params: [{
      id: 'freq', kind: 'choice', label: 'lessons.fade.params.freq.label', default: '100',
      options: [
        { value: '50', code: '50', label: 'lessons.fade.params.freq.50', note: 'lessons.fade.params.freq.50-note' },
        { value: '100', code: '100', label: 'lessons.fade.params.freq.100' },
        { value: '1000', code: '1000', label: 'lessons.fade.params.freq.1000' },
      ],
    }],
    circuit: 'fade',
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: ['brightness 0.0', 'brightness 0.5', 'brightness 1.0'] },
    runMs: 3000,
    checks: [
      { kind: 'pwm', pin: 'GPIO18', duty: [0.45, 0.55], atMs: 1100, label: chk('fade', 1) },
      { kind: 'pwm', pin: 'GPIO18', duty: [0.95, 1], atMs: 2100, label: chk('fade', 2) },
      { kind: 'serial', match: 'brightness 0.5', regex: false, minCount: 1, label: chk('fade', 3) },
      { kind: 'code', must: ['PWMLED(18'], mustNot: ['RPi.GPIO'], label: chk('fade', 4) },
    ],
    variants: [],
    pins: pins('fade', [['GPIO18', 'green'], ['GND', 'black']]),
    callouts: [{ part: 'D1', text: 'lessons.fade.callouts.D1' }],
    ...lessonText('fade', 4, 3, 3, ['wave', 'dial', 'chart']),
    quiz: quiz('fade', [0, 2, 1]),
  },
  {
    id: 'distance', n: 4, level: 'project', language: 'python',
    code: { source: DISTANCE_PY, libraries: ['gpiozero'] },
    params: [{
      id: 'near', kind: 'choice', label: 'lessons.distance.params.near.label', default: '30',
      options: [
        { value: '20', code: '0.2', label: 'lessons.distance.params.near.20' },
        { value: '30', code: '0.3', label: 'lessons.distance.params.near.30' },
        { value: '50', code: '0.5', label: 'lessons.distance.params.near.50' },
      ],
    }],
    circuit: 'distance',
    world: {
      inputs: [
        { id: 'sonar', quantity: 'distance-cm', device: { kind: 'hc-sr04' }, pins: ['GPIO23', 'GPIO24'], part: 'US1', min: 2, max: 400, step: 1, default: 80, unit: 'cm', gesture: 'drag', label: 'lessons.distance.world.sonar' },
      ],
      script: [{ t: 1500, input: 'sonar', value: 15 }, { t: 3000, input: 'sonar', value: 80 }],
    },
    serial: { baud: 115200, sample: ['distance 80 cm', 'distance 15 cm'] },
    runMs: 4500,
    checks: [
      { kind: 'pin-level', pin: 'GPIO17', level: 0, atMs: 1400, label: chk('distance', 1) },
      { kind: 'responds', after: { t: 1500, input: 'sonar', value: 15 }, pin: 'GPIO17', withinMs: 600, mode: 'out', v: [1, 1], label: chk('distance', 2) },
      { kind: 'pin-level', pin: 'GPIO17', level: 0, atMs: 4200, label: chk('distance', 3) },
      { kind: 'serial', match: 'distance 80 cm', regex: false, minCount: 2, label: chk('distance', 4) },
      { kind: 'serial', match: 'distance 15 cm', regex: false, minCount: 1, label: chk('distance', 5) },
      { kind: 'code', must: ['DistanceSensor(', 'echo=24', 'trigger=23'], mustNot: ['RPi.GPIO'], label: chk('distance', 6) },
    ],
    variants: [],
    pins: pins('distance', [['GPIO23', 'yellow'], ['GPIO24', 'green'], ['5V', 'red'], ['GND', 'black'], ['GPIO17', 'orange']]),
    callouts: [{ part: 'US1', text: 'lessons.distance.callouts.US1' }, { part: 'R2', text: 'lessons.distance.callouts.R2' }, { part: 'R3', text: 'lessons.distance.callouts.R3' }],
    ...lessonText('distance', 4, 3, 3, ['radar', 'ruler', 'led']),
    quiz: quiz('distance', [1, 0, 2]),
  },
  {
    id: 'ros2', n: 5, level: 'protocol', language: 'python',
    code: { source: ROS2_PY, libraries: ['rclpy', 'gpiozero'] },
    params: [{
      id: 'speed', kind: 'choice', label: 'lessons.ros2.params.speed.label', default: 'walk',
      options: [
        { value: 'slow', code: '0.1', label: 'lessons.ros2.params.speed.slow' },
        { value: 'walk', code: '0.2', label: 'lessons.ros2.params.speed.walk' },
        { value: 'fast', code: '0.5', label: 'lessons.ros2.params.speed.fast' },
      ],
    }],
    circuit: 'estop',
    world: {
      inputs: [
        { id: 'estop', quantity: 'button', device: { kind: 'button', pull: 'internal-up', bounceMs: 5 }, pins: ['GPIO27'], part: 'BTN1', min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: 'lessons.ros2.world.estop' },
      ],
      script: [{ t: 1500, input: 'estop', value: 1 }, { t: 1800, input: 'estop', value: 0 }],
    },
    serial: { baud: 115200, sample: ['[INFO] [drive]: sent 10 commands, linear.x=0.20', '[WARN] [drive]: e-stop pressed: stopping', '[INFO] [drive]: sent 20 commands, linear.x=0.00'] },
    runMs: 2500,
    checks: [
      { kind: 'serial', match: '^\\[INFO\\] \\[drive\\]: sent 10 commands, linear\\.x=0\\.[1-5]0$', regex: true, minCount: 1, byMs: 1100, label: chk('ros2', 1) },
      { kind: 'pin-level', pin: 'GPIO17', level: 1, atMs: 1200, label: chk('ros2', 2) },
      { kind: 'responds', after: { t: 1500, input: 'estop', value: 1 }, pin: 'GPIO17', withinMs: 50, mode: 'out', v: [0, 0], label: chk('ros2', 3) },
      { kind: 'serial', match: '^\\[WARN\\] \\[drive\\]: e-stop pressed: stopping$', regex: true, minCount: 1, label: chk('ros2', 4) },
      { kind: 'serial', match: '^\\[INFO\\] \\[drive\\]: sent 20 commands, linear\\.x=0\\.00$', regex: true, minCount: 1, label: chk('ros2', 5) },
      { kind: 'code', must: ['create_timer(', 'rclpy.spin(', 'Button(27)'], mustNot: ['time.sleep', 'while True'], label: chk('ros2', 6) },
    ],
    variants: [],
    pins: pins('ros2', [['GPIO27', 'yellow'], ['GPIO17', 'orange'], ['GND', 'black']]),
    callouts: [{ part: 'BTN1', text: 'lessons.ros2.callouts.BTN1' }, { part: 'D1', text: 'lessons.ros2.callouts.D1' }, { part: 'U1', text: 'lessons.ros2.callouts.U1' }],
    ...lessonText('ros2', 4, 3, 3, ['robot', 'clock', 'stop']),
    quiz: quiz('ros2', [2, 1, 0]),
  },
];

const board = {
  lab: 'board',
  id: 'pi4-pi5',
  maker: 'Raspberry Pi',
  variants: [
    { id: 'pi5', name: 'Raspberry Pi 5', note: 'variants.pi5', figureVariant: 'pi5' },
    { id: 'pi4', name: 'Raspberry Pi 4 Model B', note: 'variants.pi4', mcu: BCM2711, power: power(3000, 600), leds: PI4_LEDS, controls: [], figureVariant: 'pi4' },
  ],
  mcu: BCM2712,
  logicVolts: 3.3,
  power: power(5000, 800),
  pinout: J8.map(row),
  leds: [{ id: 'LED1', label: 'PWR / ACT', color: 'green', drivenBy: 'status', activeLow: true, note: 'leds.LED1' }],
  controls: [{ id: 'SW1', label: 'POWER', kind: 'power-switch', activeLow: true, act: 'ctl', effect: 'controls.SW1' }],
  displays: [],
  figure: {
    page: '/figures/boards/pi4-pi5.html',
    sheets: ['board', 'breadboard', 'schematic', 'power'],
    parts: [
      { id: 'U1', short: 'SOC', role: 'soc', name: 'parts.U1.name', what: 'parts.U1.what' },
      { id: 'U2', short: 'RAM', role: 'memory', name: 'parts.U2.name', what: 'parts.U2.what' },
      { id: 'U3', short: 'RP1', role: 'other', name: 'parts.U3.name', what: 'parts.U3.what' },
      { id: 'U4', short: 'PMIC', role: 'regulator', name: 'parts.U4.name', what: 'parts.U4.what' },
      { id: 'L1', short: 'INDUCTORS', role: 'passive', name: 'parts.L1.name', what: 'parts.L1.what' },
      { id: 'U5', short: 'WI-FI', role: 'radio', name: 'parts.U5.name', what: 'parts.U5.what' },
      { id: 'U6', short: 'ETH PHY', role: 'other', name: 'parts.U6.name', what: 'parts.U6.what' },
      { id: 'RC', short: 'PASSIVES', role: 'passive', name: 'parts.RC.name', what: 'parts.RC.what' },
      { id: 'LED1', short: 'LED', role: 'led', name: 'parts.LED1.name', what: 'parts.LED1.what' },
      { id: 'SW1', short: 'POWER', role: 'button', name: 'parts.SW1.name', what: 'parts.SW1.what' },
      { id: 'J20', short: 'PCIE', role: 'connector', name: 'parts.J20.name', what: 'parts.J20.what' },
      { id: 'J3', short: 'CAM/DISP 0', role: 'connector', name: 'parts.J3.name', what: 'parts.J3.what' },
      { id: 'J4', short: 'CAM/DISP 1', role: 'connector', name: 'parts.J4.name', what: 'parts.J4.what' },
      { id: 'J5', short: 'BAT', role: 'connector', name: 'parts.J5.name', what: 'parts.J5.what' },
      { id: 'UART', short: 'UART', role: 'debugger', name: 'parts.UART.name', what: 'parts.UART.what' },
      { id: 'FAN', short: 'FAN', role: 'connector', name: 'parts.FAN.name', what: 'parts.FAN.what' },
      { id: 'J1', short: 'USB-C', role: 'connector', name: 'parts.J1.name', what: 'parts.J1.what' },
      { id: 'MICROSD', short: 'MICROSD', role: 'socket', name: 'parts.MICROSD.name', what: 'parts.MICROSD.what' },
      { id: 'J6', short: 'HDMI0', role: 'connector', name: 'parts.J6.name', what: 'parts.J6.what' },
      { id: 'J13', short: 'HDMI1', role: 'connector', name: 'parts.J13.name', what: 'parts.J13.what' },
      { id: 'J8', short: 'GPIO', role: 'header', name: 'parts.J8.name', what: 'parts.J8.what' },
      { id: 'J14', short: 'POE+', role: 'header', name: 'parts.J14.name', what: 'parts.J14.what' },
      { id: 'J10', short: 'ETHERNET', role: 'connector', name: 'parts.J10.name', what: 'parts.J10.what' },
      { id: 'J12', short: 'USB 3', role: 'connector', name: 'parts.J12.name', what: 'parts.J12.what' },
      { id: 'J11', short: 'USB 2', role: 'connector', name: 'parts.J11.name', what: 'parts.J11.what' },
      { id: 'CARD', short: 'SD CARD', role: 'memory', name: 'parts.CARD.name', what: 'parts.CARD.what' },
      { id: 'ANT', short: 'ANTENNA', role: 'antenna', name: 'parts.ANT.name', what: 'parts.ANT.what' },
      { id: 'D3', short: 'PWR', role: 'led', name: 'parts.D3.name', what: 'parts.D3.what' },
      { id: 'D5', short: 'ACT', role: 'led', name: 'parts.D5.name', what: 'parts.D5.what' },
      { id: 'J2', short: 'RUN', role: 'other', name: 'parts.J2.name', what: 'parts.J2.what' },
      { id: 'J7', short: 'A/V', role: 'connector', name: 'parts.J7.name', what: 'parts.J7.what' },
    ],
  },
  wireables: [
    { part: 'led', connections: [{ from: 'A', to: 'GPIO17', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.led.note', caution: 'wireables.led.caution' },
    { part: 'push-button', connections: [{ from: '1', to: 'GPIO27', color: 'yellow' }, { from: '3', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.push-button.note' },
    { part: 'hc-sr04', connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'TRIG', to: 'GPIO23', color: 'yellow' }, { from: 'ECHO', to: 'GPIO24', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }], supplyVolts: 5, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution' },
    { part: 'servo-sg90', connections: [{ from: 'signal', to: 'GPIO18', color: 'orange' }, { from: 'V+', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'brown' }], supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution' },
    { part: 'mpu6050', connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'GPIO3', color: 'yellow' }, { from: 'SDA', to: 'GPIO2', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.mpu6050.note' },
    { part: 'ssd1306', connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V3', color: 'red' }, { from: 'SCL', to: 'GPIO3', color: 'yellow' }, { from: 'SDA', to: 'GPIO2', color: 'blue' }], supplyVolts: 3.3, note: 'wireables.ssd1306.note' },
    { part: 'piezo-buzzer', connections: [{ from: '+', to: 'GPIO22', color: 'orange' }, { from: '-', to: 'GND', color: 'black' }], supplyVolts: 3.3, note: 'wireables.piezo-buzzer.note' },
  ],
  failures: [
    { id: 'reverse-pin5', kind: 'reverse-polarity', trigger: { by: 'reverse', input: 'pin5' }, figure: { type: 'set', state: { power: 'pin5', fault: 'reverse-polarity:pin5' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'failures.reverse-pin5.title', symptom: 'failures.reverse-pin5.symptom', explanation: 'failures.reverse-pin5.explanation', fix: 'failures.reverse-pin5.fix' },
    { id: 'overvolt-pin5', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'pin5', volts: 12 }, figure: { type: 'set', state: { power: 'pin5', fault: 'wrong-voltage:pin5:12' } },
      effect: { power: 'off', halts: true, damages: ['U4'] },
      title: 'failures.overvolt-pin5.title', symptom: 'failures.overvolt-pin5.symptom', explanation: 'failures.overvolt-pin5.explanation', fix: 'failures.overvolt-pin5.fix' },
    { id: 'weak-charger', kind: 'wrong-voltage', trigger: { by: 'power-input', input: 'usbc', volts: 4.6 }, figure: { type: 'set', state: { power: 'charger', fault: 'wrong-voltage:charger:4.6' } },
      effect: { power: 'on', halts: false, serial: ['hwmon hwmon1: Undervoltage detected!'] },
      title: 'failures.weak-charger.title', symptom: 'failures.weak-charger.symptom', explanation: 'failures.weak-charger.explanation', fix: 'failures.weak-charger.fix' },
    { id: 'motor-brownout', kind: 'brownout', trigger: { by: 'load', rail: '5V', ma: 2500, part: 'dc-motor' }, figure: { type: 'set', state: { power: 'pin5', fault: 'brownout' } },
      effect: { power: 'resetting', halts: true, extraMa: 2500 },
      title: 'failures.motor-brownout.title', symptom: 'failures.motor-brownout.symptom', explanation: 'failures.motor-brownout.explanation', fix: 'failures.motor-brownout.fix' },
    { id: 'cold-gpio17', kind: 'cold-solder', trigger: { by: 'cold-joint', part: 'J8', pin: 'GPIO17' }, figure: { type: 'set', state: { fault: 'cold:J8.11' } },
      effect: { power: 'on', halts: false, pins: { GPIO17: 'noisy' } },
      title: 'failures.cold-gpio17.title', symptom: 'failures.cold-gpio17.symptom', explanation: 'failures.cold-gpio17.explanation', fix: 'failures.cold-gpio17.fix' },
    { id: 'no-card', kind: 'missing-part', trigger: { by: 'remove-part', part: 'CARD' }, figure: { type: 'set', state: { fault: 'missing:CARD' } },
      effect: { power: 'on', halts: true },
      title: 'failures.no-card.title', symptom: 'failures.no-card.symptom', explanation: 'failures.no-card.explanation', fix: 'failures.no-card.fix' },
    { id: 'no-ram', kind: 'missing-part', trigger: { by: 'remove-part', part: 'U2' }, figure: { type: 'set', state: { fault: 'missing:U2' } },
      effect: { power: 'on', halts: true },
      title: 'failures.no-ram.title', symptom: 'failures.no-ram.symptom', explanation: 'failures.no-ram.explanation', fix: 'failures.no-ram.fix' },
    { id: 'short-3v3', kind: 'short', trigger: { by: 'short', nets: ['3V3', 'GND'] }, figure: { type: 'set', state: { fault: 'short:3V3:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-3v3.title', symptom: 'failures.short-3v3.symptom', explanation: 'failures.short-3v3.explanation', fix: 'failures.short-3v3.fix' },
    { id: 'short-5v', kind: 'short', trigger: { by: 'short', nets: ['5V', 'GND'] }, figure: { type: 'set', state: { fault: 'short:5V:GND' } },
      effect: { power: 'off', halts: true },
      title: 'failures.short-5v.title', symptom: 'failures.short-5v.symptom', explanation: 'failures.short-5v.explanation', fix: 'failures.short-5v.fix' },
    { id: 'five-volt-echo', kind: 'level-mismatch', trigger: { by: 'wiring', part: 'hc-sr04', from: 'ECHO', to: 'GPIO24' }, figure: { type: 'set', state: { power: 'echo5' } },
      effect: { power: 'off', halts: true, damages: ['U3'] },
      title: 'failures.five-volt-echo.title', symptom: 'failures.five-volt-echo.symptom', explanation: 'failures.five-volt-echo.explanation', fix: 'failures.five-volt-echo.fix' },
  ],
  assembly: [
    { id: 'strip', kind: 'build', action: { type: 'set', state: { power: null, build: 'bare' } }, done: { build: 'bare' }, major: false, title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'pick-place', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false, title: 'assembly.pick-place.title', body: 'assembly.pick-place.body', refusal: 'assembly.pick-place.refusal' },
    { id: 'low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'tasks.low-in': true }, major: false, title: 'assembly.low.title', body: 'assembly.low.body', refusal: 'assembly.low.refusal' },
    { id: 'tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'tasks.tall-in': true }, major: false, title: 'assembly.tall.title', body: 'assembly.tall.body', refusal: 'assembly.tall.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'soldered' }, major: false, title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'card', kind: 'build', action: { type: 'press', id: 'place', choice: 'card' }, done: { 'tasks.card-in': true, build: 'assembled' }, major: false, title: 'assembly.card.title', body: 'assembly.card.body', refusal: 'assembly.card.refusal' },
    { id: 'plug', kind: 'test', action: { type: 'set', state: { mode: 'boot', power: 'usbc' } }, done: { power: 'usbc', mode: 'boot', status: 'running' }, major: false, title: 'assembly.plug.title', body: 'assembly.plug.body', refusal: 'assembly.plug.refusal' },
    { id: 'rails', kind: 'test', action: { type: 'set', state: { view: 'power' } }, done: { 'rails.5V': 5.1, 'rails.3V3': 3.3 }, major: false, title: 'assembly.rails.title', body: 'assembly.rails.body' },
    { id: 'blink', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { mode: 'blink', status: 'running' }, major: false, title: 'assembly.blink.title', body: 'assembly.blink.body' },
    { id: 'health', kind: 'test', action: { type: 'press', id: 'upload', choice: 'health' }, done: { mode: 'health', status: 'running' }, major: false, title: 'assembly.health.title', body: 'assembly.health.body' },
    { id: 'exploded', kind: 'test', action: { type: 'set', state: { power: null, exploded: true } }, done: { exploded: true }, major: false, title: 'assembly.exploded.title', body: 'assembly.exploded.body', refusal: 'assembly.exploded.refusal' },
  ],
  lessons,
  serial: { baud: 115200, sample: ['[    0.000000] Machine model: Raspberry Pi 5 Model B Rev 1.0', 'Debian GNU/Linux 13 raspberrypi ttyAMA10', 'maker@raspberrypi:~ $'] },
  sources: [
    { title: 'Raspberry Pi 5 product brief', url: 'https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-product-brief.pdf' },
    { title: 'Raspberry Pi 5 mechanical drawing', url: 'https://datasheets.raspberrypi.com/rpi5/raspberry-pi-5-mechanical-drawing.pdf' },
    { title: 'RP1 peripherals datasheet', url: 'https://datasheets.raspberrypi.com/rp1/rp1-peripherals.pdf' },
    { title: 'Introducing: Raspberry Pi 5! (Raspberry Pi news, 2023-09-28)', url: 'https://www.raspberrypi.com/news/introducing-raspberry-pi-5/' },
    { title: 'Raspberry Pi 4 Model B product brief', url: 'https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-product-brief.pdf' },
    { title: 'Raspberry Pi 4 Model B datasheet', url: 'https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-datasheet.pdf' },
    { title: 'Raspberry Pi 4 mechanical drawing', url: 'https://datasheets.raspberrypi.com/rpi4/raspberry-pi-4-mechanical-drawing.pdf' },
    { title: 'Raspberry Pi 4 reduced schematics', url: 'https://pip-assets.raspberrypi.com/categories/545-raspberry-pi-4-model-b/documents/RP-008345-DS-1-raspberry-pi-4-reduced-schematics.pdf' },
    { title: 'Raspberry Pi documentation: power supplies', url: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/power-supplies.adoc' },
    { title: 'Raspberry Pi documentation: GPIO', url: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/gpio-on-raspberry-pi.adoc' },
    { title: 'Raspberry Pi documentation: frequency management and cooling', url: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/raspberry-pi/frequency-management.adoc' },
    { title: 'Raspberry Pi documentation: LED warning flash codes', url: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/configuration/led_blink_warnings.adoc' },
    { title: 'Raspberry Pi documentation: vcgencmd get_throttled', url: 'https://github.com/raspberrypi/documentation/blob/master/documentation/asciidoc/computers/os/graphics-utilities.adoc' },
    { title: 'gpiozero documentation', url: 'https://gpiozero.readthedocs.io/en/stable/' },
    { title: 'ROS 2 Lyrical Luth documentation', url: 'https://docs.ros.org/en/lyrical/' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
} satisfies BoardContent;

export default board;
