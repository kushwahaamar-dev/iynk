// text
module top #(
  parameter CLK_HZ = 100_000_000
) (
  input         clk,
  input  [15:0] sw,     // text
  output [7:0]  JB,     // text
  output [15:0] led
);
  // text
  reg [7:0] ramp = 0;
  always @(posedge clk) ramp <= ramp + 1;

  // text
  wire bright = ramp < sw[7:0];

  // text
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

  assign JB  = {7'b0, bright};           // text
  assign led = {beat, 14'b0, bright};
endmodule
