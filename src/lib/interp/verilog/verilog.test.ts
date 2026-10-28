import { describe, expect, it } from 'vitest';
import { createRun, check } from '../run';
import { getProfile } from '../profiles';
import { digitNet, fpgaNets } from './nets';
import { SIM_CLOCK_HZ, compileVerilog } from './sim';

const CHASER = `// One lit LED walks along the 16 LEDs; btnC restarts it.
module chaser #(parameter DIV = 50_000_000) (
  input clk,
  input btnC,
  output reg [15:0] led
);
  reg [31:0] count = 0;
  initial led = 16'b1;
  always @(posedge clk) begin
    if (btnC) begin
      count <= 0;
      led <= 16'b1;
    end else if (count == DIV - 1) begin
      count <= 0;
      led <= {led[14:0], led[15]};
    end else
      count <= count + 1;
  end
endmodule
`;

const DECODER = `module top #(parameter CLK_HZ = 100_000_000) (
  input [15:0] sw,
  output [15:0] led,
  output reg [6:0] seg,
  output [3:0] an,
  output dp
);
  assign led = sw;
  assign an = 4'b1110;   // only the rightmost digit
  assign dp = 1'b1;
  always @* begin
    case (sw[3:0])
      4'h0: seg = 7'b1000000;
      4'h1: seg = 7'b1111001;
      4'h2: seg = 7'b0100100;
      4'h3: seg = 7'b0110000;
      4'h4: seg = 7'b0011001;
      4'h5: seg = 7'b0010010;
      4'h6: seg = 7'b0000010;
      4'h7: seg = 7'b1111000;
      4'h8: seg = 7'b0000000;
      4'h9: seg = 7'b0010000;
      4'hA: seg = 7'b0001000;
      4'hB: seg = 7'b0000011;
      4'hC: seg = 7'b1000110;
      4'hD: seg = 7'b0100001;
      4'hE: seg = 7'b0000110;
      default: seg = 7'b0001110;
    endcase
  end
endmodule
`;

