# Fig. 11 — Digilent Basys 3 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **Digilent Basys 3** (PB200-183, rev D) lying on its four standoffs
on a pale green cutting mat with a 10 mm grid, with a flat blue cast shadow (`figures/boards/basys3.js`, facts in
`docs/facts/basys3.md`). The board is 121.92 x 71.12 mm, 1.5 mm thick, square corners, blue solder mask, white silk,
four 3.66 mm holes in the corners. Through-hole pads sit where Digilent's DXF puts them and SMD parts where its STEP
model does, the switch and LED edge toward the viewer:

- in the middle: the **Artix-7 XC7A35T** BGA (marked XILINX ARTIX-7 XC7A35T 1C) in a ring of decoupling capacitors,
  silk BASYS3 and DIGILENT beside it, the 100 MHz MEMS oscillator under the board with its pin named on the silk
  (CLK100MHz (W5));
- along the front edge: 16 slide switches SW15 … SW0 with their FPGA pins in brackets on the silk, 16 green SMD LEDs
  LD15 … LD0 above them, the **4-digit common-anode display** DISP1 at the left with its two dual PNP drivers Q1 and Q2
  under the board, and the five SMD buttons in a plus (BTNU, BTNL, BTNC, BTNR, BTND, each with its pin);
- along the back edge: the micro-USB J4 with a dark cable plugged in that curls down onto the mat, the RX and TX LEDs,
  the FT2232HQ USB bridge, the VGA socket J1, the USB-A host socket J2 with the PIC24 USB-host chip and its BUSY LED,
  the mode jumper JP1 (QSPI, JTAG, USB) with its shunt on QSPI, the red PROG button and the green DONE LED;
- at the left back corner the power section: the EXT header J6 (silk "5V Only!"), its 10 µF input capacitor C27, the
  power-source jumper JP2 (shunt on USB), the power switch SW16 on ON, the red LD20 and, under the board, the LTC3633
  dual buck (1.0 V and 3.3 V) and the LTC3621 (1.8 V) with their inductors; test points W1 (3.3 V), W2 (1.8 V) and W3
  (1.0 V);
- on the sides: the Pmod ports JA and JXADC at the left, JB and JC at the right, each 2 x 6 right-angle socket with its
  pins named (1-4, GND, 3V3, 7-10, GND, 3V3); the Quad-SPI flash IC8 under the board.

What it does:

- **Power ▾**: USB cable, or 4.5-5.5 V on the EXT header, or Unplug. The power tree is real: USB → J4 → JP2 → VU, or
  EXT → J6 → JP2 → VU, with no reverse diode and no fuse on EXT; VU feeds the LTC3633's 1.0 V, whose power-good starts
  the LTC3621's 1.8 V, whose power-good starts the 3.3 V. LD20 lights from 3.3 V. The FPGA needs 2.9 V and the flash
  to run; DONE (LD19) lights once it has loaded its design.
- **Program the FPGA ▾**: the factory GPIO demo (each switch lights the LED above it, the display counts 0-9 once a
  second, a button blanks a digit, BTNC blanks the display and restarts the count, and the UART prints "BASYS3
  GPIO/UART DEMO!" and "Button press detected!"), Blink LD0 from a counter, an LED chaser, and the switches as a hex
  number on the display. Programming goes only over USB through the FT2232HQ and the FPGA. The stat reads Design.
- **Flip SW0 … SW15, press BTNU … BTND, press PROG**: the switches and buttons drive the running design; while a design
  runs in the Board Lab the host moves the levers to match the levels the design reads.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾ (low parts first, then tall), Solder joints, Remove a
  part ▾**: the real build order with its refusals.
- **Break it ▾**: EXT wired backwards (the LTC3633 burns), 12 V on EXT (C27 fails), 3 V on EXT (brown-out), a Pmod
  3V3 pin shorted to GND, VU shorted to GND, the JP2 shunt lost (dead), no flash (powered, nothing runs), a motor on
  the rail (brown-out resets), and a cold joint on any switch or button (its LED flickers by itself).
- **View ▾**: the board; the breadboard with an LED on Pmod JB (JB pin 1 → 220 Ω → red LED → JB pin 5, real current);
  the hand-inked schematic and power-tree sheets; the exploded view. **See-through** shows the silicon dies and the
  copper: USB 5 V, VU, 3.3 V, SW0 to the FPGA, the FPGA to LD0 and to segment A. Labels: SILICON DIE: LOGIC CELLS,
  MEMS RESONATOR, NO QUARTZ, USB BRIDGE, FLASH: THE DESIGN, BUCK 1.0 V + 3.3 V.
- A design run in the Board Lab reaches the drawing as nets: LD0..LD15, SW0..SW15, BTNU..BTND, JA1..JC10, and one net
  per segment, DIG<d>_<A..G|DP> (digit 0 rightmost, brightness averaged over the multiplexing).

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the SimLab host (embedded, bare). Bitstream sizes are the XC7A35T's
2,192,012 bytes.
