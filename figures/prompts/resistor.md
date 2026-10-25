# Resistor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of **four 1/4 W axial through-hole resistors** lying in a white mini
breadboard (17 columns, rows a-j, no power rails) on a pale green cutting mat (`figures/parts/resistor.js`, drawn by
the Board Bench engine that every lesson circuit uses). Each spans four columns, holes 3 to 7: R1 220 Ω in row a,
R2 1 kΩ in row c, R3 4.7 kΩ in row e and R4 10 kΩ across the centre channel in row g.

- A tan 6.3 mm body held 2.6 mm above the board, its tinned legs bent straight down into the two holes.
- Four colour bands worked out from the value: two digits, the multiplier and gold for 5 %. R1 red-red-brown-gold,
  R2 brown-black-red-gold, R3 yellow-violet-red-gold, R4 brown-black-orange-gold. Below 10 Ω the multiplier band
  turns gold or silver.

What it does:

- **Value ▾** (100 Ω, 220 Ω, 330 Ω, 1 kΩ, 4.7 kΩ, 10 kΩ, 100 kΩ) changes the resistor you clicked, or R1 when none
  is selected: its bands redraw and a toast says so ("R1 is now 330 Ω").
- **Labels** names each one with its value ("R1 · 220 Ω").
- In a lesson circuit the breadboard solver treats it as a plain resistance between its two strips; it is what
  sets an LED's current ((5 V − 2.0 V) / 220 Ω = 13.6 mA for a red LED).

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, mustard accent, the five
Colorfigures palettes. The mat and breadboard fade out round the parts, which the page frames.
