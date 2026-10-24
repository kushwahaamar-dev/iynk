# RGB LED (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **5 mm diffused RGB LED, common cathode**, in four neighbouring
holes (e7-e10) of a white mini breadboard on a pale green cutting mat, with a flat blue cast shadow.

- A milky-white diffused epoxy body: a 5.8 mm rim with a flat on the red side, a 5 mm column and a domed top.
- Four tinned legs leave the body 1.27 mm apart and splay to the holes. Flat on the left, legs toward you: red, the
  common lead (the longest, drawn with a knee), green, blue.
- Three dies in one cup: red AlGaInP about 2.0 V, green and blue InGaN about 3.1 V, 20 mA each. With 220 Ω per
  colour at 5 V: red 13.6 mA, green and blue 8.6 mA, so equal duty looks red-heavy (330 Ω on red balances it).

What it does:

- **Red duty ▾ / Green duty ▾ / Blue duty ▾** (0-100 %) and a press on the part, which steps through red, green,
  blue, white and off. The dome takes the mixed colour and glows with it; each colour's brightness follows
  (I / 13.6 mA)^0.55. The label reads "LED1 · R 13.6 · G 2.2 · B 5.2 mA".
- **Common lead ▾**: cathode (long lead to GND, a colour lights when its pin is HIGH) or anode (long lead to 5 V,
  colours active LOW, `analogWrite(pin, 255 - v)`). Wired as the other kind, every colour stays dark
  ("backwards: dark").
- **See-through** clears the body: the four lead posts, the steel reflector cup on the common lead holding the red,
  green and blue dies, each lit in its own colour and bonded to its own lead with a gold wire. Labels: Red die, Green
  die, Blue die, Common cathode cup.
- Failure: without its resistor a colour takes far more than 20 mA and burns out: that die goes black, the label
  says "R burnt" and a wisp of smoke rises.

Look: warm paper, heavy ink outline with finer inner lines, flat bands, mustard accent, the five palettes.
