# Fig. 01 — Arduino Uno R3 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of an **Arduino Uno R3** (A000066, through-hole edition) lying on a
pale green cutting mat with a 10 mm grid, raised on four gold standoffs, with a flat blue cast shadow. The board is
68.58 x 53.34 mm, teal solder mask, white silkscreen, with the real outline (the stepped right-hand edge) and four
3.2 mm mounting holes at (13.97, 2.54), (15.24, 50.8), (66.04, 7.62) and (66.04, 35.56) mm.

Draw every part where Arduino's own Eagle board file (UNO-TH_Rev3e.brd) puts it: the ATmega328P-PU in a DIP-28
socket (notch to the right, text upside down as on the real board), the ATmega16U2 QFN-32 by the USB socket, the
16 MHz HC-49 crystal (Y1) and the 16 MHz ceramic resonator (Y2), the NCP1117 5 V regulator (SOT-223), the LP2985
3.3 V regulator (SOT-23-5), the LMV358 op-amp (MSOP-8), the FDN340P MOSFET, the 500 mA polyfuse, the M7 diode, two
47 µF SMD electrolytics with their black minus bands, the 10 µH AVCC inductor, the ferrite bead, every 0603
capacitor and resistor and the four resistor arrays, the two MiniMELF diodes, the USB-B socket overhanging the left
edge, the barrel jack, the RESET button, both 2x3 ICSP headers, the unpopulated JP2 pads, the RESET-EN jumper, and
the four black female headers (D8-D13/GND/AREF/SDA/SCL, D0-D7, power, A0-A5) with their silk labels, plus the L, TX,
RX (yellow) and ON (green) LEDs. A grey USB cable is plugged in and curls down onto the mat.

What it does:

- **Power ▾**: USB cable, barrel jack, VIN pin or 5V pin. The power tree is real: USB → polyfuse → MOSFET → 5 V
  (switched off by the comparator when VIN is above 6.6 V); jack → M7 diode → NCP1117 → 5 V; 5 V → LP2985 → 3.3 V.
  ON lights from the 5 V rail.
- **Upload sketch ▾**: Blink (factory, 1 s on / 1 s off), Blink without delay(), analogWrite on pin 13 (no PWM
  there), Serial hello. Uploads take 2.2 s with RX/TX flicker; after RESET the bootloader flashes L three times and
  waits about a second.
- **Press RESET** (or press the button on the board): the sketch stops while it is held and restarts on release.
- **Strip to bare PCB, Pick & place SMD (reflow), Place a part ▾, Solder joints, Remove a part ▾**: the real build
  order with its refusals ("Unplug the power first: never work on a live board", "SMD parts first…", "Low parts
  first…", "Solder everything first. Never heat a chip sitting in its socket"). Any single part can be left out.
- **Break it ▾**: reverse polarity on the jack (the M7 diode blocks it), too high or too low a voltage on every
  input, a motor on the 5 V pin (brown-out resets), the 328P or an electrolytic in backwards (hot / pop with smoke),
  cold joints (the part works in bursts), a 5 V–GND solder bridge (the supply trips).
- **View ▾**: the board; the breadboard with the Blink circuit (D13 → 220 Ω → red LED → GND, real current shown);
  the hand-inked schematic and power-tree sheets, synced with the 3D parts; the exploded view (parts lift by build
  group). **See-through** shows the silicon dies with bond wires, the quartz blank, the polyfuse element and orange
  copper paths with moving dots where current flows (USB, 5 V, VIN, D13). **Labels** names the main parts.

Look: Colorfigures palette (cobalt accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone (badges and a label list) and inside the iynk host (embedded, bare).