describe('Verilog on the Basys 3', () => {
  it('LED chaser with a host parameter override', () => {
    const run = createRun({ board: 'basys3', source: CHASER, params: { DIV: 10 } });
    run.start();
    run.step(0.001); // 100 cycles at 100 MHz
    expect(run.status.cycles).toBe(100);
    expect(run.snapshot().ports?.led).toBe(1 << 10);
    run.step(0.0006);
    expect(run.snapshot().ports?.led).toBe(1 << 0); // wrapped around after 16 shifts
    run.input('btnC', 1);
    run.step(0.0001);
    run.input('btnC', 0);
    expect(run.snapshot().ports?.led).toBe(1);
  });

  it('a #(.DIV(n)) override on an instance', () => {
    const src = `${CHASER}
module top(input clk, input btnC, output [15:0] led);
  chaser #(.DIV(3)) walker(.clk(clk), .btnC(btnC), .led(led));
endmodule
`;
    const sim = compileVerilog(src, getProfile('basys3'), {});
    sim.run(3 * 5);
    expect(sim.outputs().led).toBe(1 << 5);
  });

  it('switches to LEDs and a 7-segment decoder', () => {
    const run = createRun({ board: 'basys3', source: DECODER });
    run.start();
    const lit = () => run.snapshot().seg7!.map((d) => d.map((x) => Math.round(x)));
    run.input('sw', 0b0011);
    run.step(100); // the display settles within a few tens of ms
    expect(run.snapshot().ports?.led).toBe(3);
    // Digit 0 (rightmost) shows "3": segments a, b, c, d, g.
    expect(lit()[0]).toEqual([1, 1, 1, 1, 0, 0, 1, 0]);
    expect(lit()[1]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    run.input('sw[3]', 1); // 0b1011 = B
    run.step(100);
    expect(lit()[0]).toEqual([0, 0, 1, 1, 1, 1, 1, 0]);
  });

  it('multiplexed digits show as persistence-of-vision brightness', () => {
    const src = `module top #(parameter CLK_HZ = 100_000_000) (input clk, output [6:0] seg, output [3:0] an, output dp);
  reg [1:0] digit = 0;
  always @(posedge clk) digit <= digit + 1;
  assign an = ~(4'b0001 << digit);
  assign seg = (digit == 0) ? 7'b1111001 : 7'b1111111;
  assign dp = 1'b1;
endmodule
`;
    const run = createRun({ board: 'basys3', source: src });
    run.start();
    run.step(200); // 20 000 cycles at the simulated 100 kHz
    const d = run.snapshot().seg7!;
    expect(d[0][1]).toBeCloseTo(0.25, 2); // "1" lit a quarter of the time
    expect(d[0][0]).toBe(0);
    expect(d[1][1]).toBe(0);
    expect(d[0][7]).toBe(0); // dp off
  });

  it('a 1 ms digit rate still reads as a steady quarter brightness', () => {
    const src = `module top #(parameter CLK_HZ = 100_000_000) (input clk, output reg [6:0] seg, output reg [3:0] an, output dp);
  localparam DIGIT = CLK_HZ / 1000;
  reg [31:0] count = 0;
  reg [1:0] digit = 0;
  assign dp = 1'b1;
  always @(posedge clk) begin
    if (count == DIGIT - 1) begin count <= 0; digit <= digit + 1; end
    else count <= count + 1;
  end
  always @* begin
    an = ~(4'b0001 << digit);
    seg = 7'b1000000; // "0" on every digit
  end
endmodule
`;
    const run = createRun({ board: 'basys3', source: src });
    run.start();
    for (let t = 0; t < 300; t++) {
      run.step(1);
      if (t < 100) continue;
      for (const digit of run.snapshot().seg7!) {
        expect(digit[0]).toBeGreaterThan(0.15);
        expect(digit[0]).toBeLessThan(0.4);
        expect(digit[6]).toBe(0); // g is off in "0"
      }
    }
  });

  it('the chaser has walked to the right LED after 200,000 cycles', () => {
    const sim = compileVerilog(CHASER, getProfile('basys3'), { DIV: 1000 });
    sim.run(200_000);
    expect(sim.outputs().led).toBe(1 << (200 % 16));
  });
});

describe('Verilog on the DE10-Lite', () => {
  const SRC = `module top(input MAX10_CLK1_50, input [1:0] KEY, input [9:0] SW, output [9:0] LEDR, output [7:0] HEX0);
  reg [3:0] ticks = 0;
  always @(posedge MAX10_CLK1_50) ticks <= ticks + 1'b1;
  assign LEDR = {SW[9:4], ticks};
  assign HEX0 = KEY[0] ? 8'hFF : 8'hC0;
endmodule
`;

  it('runs at 50 MHz with keys idle high', () => {
    const run = createRun({ board: 'de10-lite', source: SRC });
    run.start();
    run.step(0.0001); // 5 cycles at 50 MHz
    expect(run.snapshot().ports?.LEDR).toBe(5);
    expect(run.snapshot().seg7?.[0]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]); // released: HEX0 = FF, dark
  });

  it('an active-low key lights an active-low HEX display', () => {
    const sim = compileVerilog(SRC, getProfile('de10-lite'), {});
    sim.setInput('KEY[0]', 0); // pressed
    sim.run(50_000_000 * 0.1); // 100 ms: the display has settled
    const hex0 = sim.seg7()[0].map((x) => Math.round(x * 100) / 100);
    expect(hex0).toEqual([1, 1, 1, 1, 1, 1, 0, 0]); // "0", no dp
    expect(sim.seg7()[1]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]); // HEX1 not in the design
  });
});

describe('the simulated clock (CLK_HZ)', () => {
  const BLINK = `module top #(parameter CLK_HZ = 100_000_000) (input clk, output reg [15:0] led);
  localparam HALF = CLK_HZ / 2;
  reg [31:0] count = 0;
  initial led = 0;
  always @(posedge clk)
    if (count == HALF - 1) begin count <= 0; led[0] <= ~led[0]; end
    else count <= count + 1;
endmodule
`;

  it('clocks a CLK_HZ design at SIM_CLOCK_HZ with CLK_HZ set to match, so time is the board\'s', () => {
    const sim = compileVerilog(BLINK, getProfile('basys3'), {});
    expect(sim.clockHz).toBe(SIM_CLOCK_HZ);
    const run = createRun({ board: 'basys3', source: BLINK });
    run.start();
    run.step(400);
    expect(run.snapshot().ports?.led).toBe(0);
    run.step(200); // 0.6 s: the half period (0.5 s) has passed
    expect(run.snapshot().ports?.led).toBe(1);
    expect(run.status.cycles).toBe(60_000);
  });

  it('a design without a clock runs a second of board time in one step, and still answers its inputs', () => {
    const run = createRun({ board: 'basys3', source: 'module top(input [15:0] sw, output [15:0] led);\n  assign led = ~sw;\nendmodule\n' });
    run.start();
    run.step(1000);
    expect(run.status.cycles).toBe(100_000_000); // the board's 100 MHz, no cycle budget
    run.input('sw[5]', 1);
    run.step(1);
    expect(run.snapshot().ports?.led).toBe(0xffff & ~(1 << 5));
  });

  it('a host CLK_HZ override sets the clock too, and designs without it run at the board clock', () => {
    expect(compileVerilog(BLINK, getProfile('basys3'), { CLK_HZ: 1000 }).clockHz).toBe(1000);
    expect(compileVerilog(CHASER, getProfile('basys3'), { DIV: 10 }).clockHz).toBe(100_000_000);
    expect(compileVerilog(BLINK.replace('parameter CLK_HZ', 'parameter BOARD_HZ').replace('CLK_HZ / 2', 'BOARD_HZ / 2'), getProfile('basys3'), {}).clockHz).toBe(100_000_000);
  });
});

