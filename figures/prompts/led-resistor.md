# Fig. 02 — LED + resistor trainer (Robotics Bench, Colorfigures prompt)

Make a colourful, hand-inked isometric bench figure of a **60 x 40 mm LED trainer**, a through-hole teaching board
with no controller, on a pale green cutting mat with a 10 mm grid, raised on four standoffs, with a flat blue cast
shadow. Green solder mask, white silkscreen ("LED TRAINER", "I = V / R", the row labels 220, 1K, 10K and NONE), four
3.2 mm mounting holes. Mint palette accent.

On the board: a power-only USB-C jack (J1) with its two 5.1 kΩ CC pull-downs (R4, R5), a green two-way screw
terminal for a bench supply (J2), a slide switch (SW1), a blue-sleeved 100 µF electrolytic (C1, stripe toward GND),
three axial resistors with real colour bands (R1 220 Ω red-red-brown-gold, R2 1 kΩ brown-black-red-gold, R3 10 kΩ
brown-black-orange-gold) and a bare wire link (JL1) in four rows, a 2 x 4 jumper header (JP1) with a black jumper cap
that sits on the chosen row, a red 5 mm LED (D1) standing on its legs, flat on the cathode side, and two test points
(TP1 red, TP2 black). On the mat in front: a yellow pocket multimeter on its 200 mA DC range, its LCD showing the
current and "mA", red and black probe leads clipped to TP1 and TP2, so the meter sits in series with the LED. A grey
USB-C cable comes in from the left.

What it does:

- **Power ▾**: the USB-C charger (5 V) or the bench supply on J2 (5 V, adjustable for the faults). **Flip POWER**
  slides SW1.
- **Move the jumper** (the bench's modes: 220 Ω, 1 kΩ, 10 kΩ, No resistor): instant, works unplugged, the cap
  moves. The model is I = (V − V_F) / R with V_F = 2.0 V: the meter reads 13.6, 3.0 or 0.30 mA, the LED glows on a
  log scale, and every 4 s the bench notes print the sum ("I = 3.0 V / 220 = 13.6 mA  bright, safe").
- **Strip to bare PCB, Place a part ▾, Solder joints**: low parts, then tall parts, then the cap and the meter last,
  with the build's refusals.
- **Break it ▾**: no resistor (a flash, OL on the meter, then the LED is dark for good), D1 or C1 in backwards (dark;
  vented), R4 left out (the charger never turns 5 V on), a cold joint on D1 (the LED and the meter cut in and out),
  the bench supply's leads swapped (C1 vents, D1 just blocks), 12 V on J2 (45 mA, the LED overheats and dies after a
  few seconds), a 10 mA current limit (the supply sags to 4.2 V). Burnt and vented parts stay dead until replaced.
- **View ▾**: the board, the schematic and power sheets, the exploded view. **See-through** shows the LED die in its
  reflector cup and moving dots along the loop the meter reads: TP2, the resistor bus, the chosen row, the LED.

State the host reads: `status`, `power`, `mode`, `fault`, `faults`, `rails.VIN`, `rails.VCC`, `meas.MM1` (the meter:
`i_mA` and the display `text`), `meas.D1`, `meas.JP1` (`ohms`, `mW`) and the build-step conditions `tasks.low-in`,
`tasks.tall-in`, `tasks.soldered`, `tasks.last-in`, `tasks.lit`. The lesson (19 steps, 8 faults, 2 tasks, 5 quizzes)
is `src/content/robotics/led-resistor.ts`; the facts are `docs/facts/trainers.md`.

Look: Colorfigures palette, warm paper, heavy ink silhouette, finer inner lines, hand-drawn wobble, paper grain. Works
on a phone and inside the SimLab host (embedded, bare).
