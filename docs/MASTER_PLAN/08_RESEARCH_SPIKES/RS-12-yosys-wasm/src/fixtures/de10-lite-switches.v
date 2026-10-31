// text
// text
module top (
  input  [9:0] SW,      // text
  input  [1:0] KEY,     // text
  output [9:0] LEDR
);
  assign LEDR[7:0] = SW[7:0];          // text
  assign LEDR[8]   = SW[8] ^ SW[9];    // text
  assign LEDR[9]   = ~KEY[0];          // text
endmodule
