// Digilent Basys 3 (Artix-7 XC7A35T-1CPG236C). Facts: docs/facts/basys3.md (pins from the master XDC, circuits from the
// Rev D.1 schematic). Figure: figures/boards/basys3.js; part ids, nets, fault ids and the circuit key match it exactly.
// Lessons are Verilog: `code.ports` is the XDC, each top-level port bit landing on the board net the figure draws.
import type { BoardContent, Check, FigurePart, Lesson, OnboardControl, OnboardLed, PinRow, Quiz, WorldInput } from '@/content/schema';

const IO = 3.3;
const N16 = Array.from({ length: 16 }, (_, i) => i);
const SW_PIN = ['V17', 'V16', 'W16', 'W17', 'W15', 'V15', 'W14', 'W13', 'V2', 'T3', 'T2', 'R3', 'W2', 'U1', 'T1', 'R2'];
const LD_PIN = ['U16', 'E19', 'U19', 'V19', 'W18', 'U15', 'U14', 'V14', 'V13', 'V3', 'W3', 'U3', 'P3', 'N3', 'P1', 'L1'];
const BUTTONS: [id: string, port: string, pin: string][] = [['BTNU', 'btnU', 'T18'], ['BTNL', 'btnL', 'W19'], ['BTNC', 'btnC', 'U18'], ['BTNR', 'btnR', 'T17'], ['BTND', 'btnD', 'U17']];
const PMOD_PINS: Record<string, string[]> = {
  JA: ['J1', 'L2', 'J2', 'G2', 'H1', 'K2', 'H2', 'G3'],
  JB: ['A14', 'A16', 'B15', 'B16', 'A15', 'A17', 'C15', 'C16'],
  JC: ['K17', 'M18', 'N17', 'P18', 'L17', 'M19', 'P17', 'R18'],
};
const XADC: [label: string, pin: string, pair: string][] = [
  ['XA1_P', 'J3', 'VAUX6P'], ['XA2_P', 'L3', 'VAUX14P'], ['XA3_P', 'M2', 'VAUX7P'], ['XA4_P', 'N2', 'VAUX15P'],
  ['XA1_N', 'K3', 'VAUX6N'], ['XA2_N', 'M3', 'VAUX14N'], ['XA3_N', 'M1', 'VAUX7N'], ['XA4_N', 'N1', 'VAUX15N'],
];

/** Pmod signal pins 1-4 and 7-10, in port bit order (JB[0] is pin 1, JB[4] is pin 7). */
const PMOD_SIGNALS = [1, 2, 3, 4, 7, 8, 9, 10];
const pmodNets = (j: string) => PMOD_SIGNALS.map((n) => `${j}${n}`);

