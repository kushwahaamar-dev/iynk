import { describe, expect, it } from 'vitest';
import { createRun, check } from '../run';
import { getProfile } from '../profiles';
import { compileVerilog } from './sim';

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

const DECODER = `module top(
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
    run.input('sw', 0b0011);
    run.step(0.01);
    const snap = run.snapshot();
    expect(snap.ports?.led).toBe(3);
    // Digit 0 (rightmost) shows "3": segments a, b, c, d, g.
    expect(snap.seg7?.[0]).toEqual([1, 1, 1, 1, 0, 0, 1, 0]);
    expect(snap.seg7?.[1]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    run.input('sw[3]', 1); // 0b1011 = B
    run.step(0.01);
    expect(run.snapshot().seg7?.[0]).toEqual([0, 0, 1, 1, 1, 1, 1, 0]);
  });

  it('multiplexed digits show as persistence-of-vision fractions', () => {
    const src = `module top(input clk, output [6:0] seg, output [3:0] an, output dp);
  reg [1:0] digit = 0;
  always @(posedge clk) digit <= digit + 1;
  assign an = ~(4'b0001 << digit);
  assign seg = (digit == 0) ? 7'b1111001 : 7'b1111111;
  assign dp = 1'b1;
endmodule
`;
    const run = createRun({ board: 'basys3', source: src });
    run.start();
    run.step(0.004);
    const d = run.snapshot().seg7!;
    expect(d[0][1]).toBeCloseTo(0.25, 2); // "1" lit a quarter of the time
    expect(d[0][0]).toBe(0);
    expect(d[1][1]).toBe(0);
  });

  it('runs fast enough to animate', () => {
    const sim = compileVerilog(CHASER, getProfile('basys3'), { DIV: 1000 });
    const t0 = performance.now();
    sim.run(200_000);
    const ms = performance.now() - t0;
    expect(sim.outputs().led).toBe(1 << (200 % 16));
    expect(200_000 / ms).toBeGreaterThan(100); // > 100k cycles per wall second
  });
});

describe('Verilog on the DE10-Lite', () => {
  it('active-low keys and HEX displays, 50 MHz counter', () => {
    const src = `module top(input MAX10_CLK1_50, input [1:0] KEY, input [9:0] SW, output [9:0] LEDR, output [7:0] HEX0);
  reg [3:0] ticks = 0;
  always @(posedge MAX10_CLK1_50) ticks <= ticks + 1'b1;
  assign LEDR = {SW[9:4], ticks};
  assign HEX0 = KEY[0] ? 8'hFF : 8'hC0;
endmodule
`;
    const run = createRun({ board: 'de10-lite', source: src });
    run.start();
    run.step(0.0001); // 5 cycles at 50 MHz
    expect(run.snapshot().ports?.LEDR).toBe(5);
    expect(run.snapshot().seg7?.[0]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    run.input('KEY[0]', 0); // pressed
    run.step(0.0001);
    expect(run.snapshot().seg7?.[0]).toEqual([1, 1, 1, 1, 1, 1, 0, 0]); // "0"
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
