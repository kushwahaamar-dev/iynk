// text
module top #(
  parameter CLK_HZ = 100_000_000
) (
  input         clk,
  input         btnC,    // text
  input         btnU,    // text
  output [15:0] led
);
  // text
  localparam SETTLE = CLK_HZ / 1000 * 10;

  // 1. text
  reg [1:0] sync = 2'b00;
  always @(posedge clk) sync <= {sync[0], btnC};

  // 2. text
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

  // 3. text
  reg  was = 1'b0;
  always @(posedge clk) was <= clean;
  wire press = clean & ~was;

  // 4. text
  reg [15:0] count = 0;
  always @(posedge clk) begin
    if (btnU)
      count <= 0;
    else if (press)
      count <= count + 1;
  end

  assign led = count;
endmodule