describe('what the board shows (ports to nets)', () => {
  const PWM = `module top #(parameter CLK_HZ = 100_000_000) (input clk, input [15:0] sw, output [15:0] led);
  reg [7:0] pwm = 0;
  always @(posedge clk) pwm <= pwm + 1;
  assign led[0] = pwm < sw[7:0];
  assign led[15:1] = sw[15:1];
endmodule
`;
  const ports = { led: Array.from({ length: 16 }, (_, i) => `LD${i}`), sw: Array.from({ length: 16 }, (_, i) => `SW${i}`) };

  it('a PWM-dimmed LED shows its duty, a steady one its level, an input its level', () => {
    const run = createRun({ board: 'basys3', source: PWM });
    run.start();
    run.input('sw', 64 | (1 << 9));
    run.step(200);
    const nets = fpgaNets(getProfile('basys3'), run.snapshot(), ports);
    expect(nets.LD0).toEqual({ v: 0.25, pwm: true, input: false });
    expect(nets.LD9).toEqual({ v: 1, pwm: false, input: false });
    expect(nets.LD8).toEqual({ v: 0, pwm: false, input: false });
    expect(nets.SW9).toEqual({ v: 1, pwm: false, input: true });
  });

  it('each digit segment is a net, digit 0 rightmost', () => {
    expect(digitNet(0, 0)).toBe('DIG0_A');
    expect(digitNet(3, 7)).toBe('DIG3_DP');
    const nets = fpgaNets(getProfile('basys3'), { ports: {}, seg7: [[1, 0.26, 0, 0, 0, 0, 0, 0]] }, {});
    expect(nets.DIG0_A).toEqual({ v: 1, pwm: true, input: false });
    expect(nets.DIG0_B.v).toBe(0.25);
  });
});

describe('Verilog errors', () => {
  it('reports friendly errors with line and column', () => {
    const bad = (source: string) => check({ board: 'basys3', source })[0];
    expect(bad('module top(input [15:0] sw, output [15:0] leds);\n  assign leds = sw;\nendmodule\n')).toMatchObject({
      line: 1, col: 43, message: "the Digilent Basys 3 has no pin called 'leds'",
    });
    expect(bad('module top(input [15:0] sw, output [15:0] led);\n  assign led = sw\nendmodule\n')).toMatchObject({ kind: 'syntax', line: 2, col: 18 });
    expect(bad('module top(input clk, output [15:0] led);\n  always @(posedge clk) led <= led + 1;\nendmodule\n').message).toMatch(/is a wire/);
    expect(bad('module top(input clk, output [15:0] led);\n  assign led = cnt;\nendmodule\n').message).toBe("'cnt' is not declared in module top");
    expect(check({ board: 'basys3', source: CHASER, params: { DIVV: 2 } })[0].message).toBe("module chaser has no parameter 'DIVV'");
  });

  it('detects a combinational loop', () => {
    const run = createRun({ board: 'basys3', source: 'module top(input [15:0] sw, output [15:0] led);\n  wire a;\n  assign a = ~a;\n  assign led = {15\'b0, a};\nendmodule\n' });
    const errors: string[] = [];
    run.on('error', (e) => errors.push(e.message));
    run.start();
    run.step(0.001);
    expect(errors.join()).toMatch(/combinational loop/);
  });
});
