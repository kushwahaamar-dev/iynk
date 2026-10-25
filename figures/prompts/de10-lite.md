# Fig. 12 — Terasic DE10-Lite (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **Terasic DE10-Lite** (P0466) lying on its four standoffs on a pale
green cutting mat with a 10 mm grid, with a flat blue cast shadow (`figures/boards/de10-lite.js`, facts in
`docs/facts/de10-lite.md`). The board is 97.5 x 80 mm, 1.6 mm thick, slightly rounded corners, blue solder mask, white
silk, four 3.2 mm holes. Terasic publishes no CAD file, so every position is measured on the top-view photo in the
user manual (about ±1.5 mm); parts the fact sheet could not place (the USB chip, the clock generator and its crystal,
the regulators, op-amps and diodes) sit where it says they are, near what they serve. The displays and switches face
the viewer:

- in the middle: the **MAX 10 10M50DAF484C7G** BGA (23 x 23 mm, its own configuration flash inside), the 64 MB SDRAM
  TSOP (ISSI IS42S16320D) to its left, the large DE10-Lite logo printed sideways and the terasIC mark;
- along the front edge: six red common-anode 7-segment digits in three pairs (HEX5-4, HEX3-2, HEX1-0), ten red LEDs
  LEDR9 … LEDR0 and ten slide switches SW9 … SW0 under them, and at the right the two push buttons KEY0 over KEY1 with
  the SN74AUC17 Schmitt-trigger buffer that debounces them;
- at the left: the USB-B socket J3 with a grey cable plugged in that curls down onto the mat, the TPD2EUSB30 ESD chip,
  the USB-Blaster (FT245BL USB chip and MAX II EPM240 CPLD) with the LOAD and CONF LEDs, the unfitted 2.5 V JTAG pads
  J1, the 2-pin "DC 5V" header JP6 with its Schottky diode D7 and the AO3415 over-voltage cut-off Q2, the Schottky D6
  from USB, the two LTC3612 bucks (U7 3.3 V, U6 1.2 V) with their inductors, the polymer capacitors C18 and C145, the
  two LTC3025 regulators (2.5 V, 1.8 V) and the green POWER GOOD LED;
- at the back: the black 2 x 20 GPIO box header JP1 along the edge, the Arduino Uno headers (SCL SDA AREF GND D13-D8,
  D7-D0, the power header with IOREF and RESET, A0-A5), the CDCE937 clock generator on its 24 MHz crystal, the
  ADXL345 accelerometer, the two MCP6244 op-amps and the REF3125 reference for the ADC, and the VGA D-sub at the right.

What it does:

- **Power ▾**: USB cable, or 5 V on JP6, or Unplug. The power tree is real: USB → D6, JP6 → D7 (a reversed supply is
  simply blocked), both into VCC5 through the over-voltage cut-off that opens above about 5.5 V; the 3.3 V buck, then
  (on 3.3 V's power-good) the 1.2 V core, then the two LDOs. POWER GOOD lights with the chain. The FPGA needs 3.0 V,
  the clock generator and the crystal to run; CONF lights when it has loaded its design.
- **Program the FPGA ▾**: the factory design (the LEDs blink and hex digits walk across the displays; KEY0 lights every
  LED and segment; with SW0 up the LEDs are a spirit level, the middle two lit when flat), Blink LEDR0 from a counter,
  the switches to the LEDs, and the switches as a hex number on HEX2-HEX0. Programming goes only over USB through the
  USB-Blaster, whose CPLD runs on the clock generator's 24 MHz. The stat reads Design.
- **Flip SW0 … SW9, press KEY0 and KEY1**: the keys read 0 while pressed; while a design runs in the Board Lab the host
  moves the levers and holds the keys to match the levels the design reads.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾ (low parts first, then tall), Solder joints, Remove a
  part ▾**: the real build order with its refusals.
- **Break it ▾**: JP6 wired backwards (D7 blocks it, no harm), 12 V on JP6 (the cut-off opens, dead), 3.5 V on JP6
  (brown-out), a header 3.3 V or 5 V pin shorted to GND, the 24 MHz crystal missing (powered, no clocks), a heavy
  load (brown-out resets), and cold joints on the FPGA, the clock parts, the LEDs and SW0 (the factory design flips
  into the spirit level by itself).
- **View ▾**: the board; the breadboard with an LED on Arduino D3 (D3 → 220 Ω → red LED → GND, real current); the
  hand-inked schematic and power-tree sheets; the exploded view. **See-through** shows the silicon dies and the copper:
  USB 5 V, VCC5, 3.3 V, SW0 and KEY0 to the FPGA, the FPGA to LEDR0 and to HEX0. Labels: ONE DIE: LOGIC, RAM, ADC AND
  FLASH, DRAM DIE, USB-BLASTER: JTAG, QUARTZ BLANK, MEMS PROOF MASS.
- A design run in the Board Lab reaches the drawing as nets: LEDR0..LEDR9, SW0..SW9, KEY0 and KEY1, D0..D13, SDA and SCL
  on the Arduino header, and one net per segment, DIG<d>_<A..G|DP> (DIG0 = HEX0, the rightmost).

Look: Colorfigures palette (tomato accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone and inside the SimLab host (embedded, bare). Design sizes are illustrative.
