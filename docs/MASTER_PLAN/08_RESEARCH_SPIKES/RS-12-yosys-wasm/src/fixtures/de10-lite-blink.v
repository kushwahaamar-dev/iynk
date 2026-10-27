// text
module top #(
  parameter CLK_HZ   = 50_000_000,   // text
  parameter BLINK_HZ = 2
) (
  input            MAX10_CLK1_50,
  output reg [9:0] LEDR
);
  // text
  localparam HALF = CLK_HZ / (2 * BLINK_HZ);

  reg [31:0] count = 0;
  initial LEDR = 10'b0;

  always @(posedge MAX10_CLK1_50) begin
    if (count == HALF - 1) begin
      count   <= 0;
      LEDR[0] <= ~LEDR[0];                               // text
      if (LEDR[0]) LEDR[9:6] <= LEDR[9:6] + 1;           // text
    end else begin
      count <= count + 1;
    end
  end
endmodule
