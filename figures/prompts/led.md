# LED (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of **five 5 mm through-hole LEDs**, red, yellow, green, blue and white,
standing in a row in a white mini breadboard (17 columns, rows a-j, no power rails) on a pale green cutting mat
(`figures/parts/led.js`, drawn by the Board Bench engine that every lesson circuit uses). They sit in holes e2-e3,
e5-e6, e8-e9, e11-e12 and e14-e15, ids LED1 to LED5.

- Each LED stands 7 mm above the board on two tinned legs. The anode leg has a small knee half way up, so it reads
  as the longer leg; the cathode leg runs straight.
- The coloured epoxy body: a 5.8 mm rim, a 5 mm column and a rounded dome, about 7.4 mm tall in all.

What it does:

- **Colour ▾** (red, yellow, green, blue, white) recolours the LED you clicked, or LED1 when none is selected, and
  says so in a toast ("LED1 is now blue").
- On this page the LEDs sit in no circuit, so they stay dark and **Labels** reads just their ids. In a lesson
  circuit the breadboard solver gives each LED its real current from its forward voltage (red 2.0, yellow 2.1, green
  2.2, blue 3.0, white 3.1 V; 20 mA rated). A lit LED's body pales towards white and a glow in its own colour spreads
  round the dome, brighter as (I / 13.6 mA)^0.55; the label reads "LED1 · 13.6 mA".
- Failure, in a circuit: wired the wrong way round it stays dark ("LED1 · backwards"). A current peak above 50 mA
  (2.5 times its rating) burns it out with a pop and a toast ("LED1 burned out: … mA is far above its 20 mA"): the
  body turns dark brown, a grey puff of smoke hangs over it, and it stays dead ("LED1 · burnt").

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, mustard accent, the five
Colorfigures palettes. The mat and breadboard fade out round the parts, which the page frames.
