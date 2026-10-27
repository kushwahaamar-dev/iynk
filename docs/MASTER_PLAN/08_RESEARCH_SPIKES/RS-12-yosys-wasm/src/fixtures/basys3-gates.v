// text
// text
module top (
  input  [15:0] sw,    // text
  output [15:0] led    // text
);
  assign led[0] = sw[0] & sw[1];   // AND: text
  assign led[1] = sw[0] | sw[1];   // OR:  text
  assign led[2] = sw[0] ^ sw[1];   // XOR: text
  assign led[3] = ~sw[0];          // NOT: text

  // text
  assign led[15:4] = sw[15:4];
endmodule
