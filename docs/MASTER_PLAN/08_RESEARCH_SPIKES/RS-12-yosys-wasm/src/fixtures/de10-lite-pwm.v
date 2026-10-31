// text
module top #(
  parameter CLK_HZ = 50_000_000
) (
  input         MAX10_CLK1_50,
  input  [9:0]  SW,           // text
  output [15:0] ARDUINO_IO,   // text
  output [9:0]  LEDR
);
  // text
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

  // text
  wire [7:0] duty = SW[9] ? level : SW[7:0];

  // text
  reg [7:0] ramp = 0;
  always @(posedge MAX10_CLK1_50) ramp <= ramp + 1;
  wire bright = ramp < duty;

  assign ARDUINO_IO = {12'b0, bright, 3'b000};   // text
  assign LEDR       = {SW[9], 8'b0, bright};
endmodule
