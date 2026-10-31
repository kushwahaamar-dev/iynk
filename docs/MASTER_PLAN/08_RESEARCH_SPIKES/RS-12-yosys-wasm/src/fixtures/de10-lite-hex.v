// text

// text
module hex7 (
  input  [3:0] value,
  output [7:0] hex       // text
);
  // text
  reg [6:0] lit;
  always @* begin
    case (value)
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
  assign hex = {1'b1, ~lit};   // text
endmodule

module top (
  input  [9:0] SW,
  output [7:0] HEX0,
  output [7:0] HEX1,
  output [7:0] HEX2,
  output [7:0] HEX3,
  output [7:0] HEX4,
  output [7:0] HEX5,
  output [9:0] LEDR
);
  // text
  hex7 digit0 (.value(SW[3:0]), .hex(HEX0));
  hex7 digit1 (.value(SW[7:4]), .hex(HEX1));
  hex7 digit2 (.value({2'b00, SW[9:8]}), .hex(HEX2));

  // text
  assign HEX3 = 8'hFF;
  assign HEX4 = 8'hFF;
  assign HEX5 = 8'hFF;
  assign LEDR = SW;
endmodule
