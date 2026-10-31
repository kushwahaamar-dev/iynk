// text
module top #(
  parameter CLK_HZ   = 100_000_000,  // text
  parameter BLINK_HZ = 2
) (
  input             clk,             // W5
  output reg [15:0] led
);
  // text
  localparam HALF = CLK_HZ / (2 * BLINK_HZ);

  reg [31:0] count = 0;
  initial led = 16'b0;

  always @(posedge clk) begin
    if (count == HALF - 1) begin
      count  <= 0;
      led[0] <= ~led[0];                                  // text
      if (led[0]) led[15:12] <= led[15:12] + 1;           // text
    end else begin
      count <= count + 1;
    end
  end
endmodule
