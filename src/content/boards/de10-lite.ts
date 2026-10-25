// Terasic DE10-Lite (Intel MAX 10 10M50DAF484C7G). Facts: docs/facts/de10-lite.md (pins from Terasic's System Builder
// qsf, cross-checked with the user manual; circuits from the Rev B1 schematic). Figure: figures/boards/de10-lite.js;
// part ids, nets, fault ids and the circuit key match it exactly. Lessons are Verilog with the qsf port names: `code.ports`
// is the pin assignment, each top-level port bit landing on the board net the figure draws.
import type { BoardContent, Check, FigurePart, Lesson, OnboardControl, OnboardLed, PinRow, Quiz, WorldInput } from '@/content/schema';

const IO = 3.3;
const N10 = Array.from({ length: 10 }, (_, i) => i);
const SW_PIN = ['C10', 'C11', 'D12', 'C12', 'A12', 'B12', 'A13', 'A14', 'B14', 'F15'];
const LD_PIN = ['A8', 'A9', 'A10', 'B10', 'D13', 'C13', 'E14', 'D14', 'A11', 'B11'];
// Per display, segments a..g then DP (bit 0..7), FPGA pins from the qsf.
const HEX_PINS = [
  ['C14', 'E15', 'C15', 'C16', 'E16', 'D17', 'C17', 'D15'],
  ['C18', 'D18', 'E18', 'B16', 'A17', 'A18', 'B17', 'A16'],
  ['B20', 'A20', 'B19', 'A21', 'B21', 'C22', 'B22', 'A19'],
  ['F21', 'E22', 'E21', 'C19', 'C20', 'D19', 'E17', 'D22'],
  ['F18', 'E20', 'E19', 'J18', 'H19', 'F19', 'F20', 'F17'],
  ['J20', 'K20', 'L18', 'N18', 'M20', 'N19', 'N20', 'L19'],
];
// The figure draws each segment as the net DIG<display>_<segment>, lit at 1 (the pin itself lights it at 0).
const SEG = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'DP'];
const segNet = (d: number, k: number) => `DIG${d}_${SEG[k]}`;
// ARDUINO_IO[0..15]: D0-D13, then SDA (14) and SCL (15).
const ARD_NETS = [...Array.from({ length: 14 }, (_, i) => `D${i}`), 'SDA', 'SCL'];
const ARD_PINS = ['AB5', 'AB6', 'AB7', 'AB8', 'AB9', 'Y10', 'AA11', 'AA12', 'AB17', 'AA17', 'AB19', 'AA19', 'Y19', 'AB20', 'AB21', 'AA20'];
const ARD_FN: Record<number, string> = { 0: 'RXD', 1: 'TXD', 10: 'SS', 11: 'MOSI', 12: 'MISO', 13: 'SCK', 14: 'I2C SDA', 15: 'I2C SCL' };
const GPIO_PINS = ['V10', 'W10', 'V9', 'W9', 'V8', 'W8', 'V7', 'W7', 'W6', 'V5', 'W5', 'AA15', 'AA14', 'W13', 'W12', 'AB13', 'AB12', 'Y11',
  'AB11', 'W11', 'AB10', 'AA10', 'AA9', 'Y8', 'AA8', 'Y7', 'AA7', 'Y6', 'AA6', 'Y5', 'AA5', 'Y4', 'AB3', 'Y3', 'AB2', 'AA2'];