/** A 12-pin Pmod port: GND on pins 5 and 11, 3.3 V on 6 and 12, and `signal(bit, pin)` on 1-4 and 7-10. */
const pmodPort = (j: string, signal: (bit: number, pin: string) => PinRow): PinRow[] => Array.from({ length: 12 }, (_, i): PinRow => {
  const n = i + 1, pin = String(n);
  if (n === 5 || n === 11) return { header: j, pin, label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' };
  if (n === 6 || n === 12) return { header: j, pin, label: '3V3', functions: ['3.3 V out'], caps: ['power'], volts: IO, maxCurrentMa: 1000, net: '3V3', note: 'pins.pmod3v3' };
  return signal(PMOD_SIGNALS.indexOf(n), pin);
});
const pmod = (j: string) => pmodPort(j, (bit, pin) => ({
  header: j, pin, label: `${j}${pin}`, functions: [`${j}[${bit}]`], caps: ['fpga-io', 'digital', 'pwm'], volts: IO, maxCurrentMa: 16, net: `${j}${pin}`, fpgaPin: PMOD_PINS[j][bit], note: 'pins.pmod',
}));
const jxadc = pmodPort('JXADC', (bit, pin) => {
  const [label, ball, pair] = XADC[bit];
  return { header: 'JXADC', pin, label, functions: [`JXADC[${bit}]`, pair], caps: ['fpga-io', 'digital', 'analog-in'], volts: IO, net: label, fpgaPin: ball, note: 'pins.jxadc' };
});

const pinout: PinRow[] = [
  { header: 'CLK', pin: 'W5', label: 'CLK100MHZ', functions: ['clk', '100 MHz'], caps: ['clock'], volts: IO, net: 'CLK', fpgaPin: 'W5', note: 'pins.clk' },
  ...N16.map((n): PinRow => ({ header: 'SW', pin: String(n), label: `SW${n}`, functions: [`sw[${n}]`], caps: ['fpga-io', 'digital'], volts: IO, net: `SW${n}`, fpgaPin: SW_PIN[n], note: 'pins.sw' })),
  ...N16.map((n): PinRow => ({ header: 'LED', pin: String(n), label: `LD${n}`, functions: [`led[${n}]`], caps: ['fpga-io', 'digital', 'led'], volts: IO, maxCurrentMa: 4, net: `LD${n}`, fpgaPin: LD_PIN[n], note: 'pins.led' })),
  ...BUTTONS.map(([id, port, pin]): PinRow => ({ header: 'BTN', pin: id.slice(3), label: id, functions: [port], caps: ['fpga-io', 'digital'], volts: IO, net: id, fpgaPin: pin, note: 'pins.btn' })),
  ...['W7', 'W6', 'U8', 'V8', 'U5', 'V5', 'U7'].map((pin, k): PinRow => ({ header: '7SEG', pin: `C${'ABCDEFG'[k]}`, label: `C${'ABCDEFG'[k]}`, functions: [`seg[${k}]`, `segment ${'abcdefg'[k]}`], caps: ['fpga-io', 'digital'], volts: IO, net: `C${'ABCDEFG'[k]}`, fpgaPin: pin, note: 'pins.seg' })),
  { header: '7SEG', pin: 'DP', label: 'DP', functions: ['dp', 'decimal point'], caps: ['fpga-io', 'digital'], volts: IO, net: 'DP', fpgaPin: 'V7', note: 'pins.seg' },
  ...['U2', 'U4', 'V4', 'W4'].map((pin, k): PinRow => ({ header: '7SEG', pin: `AN${k}`, label: `AN${k}`, functions: [`an[${k}]`, k === 0 ? 'rightmost digit' : k === 3 ? 'leftmost digit' : `digit ${k}`], caps: ['fpga-io', 'digital'], volts: IO, net: `AN${k}`, fpgaPin: pin, note: 'pins.an' })),
  ...pmod('JA'), ...pmod('JB'), ...pmod('JC'),
  ...jxadc,
  { header: 'UART', pin: 'RX', label: 'RsRx', functions: ['RsRx', 'UART in, from the PC'], caps: ['uart'], volts: IO, net: 'RsRx', fpgaPin: 'B18', note: 'pins.uart' },
  { header: 'UART', pin: 'TX', label: 'RsTx', functions: ['RsTx', 'UART out, to the PC'], caps: ['uart'], volts: IO, net: 'RsTx', fpgaPin: 'A18', note: 'pins.uart' },
  ...[['vgaRed', ['G19', 'H19', 'J19', 'N19']], ['vgaGreen', ['J17', 'H17', 'G17', 'D17']], ['vgaBlue', ['N18', 'L18', 'K18', 'J18']]].flatMap(([port, pins]) =>
    (pins as string[]).map((pin, b): PinRow => ({ header: 'VGA', pin: `${port}${b}`, label: `${port}[${b}]`, functions: [`${port}[${b}]`], caps: ['fpga-io', 'digital'], volts: IO, net: `${port}${b}`, fpgaPin: pin, note: 'pins.vga' }))),
  { header: 'VGA', pin: 'HS', label: 'Hsync', functions: ['Hsync'], caps: ['fpga-io', 'digital'], volts: IO, net: 'Hsync', fpgaPin: 'P19', note: 'pins.vga' },
  { header: 'VGA', pin: 'VS', label: 'Vsync', functions: ['Vsync'], caps: ['fpga-io', 'digital'], volts: IO, net: 'Vsync', fpgaPin: 'R19', note: 'pins.vga' },
  { header: 'PS2', pin: 'CLK', label: 'PS2Clk', functions: ['PS2Clk', 'PULLUP true'], caps: ['fpga-io'], volts: IO, net: 'PS2Clk', fpgaPin: 'C17', note: 'pins.ps2' },
  { header: 'PS2', pin: 'DATA', label: 'PS2Data', functions: ['PS2Data', 'PULLUP true'], caps: ['fpga-io'], volts: IO, net: 'PS2Data', fpgaPin: 'B17', note: 'pins.ps2' },
  { header: 'J6', pin: '1', label: 'EXT', functions: ['4.5-5.5 V in'], caps: ['power'], volts: 5, net: 'VEXT', note: 'pins.ext' },
  { header: 'J6', pin: '2', label: 'GND', functions: [], caps: ['gnd'], volts: null, net: 'GND' },
];

const leds: OnboardLed[] = [
  ...N16.map((n): OnboardLed => ({ id: `LD${n}`, label: `LD${n}`, color: 'green', drivenBy: `LD${n}`, activeLow: false, note: 'leds.user' })),
  { id: 'LD16', label: 'BUSY', color: 'yellow', drivenBy: 'status', activeLow: true, note: 'leds.LD16' },
  { id: 'LD17', label: 'RX', color: 'yellow', drivenBy: 'usb-rx', activeLow: false, note: 'leds.LD17' },
  { id: 'LD18', label: 'TX', color: 'yellow', drivenBy: 'usb-tx', activeLow: false, note: 'leds.LD18' },
  { id: 'LD19', label: 'DONE', color: 'green', drivenBy: 'status', activeLow: false, note: 'leds.LD19' },
  { id: 'LD20', label: 'POWER', color: 'red', drivenBy: 'power', activeLow: false, note: 'leds.LD20' },
];

const controls: OnboardControl[] = [
  ...N16.map((n): OnboardControl => ({ id: `SW${n}`, label: `SW${n}`, kind: 'slide-switch', pin: `sw[${n}]`, activeLow: false, act: 'ctl', effect: 'controls.sw' })),
  ...BUTTONS.map(([id, port]): OnboardControl => ({ id, label: id, kind: 'user-button', pin: port, activeLow: false, act: 'ctl', effect: 'controls.btn' })),
  { id: 'PROG', label: 'PROG', kind: 'reset', activeLow: true, act: 'ctl', effect: 'controls.PROG' },
];

const part = (id: string, short: string, role: FigurePart['role'], key = id): FigurePart => ({ id, short, role, name: `parts.${key}.name`, what: `parts.${key}.what` });
const parts: FigurePart[] = [
  part('IC7', 'FPGA', 'fpga'),
  part('C45', 'DECOUPLING', 'passive'),
  part('IC1', 'USB-JTAG', 'usb-bridge'),
  part('IC2', 'USB HOST', 'mcu'),
  part('DISP1', 'DISPLAY', 'display'),
  part('Q1', 'Q1', 'driver'),
  part('Q2', 'Q2', 'driver'),
  ...N16.map((n) => part(`SW${n}`, `SW${n}`, 'switch', 'sw')),
  ...N16.map((n) => part(`LD${n}`, `LD${n}`, 'led', 'ld')),
  ...BUTTONS.map(([id]) => part(id, id, 'button', 'btn')),
  part('PROG', 'PROG', 'button'),
  part('J4', 'MICRO-USB', 'connector'),
  part('J6', 'EXT 5V', 'header'),
  part('C27', 'C27', 'passive'),
  part('JP2', 'JP2', 'jumper'),
  part('SW16', 'POWER', 'switch'),
  part('LD20', 'LD20', 'led'),
  part('W1', 'W1', 'other', 'testpoint'),
  part('W3', 'W3', 'other', 'testpoint'),
  part('W2', 'W2', 'other', 'testpoint'),
  part('IC10', '1V0+3V3', 'regulator'),
  part('L1', 'L1', 'passive', 'inductor'),
  part('L2', 'L2', 'passive', 'inductor'),
  part('IC11', '1V8', 'regulator'),
  part('L3', 'L3', 'passive', 'inductor'),
  part('LD17', 'RX', 'led'),
  part('LD18', 'TX', 'led'),
  part('JP1', 'MODE', 'jumper'),
  part('LD19', 'DONE', 'led'),
  part('LD16', 'BUSY', 'led'),
  part('IC8', 'FLASH', 'memory'),
  part('IC9', 'CLOCK', 'crystal'),
  part('J1', 'VGA', 'connector'),
  part('J2', 'USB-A', 'connector'),
  part('JA', 'JA', 'header', 'pmod'),
  part('JXADC', 'JXADC', 'header'),
  part('JB', 'JB', 'header', 'pmod'),
  part('JC', 'JC', 'header', 'pmod'),
];

/* ---------- lessons ---------- */

const SW_NETS = N16.map((n) => `SW${n}`);
const LD_NETS = N16.map((n) => `LD${n}`);

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
// The buttons have a 10 K pull-down and read 1 while pressed; they bounce for a few milliseconds, as real ones do.
const button = (lesson: string, id: string, net: string): WorldInput => ({
  id, quantity: 'button', device: { kind: 'button', pull: 'external-down', bounceMs: 5 }, pins: [net], part: net,
  min: 0, max: 1, step: 1, default: 0, gesture: 'press', label: `lessons.${lesson}.world.${id}`,
});

const GATES = `// {{t:lessons.gates.code.intro}}
// {{t:lessons.gates.code.xdc}}
module top (
  input  [15:0] sw,    // {{t:lessons.gates.code.sw}}
  output [15:0] led    // {{t:lessons.gates.code.led}}
);
  assign led[0] = sw[0] & sw[1];   // AND: {{t:lessons.gates.code.and}}
  assign led[1] = sw[0] | sw[1];   // OR:  {{t:lessons.gates.code.or}}
  assign led[2] = sw[0] ^ sw[1];   // XOR: {{t:lessons.gates.code.xor}}
  assign led[3] = ~sw[0];          // NOT: {{t:lessons.gates.code.not}}

  // {{t:lessons.gates.code.rest}}
  assign led[15:4] = sw[15:4];
endmodule
`;

const BLINK = `// {{t:lessons.blink.code.intro}}
module top #(
  parameter CLK_HZ   = 100_000_000,  // {{t:lessons.blink.code.clk}}
  parameter BLINK_HZ = {{p:hz}}
) (
  input             clk,             // W5
  output reg [15:0] led
);
  // {{t:lessons.blink.code.half}}
  localparam HALF = CLK_HZ / (2 * BLINK_HZ);

  reg [31:0] count = 0;
  initial led = 16'b0;

  always @(posedge clk) begin
    if (count == HALF - 1) begin
      count  <= 0;
      led[0] <= ~led[0];                                  // {{t:lessons.blink.code.toggle}}
      if (led[0]) led[15:12] <= led[15:12] + 1;           // {{t:lessons.blink.code.count}}
    end else begin
      count <= count + 1;
    end
  end
endmodule
`;

const COUNTER = `// {{t:lessons.counter.code.intro}}
module top #(
  parameter CLK_HZ = 100_000_000
) (
  input         clk,
  input         btnC,    // {{t:lessons.counter.code.btnC}}
  input         btnU,    // {{t:lessons.counter.code.btnU}}
  output [15:0] led
);
  // {{t:lessons.counter.code.settle}}
  localparam SETTLE = CLK_HZ / 1000 * {{p:settle}};

  // 1. {{t:lessons.counter.code.sync}}
  reg [1:0] sync = 2'b00;
  always @(posedge clk) sync <= {sync[0], btnC};

  // 2. {{t:lessons.counter.code.debounce}}
  reg        clean = 1'b0;
  reg [31:0] held  = 0;
  always @(posedge clk) begin
    if (sync[1] == clean)
      held <= 0;
    else if (held == SETTLE - 1) begin
      clean <= sync[1];
      held  <= 0;
    end else
      held <= held + 1;
  end

  // 3. {{t:lessons.counter.code.edge}}
  reg  was = 1'b0;
  always @(posedge clk) was <= clean;
  wire press = clean & ~was;

  // 4. {{t:lessons.counter.code.count}}
  reg [15:0] count = 0;
  always @(posedge clk) begin
    if (btnU)
      count <= 0;
    else if (press)
      count <= count + 1;
  end

  assign led = count;
endmodule
`;

const PWM = `// {{t:lessons.pwm.code.intro}}
module top #(
  parameter CLK_HZ = 100_000_000
) (
  input         clk,
  input  [15:0] sw,     // {{t:lessons.pwm.code.sw}}
  output [7:0]  JB,     // {{t:lessons.pwm.code.jb}}
  output [15:0] led
);
  // {{t:lessons.pwm.code.ramp}}
  reg [7:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1;

  // {{t:lessons.pwm.code.compare}}
  wire bright = ramp < sw[7:0];

  // {{t:lessons.pwm.code.beat}}
  localparam HALF = CLK_HZ / 2;
  reg [31:0] count = 0;
  reg        beat  = 1'b0;
  always @(posedge clk) begin
    if (count == HALF - 1) begin
      count <= 0;
      beat  <= ~beat;
    end else
      count <= count + 1;
  end

  assign JB  = {7'b0, bright};           // {{t:lessons.pwm.code.pin}}
  assign led = {beat, 14'b0, bright};
endmodule
`;

const DISPLAY = `// {{t:lessons.display.code.intro}}
module top #(
  parameter CLK_HZ     = 100_000_000,
  parameter REFRESH_HZ = {{p:refresh}}    // {{t:lessons.display.code.refresh}}
) (
  input            clk,
  input     [15:0] sw,
  output    [6:0]  seg,    // {{t:lessons.display.code.seg}}
  output reg [3:0] an,     // {{t:lessons.display.code.an}}
  output           dp
);
  // {{t:lessons.display.code.turn}}
  localparam TURN = CLK_HZ / (4 * REFRESH_HZ);

  reg [31:0] count = 0;
  reg [1:0]  digit = 0;
  always @(posedge clk) begin
    if (count == TURN - 1) begin
      count <= 0;
      digit <= digit + 1;
    end else
      count <= count + 1;
  end

  // {{t:lessons.display.code.pick}}
  reg [3:0] nibble;
  always @* begin
    case (digit)
      2'd0:    begin an = 4'b1110; nibble = sw[3:0];   end
      2'd1:    begin an = 4'b1101; nibble = sw[7:4];   end
      2'd2:    begin an = 4'b1011; nibble = sw[11:8];  end
      default: begin an = 4'b0111; nibble = sw[15:12]; end
    endcase
  end

  // {{t:lessons.display.code.table}}
  reg [6:0] lit;
  always @* begin
    case (nibble)
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

  assign seg = ~lit;    // {{t:lessons.display.code.invert}}
  assign dp  = 1'b1;    // {{t:lessons.display.code.dp}}
endmodule
`;

const gatesChecks: Check[] = [
  { kind: 'runs', minMs: 2500, label: chk('gates', 1) },
  { kind: 'pin-level', pin: 'LD3', level: 1, atMs: 300, label: chk('gates', 2) },
  { kind: 'pin-level', pin: 'LD1', level: 1, atMs: 800, label: chk('gates', 3) },
  { kind: 'pin-level', pin: 'LD0', level: 0, atMs: 800, label: chk('gates', 4) },
  { kind: 'pin-level', pin: 'LD0', level: 1, atMs: 1300, label: chk('gates', 5) },
  { kind: 'pin-level', pin: 'LD2', level: 0, atMs: 1300, label: chk('gates', 6) },
  { kind: 'pin-level', pin: 'LD2', level: 1, atMs: 1800, label: chk('gates', 7) },
];

const blinkChecks: Check[] = [
  { kind: 'runs', minMs: 4000, label: chk('blink', 1) },
  { kind: 'pin-toggles', pin: 'LD0', periodMs: [150, 1100], minCycles: 3, label: chk('blink', 2) },
  { kind: 'pin-toggles', pin: 'LD12', periodMs: [300, 2200], minCycles: 1, label: chk('blink', 3) },
  { kind: 'code', must: ['posedge clk', 'CLK_HZ'], mustNot: [], label: chk('blink', 4) },
];

const counterChecks: Check[] = [
  { kind: 'runs', minMs: 3600, label: chk('counter', 1) },
  { kind: 'responds', after: { t: 500, input: 'btnc', value: 1 }, pin: 'LD0', withinMs: 100, mode: 'out', v: [1, 1], label: chk('counter', 2) },
  { kind: 'pin-level', pin: 'LD0', level: 1, atMs: 3100, label: chk('counter', 3) },
  { kind: 'pin-level', pin: 'LD1', level: 1, atMs: 3100, label: chk('counter', 4) },
  { kind: 'pin-level', pin: 'LD2', level: 0, atMs: 3100, label: chk('counter', 5) },
  { kind: 'pin-level', pin: 'LD0', level: 0, atMs: 3500, label: chk('counter', 6) },
];

const pwmChecks: Check[] = [
  { kind: 'runs', minMs: 3500, label: chk('pwm', 1) },
  { kind: 'pwm', pin: 'JB1', duty: [0.45, 0.55], atMs: 1000, label: chk('pwm', 2) },
  { kind: 'pwm', pin: 'JB1', duty: [0.7, 0.8], atMs: 2000, label: chk('pwm', 3) },
  { kind: 'pwm', pin: 'JB1', duty: [0.2, 0.3], atMs: 3000, label: chk('pwm', 4) },
  { kind: 'pin-toggles', pin: 'LD15', periodMs: [800, 1200], minCycles: 1, label: chk('pwm', 5) },
];

// A multiplexed digit is lit a quarter of the time: lit segments read about 0.25, dark ones 0.
const LIT: [number, number] = [0.15, 0.4];
const DARK: [number, number] = [0, 0.05];
const displayChecks: Check[] = [
  { kind: 'runs', minMs: 3000, label: chk('display', 1) },
  { kind: 'pwm', pin: 'DIG0_A', duty: LIT, atMs: 900, label: chk('display', 2) },
  { kind: 'pwm', pin: 'DIG0_G', duty: DARK, atMs: 900, label: chk('display', 3) },
  { kind: 'pwm', pin: 'DIG0_G', duty: LIT, atMs: 1900, label: chk('display', 4) },
  { kind: 'pwm', pin: 'DIG0_A', duty: DARK, atMs: 2400, label: chk('display', 5) },
  { kind: 'pwm', pin: 'DIG3_G', duty: LIT, atMs: 2900, label: chk('display', 6) },
  { kind: 'pwm', pin: 'DIG2_G', duty: DARK, atMs: 2900, label: chk('display', 7) },
];

const lessons: Lesson[] = [
  {
    id: 'gates', n: 1, level: 'intro', language: 'verilog',
    code: { source: GATES, libraries: [], top: 'top', ports: { sw: SW_NETS, led: LD_NETS } },
    params: [],
    circuit: null,
    world: {
      inputs: [slide('gates', 0), slide('gates', 1)],
      script: [{ t: 500, input: 'sw0', value: 1 }, { t: 1000, input: 'sw1', value: 1 }, { t: 1500, input: 'sw0', value: 0 }, { t: 2000, input: 'sw1', value: 0 }],
    },
    serial: { baud: 9600, sample: [] },
    runMs: 2500,
    checks: gatesChecks,
    variants: [],
    pins: [pinRole('gates', 'SW0', 'blue'), pinRole('gates', 'SW1', 'blue'), pinRole('gates', 'LD0', 'green')],
    callouts: [{ part: 'SW0', text: 'lessons.gates.callouts.SW0' }, { part: 'LD0', text: 'lessons.gates.callouts.LD0' }, { part: 'IC7', text: 'lessons.gates.callouts.IC7' }],
    ...lessonText('gates', 3, 2, 3, ['board', 'tip', 'play']),
    quiz: quiz('gates', [2, 0, 1]),
  },
  {
    id: 'blink', n: 2, level: 'io', language: 'verilog',
    code: { source: BLINK, libraries: [], top: 'top', ports: { led: LD_NETS } },
    params: [{ id: 'hz', kind: 'number', label: 'lessons.blink.params.hz.label', default: 2, min: 1, max: 5, step: 1, unit: 'Hz' }],
    circuit: null,
    world: { inputs: [], script: [] },
    serial: { baud: 9600, sample: [] },
    runMs: 4000,
    checks: blinkChecks,
    variants: [],
    pins: [pinRole('blink', 'CLK100MHZ', 'yellow'), pinRole('blink', 'LD0', 'green'), pinRole('blink', 'LD12', 'green')],
    callouts: [{ part: 'IC9', text: 'lessons.blink.callouts.IC9' }, { part: 'LD0', text: 'lessons.blink.callouts.LD0' }, { part: 'LD12', text: 'lessons.blink.callouts.LD12' }],
    ...lessonText('blink', 3, 2, 3, ['board', 'tip', 'play']),
    quiz: quiz('blink', [1, 2, 0]),
  },
  {
    id: 'counter', n: 3, level: 'input', language: 'verilog',
    code: { source: COUNTER, libraries: [], top: 'top', ports: { btnC: ['BTNC'], btnU: ['BTNU'], led: LD_NETS } },
    params: [{ id: 'settle', kind: 'number', label: 'lessons.counter.params.settle.label', default: 10, min: 2, max: 20, step: 1, unit: 'ms' }],
    circuit: null,
    world: {
      inputs: [button('counter', 'btnc', 'BTNC'), button('counter', 'btnu', 'BTNU')],
      script: [
        { t: 500, input: 'btnc', value: 1 }, { t: 800, input: 'btnc', value: 0 },
        { t: 1500, input: 'btnc', value: 1 }, { t: 1800, input: 'btnc', value: 0 },
        { t: 2500, input: 'btnc', value: 1 }, { t: 2800, input: 'btnc', value: 0 },
        { t: 3200, input: 'btnu', value: 1 }, { t: 3350, input: 'btnu', value: 0 },
      ],
    },
    serial: { baud: 9600, sample: [] },
    runMs: 3600,
    checks: counterChecks,
    variants: [],
    pins: [pinRole('counter', 'BTNC', 'blue'), pinRole('counter', 'BTNU', 'blue'), pinRole('counter', 'LD0', 'green')],
    callouts: [{ part: 'BTNC', text: 'lessons.counter.callouts.BTNC' }, { part: 'BTNU', text: 'lessons.counter.callouts.BTNU' }, { part: 'LD0', text: 'lessons.counter.callouts.LD0' }],
    ...lessonText('counter', 4, 3, 3, ['play', 'warn', 'tip']),
    quiz: quiz('counter', [1, 0, 2]),
  },
  {
    id: 'pwm', n: 4, level: 'analog', language: 'verilog',
    code: { source: PWM, libraries: [], top: 'top', ports: { sw: SW_NETS, JB: pmodNets('JB'), led: LD_NETS } },
    params: [],
    circuit: 'pmod-led',
    world: {
      inputs: [slide('pwm', 7), slide('pwm', 6)],
      script: [{ t: 200, input: 'sw7', value: 1 }, { t: 1200, input: 'sw6', value: 1 }, { t: 2200, input: 'sw7', value: 0 }],
    },
    serial: { baud: 9600, sample: [] },
    runMs: 3500,
    checks: pwmChecks,
    variants: [],
    pins: [pinRole('pwm', 'JB1', 'orange'), pinRole('pwm', 'GND', 'black'), pinRole('pwm', 'SW7', 'blue')],
    callouts: [{ part: 'JB', text: 'lessons.pwm.callouts.JB' }, { part: 'R1', text: 'lessons.pwm.callouts.R1' }, { part: 'LED1', text: 'lessons.pwm.callouts.LED1' }],
    ...lessonText('pwm', 3, 2, 3, ['play', 'board', 'tip']),
    quiz: quiz('pwm', [0, 2, 1]),
  },
  {
    id: 'display', n: 5, level: 'project', language: 'verilog',
    code: { source: DISPLAY, libraries: [], top: 'top', ports: { sw: SW_NETS } },
    params: [{ id: 'refresh', kind: 'number', label: 'lessons.display.params.refresh.label', default: 250, min: 60, max: 1000, step: 10, unit: 'Hz' }],
    circuit: null,
    world: {
      inputs: [slide('display', 0), slide('display', 1), slide('display', 3), slide('display', 15)],
      script: [{ t: 1000, input: 'sw0', value: 1 }, { t: 1000, input: 'sw1', value: 1 }, { t: 2000, input: 'sw3', value: 1 }, { t: 2500, input: 'sw15', value: 1 }],
    },
    serial: { baud: 9600, sample: [] },
    runMs: 3000,
    checks: displayChecks,
    variants: [],
    pins: [pinRole('display', 'CA', 'yellow'), pinRole('display', 'AN0', 'orange'), pinRole('display', 'SW0', 'blue')],
    callouts: [{ part: 'DISP1', text: 'lessons.display.callouts.DISP1' }, { part: 'Q2', text: 'lessons.display.callouts.Q2' }, { part: 'SW0', text: 'lessons.display.callouts.SW0' }],
    ...lessonText('display', 4, 3, 3, ['board', 'warn', 'tip']),
    quiz: quiz('display', [2, 1, 0]),
  },
];

const fail = (id: string, kind: BoardContent['failures'][number]['kind'], trigger: BoardContent['failures'][number]['trigger'], state: Record<string, unknown>, effect: BoardContent['failures'][number]['effect']) => ({
  id, kind, trigger, figure: { type: 'set' as const, state }, effect,
  title: `failures.${id}.title`, symptom: `failures.${id}.symptom`, explanation: `failures.${id}.explanation`, fix: `failures.${id}.fix`,
});

const basys3: BoardContent = {
  lab: 'board',
  id: 'basys3',
  maker: 'Digilent',
  variants: [],
  mcu: {
    part: 'XC7A35T-1CPG236C',
    core: 'AMD Artix-7 FPGA (no CPU: the design is the circuit)',
    cores: 0,
    clockHz: 100_000_000,
    flashBytes: 4 * 1024 * 1024,
    ramBytes: 1_800 * 1024 / 8,
    target: 'fpga',
    adcBits: 12,
    wireless: [],
    fpga: { family: 'Artix-7', logicCells: 33_280, clockHz: 100_000_000, toolchain: 'AMD Vivado 2026.1 (free BASIC tier)' },
    companions: [
      { part: 'FT2232HQ', role: 'mcu.ft2232hq' },
      { part: 'PIC24FJ128GB106', role: 'mcu.pic24' },
      { part: 'MX25L3233F', role: 'mcu.flash' },
    ],
  },
  logicVolts: IO,
  power: {
    inputs: [
      { id: 'usb', connector: 'micro-usb', part: 'J4', volts: { min: 4.75, max: 5.25 }, maxCurrentMa: 500, reverseProtected: true, protection: 'power.usb.protection' },
      { id: 'ext', connector: 'header-pin', part: 'J6', volts: { min: 4.5, max: 5.5, recommended: [4.75, 5.25] }, reverseProtected: false, protection: 'power.ext.protection' },
    ],
    rails: [
      { name: 'VU', volts: 5, from: 'JP2', note: 'power.rails.vu' },
      { name: '1V0', volts: 1.0, maxCurrentMa: 2000, from: 'IC10', note: 'power.rails.1v0' },
      { name: '1V8', volts: 1.8, maxCurrentMa: 300, from: 'IC11', note: 'power.rails.1v8' },
      { name: '3V3', volts: 3.3, maxCurrentMa: 2000, from: 'IC10', note: 'power.rails.3v3' },
    ],
    io: { perPinMa: 12, absMaxPerPinMa: 16, note: 'power.io' },
    brownoutVolts: 2.9,
    idleMa: 150,
  },
  pinout,
  leds,
  controls,
  displays: [
    { id: 'DISP1', kind: 'seven-segment', size: [4, 1], pins: ['CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'DP', 'AN0', 'AN1', 'AN2', 'AN3'], activeLow: true, note: 'displays.DISP1' },
  ],
  figure: { page: '/figures/boards/basys3.html', sheets: ['board', 'breadboard', 'schematic', 'power'], parts },
  wireables: [
    { part: 'led', supplyVolts: IO, note: 'wireables.led.note', caution: 'wireables.led.caution',
      connections: [{ from: 'A', to: 'JB1', color: 'orange' }, { from: 'K', to: 'GND', color: 'black' }] },
    { part: 'push-button', supplyVolts: IO, note: 'wireables.push-button.note',
      connections: [{ from: '1', to: 'JB2', color: 'blue' }, { from: '3', to: 'GND', color: 'black' }] },
    { part: 'piezo-buzzer', supplyVolts: IO, note: 'wireables.piezo-buzzer.note',
      connections: [{ from: '+', to: 'JB3', color: 'orange' }, { from: '−', to: 'GND', color: 'black' }] },
    { part: 'mpu6050', supplyVolts: IO, note: 'wireables.mpu6050.note', caution: 'wireables.mpu6050.caution',
      connections: [{ from: 'VCC', to: '3V3', color: 'red' }, { from: 'GND', to: 'GND', color: 'black' }, { from: 'SCL', to: 'JC1', color: 'yellow' }, { from: 'SDA', to: 'JC2', color: 'blue' }] },
    { part: 'ssd1306', supplyVolts: IO, note: 'wireables.ssd1306.note', caution: 'wireables.ssd1306.caution',
      connections: [{ from: 'GND', to: 'GND', color: 'black' }, { from: 'VCC', to: '3V3', color: 'red' }, { from: 'SCL', to: 'JC1', color: 'yellow' }, { from: 'SDA', to: 'JC2', color: 'blue' }] },
  ],
  failures: [
    fail('reverse-ext', 'reverse-polarity', { by: 'reverse', input: 'ext' }, { power: 'ext', fault: 'reverse-polarity:ext' }, { power: 'off', halts: true, damages: ['IC10'] }),
    fail('ext-12v', 'wrong-voltage', { by: 'power-input', input: 'ext', volts: 12 }, { power: 'ext', fault: 'wrong-voltage:ext:12' }, { power: 'off', halts: true, damages: ['C27'] }),
    fail('ext-3v', 'wrong-voltage', { by: 'power-input', input: 'ext', volts: 3 }, { power: 'ext', fault: 'wrong-voltage:ext:3' }, { power: 'resetting', halts: true }),
    fail('brownout', 'brownout', { by: 'load', rail: '3V3', ma: 2500 }, { power: 'usb', fault: 'brownout' }, { power: 'resetting', halts: true }),
    fail('short-3v3', 'short', { by: 'short', nets: ['3V3', 'GND'] }, { power: 'usb', fault: 'short:3V3:GND' }, { power: 'off', halts: true }),
    fail('short-vu', 'short', { by: 'short', nets: ['VU', 'GND'] }, { power: 'usb', fault: 'short:VU:GND' }, { power: 'off', halts: true }),
    fail('missing-jp2', 'missing-part', { by: 'remove-part', part: 'JP2' }, { power: 'usb', fault: 'missing:JP2' }, { power: 'off', halts: true }),
    fail('missing-flash', 'missing-part', { by: 'remove-part', part: 'IC8' }, { power: 'usb', fault: 'missing:IC8' }, { power: 'on', halts: true }),
    fail('cold-sw0', 'cold-solder', { by: 'cold-joint', part: 'SW0' }, { power: 'usb', fault: 'cold:SW0' }, { power: 'on', halts: false, pins: { SW0: 'noisy' } }),
  ],
  assembly: [
    { id: 'unplug', kind: 'build', action: { type: 'set', state: { power: null } }, done: { power: null }, major: false,
      title: 'assembly.unplug.title', body: 'assembly.unplug.body' },
    { id: 'strip', kind: 'build', action: { type: 'press', id: 'strip' }, done: { build: 'bare' }, major: false,
      title: 'assembly.strip.title', body: 'assembly.strip.body', refusal: 'assembly.strip.refusal' },
    { id: 'reflow', kind: 'build', action: { type: 'press', id: 'pnp' }, done: { build: 'reflowed' }, major: false,
      title: 'assembly.reflow.title', body: 'assembly.reflow.body', refusal: 'assembly.reflow.refusal' },
    { id: 'place-low', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-low' }, done: { 'missing.length': 7 }, major: false,
      title: 'assembly.place-low.title', body: 'assembly.place-low.body', refusal: 'assembly.place-low.refusal' },
    { id: 'place-tall', kind: 'build', action: { type: 'press', id: 'place', choice: 'group-tall' }, done: { 'missing.length': 0 }, major: false,
      title: 'assembly.place-tall.title', body: 'assembly.place-tall.body', refusal: 'assembly.place-tall.refusal' },
    { id: 'solder', kind: 'build', action: { type: 'press', id: 'solder' }, done: { build: 'assembled' }, major: false,
      title: 'assembly.solder.title', body: 'assembly.solder.body', refusal: 'assembly.solder.refusal' },
    { id: 'power-up', kind: 'test', action: { type: 'set', state: { power: 'usb' } }, done: { status: 'running', 'leds.LD20': 1, 'leds.LD19': 1 }, major: false,
      title: 'assembly.power-up.title', body: 'assembly.power-up.body' },
    { id: 'factory-test', kind: 'test', action: { type: 'press', id: 'ctl-sw0' }, done: { 'leds.LD0': 1 }, major: false,
      title: 'assembly.factory-test.title', body: 'assembly.factory-test.body' },
    { id: 'program', kind: 'test', action: { type: 'press', id: 'upload', choice: 'chase' }, done: { status: 'running', mode: 'chase' }, major: false,
      title: 'assembly.program.title', body: 'assembly.program.body', refusal: 'assembly.program.refusal' },
  ],
  lessons,
  serial: { baud: 9600, sample: ['BASYS3 GPIO/UART DEMO!', 'Button press detected!'] },
  sources: [
    { title: 'Digilent Basys 3 Reference Manual (rev C, DOC# 502-183)', url: 'https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys3_rm.pdf' },
    { title: 'Digilent Basys 3 web reference manual', url: 'https://digilent.com/reference/programmable-logic/basys-3/reference-manual' },
    { title: 'Basys-3-Master.xdc (Digilent XDC repository)', url: 'https://github.com/Digilent/digilent-xdc/blob/master/Basys-3-Master.xdc' },
    { title: 'Basys 3 schematic, Rev D.1', url: 'https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys-3-sch-public-rev-d.pdf' },
    { title: 'Basys 3 mechanical drawings and DXF', url: 'https://digilent.com/reference/_media/reference/programmable-logic/basys-3/basys_3_dimensions.zip' },
    { title: 'Basys 3 GPIO demo', url: 'https://digilent.com/reference/programmable-logic/basys-3/demos/gpio' },
    { title: 'Basys 3 programming guide', url: 'https://digilent.com/reference/learn/programmable-logic/tutorials/basys-3-programming-guide/start' },
    { title: 'AMD Vivado licensing options (2026.1 tiers)', url: 'https://www.amd.com/en/products/software/adaptive-socs-and-fpgas/vivado/vivado-licensing-options.html' },
  ],
  title: 'title',
  tagline: 'tagline',
  overview: 'overview',
};

export default basys3;
