// text
module top #(
  parameter CLK_HZ = 50_000_000
) (
  input        MAX10_CLK1_50,
  input  [1:0] KEY,     // text
  output [9:0] LEDR
);
  // 1. text
  reg [1:0] k0 = 2'b11;
  reg [1:0] k1 = 2'b11;
  always @(posedge MAX10_CLK1_50) begin
    k0 <= {k0[0], KEY[0]};
    k1 <= {k1[0], KEY[1]};
  end

  // 2. text
  wire press = k0[1] & ~k0[0];

  // 3. text
  localparam HOLD = CLK_HZ;
  reg [31:0] held = 0;
  always @(posedge MAX10_CLK1_50) begin
    if (k1[1])
      held <= 0;
    else if (held != HOLD)
      held <= held + 1;
  end
  wire clear = (held == HOLD - 1);

  // 4. text
  reg [9:0] count = 0;
  always @(posedge MAX10_CLK1_50) begin
    if (clear)
      count <= 0;
    else if (press)
      count <= count + 1;
  end

  assign LEDR = count;
endmodule
