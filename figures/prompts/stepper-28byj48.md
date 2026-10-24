# Fig. P19 — 28BYJ-48 stepper motor (Colorfigures prompt)

Make a colourful, hand-inked isometric figure of a **28BYJ-48 5 V unipolar geared stepper motor** standing on a
small wooden base on the pale green cutting mat, shaft up, with a red pointer (or an eight-segment prize wheel) on
the shaft and a flat blue cast shadow. Real size: steel can 28 mm across and 19 mm deep, a flange with two ears on
35 mm centres, the 5 mm shaft with its flats 8 mm off the can's centre on a small boss, "28BYJ-48 5VDC" on top, the
blue cover on the side where the five wires leave (blue, pink, yellow, orange, red) to a white 5-pin JST-XH plug.

What it does:

- Real numbers: 32 full steps per rotor turn and a 63.68395 : 1 gearbox (9→32, 11→22, 9→26, 10→31), so 2037.8864
  full steps or 4075.7728 half steps per output turn (the "64 : 1 / 2048" figure over-turns 1.8° a turn); coils
  50 Ω, 82 mA per energised phase through a ULN2003; about 15 rpm (510 full steps/s) is the real top speed.
- The rotor follows the energised wires: half-step sequence O, O+Y, Y, Y+P, P, P+B, B, B+O (O and P are the two
  ends of one centre-tapped winding, Y and B of the other). Driven from D8-D11 through the ULN2003 board, or by the
  host's step count.
- **On the shaft ▾** (pointer / prize wheel), **Stepping ▾** (full, half, wave), **Pin order in code ▾**
  (8-10-9-11 is right; 8-9-10-11 energises both ends of one winding on every other step, the field flips 180° and
  the pointer jitters in place).
- **Show ▾** (part page): idle, turning, too fast (it hums and stalls: buzz marks, the pointer shivers), wrong pin
  order.
- **See-through**: the can ghosts to show the two copper windings (each glows while energised), the eight-pole
  magnet rotor turning, and the four-stage gear train under the top plate. Labels: Winding O–P, Winding Y–B,
  32-step magnet rotor, Gears 63.68 : 1.

Look: Colorfigures ink and paper, steel can, cobalt cover, tan wood, flat banded shading. Facts:
docs/facts/la-components.md §15 (Kiatronics 28BYJ-48 sheet, teardown tooth counts).
