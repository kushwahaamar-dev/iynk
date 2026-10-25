# HC-SR04 ultrasonic distance sensor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of the classic **HC-SR04** ultrasonic rangefinder lying face up on a
pale green cutting mat, with a flat blue cast shadow (`figures/modules/hc-sr04.js`, facts in `docs/facts/hcsr04.md`).

- A blue 45 x 20 mm board, 1.6 mm thick, square corners, two Ø2 mm mounting holes diagonally opposite.
- On the front only: two 16 mm aluminium cans about 12 mm tall with a silver wire mesh over dark cloth, T (transmit)
  on the left at (9.2, 9.9) and R (receive) on the right at (34.7, 9.9); a low-profile HC-49/S crystal printed
  "4.000" between them at the top edge; the four solder joints of the header under "Vcc Trig Echo Gnd".
- The right-angle header's black body sits on the back, flush with the bottom edge; its tinned pins run in the
  board's plane and stick out 6.2 mm past the edge.
- Every SMD part is on the back and shows only in see-through: the MAX3232 transmit driver behind T, the EM78P153S
  microcontroller over the header, the LM324 quad op-amp behind R, two SOT-23 transistors and the 0603 passives.

What it does:

- **Programs** are what a host sketch prints, one ping a second: "Hand coming closer" (100 cm down to 5 cm),
  "Wall at 30 cm", "Cushion at 40 cm (soft)" (no echo, now and then the wall behind it) and "Nothing in range".
- While it runs, rings of sound rise from T, and when an echo comes back, rings fall onto R.
- **See-through** ghosts the cans and the board: the piezo disc on its brass plate with the little cone above it
  (it buzzes during the burst), the back-side chips with their dies, and the VCC, TRIG and ECHO nets. Labels:
  40 kHz burst out, Echo in, Times the echo, Amplifier + comparator.
- **Power**: 5 V, or 3.3 V, where the chip runs but the drive and gain are too low: every ping reads "no echo".
- **Break it**: reverse polarity (the MCU burns), too high a voltage, a cold joint on the Echo pin (readings drop
  out), the receiver or the crystal left out, VCC shorted to GND.

Look: warm paper, heavy ink outline with finer inner lines, flat bands, the five palettes.