/** The 2 x 20 header: pin n carries GPIO[n-1] up to pin 10, then 5 V and GND (11, 12), the 3.3 V and GND pair at 29, 30. */
const gpioRow = (n: number): PinRow => {
  const pin = String(n);
  if (n === 11) return { header: 'JP1', pin, label: '5V', functions: ['VCC5'], caps: ['power'], volts: 5, net: '5V', note: 'pins.gpio5v' };
  if (n === 29) return { header: 'JP1', pin, label: '3V3', functions: ['VCC3P3'], caps: ['power'], volts: IO, net: '3V3', note: 'pins.gpio3v3' };
  if (n === 12 || n === 30) return { header: 'JP1', pin, label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' };
  const k = n < 11 ? n - 1 : n < 29 ? n - 3 : n - 5;
  return { header: 'JP1', pin, label: `GPIO${k}`, functions: [`GPIO[${k}]`, ...(k === 0 || k === 2 ? ['clock in'] : [])], caps: ['fpga-io', 'digital', 'pwm'], volts: IO, maxCurrentMa: 8, net: `GPIO${k}`, fpgaPin: GPIO_PINS[k], note: 'pins.gpio' };
};

const pinout: PinRow[] = [
  { header: 'CLK', pin: 'P11', label: 'MAX10_CLK1_50', functions: ['50 MHz'], caps: ['clock'], volts: IO, net: 'MAX10_CLK1_50', fpgaPin: 'P11', note: 'pins.clk' },
  { header: 'CLK', pin: 'N14', label: 'MAX10_CLK2_50', functions: ['50 MHz'], caps: ['clock'], volts: IO, net: 'MAX10_CLK2_50', fpgaPin: 'N14', note: 'pins.clk' },
  { header: 'CLK', pin: 'N5', label: 'ADC_CLK_10', functions: ['10 MHz, for the ADC PLL'], caps: ['clock'], volts: IO, net: 'ADC_CLK_10', fpgaPin: 'N5', note: 'pins.adcclk' },
  ...N10.map((n): PinRow => ({ header: 'SW', pin: String(n), label: `SW${n}`, functions: [`SW[${n}]`], caps: ['fpga-io', 'digital'], volts: IO, net: `SW${n}`, fpgaPin: SW_PIN[n], note: 'pins.sw' })),
  ...N10.map((n): PinRow => ({ header: 'LEDR', pin: String(n), label: `LEDR${n}`, functions: [`LEDR[${n}]`], caps: ['fpga-io', 'digital', 'led'], volts: IO, maxCurrentMa: 4, net: `LEDR${n}`, fpgaPin: LD_PIN[n], note: 'pins.ledr' })),
  { header: 'KEY', pin: '0', label: 'KEY0', functions: ['KEY[0]', 'Schmitt trigger'], caps: ['fpga-io', 'digital'], volts: IO, net: 'KEY0', fpgaPin: 'B8', note: 'pins.key' },
  { header: 'KEY', pin: '1', label: 'KEY1', functions: ['KEY[1]', 'Schmitt trigger'], caps: ['fpga-io', 'digital'], volts: IO, net: 'KEY1', fpgaPin: 'A7', note: 'pins.key' },
  ...HEX_PINS.flatMap((pins, d) => pins.map((pin, k): PinRow => ({
    header: `HEX${d}`, pin: SEG[k].toLowerCase(), label: `HEX${d}[${k}]`, functions: [`HEX${d}[${k}]`, k < 7 ? `segment ${SEG[k].toLowerCase()}` : 'decimal point'],
    caps: ['fpga-io', 'digital'], volts: IO, net: segNet(d, k), fpgaPin: pin, note: 'pins.hex',
  }))),
  ...ARD_NETS.map((net, i): PinRow => ({
    header: 'ARDUINO', pin: net, label: net, functions: [`ARDUINO_IO[${i}]`, ...(ARD_FN[i] ? [ARD_FN[i]] : [])],
    caps: ['fpga-io', 'digital', 'pwm', ...(i < 2 ? ['uart' as const] : i >= 10 && i <= 13 ? ['spi' as const] : i >= 14 ? ['i2c' as const] : [])],
    volts: IO, maxCurrentMa: 8, net, fpgaPin: ARD_PINS[i], note: 'pins.arduino',
  })),
  { header: 'ARDUINO', pin: 'RESET', label: 'RESET', functions: ['ARDUINO_RESET_N', 'Schmitt trigger'], caps: ['fpga-io', 'reset'], volts: IO, net: 'ARDUINO_RESET_N', fpgaPin: 'F16', note: 'pins.ardreset' },
  { header: 'ARDUINO', pin: 'AREF', label: 'AREF', functions: [], caps: [], volts: null, net: 'AREF', note: 'pins.aref' },
  { header: 'ARDUINO', pin: 'VIN', label: 'VIN', functions: [], caps: ['power'], volts: null, net: 'VIN', note: 'pins.vin' },
  { header: 'ARDUINO', pin: 'IOREF', label: 'IOREF', functions: ['3.3 V: the shield logic level'], caps: ['power'], volts: IO, net: '3V3', note: 'pins.ioref' },
  { header: 'ARDUINO', pin: '3.3V', label: '3V3', functions: ['3.3 V out'], caps: ['power'], volts: IO, net: '3V3' },
  { header: 'ARDUINO', pin: '5V', label: '5V', functions: ['5 V out'], caps: ['power'], volts: 5, net: '5V' },
  { header: 'ARDUINO', pin: 'GND', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
  ...[0, 1, 2, 3, 4, 5].map((n): PinRow => ({ header: 'ARDUINO', pin: `A${n}`, label: `A${n}`, functions: [`ADC_IN${n}`, '0-5 V, halved'], caps: ['analog-in'], volts: 5, net: `A${n}`, note: 'pins.analog' })),
  ...Array.from({ length: 40 }, (_, i) => gpioRow(i + 1)),
  { header: 'JP6', pin: '1', label: '5V', functions: ['5 V in'], caps: ['power'], volts: 5, net: 'VEXT', note: 'pins.jp6' },
  { header: 'JP6', pin: '2', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
];

const leds: OnboardLed[] = [
  ...N10.map((n): OnboardLed => ({ id: `LEDR${n}`, label: `LEDR${n}`, color: 'red', drivenBy: `LEDR${n}`, activeLow: false, note: 'leds.user' })),
  { id: 'D1', label: 'LOAD', color: 'green', drivenBy: 'status', activeLow: false, note: 'leds.D1' },
  { id: 'D2', label: 'CONF', color: 'green', drivenBy: 'status', activeLow: false, note: 'leds.D2' },
  { id: 'D4', label: 'POWER GOOD', color: 'green', drivenBy: 'power', activeLow: false, note: 'leds.D4' },
];

const controls: OnboardControl[] = [
  ...N10.map((n): OnboardControl => ({ id: `SW${n}`, label: `SW${n}`, kind: 'slide-switch', pin: `SW[${n}]`, activeLow: false, act: 'ctl', effect: 'controls.sw' })),
  { id: 'KEY0', label: 'KEY0', kind: 'user-button', pin: 'KEY[0]', activeLow: true, act: 'ctl', effect: 'controls.key' },
  { id: 'KEY1', label: 'KEY1', kind: 'user-button', pin: 'KEY[1]', activeLow: true, act: 'ctl', effect: 'controls.key' },
];

const part = (id: string, short: string, role: FigurePart['role'], key = id): FigurePart => ({ id, short, role, name: `parts.${key}.name`, what: `parts.${key}.what` });
const parts: FigurePart[] = [
  part('U5', 'FPGA', 'fpga'),
  part('U4', 'SDRAM', 'memory'),
  part('U10', 'BLASTER CPLD', 'debugger'),
  part('U2', 'USB CHIP', 'usb-bridge'),
  part('U11', 'ESD', 'protection'),
  part('U3', 'CLOCKS', 'other'),
  part('Y1', '24 MHz', 'crystal'),
  part('U13', 'ACCEL', 'sensor'),
  part('U8', 'OP-AMP', 'other', 'opamp'),
  part('U9', 'OP-AMP', 'other', 'opamp'),
  part('U12', 'VREF', 'regulator'),
  part('HEX54', 'HEX5-4', 'display', 'hex'),
  part('HEX32', 'HEX3-2', 'display', 'hex'),
  part('HEX10', 'HEX1-0', 'display', 'hex'),
  ...N10.map((n) => part(`LEDR${n}`, `LEDR${n}`, 'led', 'ledr')),
  ...N10.map((n) => part(`SW${n}`, `SW${n}`, 'switch', 'sw')),
  part('KEY0', 'KEY0', 'button', 'key'),
  part('KEY1', 'KEY1', 'button', 'key'),
  part('U14', 'DEBOUNCE', 'other'),
  part('J3', 'USB', 'connector'),
  part('D6', 'D6', 'protection', 'diode'),
  part('JP6', 'DC 5V', 'header'),
  part('D7', 'D7', 'protection', 'diode'),
  part('Q2', 'OVP', 'protection'),
  part('U7', '3V3', 'regulator'),
  part('L6', 'L6', 'passive', 'inductor'),
  part('U6', '1V2', 'regulator'),
  part('L5', 'L5', 'passive', 'inductor'),
  part('C18', 'C18', 'passive', 'bulk'),
  part('C145', 'C145', 'passive', 'bulk'),
  part('REG1', '2V5', 'regulator', 'ldo'),
  part('REG2', '1V8', 'regulator', 'ldo'),
  part('D4', 'POWER', 'led'),
  part('TP1', 'TP1', 'other', 'testpoint'),
  part('TP2', 'TP2', 'other', 'testpoint'),
  part('D1', 'LOAD', 'led'),
  part('D2', 'CONF', 'led'),
  part('J1', 'J1', 'header'),
  part('VGA', 'VGA', 'connector'),
  part('JP1', 'GPIO', 'header'),
  part('JP2', 'D13-D8', 'header', 'arduino'),
  part('JP3', 'D7-D0', 'header', 'arduino'),
  part('JP7', 'POWER', 'header'),
  part('JP8', 'A0-A5', 'header'),
];

/* ---------- lessons ---------- */

const SW_NETS = N10.map((n) => `SW${n}`);
const LEDR_NETS = N10.map((n) => `LEDR${n}`);
const KEY_NETS = ['KEY0', 'KEY1'];

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
const pinRole = (lesson: string, pin: string, color: Lesson['pins'][number]['color']) => ({ pin, to: `lessons.${lesson}.pins.${pin}.to`, role: `lessons.${lesson}.pins.${pin}.role`, color });

const slide = (lesson: string, n: number): WorldInput => ({
  id: `sw${n}`, quantity: 'switch', device: { kind: 'switch' }, pins: [`SW${n}`], part: `SW${n}`,
  min: 0, max: 1, step: 1, default: 0, gesture: 'slide', label: `lessons.${lesson}.world.sw${n}`,
});
// The keys are pulled up and debounced by a Schmitt-trigger buffer on the board: 1 at rest, a clean 0 while pressed.
const key = (lesson: string, n: number): WorldInput => ({
  id: `key${n}`, quantity: 'button', device: { kind: 'button', pull: 'external-up', bounceMs: 0 }, pins: [`KEY${n}`], part: `KEY${n}`,
  min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: `lessons.${lesson}.world.key${n}`,
});

const SWITCHES = `// {{t:lessons.switches.code.intro}}
// {{t:lessons.switches.code.qsf}}
module top (
  input  [9:0] SW,      // {{t:lessons.switches.code.sw}}
  input  [1:0] KEY,     // {{t:lessons.switches.code.key}}
  output [9:0] LEDR
);
  assign LEDR[7:0] = SW[7:0];          // {{t:lessons.switches.code.copy}}
  assign LEDR[8]   = SW[8] ^ SW[9];    // {{t:lessons.switches.code.xor}}
  assign LEDR[9]   = ~KEY[0];          // {{t:lessons.switches.code.invert}}
endmodule
`;

const BLINK = `// {{t:lessons.blink.code.intro}}
module top #(
  parameter CLK_HZ   = 50_000_000,   // {{t:lessons.blink.code.clk}}
  parameter BLINK_HZ = {{p:hz}}
) (
  input            MAX10_CLK1_50,
  output reg [9:0] LEDR
);
  // {{t:lessons.blink.code.half}}
  localparam HALF = CLK_HZ / (2 * BLINK_HZ);

  reg [31:0] count = 0;
  initial LEDR = 10'b0;

  always @(posedge MAX10_CLK1_50) begin
    if (count == HALF - 1) begin
      count   <= 0;
      LEDR[0] <= ~LEDR[0];                               // {{t:lessons.blink.code.toggle}}
      if (LEDR[0]) LEDR[9:6] <= LEDR[9:6] + 1;           // {{t:lessons.blink.code.count}}
    end else begin
      count <= count + 1;
    end
  end
endmodule
`;

const COUNTER = `// {{t:lessons.counter.code.intro}}
module top #(
  parameter CLK_HZ = 50_000_000
) (
  input        MAX10_CLK1_50,
  input  [1:0] KEY,     // {{t:lessons.counter.code.key}}
  output [9:0] LEDR
);
  // 1. {{t:lessons.counter.code.sync}}
  reg [1:0] k0 = 2'b11;
  reg [1:0] k1 = 2'b11;
  always @(posedge MAX10_CLK1_50) begin
    k0 <= {k0[0], KEY[0]};
    k1 <= {k1[0], KEY[1]};
  end

  // 2. {{t:lessons.counter.code.edge}}
  wire press = k0[1] & ~k0[0];

  // 3. {{t:lessons.counter.code.hold}}
  localparam HOLD = CLK_HZ;
  reg [31:0] held = 0;
  always @(posedge MAX10_CLK1_50) begin
    if (k1[1])
      held <= 0;
    else if (held != HOLD)
      held <= held + 1;
  end
  wire clear = (held == HOLD - 1);

  // 4. {{t:lessons.counter.code.count}}
  reg [9:0] count = 0;
  always @(posedge MAX10_CLK1_50) begin
    if (clear)
      count <= 0;
    else if (press)
      count <= count + 1;
  end

  assign LEDR = count;
endmodule
`;

const PWM = `// {{t:lessons.pwm.code.intro}}
module top #(
  parameter CLK_HZ = 50_000_000
) (
  input         MAX10_CLK1_50,
  input  [9:0]  SW,           // {{t:lessons.pwm.code.sw}}
  output [15:0] ARDUINO_IO,   // {{t:lessons.pwm.code.io}}
  output [9:0]  LEDR
);
  // {{t:lessons.pwm.code.breath}}
  localparam STEP = CLK_HZ / 256;
  reg [31:0] tick  = 0;
  reg [7:0]  level = 0;
  reg        up    = 1'b1;
  always @(posedge MAX10_CLK1_50) begin
    if (tick == STEP - 1) begin
      tick <= 0;
      if (up) begin
        if (level == 8'd255) up <= 1'b0;
        else level <= level + 1;
      end else begin
        if (level == 8'd0) up <= 1'b1;
        else level <= level - 1;
      end
    end else
      tick <= tick + 1;
  end

  // {{t:lessons.pwm.code.pick}}
  wire [7:0] duty = SW[9] ? level : SW[7:0];

  // {{t:lessons.pwm.code.ramp}}
  reg [7:0] ramp = 0;
  always @(posedge MAX10_CLK1_50) ramp <= ramp + 1;
  wire bright = ramp < duty;

  assign ARDUINO_IO = {12'b0, bright, 3'b000};   // {{t:lessons.pwm.code.d3}}
  assign LEDR       = {SW[9], 8'b0, bright};
endmodule
`;

const HEX = `// {{t:lessons.hex.code.intro}}

// {{t:lessons.hex.code.module}}
module hex7 (
  input  [3:0] value,
  output [7:0] hex       // {{t:lessons.hex.code.bits}}
);
  // {{t:lessons.hex.code.table}}
  reg [6:0] lit;
  always @* begin
    case (value)
      4'h0: lit = 7'b0111111;
      4'h1: lit = 7'b0000110;
      4'h2: lit = 7'b1011011;
      4'h3: lit = 7'b1001111;
      4'h4: lit = 7'b1100110;
      4'h5: lit = 7'b1101101;
      4'h6: lit = 7'b1111101;
      4'h7: lit = 7'b0000111;
      4'h8: lit = 7'b1111111;
      4'h9: lit = 7'b1101111;
      4'hA: lit = 7'b1110111;
      4'hB: lit = 7'b1111100;
      4'hC: lit = 7'b0111001;
      4'hD: lit = 7'b1011110;
      4'hE: lit = 7'b1111001;
      default: lit = 7'b1110001;
    endcase
  end
  assign hex = {1'b1, ~lit};   // {{t:lessons.hex.code.invert}}
endmodule

module top (
  input  [9:0] SW,
  output [7:0] HEX0,
  output [7:0] HEX1,
  output [7:0] HEX2,
  output [7:0] HEX3,
  output [7:0] HEX4,
  output [7:0] HEX5,
  output [9:0] LEDR
);
  // {{t:lessons.hex.code.copies}}
  hex7 digit0 (.value(SW[3:0]), .hex(HEX0));
  hex7 digit1 (.value(SW[7:4]), .hex(HEX1));
  hex7 digit2 (.value({2'b00, SW[9:8]}), .hex(HEX2));

  // {{t:lessons.hex.code.blank}}
  assign HEX3 = 8'hFF;
  assign HEX4 = 8'hFF;
  assign HEX5 = 8'hFF;
  assign LEDR = SW;
endmodule
`;

const switchesChecks: Check[] = [
  { kind: 'runs', minMs: 2500, label: chk('switches', 1) },
  { kind: 'pin-level', pin: 'LEDR8', level: 1, atMs: 800, label: chk('switches', 2) },
  { kind: 'pin-level', pin: 'LEDR8', level: 0, atMs: 1300, label: chk('switches', 3) },
  { kind: 'pin-level', pin: 'LEDR9', level: 0, atMs: 1300, label: chk('switches', 4) },
  { kind: 'pin-level', pin: 'LEDR9', level: 1, atMs: 1800, label: chk('switches', 5) },
  { kind: 'pin-level', pin: 'LEDR9', level: 0, atMs: 2300, label: chk('switches', 6) },
];

const blinkChecks: Check[] = [
  { kind: 'runs', minMs: 4000, label: chk('blink', 1) },
  { kind: 'pin-toggles', pin: 'LEDR0', periodMs: [150, 1100], minCycles: 3, label: chk('blink', 2) },
  { kind: 'pin-toggles', pin: 'LEDR6', periodMs: [300, 2200], minCycles: 1, label: chk('blink', 3) },
  { kind: 'code', must: ['posedge MAX10_CLK1_50', 'CLK_HZ'], mustNot: [], label: chk('blink', 4) },
];

const counterChecks: Check[] = [
  { kind: 'runs', minMs: 3500, label: chk('counter', 1) },
  { kind: 'responds', after: { t: 300, input: 'key0', value: 1 }, pin: 'LEDR0', withinMs: 50, mode: 'out', v: [1, 1], label: chk('counter', 2) },
  { kind: 'pin-level', pin: 'LEDR0', level: 1, atMs: 1400, label: chk('counter', 3) },
  { kind: 'pin-level', pin: 'LEDR1', level: 1, atMs: 1400, label: chk('counter', 4) },
  { kind: 'pin-level', pin: 'LEDR1', level: 1, atMs: 2900, label: chk('counter', 5) },
  { kind: 'pin-level', pin: 'LEDR0', level: 0, atMs: 3200, label: chk('counter', 6) },
];

const pwmChecks: Check[] = [
  { kind: 'runs', minMs: 3200, label: chk('pwm', 1) },
  { kind: 'pwm', pin: 'D3', duty: [0.45, 0.55], atMs: 1000, label: chk('pwm', 2) },
  { kind: 'pwm', pin: 'D3', duty: [0.7, 0.8], atMs: 1900, label: chk('pwm', 3) },
  { kind: 'pwm', pin: 'D3', duty: [0.3, 0.7], atMs: 2500, label: chk('pwm', 4) },
  { kind: 'pwm', pin: 'D3', duty: [0.8, 1], atMs: 2950, label: chk('pwm', 5) },
];

const hexChecks: Check[] = [
  { kind: 'runs', minMs: 2000, label: chk('hex', 1) },
  { kind: 'pin-level', pin: 'DIG0_A', level: 1, atMs: 300, label: chk('hex', 2) },
  { kind: 'pin-level', pin: 'DIG0_G', level: 0, atMs: 300, label: chk('hex', 3) },
  { kind: 'pin-level', pin: 'DIG0_G', level: 1, atMs: 800, label: chk('hex', 4) },
  { kind: 'pin-level', pin: 'DIG0_A', level: 0, atMs: 1300, label: chk('hex', 5) },
  { kind: 'pin-level', pin: 'DIG2_C', level: 0, atMs: 1800, label: chk('hex', 6) },
  { kind: 'pin-level', pin: 'DIG5_A', level: 0, atMs: 1800, label: chk('hex', 7) },
];

const lessons: Lesson[] = [
  {
    id: 'switches', n: 1, level: 'intro', language: 'verilog',
    code: { source: SWITCHES, libraries: [], top: 'top', ports: { SW: SW_NETS, KEY: KEY_NETS, LEDR: LEDR_NETS } },
    params: [],
    circuit: null,
    world: {
      inputs: [slide('switches', 8), slide('switches', 9), key('switches', 0)],
      script: [{ t: 500, input: 'sw8', value: 1 }, { t: 1000, input: 'sw9', value: 1 }, { t: 1500, input: 'key0', value: 1 }, { t: 2000, input: 'key0', value: 0 }],
    },
    serial: { baud: 115200, sample: [] },
    runMs: 2500,
    checks: switchesChecks,
    variants: [],
    pins: [pinRole('switches', 'SW8', 'blue'), pinRole('switches', 'KEY0', 'blue'), pinRole('switches', 'LEDR9', 'red')],
    callouts: [{ part: 'SW8', text: 'lessons.switches.callouts.SW8' }, { part: 'KEY0', text: 'lessons.switches.callouts.KEY0' }, { part: 'U14', text: 'lessons.switches.callouts.U14' }],
    ...lessonText('switches', 3, 2, 3, ['board', 'warn', 'play']),
    quiz: quiz('switches', [1, 2, 0]),
  },
  {
    id: 'blink', n: 2, level: 'io', language: 'verilog',
    code: { source: BLINK, libraries: [], top: 'top', ports: { LEDR: LEDR_NETS } },
    params: [{ id: 'hz', kind: 'number', label: 'lessons.blink.params.hz.label', default: 2, min: 1, max: 5, step: 1, unit: 'Hz' }],
    circuit: null,
    world: { inputs: [], script: [] },
    serial: { baud: 115200, sample: [] },
    runMs: 4000,
    checks: blinkChecks,
    variants: [],
    pins: [pinRole('blink', 'MAX10_CLK1_50', 'yellow'), pinRole('blink', 'LEDR0', 'red'), pinRole('blink', 'LEDR6', 'red')],
    callouts: [{ part: 'U3', text: 'lessons.blink.callouts.U3' }, { part: 'LEDR0', text: 'lessons.blink.callouts.LEDR0' }, { part: 'LEDR6', text: 'lessons.blink.callouts.LEDR6' }],
    ...lessonText('blink', 3, 2, 3, ['board', 'tip', 'play']),
    quiz: quiz('blink', [0, 2, 0]),
  },
  {
    id: 'counter', n: 3, level: 'input', language: 'verilog',
    code: { source: COUNTER, libraries: [], top: 'top', ports: { KEY: KEY_NETS, LEDR: LEDR_NETS } },
    params: [],
    circuit: null,
    world: {
      inputs: [key('counter', 0), key('counter', 1)],
      script: [
        { t: 300, input: 'key0', value: 1 }, { t: 450, input: 'key0', value: 0 },
        { t: 700, input: 'key0', value: 1 }, { t: 850, input: 'key0', value: 0 },
        { t: 1100, input: 'key0', value: 1 }, { t: 1250, input: 'key0', value: 0 },
        { t: 1500, input: 'key1', value: 1 }, { t: 1700, input: 'key1', value: 0 },
        { t: 2000, input: 'key1', value: 1 }, { t: 3300, input: 'key1', value: 0 },
      ],
    },
    serial: { baud: 115200, sample: [] },
    runMs: 3500,
    checks: counterChecks,
    variants: [],
    pins: [pinRole('counter', 'KEY0', 'blue'), pinRole('counter', 'KEY1', 'blue'), pinRole('counter', 'LEDR0', 'red')],
    callouts: [{ part: 'KEY0', text: 'lessons.counter.callouts.KEY0' }, { part: 'KEY1', text: 'lessons.counter.callouts.KEY1' }, { part: 'U14', text: 'lessons.counter.callouts.U14' }],
    ...lessonText('counter', 4, 3, 3, ['play', 'tip', 'board']),
    quiz: quiz('counter', [2, 0, 1]),
  },
  {
    id: 'pwm', n: 4, level: 'analog', language: 'verilog',
    code: { source: PWM, libraries: [], top: 'top', ports: { SW: SW_NETS, ARDUINO_IO: ARD_NETS, LEDR: LEDR_NETS } },
    params: [],
    circuit: 'arduino-led',
    world: {
      inputs: [slide('pwm', 7), slide('pwm', 6), slide('pwm', 9)],
      script: [{ t: 200, input: 'sw7', value: 1 }, { t: 1200, input: 'sw6', value: 1 }, { t: 2000, input: 'sw9', value: 1 }],
    },
    serial: { baud: 115200, sample: [] },
    runMs: 3200,
    checks: pwmChecks,
    variants: [],
    pins: [pinRole('pwm', 'D3', 'orange'), pinRole('pwm', 'GND', 'black'), pinRole('pwm', 'SW9', 'blue')],
    callouts: [{ part: 'JP3', text: 'lessons.pwm.callouts.JP3' }, { part: 'R1', text: 'lessons.pwm.callouts.R1' }, { part: 'LED1', text: 'lessons.pwm.callouts.LED1' }],
    ...lessonText('pwm', 3, 2, 3, ['play', 'board', 'tip']),
    quiz: quiz('pwm', [1, 0, 2]),
  },
  {
    id: 'hex', n: 5, level: 'project', language: 'verilog',
    code: { source: HEX, libraries: [], top: 'top', ports: { SW: SW_NETS, LEDR: LEDR_NETS } },
    params: [],
    circuit: null,
    world: {
      inputs: [slide('hex', 0), slide('hex', 1), slide('hex', 3), slide('hex', 9)],
      script: [{ t: 500, input: 'sw0', value: 1 }, { t: 500, input: 'sw1', value: 1 }, { t: 1000, input: 'sw3', value: 1 }, { t: 1500, input: 'sw9', value: 1 }],
    },
    serial: { baud: 115200, sample: [] },
    runMs: 2000,
    checks: hexChecks,
    variants: [],
    pins: [pinRole('hex', 'HEX0', 'yellow'), pinRole('hex', 'HEX2', 'yellow'), pinRole('hex', 'SW0', 'blue')],
    callouts: [{ part: 'HEX10', text: 'lessons.hex.callouts.HEX10' }, { part: 'HEX32', text: 'lessons.hex.callouts.HEX32' }, { part: 'SW0', text: 'lessons.hex.callouts.SW0' }],
    ...lessonText('hex', 4, 3, 3, ['board', 'tip', 'warn']),
    quiz: quiz('hex', [0, 1, 2]),
  },
];

const fail = (id: string, kind: BoardContent['failures'][number]['kind'], trigger: BoardContent['failures'][number]['trigger'], state: Record<string, unknown>, effect: BoardContent['failures'][number]['effect']) => ({
  id, kind, trigger, figure: { type: 'set' as const, state }, effect,
  title: `failures.${id}.title`, symptom: `failures.${id}.symptom`, explanation: `failures.${id}.explanation`, fix: `failures.${id}.fix`,
});

const de10Lite: BoardContent = {
  lab: 'board',
  id: 'de10-lite',
  maker: 'Terasic',
  variants: [],
  mcu: {
    part: '10M50DAF484C7G',
    core: 'Intel MAX 10 FPGA (no CPU: the design is the circuit)',
    cores: 0,
    clockHz: 50_000_000,
    flashBytes: 5_888 * 1024 / 8,
    ramBytes: 1_638 * 1024 / 8,
    target: 'fpga',
    adcBits: 12,
    wireless: [],
    fpga: { family: 'MAX 10', logicCells: 50_000, clockHz: 50_000_000, toolchain: 'Intel Quartus Prime Lite 25.1std' },
    companions: [
      { part: 'FT245BL', role: 'mcu.ft245bl' },
      { part: 'EPM240T100', role: 'mcu.epm240' },
      { part: 'CDCE937', role: 'mcu.cdce937' },
      { part: 'ADXL345', role: 'mcu.adxl345' },
    ],
  },
  logicVolts: IO,
  power: {
    inputs: [
      { id: 'usb', connector: 'usb-b', part: 'J3', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'ext', connector: 'header-pin', part: 'JP6', volts: { min: 4.75, max: 5.5, recommended: [4.75, 5.25] }, reverseProtected: true, protection: 'power.ext.protection' },
    ],
    rails: [
      { name: '5V', volts: 5, from: 'Q2', note: 'power.rails.5v' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 3000, from: 'U7', note: 'power.rails.3v3' },
      { name: '1V2', volts: 1.2, maxCurrentMa: 3000, from: 'U6', note: 'power.rails.1v2' },
      { name: '2V5', volts: 2.5, maxCurrentMa: 500, from: 'REG1', note: 'power.rails.2v5' },
      { name: '1V8', volts: 1.8, maxCurrentMa: 500, from: 'REG2', note: 'power.rails.1v8' },
    ],
    io: { perPinMa: 8, absMaxPerPinMa: 25, note: 'power.io' },
    brownoutVolts: 3.0,
    idleMa: 150,
  },
  pinout,
  leds,
  controls,
  displays: [
    { id: 'HEX10', kind: 'seven-segment', size: [2, 1], pins: [1, 0].flatMap((d) => SEG.map((_, k) => segNet(d, k))), activeLow: true, note: 'displays.HEX10' },
    { id: 'HEX32', kind: 'seven-segment', size: [2, 1], pins: [3, 2].flatMap((d) => SEG.map((_, k) => segNet(d, k))), activeLow: true, note: 'displays.HEX32' },
    { id: 'HEX54', kind: 'seven-segment', size: [2, 1], pins: [5, 4].flatMap((d) => SEG.map((_, k) => segNet(d, k))), activeLow: true, note: 'displays.HEX54' },
  ],
  figure: { page: '/figures/boards/de10-lite.html', sheets: ['board', 'breadboard', 'schematic', 'power'], parts },
  wireables: [
    { part: 'led', supplyVolts: IO, note: 'wireables.led.note', caution: 'wireables.led.caution',
      connections: [{ from: 'A', to: 'D3', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }] },
    { part: 'push-button', supplyVolts: IO, note: 'wireables.push-button.note',
      connections: [{ from: '1', to: 'D2', color: 'blue' }, { from: '3', to: 'GND', color: 'black' }] },
    { part: 'piezo-buzzer', supplyVolts: IO, note: 'wireables.piezo-buzzer.note',
      connections: [{ from: '+', to: 'D5', color: 'orange' }, { from: '−', to: 'GND', color: 'black' }] },
    { part: 'potentiometer', supplyVolts: 5, note: 'wireables.potentiometer.note', caution: 'wireables.potentiometer.caution',
      connections: [{ from: '1', to: 'GND', color: 'black' }, { from: '2', to: 'A0', color: 'yellow' }, { from: '3', to: '5V', color: 'red' }] },
    { part: 'servo-sg90', supplyVolts: 5, note: 'wireables.servo-sg90.note', caution: 'wireables.servo-sg90.caution',
      connections: [{ from: 'SIG', to: 'D9', color: 'orange' }, { from: 'V+', to: '5V', color: 'red' }, { from: 'GND', to: 'GND', color: 'brown' }] },
    { part: 'hc-sr04', supplyVolts: 5, note: 'wireables.hc-sr04.note', caution: 'wireables.hc-sr04.caution',
      connections: [{ from: 'VCC', to: '5V', color: 'red' }, { from: 'Trig', to: 'D7', color: 'yellow' }, { from: 'Echo', to: 'D8', color: 'green' }, { from: 'GND', to: 'GND', color: 'black' }] },
    { part: 'mpu6050', supplyVolts: IO, note: 'wireables.mpu6050.note', caution: 'wireables.mpu6050.caution',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'SCL', color: 'yellow' }, { from: 'SDA', to: 'SDA', color: 'blue' }] },
  ],
  failures: [
    fail('reverse-ext', 'reverse-polarity', { by: 'reverse', input: 'ext' }, { power: 'ext', fault: 'reverse-polarity:ext' }, { power: 'off', halts: true }),
    fail('ext-12v', 'wrong-voltage', { by: 'power-input', input: 'ext', volts: 12 }, { power: 'ext', fault: 'wrong-voltage:ext:12' }, { power: 'off', halts: true }),
    fail('ext-3v5', 'wrong-voltage', { by: 'power-input', input: 'ext', volts: 3.5 }, { power: 'ext', fault: 'wrong-voltage:ext:3.5' }, { power: 'resetting', halts: true }),
    fail('brownout', 'brownout', { by: 'load', rail: '3V3', ma: 3500 }, { power: 'usb', fault: 'brownout' }, { power: 'resetting', halts: true }),
    fail('short-3v3', 'short', { by: 'short', nets: ['3V3', 'GND'] }, { power: 'usb', fault: 'short:3V3:GND' }, { power: 'off', halts: true }),
    fail('short-5v', 'short', { by: 'short', nets: ['5V', 'GND'] }, { power: 'usb', fault: 'short:5V:GND' }, { power: 'off', halts: true }),
    fail('missing-y1', 'missing-part', { by: 'remove-part', part: 'Y1' }, { power: 'usb', fault: 'missing:Y1' }, { power: 'on', halts: true }),
    fail('cold-sw0', 'cold-solder', { by: 'cold-joint', part: 'SW0' }, { power: 'usb', fault: 'cold:SW0' }, { power: 'on', halts: false, pins: { SW0: 'noisy' } }),
  ],
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false,
      title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false,
      title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'reflow', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false,
      title: 'assembly.reflow.title', body: 'assembly.reflow.body', refusal: 'assembly.reflow.refusal' },
    { id: 'place-low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'missing.length': 10 }, major: false,
      title: 'assembly.place-low.title', body: 'assembly.place-low.body', refusal: 'assembly.place-low.refusal' },
    { id: 'place-tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 0 }, major: false,
      title: 'assembly.place-tall.title', body: 'assembly.place-tall.body', refusal: 'assembly.place-tall.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false,
      title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'power-up', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { status: 'running', 'leds.D4': 1, 'leds.D2': 1 }, major: false,
      title: 'assembly.power-up.title', body: 'assembly.power-up.body' },
    { id: 'factory-test', kind: 'test', action: { type: 'press', id: 'ctl-sw0' }, done: { 'leds.LEDR4': 1, 'leds.LEDR5': 1, 'leds.LEDR0': 0 }, major: false,
      title: 'assembly.factory-test.title', body: 'assembly.factory-test.body' },
    { id: 'program', kind: 'test', action: { type: 'press', id: 'upload', choice: 'blink' }, done: { status: 'running', mode: 'blink' }, major: false,
      title: 'assembly.program.title', body: 'assembly.program.body', refusal: 'assembly.program.refusal' },
  ],
  lessons,
  serial: { baud: 115200, sample: [] },
  sources: [
    { title: 'Terasic DE10-Lite User Manual (v1.7, October 2022)', url: 'https://www.terasic.com.tw/cgi-bin/page/archive.pl?Language=English&No=1021' },
    { title: 'Terasic DE10-Lite schematic, Rev B1', url: 'https://mil.ufl.edu/3701/docs/DE10/DE10-Lite_Schematic.pdf' },
    { title: 'DE10_LITE_Golden_Top.qsf (Terasic System Builder pin assignments)', url: 'https://github.com/janaite/fpga-de10lite-golden-top' },
    { title: 'Terasic DE10-Lite resources', url: 'https://www.terasic.com.tw/cgi-bin/page/archive.pl?Language=English&No=1021&PartNo=4' },
    { title: 'Intel MAX 10 FPGA documentation', url: 'https://www.intel.com/content/www/us/en/products/details/fpga/max/10/docs.html' },
    { title: 'Analog Devices ADXL345 datasheet', url: 'https://www.analog.com/media/en/technical-documentation/data-sheets/ADXL345.pdf' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
};

export default de10Lite;
