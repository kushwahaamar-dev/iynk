# Fig. 09 — BBC micro:bit V2 (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **BBC micro:bit V2** (revision V2.21), front side up, lying flat on a
pale green cutting mat with a 10 mm grid, with a flat blue cast shadow. The board is 51.6 x 42 mm, 1.6 mm thick, with
R 3 mm corners, black solder mask, white silkscreen and gold (ENIG) copper. Facts and sources:
`docs/facts/microbit-v2.md`. Origin at the bottom-left corner, edge connector along the bottom (y = 0), USB at the top.

Draw every part where the Avnet assembly drawing puts it:

- **Front:** the 5 x 5 matrix of red 0603 LEDs (D2-D50) on a 4 mm grid centred at (25.8, 20), long axis along y;
  buttons A (5.86, 20.96) and B (45.74, 20.96), 6 x 6.5 mm, 4.55 mm tall, with "A" and "B" in the silkscreen; the gold
  touch logo (a stadium outline with two round eyes) at (25.8, 34.02); the five gold rings 0, 1, 2, 3V and GND at x
  4.21, 14.37, 25.8, 37.23, 47.39 (y 6.86), 4.98 mm pads round 3.98 mm plated holes, labelled above; the gold edge
  connector with its 20 narrow 0.9 mm strips at their measured x (P3, P4-P7, P8-P12, P13-P16, 3V guards, P19, P20, GND
  guards) and the wide fingers under the rings.
- **Back** (hidden from the front, shown in see-through or when selected): the micro-USB socket J3 at the top edge
  with its cable leaving past the top edge and down to the mat; the cream battery socket J2 (2-pin 2.0 mm); the RESET
  button SW1; the nRF52833 (7 x 7 mm, turned 45°) and its 32 MHz crystal X1; the nRF52820 interface chip (5 x 5 mm,
  45°); the NCP114 3.3 V regulator; the BAT60J USB diode D51, the battery diodes D59 (with D57), the BAT54T D1; the USB
  choke L5 and ESD array D62; the red power LED D60 and yellow USB LED D61; the LSM303AGR motion sensor U6; the
  MLT-8530 speaker (8 mm, cut corners, sound port) and its MOSFET T2 and flyback diode D5; the MEMS microphone U4 and
  its red LED D70; the PCB antenna in the top-right corner (estimated area); and the small parts as selectable groups
  (antenna matching L3/L7/C11, the LED resistors R38/R39, the ring ESD diodes, the small transistors). X2 and D57 have
  no measured position and are left out rather than guessed.

What it does:

- **Power ▾**: USB cable, a 2 x AAA pack in J2, a supply on the 3V ring, and "USB + 5 V on pin 0" as a wiring
  mistake. The power tree is real: USB → D51 (about 4.7 V) and battery → D59 + D57 onto VCOMBINED → NCP114 → 3V
  (3.3 V, 300 mA, current-limited); the 3V ring feeds the rail directly with no protection. The red LED lights from
  the rail, the yellow one from USB through the interface chip.
- **Upload sketch ▾** (DAPLink drag-and-drop): beating heart (the factory greeting), blink pin 1 with the centre LED,
  faces on buttons A and B, a note while the logo is touched, a sound meter that switches the microphone (and D70) on,
  and the temperature over USB serial at 115200 baud. The matrix shows each program's images.
- **Press A, Press B, Press LOGO, Press RESET**: inputs on P5, P11 and the logo; RESET holds the program.
- **Strip to bare PCB, Pick & place SMD, Solder joints (reflow), Place / Remove a part ▾**: every part is surface
  mount, so the build is strip → place → reflow.
- **Break it ▾**: a reversed pack (D59 blocks it, nothing happens), a reversed or 4.2 V supply on the 3V ring (the
  chips or the LSM303AGR burn), flat batteries (brown-out), a 3V-GND short (the regulator's limit takes it, all dark),
  a USB short, a loose crocodile clip on ring 1, a missing crystal (powered, nothing runs), a missing regulator (dark on
  USB, fine on the 3V ring), and 5 V on pin 0 (the rail climbs to 4.4 V).
- **View ▾**: the board; the half breadboard with crocodile leads from the rings for each lesson circuit (an LED on
  pin 1 through 470 Ω, and a potentiometer on pin 2 between 3V and GND); the schematic and power-tree sheets; the
  exploded view. **See-through** ghosts the PCB to show the back, the dies, the LED dies, the speaker coil and orange
  copper paths with moving dots (USB, VCOMBINED, 3V, P1, P2, RUN_MIC). **Labels** names the main parts. A host can
  light the matrix pixel by pixel with nets MX0-MX24 (0-1, row by row from the top-left).

Look: Colorfigures palette (blush accent), warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble,
paper grain. Works on a phone (badges and a label list) and inside the SimLab host (embedded, bare).
