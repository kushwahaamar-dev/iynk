# HC-SR04 standing in a breadboard (Colorfigures prompt)

The breadboard part that lesson circuits use (`figures/parts/hc-sr04.js`, Fig. P17). The module figure, lying face up
with its back-side chips, has its own prompt in `hc-sr04.md`. Facts in `docs/facts/hcsr04.md`.

Make a colourful, hand-inked isometric figure of the **HC-SR04** ultrasonic distance sensor standing upright in four
neighbouring holes (a5-a8) of a white mini breadboard on a pale green cutting mat, with a flat blue cast shadow.

- A blue 45 x 20 mm board, 1.6 mm thick, standing on its edge on a 4-pin header (2.54 mm, centred on the bottom
  edge): a black plastic strip sits on the breadboard and four tinned pins run through it into the board.
- Two aluminium transducer cans, 16 mm across and 12 mm deep, 26 mm apart, stick out of the front, each with a dark
  mesh face and its letter on it: T (transmit) on the left and R (receive) on the right, seen from the front.
- A small steel crystal can between them (no frequency printed), "HC-SR04" in white along the top edge and
  "VCC Trig Echo Gnd" over the four pins.
- Legs, left to right from the front: VCC, TRIG, ECHO, GND. 5 V, about 15 mA.

What it does:

- On its own page it is the part and nothing else: drag it all the way round, zoom, **Front view**, **Turntable**.
  It has no buttons, and **See-through** and **Labels** add nothing here: no hidden parts or callouts are drawn.
- In a lesson circuit it is US1: the Uno R3's "Read a sensor" and "Parking sensor" (beside the traffic light), the
  Nucleo's sonar, and the Pi's distance circuit, where ECHO goes through a 1 kΩ / 2 kΩ divider. The sensor itself runs
  in the interpreter as the lesson's hc-sr04 world device: a 10 µs HIGH on TRIG sends eight 40 kHz cycles, ECHO stays
  HIGH for the round trip (58 µs per cm, 2 cm to about 4 m, 38 ms when nothing echoes). While the sketch runs, three
  rings of sound spread out in front of T and fade.

Look: warm paper, heavy ink outline with finer inner lines, flat light/mid/dark bands, the five palettes.
