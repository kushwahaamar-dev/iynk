// text
module top #(
  parameter CLK_HZ     = 100_000_000,
  parameter REFRESH_HZ = 250    // text
) (
  input            clk,
  input     [15:0] sw,
  output    [6:0]  seg,    // text
  output reg [3:0] an,     // text
  output           dp
);
  // text
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

  // text
  reg [3:0] nibble;
  always @* begin
    case (digit)
      2'd0:    begin an = 4'b1110; nibble = sw[3:0];   end
      2'd1:    begin an = 4'b1101; nibble = sw[7:4];   end
      2'd2:    begin an = 4'b1011; nibble = sw[11:8];  end
      default: begin an = 4'b0111; nibble = sw[15:12]; end
    endcase
  end

  // text
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

  assign seg = ~lit;    // text
  assign dp  = 1'b1;    // text
endmodule
