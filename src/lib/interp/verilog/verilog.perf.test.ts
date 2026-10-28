import { describe, expect, it } from 'vitest';
import { createRun } from '../run';
import { getProfile } from '../profiles';
import { compileVerilog } from './sim';

const CHASER = `module chaser #(parameter DIV = 50_000_000) (
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

describe('Verilog speed', () => {
  it('runs fast enough to animate', () => {
    const sim = compileVerilog(CHASER, getProfile('basys3'), { DIV: 1000 });
    const t0 = performance.now();
    sim.run(200_000);
    const ms = performance.now() - t0;
    expect(200_000 / ms).toBeGreaterThan(100); // > 100k cycles per wall second
  });

  it('a design without a clock runs a second of board time in under 250 ms', () => {
    const run = createRun({ board: 'basys3', source: 'module top(input [15:0] sw, output [15:0] led);\n  assign led = ~sw;\nendmodule\n' });
    run.start();
    const t0 = performance.now();
    run.step(1000);
    expect(performance.now() - t0).toBeLessThan(250);
  });
});
